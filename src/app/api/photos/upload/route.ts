import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export const runtime = "edge";

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

const ALLOWED: Record<string, { ext: string; magic: number[] }> = {
  "image/jpeg": { ext: "jpg", magic: [0xff, 0xd8, 0xff] },
  "image/png": {
    ext: "png",
    magic: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  },
  // WebP: "RIFF....WEBP" — first 4 bytes RIFF, bytes 8..11 = WEBP.
  // We only assert the prefix here; bytes 8..11 checked separately.
  "image/webp": {
    ext: "webp",
    magic: [0x52, 0x49, 0x46, 0x46],
  },
};

function magicMatches(bytes: Uint8Array, mime: string): boolean {
  const spec = ALLOWED[mime];
  if (!spec) return false;
  if (bytes.length < spec.magic.length) return false;
  for (let i = 0; i < spec.magic.length; i++) {
    if (bytes[i] !== spec.magic[i]) return false;
  }
  if (mime === "image/webp") {
    if (bytes.length < 12) return false;
    // bytes 8..11 must be "WEBP"
    if (
      bytes[8] !== 0x57 ||
      bytes[9] !== 0x45 ||
      bytes[10] !== 0x42 ||
      bytes[11] !== 0x50
    ) {
      return false;
    }
  }
  return true;
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return Response.json({ error: "No file provided" }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return Response.json(
      { error: "File too large", maxBytes: MAX_BYTES },
      { status: 413 }
    );
  }

  const claimedMime = file.type;
  if (!ALLOWED[claimedMime]) {
    return Response.json(
      {
        error: "Unsupported file type",
        allowed: Object.keys(ALLOWED),
      },
      { status: 415 }
    );
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = new Uint8Array(arrayBuffer);

  // Verify magic number matches the claimed MIME — guards against
  // a renamed .pdf or HTML file with image/* Content-Type.
  if (!magicMatches(buffer.slice(0, 12), claimedMime)) {
    return Response.json(
      { error: "File contents do not match declared type" },
      { status: 415 }
    );
  }

  // Derive the extension from the validated MIME — never trust the
  // client filename. crypto.randomUUID() gives the basename so path
  // traversal is impossible.
  const ext = ALLOWED[claimedMime].ext;
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;

  const supabase = getSupabaseAdmin();
  const { error: uploadErr } = await supabase.storage
    .from("listing-photos")
    .upload(path, buffer, { contentType: claimedMime });

  if (uploadErr) {
    console.error("Upload error:", uploadErr);
    return Response.json(
      { error: `Upload failed: ${uploadErr.message}` },
      { status: 500 }
    );
  }

  const { data: urlData } = supabase.storage
    .from("listing-photos")
    .getPublicUrl(path);

  return Response.json({
    public_url: urlData.publicUrl,
    storage_path: path,
  });
}
