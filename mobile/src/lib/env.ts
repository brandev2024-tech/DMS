/** Public settings from `.env` / eas.json. Nothing secret lives in the app. */
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";
export const R2_PUBLIC_URL = (process.env.EXPO_PUBLIC_R2_PUBLIC_URL ?? "").replace(/\/$/, "");
/** The DMS website: product links, bundled sample photos and the upload route. */
export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? "").replace(/\/$/, "");
export const EAS_PROJECT_ID = process.env.EXPO_PUBLIC_EAS_PROJECT_ID ?? "";

export const isConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const productUrl = (slug: string) => `${API_URL}/product/${slug}`;
export const PRIVACY_URL = `${API_URL}/privacy`;
export const TERMS_URL = `${API_URL}/terms`;
