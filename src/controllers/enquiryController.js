// src/controllers/enquiryController.js
const enquiryModel = require('../models/enquiryModel');
const { notifyNewEnquiry } = require('../utils/mailer');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SOURCES = ['contact', 'partner', 'newsletter'];
const STATUSES = ['new', 'read', 'replied'];

function clip(value, max) {
  return String(value || '').trim().slice(0, max);
}

/** Public: contact form, partnership enquiries and newsletter sign-ups. */
async function submit(req, res) {
  // Honeypot: real visitors never see or fill this field. Pretend success to bots.
  if (req.body.website) return res.status(201).json({ message: 'Thank you' });

  const source = SOURCES.includes(req.body.source) ? req.body.source : 'contact';
  const email = clip(req.body.email, 200).toLowerCase();
  const name = clip(req.body.name, 150);
  const message = clip(req.body.message, 5000);

  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'Please enter a valid email address' });
  if (source !== 'newsletter') {
    if (!name) return res.status(400).json({ error: 'Please tell us your name' });
    if (message.length < 5) return res.status(400).json({ error: 'Please include a short message' });
    if (!req.body.consent) return res.status(400).json({ error: 'Please confirm that we may contact you about your enquiry' });
  }

  const enquiry = await enquiryModel.create({
    name, email, message, source,
    organization: clip(req.body.organization, 200),
    phone: clip(req.body.phone, 50),
    topic: clip(req.body.topic, 120),
    consent: source === 'newsletter' ? true : !!req.body.consent,
  });
  notifyNewEnquiry(enquiry); // fire and forget
  res.status(201).json({ message: 'Thank you' });
}

async function list(req, res) {
  const { status, source, page, pageSize } = req.query;
  const enquiries = await enquiryModel.list({
    status: STATUSES.includes(status) ? status : undefined,
    source: SOURCES.includes(source) ? source : undefined,
    page: Math.max(Number(page) || 1, 1),
    pageSize: Math.min(Number(pageSize) || 30, 100),
  });
  const newCount = await enquiryModel.countNew();
  res.json({ enquiries, newCount });
}

async function updateStatus(req, res) {
  const { status } = req.body;
  if (!STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status' });
  const enquiry = await enquiryModel.updateStatus(req.params.id, status);
  if (!enquiry) return res.status(404).json({ error: 'Enquiry not found' });
  res.json({ enquiry });
}

async function remove(req, res) {
  const enquiry = await enquiryModel.remove(req.params.id);
  if (!enquiry) return res.status(404).json({ error: 'Enquiry not found' });
  res.json({ message: 'Deleted' });
}

module.exports = { submit, list, updateStatus, remove };
