import { stats } from "@/lib/data/stats";

export async function GET() {
  return Response.json(stats);
}
