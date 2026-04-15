import { NextResponse } from "next/server";

export const runtime = "edge";

/**
 * Free-form geocoding via OpenStreetMap Nominatim.
 * Used by the hosting edit form to pin a listing's real location on the map.
 *
 * Usage: GET /api/geocode?q=36+Bryant+Pond+Rd,+Putnam+Valley,+NY+10579
 * Returns { lat, lng, display_name } or 404 if not found.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  if (!q) {
    return NextResponse.json({ error: "missing q" }, { status: 400 });
  }

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", q);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");

  try {
    // NB: `cache: "no-store"` is not implemented on Cloudflare Workers fetch,
    // so we omit it. Nominatim responses are small and this route is called
    // rarely (only when a host clicks "Find on map" in the edit form).
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
    const data = (await res.json()) as Array<{
      lat: string;
      lon: string;
      display_name: string;
    }>;
    if (!data || data.length === 0) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    const hit = data[0];
    return NextResponse.json({
      lat: Number(hit.lat),
      lng: Number(hit.lon),
      display_name: hit.display_name,
    });
  } catch (e) {
    console.error("geocode error", e);
    return NextResponse.json(
      { error: "geocode failed" },
      { status: 500 }
    );
  }
}
