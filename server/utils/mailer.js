const nodemailer = require('nodemailer');

/**
 * Generate a cryptographically strong 6-digit numerical OTP string
 */
function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Initialize nodemailer transporter prioritizing Brevo (Bravo) SMTP, Gmail, or Custom SMTP
 */
function getTransporterInfo() {
  // 1. Brevo (Bravo) SMTP Relay (smtp-relay.brevo.com:587)
  const brevoUser = process.env.BREVO_USER || process.env.BREVO_LOGIN;
  const brevoKey = process.env.BREVO_SMTP_KEY || process.env.BREVO_PASSWORD || process.env.BREVO_API_KEY;

  if (brevoUser && brevoKey) {
    const host = process.env.BREVO_HOST || 'smtp-relay.brevo.com';
    const port = Number(process.env.BREVO_PORT) || 587;
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user: brevoUser,
        pass: brevoKey,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    return {
      transporter,
      provider: 'Brevo (Bravo) SMTP Relay',
      host,
      fromEmail: process.env.BREVO_SENDER || process.env.FROM_EMAIL || brevoUser,
      fromName: process.env.FROM_NAME || 'SmartMatch Security (via Brevo)',
    };
  }

  // 2. Direct Gmail Service
  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD || process.env.GMAIL_PASS;

  if (gmailUser && gmailPass) {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: gmailPass,
      },
    });

    return {
      transporter,
      provider: 'Gmail SMTP',
      host: 'smtp.gmail.com',
      fromEmail: process.env.FROM_EMAIL || gmailUser,
      fromName: process.env.FROM_NAME || 'SmartMatch Security',
    };
  }

  // 3. Generic Custom SMTP Relay
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    const port = Number(process.env.SMTP_PORT) || 587;
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    return {
      transporter,
      provider: 'Custom SMTP Relay',
      host: process.env.SMTP_HOST,
      fromEmail: process.env.FROM_EMAIL || process.env.SMTP_USER,
      fromName: process.env.FROM_NAME || 'SmartMatch Security',
    };
  }

  return null;
}

/**
 * Public status checker for active SMTP provider
 */
function getSmtpStatus() {
  const info = getTransporterInfo();
  if (info) {
    return {
      configured: true,
      provider: info.provider,
      host: info.host,
    };
  }
  return {
    configured: false,
    provider: 'Simulation Mode (Configure Brevo/Gmail in .env)',
  };
}

/**
 * Enterprise HTML Email Layout Wrapper (Optimized for Brevo SMTP Delivery)
 */
function buildHtmlTemplate({ title, subtitle, name, roleBadge, bodyContent, otp, note }) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; }
    .wrapper { width: 100%; table-layout: fixed; background-color: #0f172a; padding: 40px 0; }
    .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.25); border: 1px solid #e2e8f0; }
    .header { background: linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%); padding: 40px 32px; text-align: center; color: #ffffff; }
    .brand-pill { display: inline-flex; align-items: center; gap: 8px; background: rgba(99, 102, 241, 0.15); border: 1px solid rgba(129, 140, 248, 0.35); padding: 6px 14px; border-radius: 9999px; margin-bottom: 12px; }
    .brand-pill span { color: #818cf8; font-size: 13px; font-weight: 700; letter-spacing: 0.5px; }
    .header h1 { margin: 8px 0 6px; font-size: 26px; font-weight: 800; letter-spacing: -0.5px; color: #ffffff; }
    .header p { margin: 0; color: #94a3b8; font-size: 14px; }
    .role-badge { display: inline-block; background: rgba(59, 130, 246, 0.2); border: 1px solid rgba(59, 130, 246, 0.4); color: #60a5fa; font-size: 12px; font-weight: 600; padding: 5px 14px; border-radius: 9999px; margin-top: 14px; }
    .content { padding: 38px 34px; background: #ffffff; }
    .greeting { font-size: 19px; font-weight: 700; margin-bottom: 16px; color: #0f172a; }
    .lead { font-size: 15px; line-height: 1.65; color: #334155; margin-bottom: 26px; }
    .otp-card { background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%); border: 2px dashed #94a3b8; border-radius: 14px; padding: 26px; text-align: center; margin: 30px 0; }
    .otp-label { font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; color: #475569; margin-bottom: 10px; }
    .otp-code { font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace; font-size: 42px; font-weight: 900; letter-spacing: 10px; color: #4338ca; margin: 0; line-height: 1; }
    .otp-expiry { font-size: 13px; color: #dc2626; margin-top: 10px; font-weight: 600; display: inline-flex; align-items: center; gap: 4px; }
    .security-box { background: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px 18px; border-radius: 0 10px 10px 0; font-size: 13px; color: #1e40af; line-height: 1.5; margin: 26px 0; }
    .smtp-tag { font-size: 11px; color: #64748b; text-align: center; margin-top: 18px; font-family: monospace; }
    .footer { background: #f8fafc; padding: 28px 34px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <div class="brand-pill">
          <span>⚡ SMARTMATCH TALENT PORTAL</span>
        </div>
        <h1>${title}</h1>
        <p>${subtitle}</p>
        ${roleBadge ? `<div class="role-badge">${roleBadge}</div>` : ''}
      </div>
      <div class="content">
        <div class="greeting">Hello ${name || 'User'},</div>
        <div class="lead">${bodyContent}</div>

        <div class="otp-card">
          <div class="otp-label">One-Time Verification Passcode</div>
          <div class="otp-code">${otp}</div>
          <div class="otp-expiry">⏱️ Valid for 10 minutes only</div>
        </div>

        <div class="security-box">
          🔒 <strong>Security Warning:</strong> Never disclose this one-time code to anyone. Our recruiting and administrative staff will never ask for your verification passcode.
        </div>

        ${note ? `<p style="font-size: 13px; color: #64748b; line-height: 1.5;">${note}</p>` : ''}
        <div class="smtp-tag">🛡️ Dispatched via Authenticated Brevo (Bravo) SMTP Gateway</div>
      </div>
      <div class="footer">
        <p><strong>Smart Job Portal Inc.</strong> • Enterprise Multi-Factor Matching & Verification</p>
        <p>This automated message was sent to your registered address via Brevo SMTP Relay. Please do not reply directly.</p>
      </div>
    </div>
  </div>
</body>
</html>
`;
}

/**
 * Dispatch Account Verification OTP Email
 */
async function sendVerificationEmail({ to, name, otp, role }) {
  const roleLabel = role === 'hr' ? '🏢 Verified Corporate Employer Account' : '👤 Candidate / Job Seeker Account';
  const roleDesc = role === 'hr'
    ? 'Thank you for registering your company hiring profile. To activate your recruiter dashboard, submit corporate ID credentials, and post vacancies, please verify your official work email using the one-time passcode below:'
    : 'Welcome to Smart Job Portal! To complete your candidate registration and activate multi-factor resume matching against verified employer vacancies, please verify your email address with the passcode below:';

  const html = buildHtmlTemplate({
    title: 'Verify Your Email Address',
    subtitle: 'Account Verification & Authentication',
    name,
    roleBadge: roleLabel,
    bodyContent: roleDesc,
    otp,
    note: 'Enter this 6-digit code on the portal verification screen to activate your account.',
  });

  const subject = `🔐 [${otp}] Verify your Smart Job Portal account`;
  return sendMail({ to, subject, html, text: `Your Smart Job Portal verification OTP is ${otp}. Valid for 10 minutes.` });
}

/**
 * Dispatch Password Reset OTP Email
 */
async function sendPasswordResetEmail({ to, name, otp }) {
  const html = buildHtmlTemplate({
    title: 'Reset Your Password',
    subtitle: 'Security & Account Recovery',
    name,
    roleBadge: '🔑 Password Recovery Request',
    bodyContent: 'We received an authorized request to reset the password for your Smart Job Portal account. Enter the 6-digit recovery passcode below to securely set your new password:',
    otp,
    note: 'If you did not request this password reset, your credentials remain secure and you can safely disregard this message.',
  });

  const subject = `🔑 [${otp}] Smart Job Portal Password Reset Code`;
  return sendMail({ to, subject, html, text: `Your password reset OTP is ${otp}. Valid for 10 minutes.` });
}

/**
 * Core sendMail routine with Brevo SMTP, Gmail, and fallback support
 */
async function sendMail({ to, subject, html, text }) {
  const info = getTransporterInfo();

  if (info && info.transporter) {
    const from = `"${info.fromName}" <${info.fromEmail}>`;
    try {
      const result = await info.transporter.sendMail({
        from,
        to,
        subject,
        text,
        html,
      });
      console.log(`📧 [${info.provider} DISPATCHED] Message sent to ${to} (MessageID: ${result.messageId})`);
      return { success: true, messageId: result.messageId, provider: info.provider };
    } catch (err) {
      console.error(`❌ [${info.provider} ERROR] Failed to send email to ${to}: ${err.message}`);
      throw new Error(`Email dispatch failed via ${info.provider}: ${err.message}. Please verify your SMTP settings in server/.env.`);
    }
  }

  // Local/Dev Simulation Output if no SMTP configured yet
  console.warn(`\n⚠️ [SMTP NOT CONFIGURED] Real email could not be dispatched because Brevo / Gmail credentials are not set in server/.env.`);
  console.log(`======================================================`);
  console.log(`📨 [MAIL DISPATCH SIMULATION]`);
  console.log(`To:       ${to}`);
  console.log(`Subject:  ${subject}`);
  console.log(`Content:  ${text}`);
  console.log(`------------------------------------------------------`);
  console.log(`To send live emails via Brevo (Bravo) SMTP:`);
  console.log(`1. Add BREVO_USER=your_brevo_account_email to server/.env`);
  console.log(`2. Add BREVO_SMTP_KEY=xsmtpsib-... to server/.env`);
  console.log(`======================================================\n`);

  return { success: true, mode: 'simulation' };
}

module.exports = {
  generateOtp,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendMail,
  getSmtpStatus,
};
