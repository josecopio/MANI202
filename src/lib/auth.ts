import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import type { EmailConfig } from "next-auth/providers";
import { db } from "./db";
import { sendMail, EMAIL_FROM } from "./email";
import { magicLinkEmail } from "./email-templates";

/**
 * Email magic-link provider. The link is mailed through our own mailer (SMTP in
 * production, printed to the server console in development).
 */
const magicLink: EmailConfig = {
  id: "email",
  type: "email",
  name: "Email",
  from: EMAIL_FROM,
  maxAge: 24 * 60 * 60,
  options: {},
  async sendVerificationRequest({ identifier, url }) {
    await sendMail(magicLinkEmail(identifier, url));
  },
};

const adminEmails = (process.env.ADMIN_EMAILS || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  providers: [magicLink],
  session: { strategy: "database", maxAge: 30 * 24 * 60 * 60 },
  trustHost: process.env.AUTH_TRUST_HOST === "true" || process.env.NODE_ENV !== "production",
  pages: { signIn: "/signin", verifyRequest: "/signin/check-email", error: "/signin" },
  callbacks: {
    // With database sessions, Auth.js hands us the adapter's raw session (including the
    // sessionToken) and user row. Whatever we return is served to the browser by
    // /api/auth/session, so build the object explicitly instead of passing it through.
    session({ session, user }) {
      return {
        expires: session.expires,
        user: {
          id: user.id,
          email: user.email,
          name: user.name ?? null,
          image: user.image ?? null,
          role: user.role ?? "ORGANISER",
          organisation: user.organisation ?? null,
        },
      } as typeof session;
    },
  },
  events: {
    // Bootstrap: emails listed in ADMIN_EMAILS become admins when their account is first created
    // (which only happens after they proved ownership of the address through the magic link).
    async createUser({ user }) {
      if (user.id && user.email && adminEmails.includes(user.email.toLowerCase())) {
        await db.user.update({ where: { id: user.id }, data: { role: "ADMIN" } });
      }
    },
  },
});
