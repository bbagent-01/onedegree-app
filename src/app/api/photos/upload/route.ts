import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export const runtime = "edge";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return Response.json({ error: "No file provided" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  const ext = file.name.split(".").pop() || "jpg";
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = new Uint8Array(arrayBuffer);

  const { error: uploadErr } = await supabase.storage
    .from("listing-photos")
    .upload(path, buffer, { contentType: file.type });

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
