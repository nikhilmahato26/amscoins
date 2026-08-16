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

/**
 * Build the SMTP transport.
 *
 * Preferred path: Resend SMTP. When RESEND_API_KEY is set, mail is sent from an
 * authenticated asmcoins.com address (SPF + DKIM + DMARC aligned), which is what
 * keeps it out of spam. The username is the literal string "resend" and the
 * password is the API key.
 *
 * Fallback: whatever generic SMTP_* creds are in the env (e.g. Gmail in local dev).
 * In tests: a JSON transport so nothing is actually sent over the wire.
 */
function buildTransport() {
  if (process.env.NODE_ENV === 'test') {
    return nodemailer.createTransport({ jsonTransport: true })
  }
  if (env.RESEND_API_KEY) {
    return nodemailer.createTransport({
      host: 'smtp.resend.com',
      port: 465,
      secure: true,
      auth: { user: 'resend', pass: env.RESEND_API_KEY },
    })
  }
  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
  })
}

const transport = buildTransport()

/**
 * Derive a plain-text version from the HTML body. HTML-only emails score worse
 * with spam filters, so every message ships a `text` alternative alongside `html`.
 */
function htmlToText(html) {
  return String(html)
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<head[\s\S]*?<\/head>/gi, '')
    .replace(/<\/(p|div|tr|h[1-6]|li)>/gi, '\n')
    .replace(/<br\s*\/?>(?=)/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

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
// Shared layout shell
// ---------------------------------------------------------------------------
/**
 * Colour tokens, mirrored from the app's light theme (`asm-*` in the Tailwind
 * config) so an email and the screen it links to read as one product.
 *
 * Light is the *authored* palette and is applied inline, because a fair number
 * of clients drop `<style>` entirely — whatever survives has to be the light
 * one. Dark is applied from the stylesheet, so it only reaches clients that
 * both keep `<style>` and honour `prefers-color-scheme`.
 */
const C = {
  page: '#F4F7FE',
  card: '#FFFFFF',
  line: '#E5EAF3',
  heading: '#102A5C',
  text: '#546582',
  muted: '#55698E',
  panel: '#F4F7FE',
  footer: '#EDF3FF',
  /*
   * Text-safe green. The brand green (#22C55E) sits at ~2.2:1 on white, which
   * is illegible — it survives below only as the decorative rule and as the
   * dark-mode accent, where the contrast works.
   */
  accent: '#15803D',
  accentSoft: '#EAF7EF',
  rule: '#22C55E',
}

/**
 * Dark-mode overrides.
 *
 * `!important` is not optional here: every colour is also set inline on the
 * element, and inline styles outrank a stylesheet rule without it.
 *
 * The `[data-ogsc]` / `[data-ogsb]` duplicates target Outlook.com, which
 * rewrites the DOM and stamps those attributes instead of honouring the media
 * query. Same declarations, different trigger.
 */
const DARK_RULES = `
    .asm-page { background-color:#0D0D0D !important; }
    .asm-card { background-color:#121212 !important; border-color:#232323 !important; }
    .asm-panel { background-color:#161616 !important; border-color:#282828 !important; }
    .asm-cell { border-color:#232323 !important; }
    .asm-strip { background-color:#0C0C0C !important; border-color:#232323 !important; }
    .asm-footer { background-color:#080808 !important; border-color:#1A1A1A !important; }
    .asm-heading { color:#FFFFFF !important; }
    .asm-text { color:#D1D5DB !important; }
    .asm-muted { color:#9CA3AF !important; }
    .asm-accent { color:#22C55E !important; }
    .asm-code { background-color:#0C0C0C !important; border-color:#22C55E !important; color:#22C55E !important; }
    .asm-icon { stroke:#22C55E !important; }
`

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
  <meta name="x-apple-disable-message-reformatting" />
  <!--
    Declaring both schemes is what stops Gmail, Outlook and Apple Mail from
    running their own auto-inversion over this message. Without it a client in
    dark mode assumes the email is light and inverts it wholesale, which is how
    a dark template ends up rendering as a washed-out light one.
  -->
  <meta name="color-scheme" content="light dark" />
  <meta name="supported-color-schemes" content="light dark" />
  <title>ASM Coins</title>
  <style>
    :root { color-scheme: light dark; supported-color-schemes: light dark; }
    a { color: ${C.accent}; }
    @media (prefers-color-scheme: dark) {
${DARK_RULES}
      a { color:#22C55E !important; }
    }
    [data-ogsc] .asm-page, [data-ogsb] .asm-page { background-color:#0D0D0D !important; }
${DARK_RULES.replace(/^ {4}\./gm, '    [data-ogsc] .')}
    @media only screen and (max-width: 480px) {
      .asm-shell { padding: 12px 8px !important; }
      .asm-pad { padding: 22px 18px 16px 18px !important; }
      .asm-phish { display: block !important; text-align: left !important; padding-top: 10px !important; }
    }
  </style>
</head>
<body class="asm-page" style="margin:0;padding:0;background-color:${C.page};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" class="asm-page" style="background-color:${C.page};padding:24px 12px;">
    <tr>
      <td align="center" class="asm-shell">
        <table width="100%" cellpadding="0" cellspacing="0" class="asm-card" style="max-width:560px;background-color:${C.card};border-radius:12px;overflow:hidden;border:1px solid ${C.line};box-shadow:0 8px 24px rgba(16,42,92,0.10);">

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
                  <td align="right" class="asm-phish" style="vertical-align:middle;">
                    <table cellpadding="0" cellspacing="0" align="right">
                      <tr>
                        <td style="padding-right:8px;font-size:12px;font-weight:600;color:#4b5563;white-space:nowrap;">Anti-Phishing Code:</td>
                        <td>
                          <div style="border:1.5px solid ${C.accent};border-radius:4px;padding:4px 10px;font-size:14px;font-weight:700;letter-spacing:1.5px;color:${C.accent};background-color:${C.accentSoft};text-align:center;">
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
            <td style="height:3px;background-color:${C.rule};line-height:3px;font-size:0;">&nbsp;</td>
          </tr>

          <!-- ── Email Body ── -->
          <tr>
            <td class="asm-pad asm-text" style="padding:28px 24px 20px 24px;color:${C.text};font-size:14px;line-height:1.65;">
              ${bodyHtml}
            </td>
          </tr>

          <!-- ── Trust Badges & Website ── -->
          <tr>
            <td class="asm-strip" style="padding:16px 20px;border-top:1px solid ${C.line};background-color:${C.panel};">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <!-- Secure -->
                  <td align="center" width="25%" style="text-align:center;padding:2px;">
                    <table cellpadding="0" cellspacing="0" align="center">
                      <tr>
                        <td style="vertical-align:middle;padding-right:4px;">
                          <svg width="18" height="18" viewBox="0 0 24 24" class="asm-icon" fill="none" stroke="${C.accent}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
                        </td>
                        <td align="left" style="vertical-align:middle;">
                          <div class="asm-heading" style="color:${C.heading};font-size:11px;font-weight:700;line-height:1.1;">Secure</div>
                          <div class="asm-muted" style="color:${C.muted};font-size:9px;line-height:1.1;">100% Protected</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <!-- Fast & Reliable -->
                  <td align="center" width="25%" style="text-align:center;padding:2px;">
                    <table cellpadding="0" cellspacing="0" align="center">
                      <tr>
                        <td style="vertical-align:middle;padding-right:4px;">
                          <svg width="18" height="18" viewBox="0 0 24 24" class="asm-icon" fill="none" stroke="${C.accent}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
                        </td>
                        <td align="left" style="vertical-align:middle;">
                          <div class="asm-heading" style="color:${C.heading};font-size:11px;font-weight:700;line-height:1.1;">Fast &amp; Reliable</div>
                          <div class="asm-muted" style="color:${C.muted};font-size:9px;line-height:1.1;">24/7 Support</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <!-- Trusted -->
                  <td align="center" width="25%" style="text-align:center;padding:2px;">
                    <table cellpadding="0" cellspacing="0" align="center">
                      <tr>
                        <td style="vertical-align:middle;padding-right:4px;">
                          <svg width="18" height="18" viewBox="0 0 24 24" class="asm-icon" fill="none" stroke="${C.accent}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                        </td>
                        <td align="left" style="vertical-align:middle;">
                          <div class="asm-heading" style="color:${C.heading};font-size:11px;font-weight:700;line-height:1.1;">Trusted</div>
                          <div class="asm-muted" style="color:${C.muted};font-size:9px;line-height:1.1;">By Thousands</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <!-- Domain -->
                  <td align="center" width="25%" style="text-align:center;padding:2px;">
                    <table cellpadding="0" cellspacing="0" align="center">
                      <tr>
                        <td style="vertical-align:middle;padding-right:4px;">
                          <svg width="16" height="16" viewBox="0 0 24 24" class="asm-icon" fill="none" stroke="${C.accent}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                        </td>
                        <td align="left" style="vertical-align:middle;">
                          <a href="https://www.asmcoins.com" target="_blank" class="asm-accent" style="color:${C.accent};font-size:11px;text-decoration:none;font-weight:600;">www.asmcoins.com</a>
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
            <td align="center" class="asm-footer asm-muted" style="padding:14px 20px;background-color:${C.footer};border-top:1px solid ${C.line};color:${C.muted};font-size:12px;">
              &#x1F389; Thank you for choosing <span class="asm-accent" style="color:${C.accent};font-weight:600;">ASM Coins</span>. Happy Trading! &#x1F680;
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

async function sendMail({ to, subject, html, text }) {
  try {
    logger.info('Sending email', { to, subject })
    return await transport.sendMail({
      from: env.MAIL_FROM,
      replyTo: env.MAIL_REPLY_TO,
      to,
      subject,
      html,
      text: text || htmlToText(html),
    })
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
    <p class="asm-heading" style="margin:0 0 16px 0;font-size:15px;color:${C.heading};">
      Hello <span class="asm-accent" style="color:${C.accent};font-weight:600;">${user.name}</span>,
    </p>

    <p class="asm-text" style="margin:0 0 16px 0;font-size:14px;color:${C.text};line-height:1.6;">
      Your withdrawal request for <strong>${inrAmountPrefix}</strong> to your ${accountText} has been successfully placed on <span class="asm-accent" style="color:${C.accent};">${dateStr}</span>.
    </p>

    <p class="asm-muted" style="margin:0 0 16px 0;font-size:14px;color:${C.muted};line-height:1.6;">
      All Withdrawals are processed with manual review. We try to complete all withdrawals in less than 24 hours.
    </p>

    <p class="asm-text" style="margin:0 0 20px 0;font-size:14px;color:${C.text};line-height:1.6;">
      We will update you once the withdrawal request is successfully processed.
    </p>

    <!-- Table -->
    <table width="100%" cellpadding="0" cellspacing="0"
           class="asm-panel" style="background-color:${C.panel};border:1px solid ${C.line};border-radius:8px;overflow:hidden;margin:20px 0;">
      <tr>
        <td class="asm-cell asm-text" style="padding:11px 16px;border-bottom:1px solid ${C.line};border-right:1px solid ${C.line};color:${C.text};font-size:14px;width:35%;">Amount</td>
        <td class="asm-cell asm-accent" style="padding:11px 16px;border-bottom:1px solid ${C.line};color:${C.accent};font-size:14px;font-weight:700;">${inrNetSuffix}</td>
      </tr>
      <tr>
        <td class="asm-cell asm-text" style="padding:11px 16px;border-bottom:1px solid ${C.line};border-right:1px solid ${C.line};color:${C.text};font-size:14px;">TDS (5%)</td>
        <td class="asm-cell asm-heading" style="padding:11px 16px;border-bottom:1px solid ${C.line};color:${C.heading};font-size:14px;">${tdsSuffix}</td>
      </tr>
      <tr>
        <td class="asm-cell asm-text" style="padding:11px 16px;border-right:1px solid ${C.line};color:${C.text};font-size:14px;">Date</td>
        <td class="asm-heading" style="padding:11px 16px;color:${C.heading};font-size:14px;">${dateStr}</td>
      </tr>
    </table>

    <p class="asm-muted" style="margin:24px 0 18px 0;font-size:13px;color:${C.muted};line-height:1.6;">
      Please raise a support ticket in case of any concerns <a href="${env.FRONTEND_URL}/support" class="asm-accent" style="color:${C.accent};text-decoration:underline;">here</a>. We will sort out the issue on highest priority.
    </p>

    <p class="asm-text" style="margin:0;font-size:14px;color:${C.text};line-height:1.6;">
      Thank You,<br/>
      Team <span class="asm-accent" style="color:${C.accent};font-weight:600;">ASM Coins</span>
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
        <circle cx="75" cy="26" r="3" fill="#0B4FD8"/>
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
        <circle cx="185" cy="26" r="3" fill="#0B4FD8"/>
        <circle cx="215" cy="42" r="2" fill="#22c55e"/>
        <!-- Star right -->
        <path d="M175 36L176.8 40.4L181.5 40.8L177.9 43.9L179 48.5L175 46L171 48.5L172.1 43.9L168.5 40.8L173.2 40.4L175 36Z" fill="#f59e0b"/>
        <path d="M220 26L221.2 29L224.5 29.3L222 31.5L222.8 34.7L220 33L217.2 34.7L218 31.5L215.5 29.3L218.8 29L220 26Z" fill="#fbbf24"/>
        <!-- Streamer right -->
        <path d="M210 20C214 26 202 33 208 46" stroke="#fbbf24" stroke-width="2.5" stroke-linecap="round" fill="none"/>
        <path d="M192 13C196 18 188 24 193 34" stroke="#22c55e" stroke-width="2" stroke-linecap="round" fill="none"/>
      </svg>
      <h2 class="asm-heading" style="margin:10px 0 6px 0;font-size:22px;font-weight:800;color:${C.heading};letter-spacing:0.3px;">Withdrawal <span class="asm-accent" style="color:${C.accent};">Successful!</span></h2>
      <p class="asm-text" style="margin:0;font-size:14px;color:${C.text};line-height:1.5;">Your withdrawal of ${inrAmountPrefix} has been<br/>successfully processed. &#x1F389;</p>
    </div>

    <p class="asm-heading" style="margin:0 0 16px 0;font-size:15px;color:${C.heading};">
      Hello <span class="asm-accent" style="color:${C.accent};font-weight:600;">${user.name}</span>,
    </p>

    <p class="asm-text" style="margin:0 0 16px 0;font-size:14px;color:${C.text};line-height:1.6;">
      Your request for withdrawal of ${inrAmountPrefix} to your ${accountText} has been processed by ASM Coins.
    </p>

    <p class="asm-text" style="margin:0 0 20px 0;font-size:14px;color:${C.text};line-height:1.6;">
      You can check the updated wallet balance <a href="${env.FRONTEND_URL}/wallet" class="asm-accent" style="color:${C.accent};text-decoration:underline;">here</a>
    </p>

    <!-- Table with 2 columns and borders -->
    <table width="100%" cellpadding="0" cellspacing="0"
           class="asm-panel" style="background-color:${C.panel};border:1px solid ${C.line};border-radius:8px;overflow:hidden;margin:20px 0;">
      <tr>
        <td class="asm-cell asm-text" style="padding:11px 16px;border-bottom:1px solid ${C.line};border-right:1px solid ${C.line};color:${C.text};font-size:14px;width:35%;">Amount</td>
        <td class="asm-cell asm-accent" style="padding:11px 16px;border-bottom:1px solid ${C.line};color:${C.accent};font-size:14px;font-weight:700;">${inrNetSuffix}</td>
      </tr>
      <tr>
        <td class="asm-cell asm-text" style="padding:11px 16px;border-bottom:1px solid ${C.line};border-right:1px solid ${C.line};color:${C.text};font-size:14px;">TDS (5%)</td>
        <td class="asm-cell asm-heading" style="padding:11px 16px;border-bottom:1px solid ${C.line};color:${C.heading};font-size:14px;">${tdsSuffix}</td>
      </tr>
      <tr>
        <td class="asm-cell asm-text" style="padding:11px 16px;border-bottom:1px solid ${C.line};border-right:1px solid ${C.line};color:${C.text};font-size:14px;">Reference Number</td>
        <td class="asm-cell asm-heading" style="padding:11px 16px;border-bottom:1px solid ${C.line};color:${C.heading};font-size:14px;letter-spacing:0.5px;">${refNumber}</td>
      </tr>
      <tr>
        <td class="asm-cell asm-text" style="padding:11px 16px;border-right:1px solid ${C.line};color:${C.text};font-size:14px;">Date</td>
        <td class="asm-heading" style="padding:11px 16px;color:${C.heading};font-size:14px;">${dateStr}</td>
      </tr>
    </table>

    <p class="asm-muted" style="margin:24px 0 18px 0;font-size:13px;color:${C.muted};line-height:1.6;">
      Please raise a support ticket in case of any concerns <a href="${env.FRONTEND_URL}/support" class="asm-accent" style="color:${C.accent};text-decoration:underline;">here</a>. We will sort out the issue on highest priority.
    </p>

    <p class="asm-text" style="margin:0;font-size:14px;color:${C.text};line-height:1.6;">
      Thank You,<br/>
      Team <span class="asm-accent" style="color:${C.accent};font-weight:600;">ASM Coins</span> &#x1F49A;
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
    <p class="asm-heading" style="margin:0 0 16px 0;font-size:15px;color:${C.heading};">
      Hello <span class="asm-accent" style="color:${C.accent};font-weight:600;">${user.name}</span>,
    </p>

    <p class="asm-text" style="margin:0 0 16px 0;font-size:14px;color:${C.text};line-height:1.6;">
      Unfortunately your withdrawal request of <strong>${inrAmountPrefix}</strong> could not be completed.
      The full amount has been <span class="asm-accent" style="color:${C.accent};font-weight:600;">credited back</span> to your ASM Coins wallet.
    </p>

    ${w.note ? `<p class="asm-muted" style="margin:0 0 16px 0;color:${C.muted};font-size:13px;">Reason: ${w.note}</p>` : ''}

    <p class="asm-muted" style="margin:24px 0 18px 0;font-size:13px;color:${C.muted};line-height:1.6;">
      Please raise a support ticket in case of any concerns <a href="${env.FRONTEND_URL}/support" class="asm-accent" style="color:${C.accent};text-decoration:underline;">here</a>. We will sort out the issue on highest priority.
    </p>

    <p class="asm-text" style="margin:0;font-size:14px;color:${C.text};line-height:1.6;">
      Thank You,<br/>
      Team <span class="asm-accent" style="color:${C.accent};font-weight:600;">ASM Coins</span>
    </p>
  `

  return sendMail({
    to: user.email,
    subject: `Your withdrawal of ${inrAmountPrefix} was reversed`,
    html: emailShell(user._id, body),
  })
}

const passwordResetOtp = (user, otp) => {
  const body = `
    <p class="asm-heading" style="margin:0 0 16px 0;font-size:15px;color:${C.heading};">
      Hello <span class="asm-accent" style="color:${C.accent};font-weight:600;">${user.name}</span>,
    </p>
    <p class="asm-text" style="margin:0 0 16px 0;font-size:14px;color:${C.text};line-height:1.6;">
      Use the one-time code below to reset your ASM Coins password. It expires in <strong>10 minutes</strong>.
    </p>
    <div style="text-align:center;margin:24px 0;">
      <!-- Right padding is 10px light: letter-spacing adds a trailing gap after
           the last digit, which would otherwise push the code off-centre. -->
      <div class="asm-code" style="display:inline-block;padding:14px 18px 14px 28px;border:1.5px solid ${C.accent};border-radius:10px;background-color:${C.accentSoft};font-size:32px;font-weight:800;letter-spacing:10px;color:${C.accent};">
        ${otp}
      </div>
    </div>
    <p class="asm-muted" style="margin:0 0 16px 0;font-size:13px;color:${C.muted};line-height:1.6;">
      If you did not request a password reset, you can safely ignore this email — your password will not change.
    </p>
    <p class="asm-text" style="margin:0;font-size:14px;color:${C.text};line-height:1.6;">
      Thank You,<br/>Team <span class="asm-accent" style="color:${C.accent};font-weight:600;">ASM Coins</span>
    </p>
  `
  return sendMail({
    to: user.email,
    subject: 'Your ASM Coins password reset code',
    html: emailShell(user._id, body),
  })
}

// ---------------------------------------------------------------------------
// Support tickets
// ---------------------------------------------------------------------------
function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

const row = (label, value) =>
  `<tr>
     <td class="asm-cell asm-text" style="padding:11px 16px;border-bottom:1px solid ${C.line};border-right:1px solid ${C.line};color:${C.text};font-size:14px;width:35%;">${label}</td>
     <td class="asm-cell asm-heading" style="padding:11px 16px;border-bottom:1px solid ${C.line};color:${C.heading};font-size:14px;">${value}</td>
   </tr>`

// Sent to the admin inbox when a user raises a query.
const supportTicketAdmin = (user, ticket) => {
  const body = `
    <p class="asm-heading" style="margin:0 0 16px 0;font-size:15px;color:${C.heading};">
      New support query — <span class="asm-accent" style="color:${C.accent};font-weight:600;">${escapeHtml(ticket.publicRef)}</span>
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" class="asm-panel" style="background-color:${C.panel};border:1px solid ${C.line};border-radius:8px;overflow:hidden;margin:16px 0;">
      ${row('User', `${escapeHtml(user.name)} (${escapeHtml(user.email)})`)}
      ${row('User ID', escapeHtml(user.publicId || user._id))}
      ${row('Subject', escapeHtml(ticket.subject))}
      ${row('Raised', fmtDate(ticket.createdAt || new Date()))}
    </table>
    <p class="asm-text" style="margin:0 0 8px 0;font-size:14px;color:${C.text};"><strong>Message</strong></p>
    <p class="asm-muted" style="margin:0;font-size:14px;color:${C.muted};line-height:1.6;white-space:pre-wrap;">${escapeHtml(ticket.message)}</p>
  `
  return sendMail({
    to: env.ADMIN_EMAIL,
    subject: `New support query ${ticket.publicRef}: ${ticket.subject}`,
    html: emailShell(user._id, body),
  })
}

// Confirmation sent to the user who raised the query.
const supportTicketConfirmation = (user, ticket) => {
  const body = `
    <p class="asm-heading" style="margin:0 0 16px 0;font-size:15px;color:${C.heading};">
      Hello <span class="asm-accent" style="color:${C.accent};font-weight:600;">${escapeHtml(user.name)}</span>,
    </p>
    <p class="asm-text" style="margin:0 0 16px 0;font-size:14px;color:${C.text};line-height:1.6;">
      We've received your support query <strong>${escapeHtml(ticket.publicRef)}</strong>. Our team will get back to you as soon as possible.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" class="asm-panel" style="background-color:${C.panel};border:1px solid ${C.line};border-radius:8px;overflow:hidden;margin:16px 0;">
      ${row('Reference', escapeHtml(ticket.publicRef))}
      ${row('Subject', escapeHtml(ticket.subject))}
    </table>
    <p class="asm-muted" style="margin:0 0 16px 0;font-size:14px;color:${C.muted};line-height:1.6;white-space:pre-wrap;">${escapeHtml(ticket.message)}</p>
    <p class="asm-text" style="margin:0;font-size:14px;color:${C.text};line-height:1.6;">
      Thank You,<br/>Team <span class="asm-accent" style="color:${C.accent};font-weight:600;">ASM Coins</span>
    </p>
  `
  return sendMail({
    to: user.email,
    subject: `We received your query ${ticket.publicRef}`,
    html: emailShell(user._id, body),
  })
}

// Sent to the user when an admin marks their query resolved.
const supportTicketResolved = (user, ticket) => {
  const note = ticket.adminNote
    ? `<p class="asm-text" style="margin:0 0 8px 0;font-size:14px;color:${C.text};"><strong>Our response</strong></p>
       <p class="asm-muted" style="margin:0 0 16px 0;font-size:14px;color:${C.muted};line-height:1.6;white-space:pre-wrap;">${escapeHtml(ticket.adminNote)}</p>`
    : ''
  const body = `
    <p class="asm-heading" style="margin:0 0 16px 0;font-size:15px;color:${C.heading};">
      Hello <span class="asm-accent" style="color:${C.accent};font-weight:600;">${escapeHtml(user.name)}</span>,
    </p>
    <p class="asm-text" style="margin:0 0 16px 0;font-size:14px;color:${C.text};line-height:1.6;">
      Your support query <strong>${escapeHtml(ticket.publicRef)}</strong> — “${escapeHtml(ticket.subject)}” — has been marked <strong>resolved</strong>.
    </p>
    ${note}
    <p class="asm-muted" style="margin:0 0 16px 0;font-size:13px;color:${C.muted};line-height:1.6;">
      If this isn't fully resolved, just raise a new query from the app and we'll pick it up.
    </p>
    <p class="asm-text" style="margin:0;font-size:14px;color:${C.text};line-height:1.6;">
      Thank You,<br/>Team <span class="asm-accent" style="color:${C.accent};font-weight:600;">ASM Coins</span>
    </p>
  `
  return sendMail({
    to: user.email,
    subject: `Your query ${ticket.publicRef} has been resolved`,
    html: emailShell(user._id, body),
  })
}

module.exports = {
  sendMail,
  withdrawalInitiated,
  withdrawalCompleted,
  withdrawalRejected,
  passwordResetOtp,
  supportTicketAdmin,
  supportTicketConfirmation,
  supportTicketResolved,
}
