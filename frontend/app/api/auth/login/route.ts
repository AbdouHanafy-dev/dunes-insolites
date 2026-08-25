/**
 * Placeholder. Real authentication belongs in the Spring Boot backend —
 * password hashing, session issuance, rate limiting and lockout are all
 * server concerns, and none of them should be faked here.
 *
 * Until NEXT_PUBLIC_API_URL points at that backend, this returns 501 so the
 * UI says plainly that accounts are not connected yet, rather than pretending
 * someone is signed in.
 */
export async function POST() {
  return Response.json(
    { error: "Accounts aren't connected yet — the backend isn't wired up." },
    { status: 501 },
  );
}
