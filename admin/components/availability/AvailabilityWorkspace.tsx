"use client";

import { useState } from "react";
import type { AdminExtra, AdminTourType } from "@/lib/api";
import AvailabilityCalendar from "./AvailabilityCalendar";
import ActivityAvailabilityCalendar from "./ActivityAvailabilityCalendar";

export default function AvailabilityWorkspace({ tourTypes, activities }: { tourTypes: AdminTourType[]; activities: AdminExtra[] }) {
  const [section, setSection] = useState<"accommodations" | "activities">("accommodations");
  return (
    <div className="flex flex-col gap-5">
      <div className="inline-flex w-fit rounded-xl border border-navy-700/10 bg-white p-1">
        <Tab active={section === "accommodations"} onClick={() => setSection("accommodations")}>Tentes & hébergements</Tab>
        <Tab active={section === "activities"} onClick={() => setSection("activities")}>Excursions</Tab>
      </div>
      {section === "accommodations"
        ? <AvailabilityCalendar tourTypes={tourTypes} />
        : <ActivityAvailabilityCalendar activities={activities} />}
    </div>
  );
}

function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} className={`rounded-lg px-4 py-2 text-sm font-semibold ${active ? "bg-navy-800 text-white" : "text-navy-700 hover:bg-navy-700/5"}`}>{children}</button>;
}
