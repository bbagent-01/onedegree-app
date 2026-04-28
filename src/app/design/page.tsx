import { AvailabilityCalendar } from "@/components/listing/availability-calendar";

export const runtime = "edge";

export default function DesignPage() {
  return (
    <div className="p-10">
      <h1 className="mb-6 text-2xl font-bold">Calendar preview</h1>
      <div id="probe" className="inline-block rounded-xl border border-border/60 p-4">
        <AvailabilityCalendar blockedRanges={[]} />
      </div>
    </div>
  );
}
