import { NextResponse } from "next/server";

/**
 * iOS universal links: served at /.well-known/apple-app-site-association (see next.config.ts)
 * so shared /product/… links open the DMS app when it's installed.
 * Set APPLE_TEAM_ID (Apple Developer → Membership) once the iOS app exists.
 */
export function GET() {
  const team = process.env.APPLE_TEAM_ID;
  const bundle = process.env.APP_BUNDLE_ID ?? "com.dms.shop";
  if (!team) return new NextResponse("Not configured", { status: 404 });
  return NextResponse.json({
    applinks: {
      details: [{ appIDs: [`${team}.${bundle}`], components: [{ "/": "/product/*", comment: "Product pages open in the app" }] }],
    },
  });
}
