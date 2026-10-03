import { NextResponse, type NextRequest } from "next/server";
import { thumbKey } from "@/lib/images";
import { deleteObjects } from "@/lib/r2";
import { createRequestClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Admin-only: removes photos (and their thumbnails) that are no longer used. */
export async function POST(request: NextRequest) {
  const supabase = await createRequestClient(request);
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", auth.user.id).maybeSingle();
  if (profile?.role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { keys } = ((await request.json().catch(() => ({}))) ?? {}) as { keys?: unknown };
  const valid = (Array.isArray(keys) ? keys : [])
    .filter((k): k is string => typeof k === "string")
    // Never touch bundled samples, chat photos or anything outside our folders.
    .filter((k) => /^(products|categories|branding)\//.test(k) && !k.includes(".."))
    .slice(0, 50);
  const all = [...new Set(valid.flatMap((k) => [k, thumbKey(k)]))];
  await deleteObjects(all);
  return NextResponse.json({ deleted: all.length });
}
