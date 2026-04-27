/**
 * Backfill for migration 045 (S10.5).
 *
 * For every listing:
 *   1. Parse the `<!--meta:{...}-->` comment from `description` via the
 *      same parser the runtime uses (src/lib/listing-meta.ts).
 *   2. Populate the new real columns from the parsed JSON, but ONLY for
 *      columns that are still NULL/empty on this row — never overwrite
 *      an existing value.
 *   3. Map the legacy `house_rules` text blob into the new
 *      no_smoking / no_parties / quiet_hours / pets_allowed booleans.
 *   4. Copy meta.cleaningFee → cleaning_fee column.
 *   5. Copy meta.defaultAvailability → default_availability_status with
 *      the wizard→column value rename ('unavailable'→'blocked',
 *      'possibly'→'possibly_available', 'available' stays).
 *   6. Mirror access_settings.preview_content → preview_settings column
 *      (keeps the per-section toggles in sync now that preview_settings
 *      is the canonical source).
 *   7. Strip the meta-comment from description after a successful read.
 *
 * Surface ANY parse failure and bail before continuing — we'd rather
 * leave the description blob intact than silently lose data.
 *
 * Idempotent: re-running on a row whose meta has already been extracted
 * is a no-op (the meta-comment is gone, so parser returns {}).
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/backfill-045-listing-meta.ts
 *   npx tsx --env-file=.env.local scripts/backfill-045-listing-meta.ts --dry
 */
import { createClient } from "@supabase/supabase-js";
import { parseListingMeta, type ListingMeta } from "../src/lib/listing-meta";

const DRY = process.argv.includes("--dry");

interface PreviewContent {
  show_title?: boolean;
  show_price_range?: boolean;
  show_description?: boolean;
  show_host_first_name?: boolean;
  show_profile_photo?: boolean;
  show_neighborhood?: boolean;
  show_map_area?: boolean;
  show_rating?: boolean;
  show_amenities?: boolean;
  show_bed_counts?: boolean;
  show_house_rules?: boolean;
  use_preview_specific_description?: boolean;
}

interface AccessSettings {
  preview_content?: PreviewContent;
  [k: string]: unknown;
}

interface Row {
  id: string;
  description: string | null;
  house_rules: string | null;
  access_settings: AccessSettings | null;
  // existing columns we'll guard against overwriting
  cleaning_fee: number | null;
  default_availability_status: string | null;
  // new columns added by mig 045
  place_kind: string | null;
  property_label: string | null;
  max_guests: number | null;
  bedrooms: number | null;
  beds: number | null;
  bathrooms: number | null;
  street: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  lat: number | null;
  lng: number | null;
  weekly_discount_pct: number | null;
  monthly_discount_pct: number | null;
  extended_overview: string | null;
  guest_access_text: string | null;
  interaction_text: string | null;
  other_details_text: string | null;
  no_smoking: boolean | null;
  no_parties: boolean | null;
  quiet_hours: boolean | null;
  pets_allowed: boolean | null;
}

const TITLE_TO_LABEL: Record<string, string> = {
  House: "house",
  Apartment: "apartment",
  Condo: "condo",
  Townhouse: "townhouse",
  Cabin: "cabin",
  Loft: "loft",
  Other: "other",
};

function mapPropertyLabel(raw: string | undefined): string | null {
  if (!raw) return null;
  if (TITLE_TO_LABEL[raw]) return TITLE_TO_LABEL[raw];
  const lower = raw.toLowerCase();
  if (Object.values(TITLE_TO_LABEL).includes(lower)) return lower;
  return null;
}

/** Some seed scripts wrote `<!--meta:{"meta":{...}}-->` instead of the
 *  canonical flat shape produced by encodeListingMeta. parseListingMeta
 *  returns the literal `{meta:{...}}` in that case (it just JSON.parses
 *  whatever is between the comment markers and casts it to ListingMeta).
 *  Unwrap one level if we see no known top-level keys. */
function unwrapNested(raw: ListingMeta): ListingMeta {
  if (!raw || typeof raw !== "object") return {};
  const known = [
    "placeKind",
    "propertyLabel",
    "guests",
    "bedrooms",
    "beds",
    "bathrooms",
    "address",
    "cleaningFee",
    "propertyOverview",
    "guestAccess",
    "interactionWithGuests",
    "otherDetails",
    "weeklyDiscount",
    "monthlyDiscount",
    "defaultAvailability",
  ];
  const hasFlat = known.some((k) => k in (raw as Record<string, unknown>));
  if (hasFlat) return raw;
  const obj = raw as Record<string, unknown>;
  if (
    "meta" in obj &&
    obj.meta &&
    typeof obj.meta === "object" &&
    !Array.isArray(obj.meta)
  ) {
    return obj.meta as ListingMeta;
  }
  return raw;
}

function mapDefaultAvailability(
  raw: string | undefined
): "available" | "possibly_available" | "blocked" | null {
  if (!raw) return null;
  if (raw === "available") return "available";
  if (raw === "possibly" || raw === "possibly_available")
    return "possibly_available";
  if (raw === "unavailable" || raw === "blocked") return "blocked";
  return null;
}

/** Map the legacy house_rules text blob → boolean flags.
 *  Wizard joins selected items with "\n"; the canonical labels are:
 *    "No smoking" · "No pets" · "No parties or events" · "Quiet hours after 10pm"
 *  Match case-insensitively + tolerant of substrings ("no smoking allowed").
 */
function rulesFromText(text: string | null): {
  no_smoking: boolean | null;
  no_parties: boolean | null;
  quiet_hours: boolean | null;
  pets_allowed: boolean | null;
} {
  const out = {
    no_smoking: null as boolean | null,
    no_parties: null as boolean | null,
    quiet_hours: null as boolean | null,
    pets_allowed: null as boolean | null,
  };
  if (!text) return out;
  const lc = text.toLowerCase();
  if (/(^|\n|\.|\s)no\s*smoking/.test(lc)) out.no_smoking = true;
  if (/(^|\n|\.|\s)no\s*part(y|ies)/.test(lc)) out.no_parties = true;
  if (/quiet\s*hours/.test(lc)) out.quiet_hours = true;
  if (/(^|\n|\.|\s)no\s*pets/.test(lc)) out.pets_allowed = false;
  return out;
}

async function main() {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const { data: rows, error } = await sb
    .from("listings")
    .select(
      [
        "id",
        "description",
        "house_rules",
        "access_settings",
        "cleaning_fee",
        "default_availability_status",
        "place_kind",
        "property_label",
        "max_guests",
        "bedrooms",
        "beds",
        "bathrooms",
        "street",
        "city",
        "state",
        "postal_code",
        "lat",
        "lng",
        "weekly_discount_pct",
        "monthly_discount_pct",
        "extended_overview",
        "guest_access_text",
        "interaction_text",
        "other_details_text",
        "no_smoking",
        "no_parties",
        "quiet_hours",
        "pets_allowed",
      ].join(",")
    );
  if (error) throw new Error(`select failed: ${error.message}`);
  if (!rows) throw new Error("no rows returned");

  console.log(`scanning ${rows.length} listings — DRY=${DRY}`);

  const failures: Array<{ id: string; reason: string }> = [];
  const updates: Array<{ id: string; patch: Record<string, unknown> }> = [];

  for (const r of rows as unknown as Row[]) {
    let meta: ListingMeta;
    let body: string;
    try {
      const parsed = parseListingMeta(r.description);
      meta = unwrapNested(parsed.meta);
      body = parsed.body;
    } catch (e) {
      failures.push({ id: r.id, reason: `parse threw: ${(e as Error).message}` });
      continue;
    }

    const patch: Record<string, unknown> = {};

    // Only fill columns that are still empty — never overwrite real data.
    const fillIfNull = <K extends keyof Row>(
      key: K,
      value: Row[K] | null | undefined
    ) => {
      if (value === undefined || value === null || value === "") return;
      if (r[key] === null || r[key] === undefined || r[key] === ("" as unknown))
        patch[key as string] = value;
    };

    fillIfNull("place_kind", meta.placeKind ?? null);
    fillIfNull(
      "property_label" as keyof Row,
      mapPropertyLabel(meta.propertyLabel) as Row["property_label"]
    );
    fillIfNull("max_guests", meta.guests ?? null);
    fillIfNull("bedrooms", meta.bedrooms ?? null);
    fillIfNull("beds", meta.beds ?? null);
    fillIfNull("bathrooms", meta.bathrooms ?? null);
    fillIfNull("street", meta.address?.street ?? null);
    fillIfNull("city", meta.address?.city ?? null);
    fillIfNull("state", meta.address?.state ?? null);
    fillIfNull("postal_code", meta.address?.zip ?? null);
    fillIfNull("lat", meta.address?.lat ?? null);
    fillIfNull("lng", meta.address?.lng ?? null);
    fillIfNull("weekly_discount_pct", meta.weeklyDiscount ?? null);
    fillIfNull("monthly_discount_pct", meta.monthlyDiscount ?? null);
    fillIfNull("extended_overview", meta.propertyOverview ?? null);
    fillIfNull("guest_access_text", meta.guestAccess ?? null);
    fillIfNull("interaction_text", meta.interactionWithGuests ?? null);
    fillIfNull("other_details_text", meta.otherDetails ?? null);

    if (
      r.cleaning_fee === null &&
      typeof meta.cleaningFee === "number" &&
      Number.isFinite(meta.cleaningFee)
    ) {
      patch.cleaning_fee = meta.cleaningFee;
    }

    const dasv = mapDefaultAvailability(meta.defaultAvailability);
    if (dasv && r.default_availability_status === null) {
      patch.default_availability_status = dasv;
    }

    // Promote the rules text blob → booleans (only when still null).
    const rules = rulesFromText(r.house_rules);
    if (r.no_smoking === null && rules.no_smoking !== null)
      patch.no_smoking = rules.no_smoking;
    if (r.no_parties === null && rules.no_parties !== null)
      patch.no_parties = rules.no_parties;
    if (r.quiet_hours === null && rules.quiet_hours !== null)
      patch.quiet_hours = rules.quiet_hours;
    if (r.pets_allowed === null && rules.pets_allowed !== null)
      patch.pets_allowed = rules.pets_allowed;

    // Mirror preview_content into preview_settings on existing rows so
    // the new column has the host's actual toggles, not the all-true
    // default. (We do this unconditionally — preview_settings has a
    // non-null default so the column is never null, but if the row's
    // access_settings.preview_content exists, it's the source of truth.)
    const pc = r.access_settings?.preview_content;
    if (pc && typeof pc === "object") {
      patch.preview_settings = pc;
    }

    // Strip the meta-comment from the description. Only when the parse
    // produced a non-empty meta — otherwise leave description alone so
    // we don't churn unrelated rows.
    if (Object.keys(meta).length > 0 && body !== r.description) {
      patch.description = body;
    }

    if (Object.keys(patch).length > 0) {
      updates.push({ id: r.id, patch });
    }
  }

  console.log(`would update ${updates.length} rows`);
  if (failures.length) {
    console.error(`\n${failures.length} parse failures — bailing:`);
    for (const f of failures) console.error(`  ${f.id}: ${f.reason}`);
    process.exit(1);
  }

  if (DRY) {
    console.log("\n--- sample patches (first 3) ---");
    for (const u of updates.slice(0, 3)) {
      console.log(u.id, JSON.stringify(u.patch));
    }
    return;
  }

  let applied = 0;
  for (const u of updates) {
    const { error: updErr } = await sb
      .from("listings")
      .update(u.patch)
      .eq("id", u.id);
    if (updErr) {
      console.error(`update failed for ${u.id}: ${updErr.message}`);
      continue;
    }
    applied += 1;
  }
  console.log(`\n✓ applied ${applied} / ${updates.length} updates`);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
