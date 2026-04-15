import { NextResponse } from "next/server";

export const runtime = "edge";

/**
 * Free-form geocoding via OpenStreetMap Nominatim.
 * Used by the hosting edit form for:
 *   - "Find on map" button (single best hit)
 *   - Address autocomplete (top N suggestions as the user types)
 *
 * Usage:
 *   GET /api/geocode?q=36+Bryant+Pond+Rd        → { lat, lng, display_name }
 *   GET /api/geocode?q=36+Bryant+Pond&limit=5   → { results: [ {lat,lng,display_name,...}, ... ] }
 *
 * Trade-offs:
 *   Nominatim is free but rate-limited to ~1 req/sec per IP. Callers must
 *   debounce. For production, swap to Mapbox / Google Places.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  const limitParam = Number(searchParams.get("limit") || "1");
  const limit = Math.max(1, Math.min(8, isNaN(limitParam) ? 1 : limitParam));

  if (!q || q.length < 3) {
    return NextResponse.json({ error: "missing q" }, { status: 400 });
  }

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", q);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("addressdetails", "1");

  try {
    // NB: `cache: "no-store"` is not implemented on Cloudflare Workers fetch.
    const res = await fetch(url.toString(), {
      headers: {
        // Nominatim requires a valid User-Agent identifying the app.
        "User-Agent": "onedegreebnb-alpha-b (contact: hello@onedegreebnb.com)",
        Accept: "application/json",
      },
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: "upstream error" },
        { status: 502 }
      );
    }
    type NominatimHit = {
      lat: string;
      lon: string;
      display_name: string;
      address?: {
        house_number?: string;
        road?: string;
        city?: string;
        town?: string;
        village?: string;
        hamlet?: string;
        state?: string;
        postcode?: string;
      };
    };
    const data = (await res.json()) as NominatimHit[];
    if (!data || data.length === 0) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    const shape = (h: NominatimHit) => {
      const a = h.address || {};
      const streetParts: string[] = [];
      if (a.house_number) streetParts.push(a.house_number);
      if (a.road) streetParts.push(a.road);
      return {
        lat: Number(h.lat),
        lng: Number(h.lon),
        display_name: h.display_name,
        street: streetParts.join(" ") || undefined,
        city: a.city || a.town || a.village || a.hamlet || undefined,
        state: a.state || undefined,
        zip: a.postcode || undefined,
      };
    };
    if (limit === 1) {
      return NextResponse.json(shape(data[0]));
    }
    return NextResponse.json({ results: data.map(shape) });
  } catch (e) {
    console.error("geocode error", e);
    return NextResponse.json(
      { error: "geocode failed" },
      { status: 500 }
    );
  }
}
