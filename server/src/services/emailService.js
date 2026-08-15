'use strict'

const path = require('path')
const nodemailer = require('nodemailer')
const env = require('../config/env')
const logger = require('../lib/logger').child({ service: 'email' })

// Public URL for the ASM logo used in emails.
// Gmail and most email clients load images from a public HTTPS URL.
// Set LOGO_URL in your .env to override (e.g. your CDN or deployed domain).
const LOGO_URL =
  env.LOGO_URL ||
  'https://raw.githubusercontent.com/nikhilmahato26/amscoins/feat/backend/amscoins/client/public/asm.png'

// In tests use a JSON transport so nothing is actually sent over SMTP.
const transport =
  process.env.NODE_ENV === 'test'
    ? nodemailer.createTransport({ jsonTransport: true })
    : nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_PORT === 465,
        auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
      })

const formatInrPrefix = (paise) => `INR ${(paise / 100).toLocaleString('en-IN')}`
const formatInrSuffix = (paise) => `${(paise / 100).toLocaleString('en-IN')} INR`

/** Format a Date as "YYYY-MM-DD hh:mm:ss AM/PM IST" */
function fmtDate(d) {
  const dt = d instanceof Date ? d : new Date(d || Date.now())
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    }).formatToParts(dt)

    const p = {}
    for (const part of parts) {
      p[part.type] = part.value
    }
    const ampm = (p.dayPeriod || '').toUpperCase()
    return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}:${p.second} ${ampm} IST`
  } catch {
    return dt.toISOString()
  }
}

/** Formats reference number as ASM + YYYYMMDDHHmmss */
function fmtRefNumber(w, dateObj) {
  if (w.ref) return String(w.ref)
  const dt = dateObj instanceof Date ? dateObj : new Date(dateObj || Date.now())
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).formatToParts(dt)
    const p = {}
    for (const part of parts) {
      p[part.type] = part.value
    }
    return `ASM${p.year}${p.month}${p.day}${p.hour}${p.minute}${p.second}`
  } catch {
    return `ASM${Date.now()}`
  }
}

/**
 * Generate a deterministic 8-char anti-phishing code from the user's _id.
 */
function antiPhishingCode(userId) {
  const hex = String(userId || 'ASMUSER')
  let h = 0
  for (let i = 0; i < hex.length; i++) {
    h = (Math.imul(31, h) + hex.charCodeAt(i)) | 0
  }
  return Math.abs(h).toString(36).toUpperCase().slice(0, 8).padStart(8, '0')
}

function formatAccount(upiId) {
  if (!upiId) return 'bank account'
  if (upiId.includes('@')) {
    const parts = upiId.split('@')
    const masked = parts[0].length > 4 ? '****' + parts[0].slice(-4) : parts[0]
    return `UPI ID (${masked}@${parts[1]})`
  }
  const last4 = upiId.slice(-4)
  return `INDUSIND BANK account ending with (********${last4})`
}

// ---------------------------------------------------------------------------
// Shared layout shell (White top header + Tagline + Green divider + Badges + Greeting)
// ---------------------------------------------------------------------------
/**
 * NOTE: The anti-phishing code is a deterministic hash of the user's MongoDB _id.
 * It is displayed in every email so users can spot spoofed emails that don't know
 * their personal code. To allow users to verify it on the website, consider storing
 * it in the User model (e.g. user.antiPhishingCode).
 */
function emailShell(userId, bodyHtml) {
  const code = antiPhishingCode(userId)
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>ASM Coins</title>
</head>
<body style="margin:0;padding:0;background-color:#0d0d0d;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0d0d0d;padding:24px 12px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#121212;border-radius:12px;overflow:hidden;border:1px solid #222222;box-shadow:0 8px 24px rgba(0,0,0,0.5);">

          <!-- ── Header: White Banner ── -->
          <tr>
            <td style="background-color:#ffffff;padding:16px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <!-- Brand Logo & Tagline -->
                  <td align="left" style="vertical-align:middle;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="vertical-align:middle;padding-right:10px;">
                          <!-- ASM logo from public URL -->
                          <img src="${LOGO_URL}"
                               alt="ASM Coins"
                               width="40" height="40"
                               style="display:block;border-radius:50%;object-fit:cover;" />
                        </td>
                        <td style="vertical-align:middle;">
                          <div style="font-size:22px;font-weight:900;letter-spacing:0.5px;color:#0b3d1b;font-family:Arial,sans-serif;line-height:1.1;">ASM <span style="color:#16a34a;">COINS</span></div>
                          <div style="font-size:10px;color:#4b5563;font-weight:500;margin-top:2px;letter-spacing:0.2px;">Smart Investing, Bigger Future</div>
                        </td>
                      </tr>
                    </table>
                  </td>

                  <!-- Anti-Phishing Code -->
                  <td align="right" style="vertical-align:middle;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding-right:8px;font-size:12px;font-weight:600;color:#222222;white-space:nowrap;">Anti-Phishing Code:</td>
                        <td>
                          <div style="border:1.5px solid #16a34a;border-radius:4px;padding:4px 10px;font-size:14px;font-weight:700;letter-spacing:1.5px;color:#16a34a;background-color:#ffffff;text-align:center;">
                            ${code}
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ── Green Accent Divider ── -->
          <tr>
            <td style="height:3px;background-color:#22c55e;line-height:3px;font-size:0;">&nbsp;</td>
          </tr>

          <!-- ── Email Body (Dark) ── -->
          <tr>
            <td style="padding:28px 24px 20px 24px;color:#d1d5db;font-size:14px;line-height:1.65;">
              ${bodyHtml}
            </td>
          </tr>

          <!-- ── Trust Badges & Website ── -->
          <tr>
            <td style="padding:16px 20px;border-top:1px solid #222222;background-color:#0c0c0c;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <!-- Secure -->
                  <td align="center" width="25%" style="text-align:center;padding:2px;">
                    <table cellpadding="0" cellspacing="0" align="center">
                      <tr>
                        <td style="vertical-align:middle;padding-right:4px;">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
                        </td>
                        <td align="left" style="vertical-align:middle;">
                          <div style="color:#e5e7eb;font-size:11px;font-weight:700;line-height:1.1;">Secure</div>
                          <div style="color:#6b7280;font-size:9px;line-height:1.1;">100% Protected</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <!-- Fast & Reliable -->
                  <td align="center" width="25%" style="text-align:center;padding:2px;">
                    <table cellpadding="0" cellspacing="0" align="center">
                      <tr>
                        <td style="vertical-align:middle;padding-right:4px;">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
                        </td>
                        <td align="left" style="vertical-align:middle;">
                          <div style="color:#e5e7eb;font-size:11px;font-weight:700;line-height:1.1;">Fast &amp; Reliable</div>
                          <div style="color:#6b7280;font-size:9px;line-height:1.1;">24/7 Support</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <!-- Trusted -->
                  <td align="center" width="25%" style="text-align:center;padding:2px;">
                    <table cellpadding="0" cellspacing="0" align="center">
                      <tr>
                        <td style="vertical-align:middle;padding-right:4px;">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                        </td>
                        <td align="left" style="vertical-align:middle;">
                          <div style="color:#e5e7eb;font-size:11px;font-weight:700;line-height:1.1;">Trusted</div>
                          <div style="color:#6b7280;font-size:9px;line-height:1.1;">By Thousands</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <!-- Domain -->
                  <td align="center" width="25%" style="text-align:center;padding:2px;">
                    <table cellpadding="0" cellspacing="0" align="center">
                      <tr>
                        <td style="vertical-align:middle;padding-right:4px;">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                        </td>
                        <td align="left" style="vertical-align:middle;">
                          <a href="https://www.asmcoins.com" target="_blank" style="color:#22c55e;font-size:11px;text-decoration:none;font-weight:600;">www.asmcoins.com</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ── Farewell Greeting Footer ── -->
          <tr>
            <td align="center" style="padding:14px 20px;background-color:#080808;border-top:1px solid #1a1a1a;color:#9ca3af;font-size:12px;">
              &#x1F389; Thank you for choosing <span style="color:#22c55e;font-weight:600;">ASM Coins</span>. Happy Trading! &#x1F680;
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

async function sendMail({ to, subject, html }) {
  try {
    logger.info('Sending email', { to, subject })
    return await transport.sendMail({ from: env.MAIL_FROM, to, subject, html })
  } catch (e) {
    // A mail failure must never roll back a wallet transaction.
    logger.error('Email send failed', { to, subject, error: e.message })
    return null
  }
}

// ---------------------------------------------------------------------------
// 1. Withdrawal Initiated
// Subject: "Withdrawal for INR 5000 initiated"
// ---------------------------------------------------------------------------
const withdrawalInitiated = (user, w) => {
  const inrAmountPrefix = formatInrPrefix(w.gross)
  const inrNetSuffix = formatInrSuffix(w.net || w.gross) // net = gross - TDS
  const tdsSuffix = formatInrSuffix(w.tds || 0)
  const dateStr = fmtDate(w.initiatedAt || w.createdAt || new Date())
  const accountText = formatAccount(w.upiId)

  const body = `
    <p style="margin:0 0 16px 0;font-size:15px;color:#e5e7eb;">
      Hello <span style="color:#22c55e;font-weight:600;">${user.name}</span>,
    </p>

    <p style="margin:0 0 16px 0;font-size:14px;color:#d1d5db;line-height:1.6;">
      Your withdrawal request for <strong>${inrAmountPrefix}</strong> to your ${accountText} has been successfully placed on <span style="color:#22c55e;">${dateStr}</span>.
    </p>

    <p style="margin:0 0 16px 0;font-size:14px;color:#9ca3af;line-height:1.6;">
      All Withdrawals are processed with manual review. We try to complete all withdrawals in less than 24 hours.
    </p>

    <p style="margin:0 0 20px 0;font-size:14px;color:#d1d5db;line-height:1.6;">
      We will update you once the withdrawal request is successfully processed.
    </p>

    <!-- Table -->
    <table width="100%" cellpadding="0" cellspacing="0"
           style="background-color:#161616;border:1px solid #282828;border-radius:8px;overflow:hidden;margin:20px 0;">
      <tr>
        <td style="padding:11px 16px;border-bottom:1px solid #232323;border-right:1px solid #232323;color:#d1d5db;font-size:14px;width:35%;">Amount</td>
        <td style="padding:11px 16px;border-bottom:1px solid #232323;color:#22c55e;font-size:14px;font-weight:700;">${inrNetSuffix}</td>
      </tr>
      <tr>
        <td style="padding:11px 16px;border-bottom:1px solid #232323;border-right:1px solid #232323;color:#d1d5db;font-size:14px;">TDS (5%)</td>
        <td style="padding:11px 16px;border-bottom:1px solid #232323;color:#ffffff;font-size:14px;">${tdsSuffix}</td>
      </tr>
      <tr>
        <td style="padding:11px 16px;border-right:1px solid #232323;color:#d1d5db;font-size:14px;">Date</td>
        <td style="padding:11px 16px;color:#ffffff;font-size:14px;">${dateStr}</td>
      </tr>
    </table>

    <p style="margin:24px 0 18px 0;font-size:13px;color:#9ca3af;line-height:1.6;">
      Please raise a support ticket in case of any concerns <a href="${env.FRONTEND_URL}/support" style="color:#22c55e;text-decoration:underline;">here</a>. We will sort out the issue on highest priority.
    </p>

    <p style="margin:0;font-size:14px;color:#e5e7eb;line-height:1.6;">
      Thank You,<br/>
      Team <span style="color:#22c55e;font-weight:600;">ASM Coins</span>
    </p>
  `

  return sendMail({
    to: user.email,
    subject: `Withdrawal for ${inrAmountPrefix} initiated`,
    html: emailShell(user._id, body),
  })
}

// ---------------------------------------------------------------------------
// 2. Withdrawal Completed / Successful
// Subject: "Withdrawal of INR 5000 successfully processed"
// ---------------------------------------------------------------------------
const withdrawalCompleted = (user, w) => {
  const inrAmountPrefix = formatInrPrefix(w.gross)
  const inrNetSuffix = formatInrSuffix(w.net || w.gross) // net = gross - TDS
  const tdsSuffix = formatInrSuffix(w.tds || 0)
  const dateObj = w.completedAt || w.updatedAt || new Date()
  const dateStr = fmtDate(dateObj)
  const accountText = formatAccount(w.upiId)
  const refNumber = fmtRefNumber(w, dateObj)

  const body = `
    <!-- Celebration Hero Section -->
    <div style="text-align:center;margin:4px 0 24px 0;">
      <svg width="260" height="66" viewBox="0 0 260 66" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:inline-block;max-width:100%;">
        <!-- Confetti left -->
        <circle cx="30" cy="18" r="3" fill="#22c55e"/>
        <circle cx="55" cy="10" r="2.5" fill="#f59e0b"/>
        <circle cx="75" cy="26" r="3" fill="#ffffff"/>
        <circle cx="45" cy="42" r="2" fill="#22c55e"/>
        <!-- Star left -->
        <path d="M85 36L86.8 40.4L91.5 40.8L87.9 43.9L89 48.5L85 46L81 48.5L82.1 43.9L78.5 40.8L83.2 40.4L85 36Z" fill="#f59e0b"/>
        <path d="M40 26L41.2 29L44.5 29.3L42 31.5L42.8 34.7L40 33L37.2 34.7L38 31.5L35.5 29.3L38.8 29L40 26Z" fill="#fbbf24"/>
        <!-- Streamer left -->
        <path d="M50 20C46 26 58 33 52 46" stroke="#fbbf24" stroke-width="2.5" stroke-linecap="round" fill="none"/>
        <path d="M68 13C64 18 72 24 67 34" stroke="#22c55e" stroke-width="2" stroke-linecap="round" fill="none"/>

        <!-- Center Checkmark Circle -->
        <circle cx="130" cy="33" r="23" fill="#22c55e"/>
        <path d="M120 33L127 40L140 27" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>

        <!-- Confetti right -->
        <circle cx="230" cy="18" r="3" fill="#22c55e"/>
        <circle cx="205" cy="10" r="2.5" fill="#f59e0b"/>
        <circle cx="185" cy="26" r="3" fill="#ffffff"/>
        <circle cx="215" cy="42" r="2" fill="#22c55e"/>
        <!-- Star right -->
        <path d="M175 36L176.8 40.4L181.5 40.8L177.9 43.9L179 48.5L175 46L171 48.5L172.1 43.9L168.5 40.8L173.2 40.4L175 36Z" fill="#f59e0b"/>
        <path d="M220 26L221.2 29L224.5 29.3L222 31.5L222.8 34.7L220 33L217.2 34.7L218 31.5L215.5 29.3L218.8 29L220 26Z" fill="#fbbf24"/>
        <!-- Streamer right -->
        <path d="M210 20C214 26 202 33 208 46" stroke="#fbbf24" stroke-width="2.5" stroke-linecap="round" fill="none"/>
        <path d="M192 13C196 18 188 24 193 34" stroke="#22c55e" stroke-width="2" stroke-linecap="round" fill="none"/>
      </svg>
      <h2 style="margin:10px 0 6px 0;font-size:22px;font-weight:800;color:#ffffff;letter-spacing:0.3px;">Withdrawal <span style="color:#22c55e;">Successful!</span></h2>
      <p style="margin:0;font-size:14px;color:#d1d5db;line-height:1.5;">Your withdrawal of ${inrAmountPrefix} has been<br/>successfully processed. &#x1F389;</p>
    </div>

    <p style="margin:0 0 16px 0;font-size:15px;color:#e5e7eb;">
      Hello <span style="color:#22c55e;font-weight:600;">${user.name}</span>,
    </p>

    <p style="margin:0 0 16px 0;font-size:14px;color:#d1d5db;line-height:1.6;">
      Your request for withdrawal of ${inrAmountPrefix} to your ${accountText} has been processed by ASM Coins.
    </p>

    <p style="margin:0 0 20px 0;font-size:14px;color:#d1d5db;line-height:1.6;">
      You can check the updated wallet balance <a href="${env.FRONTEND_URL}/wallet" style="color:#22c55e;text-decoration:underline;">here</a>
    </p>

    <!-- Table with 2 columns and borders -->
    <table width="100%" cellpadding="0" cellspacing="0"
           style="background-color:#161616;border:1px solid #282828;border-radius:8px;overflow:hidden;margin:20px 0;">
      <tr>
        <td style="padding:11px 16px;border-bottom:1px solid #232323;border-right:1px solid #232323;color:#d1d5db;font-size:14px;width:35%;">Amount</td>
        <td style="padding:11px 16px;border-bottom:1px solid #232323;color:#22c55e;font-size:14px;font-weight:700;">${inrNetSuffix}</td>
      </tr>
      <tr>
        <td style="padding:11px 16px;border-bottom:1px solid #232323;border-right:1px solid #232323;color:#d1d5db;font-size:14px;">TDS (5%)</td>
        <td style="padding:11px 16px;border-bottom:1px solid #232323;color:#ffffff;font-size:14px;">${tdsSuffix}</td>
      </tr>
      <tr>
        <td style="padding:11px 16px;border-bottom:1px solid #232323;border-right:1px solid #232323;color:#d1d5db;font-size:14px;">Reference Number</td>
        <td style="padding:11px 16px;border-bottom:1px solid #232323;color:#ffffff;font-size:14px;letter-spacing:0.5px;">${refNumber}</td>
      </tr>
      <tr>
        <td style="padding:11px 16px;border-right:1px solid #232323;color:#d1d5db;font-size:14px;">Date</td>
        <td style="padding:11px 16px;color:#ffffff;font-size:14px;">${dateStr}</td>
      </tr>
    </table>

    <p style="margin:24px 0 18px 0;font-size:13px;color:#9ca3af;line-height:1.6;">
      Please raise a support ticket in case of any concerns <a href="${env.FRONTEND_URL}/support" style="color:#22c55e;text-decoration:underline;">here</a>. We will sort out the issue on highest priority.
    </p>

    <p style="margin:0;font-size:14px;color:#e5e7eb;line-height:1.6;">
      Thank You,<br/>
      Team <span style="color:#22c55e;font-weight:600;">ASM Coins</span> &#x1F49A;
    </p>
  `

  return sendMail({
    to: user.email,
    subject: `Withdrawal of ${inrAmountPrefix} successfully processed`,
    html: emailShell(user._id, body),
  })
}

// ---------------------------------------------------------------------------
// 3. Withdrawal Rejected
// ---------------------------------------------------------------------------
const withdrawalRejected = (user, w) => {
  const inrAmountPrefix = formatInrPrefix(w.gross)

  const body = `
    <p style="margin:0 0 16px 0;font-size:15px;color:#e5e7eb;">
      Hello <span style="color:#22c55e;font-weight:600;">${user.name}</span>,
    </p>

    <p style="margin:0 0 16px 0;font-size:14px;color:#d1d5db;line-height:1.6;">
      Unfortunately your withdrawal request of <strong>${inrAmountPrefix}</strong> could not be completed.
      The full amount has been <span style="color:#22c55e;font-weight:600;">credited back</span> to your ASM Coins wallet.
    </p>

    ${w.note ? `<p style="margin:0 0 16px 0;color:#9ca3af;font-size:13px;">Reason: ${w.note}</p>` : ''}

    <p style="margin:24px 0 18px 0;font-size:13px;color:#9ca3af;line-height:1.6;">
      Please raise a support ticket in case of any concerns <a href="${env.FRONTEND_URL}/support" style="color:#22c55e;text-decoration:underline;">here</a>. We will sort out the issue on highest priority.
    </p>

    <p style="margin:0;font-size:14px;color:#e5e7eb;line-height:1.6;">
      Thank You,<br/>
      Team <span style="color:#22c55e;font-weight:600;">ASM Coins</span>
    </p>
  `

  return sendMail({
    to: user.email,
    subject: `Your withdrawal of ${inrAmountPrefix} was reversed`,
    html: emailShell(user._id, body),
  })
}

module.exports = { sendMail, withdrawalInitiated, withdrawalCompleted, withdrawalRejected }
