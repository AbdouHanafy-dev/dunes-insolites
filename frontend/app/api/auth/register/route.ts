/** Placeholder — see the note in ../login/route.ts. */
export async function POST() {
  return Response.json(
    { error: "Accounts aren't connected yet — the backend isn't wired up." },
    { status: 501 },
  );
}
