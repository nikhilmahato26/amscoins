import { useEffect, useMemo, useState } from 'react'

function format(ms: number, expiredLabel: string): string {
  if (ms <= 0) return expiredLabel
  const s = Math.floor(ms / 1000)
  // ASM Coin's 7-day (168h) term means remaining time can span multiple days —
  // prefix with "Nd " rather than letting the hours field run past 99 (e.g. a
  // raw "168:00:00" reads as broken, not as a week).
  const days = Math.floor(s / 86400)
  const h = String(Math.floor((s % 86400) / 3600)).padStart(2, '0')
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0')
  const sec = String(s % 60).padStart(2, '0')
  const clock = `${h}:${m}:${sec}`
  return days > 0 ? `${days}d ${clock}` : clock
}

export function InvestmentCountdown({ maturesAt, expiredLabel = 'Matured' }: { maturesAt: string; expiredLabel?: string }) {
  const target = useMemo(() => new Date(maturesAt).getTime(), [maturesAt])
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (Date.now() >= target) return // already at/after target — no ticking needed
    const id = setInterval(() => {
      const t = Date.now()
      setNow(t)
      if (t >= target) clearInterval(id) // stop once reached; no wasted renders
    }, 1000)
    return () => clearInterval(id)
  }, [target])
  return <span className="tabular-nums">{format(target - now, expiredLabel)}</span>
}
