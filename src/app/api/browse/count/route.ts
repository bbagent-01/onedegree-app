import { NextResponse } from "next/server";
import { countBrowseListings } from "@/lib/browse-data";
import { parseBrowseParams } from "@/lib/browse-utils";

export const runtime = "edge";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const params: Record<string, string> = {};
  url.searchParams.forEach((v, k) => {
    params[k] = v;
  });
  const filters = parseBrowseParams(params);
  const count = await countBrowseListings(filters);
  return NextResponse.json({ count });
}
