# -*- coding: utf-8 -*-
"""
Uploads the real images already shipping on the live site
(frontend/public/images/*) into the Media Library — real assets already in
production use, not placeholders. Lets an editor reuse them (via "Copier
l'URL") in block image fields instead of them only being reachable as
hardcoded Next.js /images/* paths.

Uses stdlib only (manual multipart/form-data body) — this box has no
`requests` package installed and it's not worth adding as a dependency
for a one-time seed script.

Requires the local backend running and testadmin@dunes.local / AdminPass1!
to exist. Not idempotent — the Media Library has no way to dedupe by
filename, so a second run creates duplicate assets.

    python scripts/seed-media.py
"""
import json
import mimetypes
import os
import urllib.request
import urllib.error
import uuid

BACKEND = "http://127.0.0.1:8099/api"
IMAGES_DIR = "frontend/public/images"

# mimetypes.guess_type() returned None for .webp on this box (its system
# MIME database didn't have the mapping) even though the backend's own
# allowlist (MediaServiceImpl.ALLOWED_MIME_TYPES) accepts image/webp fine -
# found the hard way, two real files silently skipped on the first run.
# Explicit extension map sidesteps relying on whatever's installed locally.
EXT_MIME = {
    ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
    ".webp": "image/webp", ".gif": "image/gif", ".svg": "image/svg+xml",
}


def req(method, path, token=None, body=None, headers=None):
    url = f"{BACKEND}{path}"
    r = urllib.request.Request(url, data=body, method=method)
    if headers:
        for k, v in headers.items():
            r.add_header(k, v)
    if token:
        r.add_header("Authorization", f"Bearer {token}")
    try:
        with urllib.request.urlopen(r) as resp:
            raw = resp.read()
            return resp.status, (json.loads(raw) if raw else None)
    except urllib.error.HTTPError as e:
        raw = e.read()
        return e.code, (json.loads(raw) if raw else {"error": str(e)})


def login():
    status, data = req("POST", "/auth/login", body=json.dumps({
        "email": "testadmin@dunes.local", "password": "AdminPass1!",
    }).encode(), headers={"Content-Type": "application/json"})
    assert status == 200, f"login failed: {status} {data}"
    return data["accessToken"]


def build_multipart(filename, content, mime_type):
    boundary = uuid.uuid4().hex
    parts = []
    parts.append(f"--{boundary}\r\n".encode())
    parts.append(
        f'Content-Disposition: form-data; name="file"; filename="{filename}"\r\n'.encode()
    )
    parts.append(f"Content-Type: {mime_type}\r\n\r\n".encode())
    parts.append(content)
    parts.append(f"\r\n--{boundary}--\r\n".encode())
    body = b"".join(parts)
    return body, f"multipart/form-data; boundary={boundary}"


def main():
    token = login()
    files = sorted(os.listdir(IMAGES_DIR))
    created, skipped = 0, 0

    for filename in files:
        path = os.path.join(IMAGES_DIR, filename)
        ext = os.path.splitext(filename)[1].lower()
        mime_type = EXT_MIME.get(ext) or mimetypes.guess_type(filename)[0]
        if mime_type not in ("image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"):
            print(f"skipped  {filename}  (unsupported type: {mime_type})")
            skipped += 1
            continue

        with open(path, "rb") as f:
            content = f.read()
        body, content_type = build_multipart(filename, content, mime_type)

        status, data = req(
            "POST", "/media?companyType=DUNES_INSOLITES", token=token, body=body,
            headers={"Content-Type": content_type},
        )
        if status == 201:
            created += 1
            print(f"created  {filename} -> {data['url']}")
        else:
            skipped += 1
            print(f"skipped  {filename}  ({status}: {data})")

    print(f"\n{created} created, {skipped} skipped (of {len(files)} total).")


if __name__ == "__main__":
    main()
