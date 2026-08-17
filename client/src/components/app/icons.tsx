/**
 * Brand glyphs the icon set doesn't cover, inlined so we don't depend on the
 * Figma asset CDN (those export URLs expire after 7 days).
 *
 * Add to this file only after checking `lucide-react` — it carries no brand
 * marks (no Tether, BNB, WhatsApp or Telegram), but it does cover the generic
 * shapes, so `Wallet`, `Send`, `Bitcoin` and friends come from there.
 */

export function TetherIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M13.5 4H4.8L2.6 8.7c-.1.2 0 .4.1.5l9 8.6c.2.2.5.2.7 0l9-8.6c.2-.1.2-.4.1-.5L19.2 4h-5.7Zm-.2 2.9v1.6c2.5.1 4.4.6 4.4 1.2 0 .5-1.6 1-3.7 1.2v-.9a20 20 0 0 1-3.9 0v.9c-2.1-.2-3.7-.7-3.7-1.2 0-.6 1.9-1.1 4.4-1.2V6.9h-3V5.3h8.6v1.6h-3Z" />
      <path d="M10.1 11.9v3.6h3.9v-3.6a22 22 0 0 1-3.9 0Z" />
    </svg>
  )
}

export function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2Zm0 1.9a8.1 8.1 0 1 1-4.1 15.1l-.3-.2-3 .8.8-3-.2-.3A8.1 8.1 0 0 1 12 3.9Zm-3.7 4c-.2 0-.5.1-.7.4-.2.3-.9.9-.9 2.1s.9 2.5 1 2.6c.1.2 1.7 2.7 4.3 3.7 2.1.8 2.6.7 3 .6.5 0 1.5-.6 1.7-1.2.2-.6.2-1.1.1-1.2l-.6-.3-1.5-.7c-.2-.1-.4-.1-.5.1l-.7.9c-.1.2-.3.2-.5.1a7 7 0 0 1-2-1.3 7.7 7.7 0 0 1-1.5-1.8c-.1-.3 0-.4.1-.5l.4-.5.3-.4v-.5l-.7-1.6c-.2-.4-.4-.4-.5-.4h-.5Z" />
    </svg>
  )
}

export function TelegramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M21.7 4.3a1.2 1.2 0 0 0-1.3-.2L2.9 11c-1 .4-1 1.8 0 2.2l4.3 1.6 1.7 5.1c.3.8 1.3 1 1.9.4l2.4-2.3 4.3 3.2c.7.5 1.7.1 1.9-.7l3-14.1c.1-.4 0-.8-.3-1.1ZM9.3 14.2l8.4-5.6-6.9 6.6c-.2.2-.3.4-.3.6l-.3 2.3-.9-3.9Z" />
    </svg>
  )
}
