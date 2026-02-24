"use server";

import { redirect } from "next/navigation";
import { clearSessionCookies } from "@/lib/auth/session";

/** Server action: clear both session cookies and redirect to /login. */
export async function logout() {
  await clearSessionCookies();
  redirect("/login");
}
