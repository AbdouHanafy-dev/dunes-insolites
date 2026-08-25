import { getStays } from "@/lib/data/stays";

export async function GET() {
  return Response.json({ stays: getStays() });
}
