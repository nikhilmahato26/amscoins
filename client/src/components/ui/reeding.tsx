
import { cn } from '@/lib/utils'

export function Reeding({ className }: { className?: string }) {
  return (
    <div 
      className={cn("h-2 w-full", className)}
      style={{
        background: 'repeating-linear-gradient(90deg, transparent, transparent 4px, var(--primary) 4px, var(--primary) 5px)',
        opacity: 0.3
      }}
    />
  )
}
