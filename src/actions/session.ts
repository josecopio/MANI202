"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { signIn, signOut } from "@/lib/auth";
import { LOCALE_COOKIE } from "@/lib/i18n/server";
import { isLocale, type Locale } from "@/lib/types";
import { isEmail } from "@/lib/validation";

export async function setLocaleAction(locale: Locale): Promise<void> {
  if (!isLocale(locale)) return;
  (await cookies()).set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  revalidatePath("/", "layout");
}

export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: "/" });
}

export type SignInState = { error?: "email_invalid" | "failed" };

/** Sends the magic link, then redirects to the "check your inbox" page. */
export async function signInAction(_prev: SignInState, formData: FormData): Promise<SignInState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const callbackUrl = String(formData.get("callbackUrl") ?? "/");
  if (!isEmail(email)) return { error: "email_invalid" };
  // Only allow same-site relative redirects.
  const redirectTo = callbackUrl.startsWith("/") && !callbackUrl.startsWith("//") ? callbackUrl : "/";
  try {
    await signIn("email", { email, redirectTo, redirect: false });
  } catch (error) {
    console.error("[auth] sign-in email failed", error);
    return { error: "failed" };
  }
  redirect("/signin/check-email");
}
