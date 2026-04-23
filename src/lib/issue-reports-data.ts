import "server-only";
import { getSupabaseAdmin } from "./supabase";

export type IssueCategory =
  | "damage"
  | "access"
  | "amenity"
  | "safety"
  | "noise"
  | "other";
export type IssueSeverity = "low" | "medium" | "high";
export type IssueStatus = "open" | "acknowledged" | "resolved";

export interface IssueReport {
  id: string;
  contact_request_id: string;
  thread_id: string;
  reporter_id: string;
  category: IssueCategory;
  severity: IssueSeverity;
  description: string;
  status: IssueStatus;
  acknowledged_at: string | null;
  acknowledged_by: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_note: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Fetch all issue_reports for a thread. Used by the thread detail
 * fetcher so every IssueReportCard render reads live status without
 * per-card round-trips.
 */
export async function getIssueReportsForThread(
  threadId: string
): Promise<IssueReport[]> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("issue_reports")
    .select(
      "id, contact_request_id, thread_id, reporter_id, category, severity, description, status, acknowledged_at, acknowledged_by, resolved_at, resolved_by, resolution_note, created_at, updated_at"
    )
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });
  return (data || []) as IssueReport[];
}

/**
 * Counts threads with at least one `open` issue — used for the
 * red-dot badge on the trip timeline "Check-in" / "Checked out"
 * stages.
 */
export async function countOpenIssuesForThread(
  threadId: string
): Promise<number> {
  const supabase = getSupabaseAdmin();
  const { count } = await supabase
    .from("issue_reports")
    .select("id", { count: "exact", head: true })
    .eq("thread_id", threadId)
    .eq("status", "open");
  return count ?? 0;
}
