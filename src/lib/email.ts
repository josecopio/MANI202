import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { isDemoMode } from "./demo";

export type Mail = { to: string; subject: string; text: string; html: string };

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (!process.env.SMTP_HOST) return null;
  transporter ??= nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
  return transporter;
}

export const EMAIL_FROM = process.env.EMAIL_FROM || "CIUP Events <events@example.org>";

/**
 * Sends an email through SMTP. Without SMTP_HOST the message is printed to the server
 * console (development only; in production a missing SMTP configuration is an error).
 */
export async function sendMail(mail: Mail): Promise<void> {
  const t = getTransporter();
  if (!t) {
    if (process.env.NODE_ENV === "production" && !isDemoMode()) {
      throw new Error("SMTP is not configured (set SMTP_HOST, SMTP_USER, SMTP_PASS).");
    }
    console.log(
      [
        "",
        `──────────── EMAIL (${isDemoMode() ? "demo mode" : "dev"}: not sent, SMTP_HOST is empty) ────────────`,
        `To:      ${mail.to}`,
        `Subject: ${mail.subject}`,
        "",
        mail.text,
        "────────────────────────────────────────────────────────────────",
        "",
      ].join("\n"),
    );
    return;
  }
  await t.sendMail({ from: EMAIL_FROM, ...mail });
}

/** Never lets an email failure break the action that triggered it. */
export async function sendMailSafely(mail: Mail): Promise<boolean> {
  try {
    await sendMail(mail);
    return true;
  } catch (error) {
    console.error("[email] failed to send to", mail.to, error);
    return false;
  }
}
