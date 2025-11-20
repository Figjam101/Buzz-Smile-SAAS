const nodemailer = require('nodemailer');
let ResendClass = null;
try { ResendClass = require('resend').Resend; } catch (_) { ResendClass = null; }

function createTransporter() {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  const host = process.env.EMAIL_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.EMAIL_PORT || '465', 10);
  const secure = process.env.EMAIL_SECURE ? process.env.EMAIL_SECURE === 'true' : port === 465;

  if (!user || !pass) {
    throw new Error('Email credentials not configured');
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass }
  });
}

function resolveClientBase() {
  const override = process.env.PUBLIC_SITE_URL;
  if (override) return override.replace(/\/$/, '');
  const raw = process.env.CLIENT_URLS || process.env.CLIENT_URL || '';
  const list = raw.split(',').map(s => s.trim()).filter(Boolean);
  return (list[0] || 'http://localhost:3000').replace(/\/$/, '');
}

async function sendPasswordResetEmail(email, resetToken) {
  const base = resolveClientBase();
  const resetUrl = `${base}/reset-password?token=${resetToken}`;
  const fromEmail = process.env.EMAIL_FROM || process.env.EMAIL_USER;
  const fromName = process.env.EMAIL_FROM_NAME || 'Buzz Smile Media';
  const from = `${fromName} <${fromEmail}>`;
  const subject = 'Password Reset Request - Buzz Smile';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #4F46E5;">Password Reset Request</h2>
      <p>You requested to reset your password for your Buzz Smile account.</p>
      <p>Click the button below to reset your password:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetUrl}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">Reset Password</a>
      </div>
      <p>Or copy and paste this link into your browser:</p>
      <p style="word-break: break-all; color: #666;">${resetUrl}</p>
      <p><strong>This link will expire in 1 hour.</strong></p>
    </div>
  `;

  if (process.env.RESEND_API_KEY && ResendClass) {
    const resend = new ResendClass(process.env.RESEND_API_KEY);
    const result = await resend.emails.send({ from, to: email, subject, html });
    return result;
  }

  const transporter = createTransporter();
  const info = await transporter.sendMail({ from, to: email, subject, html });
  return info;
}

module.exports = { sendPasswordResetEmail };