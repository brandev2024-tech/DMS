import { File } from "expo-file-system";
import { FileSystemUploadType, createUploadTask } from "expo-file-system/legacy";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { Platform } from "react-native";
import { API_URL } from "./env";
import { supabase } from "./supabase";

export type UploadKind = "product" | "category" | "branding" | "chat";
export type PickedImage = { uri: string; width: number; height: number };

/** Opens the camera or the photo library. Returns [] when cancelled or not allowed. */
export async function pickImages(source: "camera" | "library", multiple = false): Promise<PickedImage[]> {
  if (source === "camera") {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) throw new Error("Camera access is off. You can turn it on in your phone settings.");
    const res = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 1 });
    return res.canceled ? [] : res.assets.map(({ uri, width, height }) => ({ uri, width, height }));
  }
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsMultipleSelection: multiple,
    selectionLimit: multiple ? 10 : 1,
    orderedSelection: true,
    quality: 1,
  });
  return res.canceled ? [] : res.assets.map(({ uri, width, height }) => ({ uri, width, height }));
}

// WebP is smallest; iOS encodes JPEG more reliably, which is still ~200–400 KB at these sizes.
const FORMAT = Platform.OS === "android" ? SaveFormat.WEBP : SaveFormat.JPEG;
const MIME = FORMAT === SaveFormat.WEBP ? "image/webp" : "image/jpeg";

/**
 * Crops (catalog photos to the 4:5 card shape), resizes and compresses one photo.
 */
async function compress(img: PickedImage, maxSize: number, quality: number, crop45: boolean) {
  const ctx = ImageManipulator.manipulate(img.uri);
  let { width, height } = img;
  if (crop45 && width && height) {
    const target = 4 / 5;
    if (width / height > target) {
      const w = Math.round(height * target);
      ctx.crop({ originX: Math.round((width - w) / 2), originY: 0, width: w, height });
      width = w;
    } else if (width / height < target) {
      const h = Math.round(width / target);
      ctx.crop({ originX: 0, originY: Math.round((height - h) / 2), width, height: h });
      height = h;
    }
  }
  if (Math.max(width, height) > maxSize) {
    ctx.resize(width >= height ? { width: maxSize, height: null } : { width: null, height: maxSize });
  }
  const ref = await ctx.renderAsync();
  const out = await ref.saveAsync({ format: FORMAT, compress: quality });
  return { uri: out.uri, size: new File(out.uri).size, contentType: MIME };
}

async function authHeader() {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Please log in first.");
  return { Authorization: `Bearer ${token}` };
}

/**
 * Compresses the photo (+ a 600px thumbnail for catalog photos), asks the website for
 * presigned R2 URLs and uploads straight to R2. The R2 secret keys stay on the server.
 * Returns the R2 object key to save in the database.
 */
export async function uploadImage(kind: UploadKind, img: PickedImage, onProgress?: (fraction: number) => void): Promise<string> {
  const catalog = kind === "product" || kind === "category";
  const files = [await compress(img, 1600, 0.8, catalog)];
  if (catalog) files.push(await compress(img, 600, 0.75, true));

  const res = await fetch(`${API_URL}/api/uploads/presign`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeader()) },
    body: JSON.stringify({
      kind,
      files: files.map((f, i) => ({ contentType: f.contentType, size: f.size, variant: i === 0 ? "full" : "thumb" })),
    }),
  });
  const data = (await res.json().catch(() => ({}))) as { uploads?: { key: string; url: string; contentType: string }[]; error?: string };
  if (!res.ok || !data.uploads) throw new Error(data.error ?? "Upload failed.");

  const total = files.reduce((n, f) => n + f.size, 0) || 1;
  const sent = files.map(() => 0);
  await Promise.all(
    data.uploads.map(async (u, i) => {
      const task = createUploadTask(
        u.url,
        files[i].uri,
        { httpMethod: "PUT", uploadType: FileSystemUploadType.BINARY_CONTENT, headers: { "Content-Type": u.contentType } },
        (p) => {
          sent[i] = p.totalBytesSent;
          onProgress?.(Math.min(1, sent.reduce((a, b) => a + b, 0) / total));
        },
      );
      const result = await task.uploadAsync();
      if (!result || result.status >= 300) throw new Error("Upload to storage failed. Please try again.");
    }),
  );
  onProgress?.(1);
  return data.uploads[0].key;
}

/** Admin: remove photos from R2 that are no longer used (best effort, same route as the website). */
export async function deleteImages(keys: string[]) {
  const own = keys.filter((k) => !k.startsWith("demo/"));
  if (!own.length) return;
  fetch(`${API_URL}/api/uploads/delete`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeader()) },
    body: JSON.stringify({ keys: own }),
  }).catch(() => {});
}
