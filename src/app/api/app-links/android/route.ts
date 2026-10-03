import { NextResponse } from "next/server";

/**
 * Android App Links: served at /.well-known/assetlinks.json (see next.config.ts).
 * Set ANDROID_CERT_SHA256 to the app signing certificate fingerprint(s) from
 * `npx eas-cli credentials` or Google Play Console → App integrity (comma-separated).
 */
export function GET() {
  const fingerprints = (process.env.ANDROID_CERT_SHA256 ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const pkg = process.env.APP_BUNDLE_ID ?? "com.dms.shop";
  if (!fingerprints.length) return new NextResponse("Not configured", { status: 404 });
  return NextResponse.json([
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: { namespace: "android_app", package_name: pkg, sha256_cert_fingerprints: fingerprints },
    },
  ]);
}
