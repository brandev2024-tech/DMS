import { NextResponse, type NextRequest } from "next/server";
import { isR2Configured, presignPut } from "@/lib/r2";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const KINDS = ["product", "category", "branding", "chat"] as const;
type Kind = (typeof KINDS)[number];
const ADMIN_ONLY: Kind[] = ["product", "category", "branding"];
const FOLDERS: Record<Exclude<Kind, "chat">, string> = { product: "products", category: "categories", branding: "branding" };
const TYPES: Record<string, string> = { "image/webp": "webp", "image/jpeg": "jpg", "image/png": "png" };
const MAX_BYTES = 2.5 * 1024 * 1024; // files are compressed in the browser first (~200–400 KB)

type FileReq = { contentType: string; size: number; variant?: "full" | "thumb" };

/**
 * Returns presigned R2 PUT URLs (5 min) for up to 2 files: the photo and its thumbnail.
 * Logged-in users only; product/category/branding photos are admin-only.
 */
export async function POST(request: NextRequest) {
  if (!isR2Configured()) return NextResponse.json({ error: "Image uploads aren't configured yet (R2 keys missing)." }, { status: 503 });

  const body = (await request.json().catch(() => null)) as { kind?: Kind; files?: FileReq[] } | null;
  const kind = body?.kind;
  const files = body?.files ?? [];
  if (!kind || !KINDS.includes(kind) || files.length < 1 || files.length > 2) {
    return NextResponse.json({ error: "Invalid upload request." }, { status: 400 });
  }
  for (const f of files) {
    if (!TYPES[f.contentType]) return NextResponse.json({ error: "Only WebP, JPEG or PNG images are allowed." }, { status: 415 });
    if (!(f.size > 0) || f.size > MAX_BYTES) return NextResponse.json({ error: "Image is too large (max 2.5 MB)." }, { status: 413 });
  }

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  if (ADMIN_ONLY.includes(kind)) {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", auth.user.id).maybeSingle();
    if (profile?.role !== "admin") return NextResponse.json({ error: "Admins only." }, { status: 403 });
  }

  // Chat photos live under the sender's own folder; admin uploads under their kind.
  const folder = kind === "chat" ? `chat/${auth.user.id}` : FOLDERS[kind];
  const id = crypto.randomUUID();
  const uploads = await Promise.all(
    files.map(async (f) => {
      const ext = TYPES[f.contentType];
      const key = `${folder}/${id}${f.variant === "thumb" ? "_thumb" : ""}.${ext}`;
      return { key, url: await presignPut(key, f.contentType), contentType: f.contentType };
    }),
  );
  return NextResponse.json({ uploads });
}
