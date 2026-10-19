import "server-only";
import nodemailer from "nodemailer";

interface SendOtpEmailParams {
  to: string;
  code: string;
  establishmentName: string;
}

export async function sendOtpEmail({
  to,
  code,
  establishmentName,
}: SendOtpEmailParams): Promise<{ success: boolean; simulated: boolean; error?: string }> {
  const smtpUser = process.env.SMTP_USER || "samahome221@gmail.com";
  const smtpPass = process.env.SMTP_PASS;
  const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
  const smtpPort = Number(process.env.SMTP_PORT || "465");
  const isSecure = smtpPort === 465;

  // Log systématique en console pour le dev local et l'observabilité
  console.log(`\n========================================================`);
  console.log(`📬 [SAMA HOME] CODE DE VÉRIFICATION OTP`);
  console.log(`   Destinataire : ${to}`);
  console.log(`   Établissement : ${establishmentName}`);
  console.log(`   👉 CODE OTP : ${code}`);
  console.log(`========================================================\n`);

  if (!smtpPass) {
    console.warn(
      `[SAMA HOME MAIL] SMTP_PASS non configuré. Mode simulation actif (le code est affiché ci-dessus).`,
    );
    return { success: true, simulated: true };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: isSecure,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
            .card { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 32px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
            .logo { font-size: 22px; font-weight: 900; color: #0f172a; letter-spacing: -0.5px; }
            .orange { color: #f97316; }
            .badge { display: inline-block; background: #fef3c7; color: #92400e; font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 9999px; text-transform: uppercase; margin-top: 12px; }
            .title { font-size: 20px; font-weight: 800; margin: 20px 0 8px 0; color: #0f172a; }
            .text { font-size: 14px; color: #475569; line-height: 1.6; margin: 0 0 20px 0; }
            .code-box { background: #f1f5f9; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0; }
            .code { font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #0f172a; font-family: monospace; }
            .warning { font-size: 12px; color: #64748b; text-align: center; }
            .footer { margin-top: 32px; padding-top: 20px; border-top: 1px solid #f1f5f9; font-size: 11px; color: #94a3b8; text-align: center; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="logo">SAMA<span class="orange"> HOME</span></div>
            <div class="badge">Vérification de sécurité</div>
            <h1 class="title">Votre code de confirmation</h1>
            <p class="text">
              Bonjour, vous avez initié la création d'un espace pour <strong>${establishmentName}</strong> sur SAMA HOME.
              Veuillez saisir le code ci-dessous pour vérifier votre adresse e-mail :
            </p>
            <div class="code-box">
              <div class="code">${code}</div>
            </div>
            <p class="warning">
              ⏳ Ce code est valable pendant <strong>15 minutes</strong>. Ne le partagez avec personne.
            </p>
            <div class="footer">
              Cet e-mail a été envoyé automatiquement par SAMA HOME (<a href="mailto:${smtpUser}">${smtpUser}</a>). Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet e-mail.
            </div>
          </div>
        </body>
      </html>
    `;

    await transporter.sendMail({
      from: `"SAMA HOME" <${smtpUser}>`,
      to,
      subject: `${code} est votre code de confirmation SAMA HOME`,
      text: `Votre code de confirmation SAMA HOME pour ${establishmentName} est : ${code}. Valable 15 minutes.`,
      html: htmlContent,
    });

    console.log(`[SAMA HOME MAIL] E-mail envoyé avec succès à ${to}`);
    return { success: true, simulated: false };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[SAMA HOME MAIL] Erreur lors de l'envoi SMTP :`, errorMsg);
    // En cas d'échec SMTP, on garde le code valide pour ne pas bloquer l'utilisateur
    return { success: true, simulated: true, error: errorMsg };
  }
}

interface SendPasswordResetEmailParams {
  to: string;
  code: string;
  name?: string;
}

export async function sendPasswordResetEmail({
  to,
  code,
  name,
}: SendPasswordResetEmailParams): Promise<{ success: boolean; simulated: boolean; error?: string }> {
  const smtpUser = process.env.SMTP_USER || "samahome221@gmail.com";
  const smtpPass = process.env.SMTP_PASS;
  const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
  const smtpPort = Number(process.env.SMTP_PORT || "465");
  const isSecure = smtpPort === 465;

  // Log systématique en console pour le dev local et l'observabilité
  console.log(`\n========================================================`);
  console.log(`🔑 [SAMA HOME] CODE DE RÉINITIALISATION DU MOT DE PASSE`);
  console.log(`   Destinataire : ${to}`);
  console.log(`   Utilisateur  : ${name || "Utilisateur"}`);
  console.log(`   👉 CODE OTP  : ${code}`);
  console.log(`========================================================\n`);

  if (!smtpPass) {
    console.warn(
      `[SAMA HOME MAIL] SMTP_PASS non configuré. Mode simulation actif (le code est affiché ci-dessus).`,
    );
    return { success: true, simulated: true };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: isSecure,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    const displayName = name ? `Bonjour ${name},` : "Bonjour,";

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
            .card { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 32px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
            .logo { font-size: 22px; font-weight: 900; color: #0f172a; letter-spacing: -0.5px; }
            .orange { color: #f97316; }
            .badge { display: inline-block; background: #fee2e2; color: #991b1b; font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 9999px; text-transform: uppercase; margin-top: 12px; }
            .title { font-size: 20px; font-weight: 800; margin: 20px 0 8px 0; color: #0f172a; }
            .text { font-size: 14px; color: #475569; line-height: 1.6; margin: 0 0 20px 0; }
            .code-box { background: #0f172a; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0; }
            .code { font-size: 38px; font-weight: 900; letter-spacing: 10px; color: #f97316; font-family: monospace; }
            .warning { font-size: 12px; color: #64748b; line-height: 1.5; background: #f8fafc; padding: 14px; border-radius: 8px; border-left: 3px solid #f97316; margin-top: 20px; }
            .footer { margin-top: 32px; padding-top: 20px; border-top: 1px solid #f1f5f9; font-size: 11px; color: #94a3b8; text-align: center; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="logo">SAMA<span class="orange"> HOME</span></div>
            <div class="badge">Sécurité du compte</div>
            <h1 class="title">Réinitialisation de votre mot de passe</h1>
            <p class="text">
              ${displayName} vous avez demandé la réinitialisation de votre mot de passe pour accéder à votre espace SAMA HOME.
              Saisissez le code de confirmation sécurisé ci-dessous :
            </p>
            <div class="code-box">
              <div class="code">${code}</div>
            </div>
            <div class="warning">
              ⏳ Ce code est valable pendant <strong>15 minutes</strong>.<br>
              🔒 <strong>Sécurité :</strong> Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet e-mail. Votre mot de passe actuel reste inchangé et sécurisé.
            </div>
            <div class="footer">
              Cet e-mail automatique a été envoyé par la plateforme SAMA HOME (<a href="mailto:${smtpUser}">${smtpUser}</a>).
            </div>
          </div>
        </body>
      </html>
    `;

    await transporter.sendMail({
      from: `"SAMA HOME Sécurité" <${smtpUser}>`,
      to,
      subject: `${code} est votre code de réinitialisation SAMA HOME`,
      text: `Bonjour, votre code de réinitialisation SAMA HOME est : ${code}. Valable 15 minutes. Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.`,
      html: htmlContent,
    });

    console.log(`[SAMA HOME MAIL] E-mail de réinitialisation envoyé avec succès à ${to}`);
    return { success: true, simulated: false };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[SAMA HOME MAIL] Erreur lors de l'envoi SMTP :`, errorMsg);
    return { success: true, simulated: true, error: errorMsg };
  }
}
