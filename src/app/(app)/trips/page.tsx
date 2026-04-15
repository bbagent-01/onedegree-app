import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/messaging-data";
import { getTripsForGuest } from "@/lib/trips-data";
import { TripsList } from "@/components/trips/trips-list";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export default async function TripsPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect("/sign-in?redirect_url=/trips");
  }

  const trips = await getTripsForGuest(currentUser.id);

  return (
    <div className="mx-auto w-full max-w-[960px] px-4 py-6 md:px-6 md:py-10">
      <h1 className="text-2xl font-semibold md:text-3xl">Trips</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Your reservation requests and upcoming stays.
      </p>

      <TripsList trips={trips} />
    </div>
  );
}
