/** What the backend accepts (MediaServiceImpl): keep in step with it. */
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"];

const MAX_SIDE = 2400;

/**
 * Shrinks a big photo in the browser (max 2400 px, JPEG) so phone photos of
 * 10 Mo upload without the user doing anything. SVG/GIF are left untouched, and
 * if the browser cannot decode the file we send the original as-is.
 */
async function shrink(file: File): Promise<File> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return file;
  if (file.size < 1024 * 1024) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}

export type UploadResult = { url: string; error: null } | { url: null; error: string };

/**
 * Uploads a photo through the admin's media route and returns its address,
 * or a message that says WHY it failed (too big, wrong format, no permission,
 * expired session...) instead of a bare "Envoi impossible".
 */
export async function uploadImage(original: File): Promise<UploadResult> {
  const file = await shrink(original);
  if (file.size > MAX_UPLOAD_BYTES) {
    const mb = (file.size / (1024 * 1024)).toFixed(1).replace(".", ",");
    return { url: null, error: `Photo trop lourde (${mb} Mo) : maximum 8 Mo. Réduisez-la puis réessayez.` };
  }
  if (file.type && !ACCEPTED_TYPES.includes(file.type)) {
    return { url: null, error: "Format non accepté : utilisez une image JPG, PNG, WebP ou GIF (les photos HEIC d’iPhone ne sont pas acceptées)." };
  }

  const form = new FormData();
  form.set("file", file);

  let res: Response;
  try {
    res = await fetch("/api/proxy/media-upload?companyType=DUNES_INSOLITES", { method: "POST", body: form });
  } catch {
    return { url: null, error: "Connexion impossible : vérifiez votre réseau puis réessayez." };
  }

  if (res.ok) {
    const data = (await res.json().catch(() => ({}))) as { url?: string };
    return data.url ? { url: data.url, error: null } : { url: null, error: "Le serveur n’a pas renvoyé l’adresse de la photo." };
  }

  const data = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
  const detail = data.message ?? data.error;
  switch (res.status) {
    case 401:
      return { url: null, error: "Session expirée : reconnectez-vous puis réessayez." };
    case 403:
      return { url: null, error: "Vous n’avez pas le droit d’envoyer des photos : la permission « Médiathèque » doit être sur « complet »." };
    case 413:
      return { url: null, error: "Photo trop lourde pour le serveur (maximum 8 Mo)." };
    case 400:
      return { url: null, error: detail ? `Photo refusée : ${detail}` : "Photo refusée par le serveur." };
    default:
      return {
        url: null,
        error: `Erreur du serveur (${res.status}) : la photo n’a pas pu être enregistrée${detail ? ` — ${detail}` : ""}. Réessayez ; si cela continue, prévenez le support technique.`,
      };
  }
}
