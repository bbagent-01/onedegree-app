/**
 * Unsplash search client + cache.
 *
 * Trip Wishes auto-fetch a destination photo on /proposals/new. Search
 * results are cached server-side for 30 days to stay well under the
 * demo (50/hr) and production (5000/hr) Unsplash rate limits.
 *
 * Returns a normalized photo record (URL + photographer attribution +
 * link back to the photo on Unsplash so we can satisfy Unsplash's
 * usage guidelines without storing the full API response).
 *
 * No-op fallback: when UNSPLASH_ACCESS_KEY isn't set we return [] so
 * the form gracefully degrades to "no photo found, upload your own".
 * Same shape as the email helper's silent-skip on missing API key.
 */

import { getSupabaseAdmin } from "./supabase";

export interface UnsplashPhoto {
  id: string;
  url: string;
  thumb_url: string;
  photographer_name: string;
  photographer_url: string;
  unsplash_url: string;
  /**
   * Per Unsplash API guidelines, apps must POST/GET this URL whenever
   * the photo is "used" (in our case, when a proposal with this photo
   * is created or updated). Stored on the proposal alongside the rest
   * of the attribution blob so we can fire it server-side at insert
   * time without a second round-trip to Unsplash.
   *
   * Reference: https://help.unsplash.com/en/articles/2511245-unsplash-api-guidelines
   */
  download_location: string;
  alt: string;
}

const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const RESULTS_PER_QUERY = 5;

async function hashQuery(q: string): Promise<string> {
  const data = new TextEncoder().encode(q.trim().toLowerCase());
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

interface UnsplashSearchResult {
  results: Array<{
    id: string;
    alt_description: string | null;
    description: string | null;
    urls: { regular: string; small: string };
    links: { html: string; download_location: string };
    user: {
      name: string;
      links: { html: string };
    };
  }>;
}

function normalize(raw: UnsplashSearchResult): UnsplashPhoto[] {
  return (raw.results ?? []).slice(0, RESULTS_PER_QUERY).map((r) => ({
    id: r.id,
    // urls.regular is the hotlinked CDN URL on images.unsplash.com.
    // Per Unsplash policy, photos must be served from this URL — we
    // never re-host the image to our own storage bucket.
    url: r.urls.regular,
    thumb_url: r.urls.small,
    photographer_name: r.user.name,
    photographer_url: r.user.links.html,
    unsplash_url: r.links.html,
    download_location: r.links.download_location,
    alt: r.alt_description || r.description || "Destination photo",
  }));
}

export async function searchUnsplash(
  query: string
): Promise<{ photos: UnsplashPhoto[]; cached: boolean }> {
  const trimmed = query.trim();
  if (!trimmed) return { photos: [], cached: false };

  const supabase = getSupabaseAdmin();
  const hash = await hashQuery(trimmed);

  const { data: cached } = await supabase
    .from("unsplash_cache")
    .select("response, fetched_at")
    .eq("query_hash", hash)
    .maybeSingle();

  if (cached) {
    const fetchedMs = new Date(cached.fetched_at as string).getTime();
    if (Date.now() - fetchedMs < CACHE_TTL_MS) {
      return {
        photos: normalize(cached.response as UnsplashSearchResult),
        cached: true,
      };
    }
  }

  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) {
    console.log(
      `[unsplash] UNSPLASH_ACCESS_KEY missing — returning empty result for "${trimmed}"`
    );
    return { photos: [], cached: false };
  }

  try {
    const url = new URL("https://api.unsplash.com/search/photos");
    url.searchParams.set("query", trimmed);
    url.searchParams.set("per_page", String(RESULTS_PER_QUERY));
    url.searchParams.set("orientation", "landscape");
    url.searchParams.set("content_filter", "high");

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Client-ID ${key}`,
        "Accept-Version": "v1",
      },
    });
    if (!res.ok) {
      console.error(
        `[unsplash] http ${res.status} for "${trimmed}":`,
        await res.text()
      );
      return { photos: [], cached: false };
    }
    const data = (await res.json()) as UnsplashSearchResult;

    // Upsert keeps a single row per query, refreshing fetched_at so the
    // 30-day TTL restarts whenever we revalidate.
    await supabase.from("unsplash_cache").upsert(
      {
        query_hash: hash,
        query: trimmed,
        response: data,
        fetched_at: new Date().toISOString(),
      },
      { onConflict: "query_hash" }
    );

    return { photos: normalize(data), cached: false };
  } catch (e) {
    console.error("[unsplash] fetch failed:", e);
    return { photos: [], cached: false };
  }
}

/**
 * Trigger the Unsplash "download" endpoint for a given photo. Per the
 * Unsplash API guidelines, apps must hit `links.download_location`
 * whenever a user takes an action that constitutes "using" the photo
 * (we treat creating/updating a proposal with the photo as that event).
 *
 * Fire-and-forget — never block or fail the caller. A swallowed error
 * here at worst affects Unsplash analytics, never the user-visible
 * proposal flow.
 *
 * Reference: https://help.unsplash.com/en/articles/2511245-unsplash-api-guidelines
 */
export async function triggerUnsplashDownload(
  downloadLocation: string | null | undefined
): Promise<void> {
  if (!downloadLocation) return;
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) return;
  try {
    const res = await fetch(downloadLocation, {
      method: "GET",
      headers: {
        Authorization: `Client-ID ${key}`,
        "Accept-Version": "v1",
      },
    });
    if (!res.ok) {
      console.warn(
        `[unsplash] download trigger non-OK ${res.status} for ${downloadLocation}`
      );
    }
  } catch (e) {
    console.warn("[unsplash] download trigger failed:", e);
  }
}
