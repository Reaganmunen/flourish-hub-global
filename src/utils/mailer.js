// src/utils/mailer.js
// Optional email notification for new enquiries. It only does anything when
// nodemailer is installed AND SMTP_HOST / SMTP_USER / SMTP_PASS / ENQUIRY_NOTIFY_TO
// are set. If not, enquiries are still saved and show up in the admin area.
// It never throws: a mail problem must not make a visitor's form fail.
let transporter = null;

function getTransporter() {
  if (transporter !== null) return transporter || null;
  try {
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      transporter = false;
      return null;
    }
    const nodemailer = require('nodemailer');
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    return transporter;
  } catch (_) {
    transporter = false;
    return null;
  }
}

async function notifyNewEnquiry(enquiry) {
  const to = process.env.ENQUIRY_NOTIFY_TO;
  const t = getTransporter();
  if (!t || !to) return;
  try {
    const lines = [
      `Type: ${enquiry.source}`,
      `Topic: ${enquiry.topic || '-'}`,
      `Name: ${enquiry.name || '-'}`,
      `Organisation: ${enquiry.organization || '-'}`,
      `Email: ${enquiry.email}`,
      `Phone: ${enquiry.phone || '-'}`,
      '',
      enquiry.message || '(no message)',
    ];
    await t.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      replyTo: enquiry.email,
      subject: `New FlourishHub ${enquiry.source} enquiry${enquiry.topic ? ': ' + enquiry.topic : ''}`,
      text: lines.join('\n'),
    });
  } catch (err) {
    console.error('Could not send enquiry notification:', err.message);
  }
}

module.exports = { notifyNewEnquiry };
