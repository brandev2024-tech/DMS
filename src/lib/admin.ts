import "server-only";

import { redirect } from "next/navigation";
import { getCurrentUser } from "./data";

/** Server-side guard for every /admin route. */
export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin");
  if (user.profile?.role !== "admin") redirect("/?error=not-admin");
  return user;
}
