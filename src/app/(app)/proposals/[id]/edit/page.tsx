import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { auth } from "@clerk/nextjs/server";
import { getEffectiveUserId } from "@/lib/impersonation/session";
import { fetchProposalById } from "@/lib/proposals-data";
import { EditProposalForm } from "@/components/proposals/edit-proposal-form";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export default async function EditProposalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { userId: clerkId } = await auth();
  if (!clerkId) redirect(`/sign-in?redirect=/proposals/${id}/edit`);
  const viewerId = await getEffectiveUserId(clerkId);
  if (!viewerId) redirect(`/sign-in?redirect=/proposals/${id}/edit`);

  const proposal = await fetchProposalById(id, viewerId);
  if (!proposal) notFound();
  if (proposal.row.author_id !== viewerId) {
    redirect(`/proposals/${id}`);
  }

  return (
    <div className="mx-auto w-full max-w-[720px] px-4 py-6 md:px-6 md:py-10">
      <Link
        href={`/proposals/${id}`}
        className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </Link>
      <h1 className="mt-4 text-2xl font-semibold md:text-3xl">
        Edit proposal
      </h1>
      <EditProposalForm initial={proposal.row} />
    </div>
  );
}
