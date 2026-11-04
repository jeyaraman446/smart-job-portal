// server/utils/emailService.js
const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST || 'smtp-relay.brevo.com';
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER || process.env.BREVO_USER;
  const pass = process.env.SMTP_PASS || process.env.BREVO_SMTP_KEY;

  if (user && pass) {
    transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
      tls: { rejectUnauthorized: false },
    });
  } else {
    // Development fallback: simulation transport
    transporter = {
      sendMail: async mailOptions => {
        console.log(`\n📧 [EMAIL DISPATCH SIMULATION]`);
        console.log(`To: ${mailOptions.to}`);
        console.log(`Subject: ${mailOptions.subject}`);
        console.log(`Text preview: ${(mailOptions.text || '').slice(0, 150)}...\n`);
        return { messageId: 'simulated-' + Date.now() };
      },
    };
  }

  return transporter;
}

const FROM_EMAIL = process.env.SMTP_FROM || process.env.BREVO_SENDER || 'noreply@smartjobportal.com';

// Generic safe sender that never throws to caller
async function sendSafeEmail({ to, subject, html, text }) {
  try {
    const t = getTransporter();
    return await t.sendMail({
      from: `"Smart Job Portal" <${FROM_EMAIL}>`,
      to,
      subject,
      html,
      text,
    });
  } catch (err) {
    console.warn(`Email delivery failed to ${to}:`, err.message);
    return null;
  }
}

// 1. Welcome Email
exports.sendWelcomeEmail = async ({ to, name, role }) => {
  const isCompany = role === 'company';
  const subject = `Welcome to Smart Job Portal, ${name}!`;
  const text = `Hello ${name},\n\nWelcome to Smart Job Portal. Your ${isCompany ? 'Company Employer' : 'Job Seeker'} account is now active.\n\nSign in to explore opportunities and intelligent resume matching.`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #2563eb; margin-top: 0;">⚡ Welcome to Smart Job Portal</h2>
      <p>Hello <strong>${name}</strong>,</p>
      <p>Thank you for joining Smart Job Portal as a <strong>${isCompany ? 'Verified Employer / Company' : 'Talented Candidate'}</strong>.</p>
      <p>${isCompany ? 'You can now publish job openings with custom requirements and review algorithmically ranked applicants.' : 'You can now complete your portfolio profile, browse verified vacancies, and apply with tailored resume matching scores.'}</p>
      <div style="margin: 24px 0;">
        <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/login" style="background: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
          Go to Your Portal Dashboard &rarr;
        </a>
      </div>
      <p style="color: #64748b; font-size: 13px;">Smart Job Portal &bull; Automated Talent Matching & Anti-Duplicate Platform</p>
    </div>
  `;
  return sendSafeEmail({ to, subject, html, text });
};

// 2. Application Received Email
exports.sendApplicationReceivedEmail = async ({ to, seekerName, jobTitle, companyName, matchScore }) => {
  const subject = `Application Received: ${jobTitle} at ${companyName}`;
  const text = `Hello ${seekerName},\n\nYour application for "${jobTitle}" at ${companyName} has been received.\nYour initial resume match score is: ${matchScore}%.\n\nYou will receive real-time notifications as your application progresses.`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #2563eb; margin-top: 0;">Application Submitted Successfully</h2>
      <p>Hello <strong>${seekerName}</strong>,</p>
      <p>Your application for <strong>${jobTitle}</strong> at <strong>${companyName}</strong> was successfully submitted.</p>
      <div style="background: #f8fafc; border-left: 4px solid #2563eb; padding: 16px; margin: 20px 0; border-radius: 4px;">
        <p style="margin: 0; font-size: 14px; color: #475569;">Smart Match Score:</p>
        <p style="margin: 4px 0 0; font-size: 28px; font-weight: bold; color: #2563eb;">${matchScore}%</p>
      </div>
      <p>The hiring team at ${companyName} has received your profile snapshot and resume. You will receive updates directly in the portal and via email.</p>
      <p style="color: #64748b; font-size: 13px;">Smart Job Portal &bull; Track status in My Applications</p>
    </div>
  `;
  return sendSafeEmail({ to, subject, html, text });
};

// 3. Interview Call / Shortlisted Email
exports.sendInterviewCallEmail = async ({ to, seekerName, jobTitle, companyName, interviewDetails, companyNote }) => {
  const subject = `Interview Call: ${jobTitle} at ${companyName}`;
  const mode = interviewDetails?.mode || 'Online / Remote';
  const dateStr = interviewDetails?.date ? new Date(interviewDetails.date).toLocaleDateString() : 'TBD';
  const timeStr = interviewDetails?.time || 'Scheduled with recruiter';
  const note = interviewDetails?.message || companyNote || 'We look forward to speaking with you!';

  const text = `Hello ${seekerName},\n\nCongratulations! ${companyName} has selected you for an interview for "${jobTitle}".\n\nInterview Details:\nMode: ${mode}\nDate: ${dateStr}\nTime: ${timeStr}\nMessage: ${note}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #10b981; border-radius: 8px;">
      <h2 style="color: #059669; margin-top: 0;">🎉 You Have an Interview Call!</h2>
      <p>Hello <strong>${seekerName}</strong>,</p>
      <p>We are pleased to inform you that <strong>${companyName}</strong> has shortlisted you for an interview for the <strong>${jobTitle}</strong> role.</p>
      <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 16px; border-radius: 6px; margin: 20px 0;">
        <h4 style="margin: 0 0 10px; color: #166534;">Interview Schedule</h4>
        <p style="margin: 4px 0;"><strong>Mode:</strong> ${mode}</p>
        <p style="margin: 4px 0;"><strong>Date:</strong> ${dateStr}</p>
        <p style="margin: 4px 0;"><strong>Time:</strong> ${timeStr}</p>
        <p style="margin: 8px 0 0; font-style: italic; color: #374151;">"${note}"</p>
      </div>
      <p>Log in to your portal dashboard to confirm or prepare for the conversation.</p>
      <p style="color: #64748b; font-size: 13px;">Smart Job Portal &bull; Candidate Notifications</p>
    </div>
  `;
  return sendSafeEmail({ to, subject, html, text });
};

// 4. Rejection with Auto-Generated Improvement Areas Email
exports.sendRejectionEmail = async ({ to, seekerName, jobTitle, companyName, rejectionReasons, companyNote, improvementSuggestions }) => {
  const subject = `Application Update: ${jobTitle} at ${companyName}`;
  const reasonsList = (rejectionReasons || []).map(r => `• ${r}`).join('\n');
  const text = `Hello ${seekerName},\n\nThank you for applying to "${jobTitle}" at ${companyName}.\nAfter reviewing applications, the hiring team has decided to proceed with other candidates whose profiles more closely matched their immediate requirements.\n\nKey Improvement Areas:\n${reasonsList}\n\n${companyNote ? `Note from company: ${companyNote}\n\n` : ''}Keep your skills updated and continue applying!`;

  const reasonsHtml = (rejectionReasons || [])
    .map(r => `<li style="margin-bottom: 6px; color: #334155;">${r}</li>`)
    .join('');

  const suggestionsHtml = (improvementSuggestions || [])
    .slice(0, 3)
    .map(s => `<li style="margin-bottom: 6px; color: #1e293b;"><strong>${s.category}:</strong> ${s.suggestion} <span style="color: #059669; font-size: 12px;">(+${s.pointsPossible} pts)</span></li>`)
    .join('');

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #475569; margin-top: 0;">Application Status Update</h2>
      <p>Hello <strong>${seekerName}</strong>,</p>
      <p>Thank you for your interest in the <strong>${jobTitle}</strong> position at <strong>${companyName}</strong>.</p>
      <p>While your background is appreciated, the team has decided to move forward with candidates whose qualifications more closely aligned with their specific criteria.</p>
      
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; border-radius: 6px; margin: 20px 0;">
        <h4 style="margin: 0 0 10px; color: #334155;">Actionable Feedback & Skill Areas to Improve:</h4>
        <ul style="margin: 0; padding-left: 20px;">
          ${reasonsHtml || '<li>Qualifications did not align closely with role requirements.</li>'}
        </ul>
        ${suggestionsHtml ? `
          <h4 style="margin: 14px 0 8px; color: #334155;">Suggestions to Boost Your Match Score:</h4>
          <ul style="margin: 0; padding-left: 20px;">
            ${suggestionsHtml}
          </ul>
        ` : ''}
      </div>

      ${companyNote ? `<p style="font-style: italic; color: #475569;"><strong>Note from company:</strong> "${companyNote}"</p>` : ''}
      
      <p>We encourage you to explore other openings on Smart Job Portal that match your strengths.</p>
      <p style="color: #64748b; font-size: 13px;">Smart Job Portal &bull; Continuous Improvement & Growth</p>
    </div>
  `;
  return sendSafeEmail({ to, subject, html, text });
};
