
import { cn } from '@/lib/utils'
import { MOCK_LEDGER_TAPE } from '@/mocks/ledger'

interface SettlementTapeProps {
  className?: string
}

export function SettlementTape({ className }: SettlementTapeProps) {
  // Duplicate the tape items a few times to create a seamless infinite scroll
  const items = [...MOCK_LEDGER_TAPE, ...MOCK_LEDGER_TAPE, ...MOCK_LEDGER_TAPE, ...MOCK_LEDGER_TAPE]
  
  return (
    <div className={cn(
      "relative h-[400px] overflow-hidden no-scrollbar font-data text-xs leading-[2.5] text-mist/60 whitespace-pre",
      "mask-image-linear-vertical", // we'll define this via style
      className
    )}
    style={{
      maskImage: 'linear-gradient(to bottom, transparent, black 15%, black 85%, transparent)',
      WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 15%, black 85%, transparent)'
    }}
    >
      <div className="animate-scroll motion-reduce:animate-none">
        {items.map((line, idx) => (
          <div key={idx} className="opacity-80">
            {line}
          </div>
        ))}
      </div>
    </div>
  )
}
