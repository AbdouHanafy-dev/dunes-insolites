import type { Metadata } from "next";
import { StaffEditor } from "@/components/crud/StaffCrud";

export const metadata: Metadata = { title: "Nouvel utilisateur" };

export default function NewStaffPage() {
  return <StaffEditor />;
}
