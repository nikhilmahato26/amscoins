/**
 * Brand glyphs the icon set doesn't cover, inlined so we don't depend on the
 * Figma asset CDN (those export URLs expire after 7 days).
 */

export function TetherIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M13.5 4H4.8L2.6 8.7c-.1.2 0 .4.1.5l9 8.6c.2.2.5.2.7 0l9-8.6c.2-.1.2-.4.1-.5L19.2 4h-5.7Zm-.2 2.9v1.6c2.5.1 4.4.6 4.4 1.2 0 .5-1.6 1-3.7 1.2v-.9a20 20 0 0 1-3.9 0v.9c-2.1-.2-3.7-.7-3.7-1.2 0-.6 1.9-1.1 4.4-1.2V6.9h-3V5.3h8.6v1.6h-3Z" />
      <path d="M10.1 11.9v3.6h3.9v-3.6a22 22 0 0 1-3.9 0Z" />
    </svg>
  )
}

export function BnbIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12 2 7.6 6.4 9.9 8.7 12 6.6l2.1 2.1 2.3-2.3L12 2ZM6.4 7.6 2 12l4.4 4.4 2.3-2.3L6.6 12l2.1-2.1L6.4 7.6Zm11.2 0-2.3 2.3L17.4 12l-2.1 2.1 2.3 2.3L22 12l-4.4-4.4ZM12 9.9 9.9 12l2.1 2.1L14.1 12 12 9.9Zm-2.1 5.4-2.3 2.3L12 22l4.4-4.4-2.3-2.3-2.1 2.1-2.1-2.1Z" />
    </svg>
  )
}
