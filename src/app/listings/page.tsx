import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getListingsForViewer } from "@/lib/listing-data";
import { ListingsIndexClient } from "./listings-index-client";

export default async function ListingsPage() {
  const { userId } = await auth();
  if (!userId) redirect("/");

  const supabase = getSupabaseAdmin();
  const { data: viewer } = await supabase
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  if (!viewer) redirect("/");

  const listings = await getListingsForViewer(viewer.id);

  return <ListingsIndexClient listings={listings} />;
}
