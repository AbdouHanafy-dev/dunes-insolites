import { getAvailability, isFutureDate } from "@/lib/bookings";
import { getActivity } from "@/lib/data/activities";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const activity = searchParams.get("activity");
  const date = searchParams.get("date");

  if (!activity || !date) {
    return Response.json({ error: "activity and date are required" }, { status: 400 });
  }
  if (!getActivity(activity)) {
    return Response.json({ error: "Unknown activity" }, { status: 404 });
  }
  if (!isFutureDate(date)) {
    return Response.json({ error: "Pick today or a future date", slots: [] }, { status: 400 });
  }

  return Response.json({ activity, date, slots: getAvailability(activity, date) });
}
