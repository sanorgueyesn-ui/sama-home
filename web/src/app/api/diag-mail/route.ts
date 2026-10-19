import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const rawUser = process.env.SMTP_USER;
  const rawPass = process.env.SMTP_PASS;

  return NextResponse.json({
    hasSmtpUser: Boolean(rawUser),
    smtpUserVal: rawUser ? `${rawUser.slice(0, 4)}***@${rawUser.split("@")[1] || ""}` : "NON DÉFINI SUR VERCEL",
    hasSmtpPass: Boolean(rawPass),
    smtpPassLength: rawPass ? rawPass.length : 0,
    smtpPassTrimmedLength: rawPass ? rawPass.replace(/[\s"']/g, "").length : 0,
    databaseUrlDefined: Boolean(process.env.DATABASE_URL),
    vercelRegion: process.env.VERCEL_REGION || "local",
    timestamp: new Date().toISOString(),
  });
}
