import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const to = searchParams.get("to") || "tawfekhsenegal221@gmail.com";

  const rawUser = process.env.SMTP_USER || "sanorgueye00@gmail.com";
  const rawPass = process.env.SMTP_PASS || "sxdfedgamqrvhukb";
  const host = (process.env.SMTP_HOST || "smtp.gmail.com").trim();
  const user = rawUser.trim();
  const pass = rawPass.replace(/[\s"']/g, "");

  const results: any[] = [];

  // Test 1: Service Gmail built-in
  try {
    const tService = nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass },
    });
    await tService.sendMail({
      from: `"SAMA HOME Test" <${user}>`,
      to,
      subject: "Test Diagnostic Service Gmail",
      text: "Test avec service: gmail depuis Vercel",
    });
    tService.close();
    results.push({ method: "service: gmail", success: true });
  } catch (err: any) {
    results.push({
      method: "service: gmail",
      success: false,
      error: err.message,
      code: err.code,
      command: err.command,
    });
  }

  // Test 2: Port 465 SSL standard
  try {
    const t465 = nodemailer.createTransport({
      host,
      port: 465,
      secure: true,
      auth: { user, pass },
    });
    await t465.sendMail({
      from: `"SAMA HOME Test" <${user}>`,
      to,
      subject: "Test Diagnostic Port 465",
      text: "Test avec port 465 depuis Vercel",
    });
    t465.close();
    results.push({ method: "port 465 (SSL)", success: true });
  } catch (err: any) {
    results.push({
      method: "port 465 (SSL)",
      success: false,
      error: err.message,
      code: err.code,
      command: err.command,
    });
  }

  // Test 3: Port 587 STARTTLS
  try {
    const t587 = nodemailer.createTransport({
      host,
      port: 587,
      secure: false,
      auth: { user, pass },
    });
    await t587.sendMail({
      from: `"SAMA HOME Test" <${user}>`,
      to,
      subject: "Test Diagnostic Port 587",
      text: "Test avec port 587 depuis Vercel",
    });
    t587.close();
    results.push({ method: "port 587 (STARTTLS)", success: true });
  } catch (err: any) {
    results.push({
      method: "port 587 (STARTTLS)",
      success: false,
      error: err.message,
      code: err.code,
      command: err.command,
    });
  }

  return NextResponse.json({
    envUser: user,
    passLength: pass.length,
    results,
  });
}
