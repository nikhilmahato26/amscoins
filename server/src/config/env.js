require('dotenv').config({ quiet: true })

const required = ['MONGO_URI', 'JWT_SECRET']
for (const k of required) {
  if (!process.env[k]) throw new Error(`Missing env var: ${k}`)
}

module.exports = {
  PORT: Number(process.env.PORT || 4000),
  NODE_ENV: process.env.NODE_ENV || 'development',
  LOG_LEVEL: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'http'),
  MONGO_URI: process.env.MONGO_URI,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES: process.env.JWT_EXPIRES || '7d',
  TELEGRAM_LINK: process.env.TELEGRAM_LINK || 'https://t.me/asmcoins_support',
  TDS_PCT: Number(process.env.TDS_PCT || 5),
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: Number(process.env.SMTP_PORT || 465),
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASS: process.env.SMTP_PASS,
  MAIL_FROM: process.env.MAIL_FROM || 'bhaveshsolminde@gmail.com',
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'admin@asmcoins.com',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'change-me-admin',
  REDIS_URL: process.env.REDIS_URL || null,
  LOGO_URL: process.env.LOGO_URL || null,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || null,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || null,
  GOOGLE_CALLBACK_URL: process.env.GOOGLE_CALLBACK_URL || null,
}
