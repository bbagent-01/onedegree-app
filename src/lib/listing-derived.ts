/**
 * Deterministic derivations for listing attributes that do not yet live in
 * the Track B database schema (bedrooms / beds / bathrooms / lat-lng).
 *
 * Track B is a visual / UX Airbnb clone for alpha validation. Rather than
 * a schema migration + backfill, we hash the listing id to produce stable,
 * realistic-looking values per listing. Because the hash is deterministic,
 * the same listing always renders the same numbers and map position.
 *
 * When real columns are added later, swap these helpers for the DB values.
 */

function hash(id: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Value in [0,1) derived from id + salt. */
function rand(id: string, salt: string): number {
  return (hash(id + ":" + salt) % 10000) / 10000;
}

export interface DerivedListingExtras {
  bedrooms: number;
  beds: number;
  bathrooms: number;
  latitude: number;
  longitude: number;
}

const ROOM_DISTRIBUTION = [1, 1, 2, 2, 2, 3, 3, 4, 5];
const BED_DISTRIBUTION = [1, 1, 2, 2, 3, 3, 4, 5, 6];
const BATH_DISTRIBUTION = [1, 1, 1, 1.5, 2, 2, 2.5, 3];

// Rough anchor points for seed areas — spread listings around these cities.
const AREA_ANCHORS: Record<string, [number, number]> = {
  "brooklyn": [40.6782, -73.9442],
  "manhattan": [40.7831, -73.9712],
  "williamsburg": [40.7081, -73.9571],
  "bushwick": [40.6944, -73.9213],
  "bedford-stuyvesant": [40.687, -73.9419],
  "park slope": [40.6721, -73.9771],
  "dumbo": [40.7033, -73.9881],
  "greenpoint": [40.7304, -73.9511],
  "east village": [40.7265, -73.9815],
  "west village": [40.7359, -74.0036],
  "soho": [40.7233, -74.0],
  "chelsea": [40.7465, -74.0014],
  "upper east side": [40.7736, -73.9566],
  "upper west side": [40.787, -73.9754],
  "harlem": [40.8116, -73.9465],
  "los angeles": [34.0522, -118.2437],
  "venice": [33.985, -118.4695],
  "silver lake": [34.0869, -118.2702],
  "san francisco": [37.7749, -122.4194],
  "mission": [37.7599, -122.4148],
  "austin": [30.2672, -97.7431],
  "miami": [25.7617, -80.1918],
  "chicago": [41.8781, -87.6298],
  // California
  "laguna beach": [33.5427, -117.7854],
  "california": [36.7783, -119.4179],
  "malibu": [34.0259, -118.7798],
  "santa monica": [34.0195, -118.4912],
  "palm springs": [33.8303, -116.5453],
  "lake tahoe": [39.0968, -120.0324],
  "napa": [38.2975, -122.2869],
  "san diego": [32.7157, -117.1611],
  "santa barbara": [34.4208, -119.6982],
  // New York state (outside NYC)
  "putnam valley": [41.385, -73.8075],
  "hudson valley": [41.7, -74.0],
  "catskills": [42.1, -74.3],
  "hamptons": [40.96, -72.3],
  "montauk": [41.0362, -71.9546],
  "new york": [40.7128, -74.006],
  // Other popular destinations
  "aspen": [39.1911, -106.8175],
  "nashville": [36.1627, -86.7816],
  "new orleans": [29.9511, -90.0715],
  "portland": [45.5152, -122.6784],
  "seattle": [47.6062, -122.3321],
  "denver": [39.7392, -104.9903],
  "boston": [42.3601, -71.0589],
  "washington": [38.9072, -77.0369],
};

const DEFAULT_ANCHOR: [number, number] = [40.7128, -74.006]; // NYC

function anchorForArea(areaName: string): [number, number] {
  const key = areaName.trim().toLowerCase();
  if (AREA_ANCHORS[key]) return AREA_ANCHORS[key];
  for (const [k, v] of Object.entries(AREA_ANCHORS)) {
    if (key.includes(k)) return v;
  }
  return DEFAULT_ANCHOR;
}

export function derivedExtras(
  id: string,
  areaName: string,
  overrides?: {
    bedrooms?: number;
    beds?: number;
    bathrooms?: number;
    lat?: number;
    lng?: number;
  }
): DerivedListingExtras {
  const bedrooms =
    overrides?.bedrooms ??
    ROOM_DISTRIBUTION[
      Math.floor(rand(id, "br") * ROOM_DISTRIBUTION.length)
    ];
  const beds =
    overrides?.beds ??
    Math.max(
      bedrooms,
      BED_DISTRIBUTION[Math.floor(rand(id, "bd") * BED_DISTRIBUTION.length)]
    );
  const bathrooms =
    overrides?.bathrooms ??
    BATH_DISTRIBUTION[
      Math.floor(rand(id, "ba") * BATH_DISTRIBUTION.length)
    ];

  let latitude: number;
  let longitude: number;
  if (overrides?.lat != null && overrides?.lng != null) {
    latitude = overrides.lat;
    longitude = overrides.lng;
  } else {
    const [anchorLat, anchorLng] = anchorForArea(areaName);
    // Scatter within ~3km radius (0.03 degrees ≈ 3.3 km latitude).
    latitude = anchorLat + (rand(id, "lat") - 0.5) * 0.06;
    longitude = anchorLng + (rand(id, "lng") - 0.5) * 0.08;
  }

  return { bedrooms, beds, bathrooms, latitude, longitude };
}
