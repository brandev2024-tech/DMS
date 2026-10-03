import "server-only";

import { AwsClient } from "aws4fetch";

/**
 * Cloudflare R2 (S3-compatible API) for the "dms-images" bucket.
 * Server-only: the secret keys never reach the browser.
 */
function config() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET ?? "dms-images";
  if (!accountId || !accessKeyId || !secretAccessKey) return null;
  return {
    bucket,
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    client: new AwsClient({ accessKeyId, secretAccessKey, service: "s3", region: "auto" }),
  };
}

export const isR2Configured = () => config() !== null;

function objectUrl(endpoint: string, bucket: string, key: string) {
  return `${endpoint}/${bucket}/${key.split("/").map(encodeURIComponent).join("/")}`;
}

/** A PUT URL the browser can upload one file to, valid for `expiresIn` seconds. */
export async function presignPut(key: string, contentType: string, expiresIn = 300) {
  const c = config();
  if (!c) throw new Error("R2 is not configured");
  const url = new URL(objectUrl(c.endpoint, c.bucket, key));
  url.searchParams.set("X-Amz-Expires", String(expiresIn));
  const signed = await c.client.sign(new Request(url, { method: "PUT", headers: { "Content-Type": contentType } }), {
    aws: { signQuery: true },
  });
  return signed.url;
}

export async function deleteObjects(keys: string[]) {
  const c = config();
  if (!c) return;
  await Promise.all(
    keys.map((key) => c.client.fetch(objectUrl(c.endpoint, c.bucket, key), { method: "DELETE" }).catch(() => null)),
  );
}
