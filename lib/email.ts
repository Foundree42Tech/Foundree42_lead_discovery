import { Resend } from "resend";

const resend  = new Resend(process.env.RESEND_API_KEY);
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const FROM    = "Foundree42 <noreply@foundree42.com>";

export async function sendVerificationEmail(to: string, token: string) {
  const url = `${APP_URL}/verify-email?token=${token}`;
  await resend.emails.send({
    from: FROM,
    to,
    subject: "Verify your Foundree42 account",
    html: emailShell("Verify your email", `
      <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#555;">
        Welcome to Foundree42. Click the button below to verify your email address and activate your account.
      </p>
      <a href="${url}" style="display:inline-block;background:#0071e3;color:#fff;font-size:14px;font-weight:600;text-decoration:none;padding:14px 28px;border-radius:12px;">
        Verify Email Address
      </a>
      <p style="margin:24px 0 0;font-size:12px;color:#999;">
        This link expires in 24 hours. If you didn't create an account, you can safely ignore this email.
      </p>
    `),
  });
}

export async function sendPasswordResetEmail(to: string, token: string) {
  const url = `${APP_URL}/reset-password?token=${token}`;
  await resend.emails.send({
    from: FROM,
    to,
    subject: "Reset your Foundree42 password",
    html: emailShell("Reset your password", `
      <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#555;">
        We received a request to reset your Foundree42 password. Click the button below to choose a new password.
      </p>
      <a href="${url}" style="display:inline-block;background:#0071e3;color:#fff;font-size:14px;font-weight:600;text-decoration:none;padding:14px 28px;border-radius:12px;">
        Reset Password
      </a>
      <p style="margin:24px 0 0;font-size:12px;color:#999;">
        This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email.
      </p>
    `),
  });
}

function emailShell(title: string, body: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f7;padding:40px 20px;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:18px;overflow:hidden;box-shadow:0 2px 20px rgba(0,0,0,.06);">
        <tr>
          <td style="padding:32px 40px 0;text-align:center;">
            <p style="margin:0 0 4px;font-size:10px;font-weight:600;letter-spacing:.15em;text-transform:uppercase;color:#86868b;">Foundree42</p>
            <h1 style="margin:0;font-size:22px;font-weight:700;color:#1d1d1f;">${title}</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 40px 36px;">
            ${body}
          </td>
        </tr>
        <tr>
          <td style="padding:20px 40px;border-top:1px solid #f0f0f0;text-align:center;">
            <p style="margin:0;font-size:11px;color:#aaa;">© ${new Date().getFullYear()} Foundree42 · US Salesforce Consulting</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
