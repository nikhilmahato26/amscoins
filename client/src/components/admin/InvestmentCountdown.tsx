import { useEffect, useMemo, useState } from 'react'

function format(ms: number): string {
  if (ms <= 0) return 'Matured'
  const s = Math.floor(ms / 1000)
  const h = String(Math.floor(s / 3600)).padStart(2, '0')
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0')
  const sec = String(s % 60).padStart(2, '0')
  return `${h}:${m}:${sec}`
}

export function InvestmentCountdown({ maturesAt }: { maturesAt: string }) {
  const target = useMemo(() => new Date(maturesAt).getTime(), [maturesAt])
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (Date.now() >= target) return // already matured — no ticking needed
    const id = setInterval(() => {
      const t = Date.now()
      setNow(t)
      if (t >= target) clearInterval(id) // stop once matured; no wasted renders
    }, 1000)
    return () => clearInterval(id)
  }, [target])
  return <span className="tabular-nums">{format(target - now)}</span>
}
