import { Search } from 'lucide-react'

/** Shared admin search box — matches the Users page search styling. */
export function SearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  placeholder: string
}) {
  return (
    <div className="relative max-w-sm">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-asm-muted" aria-hidden />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="w-full rounded-lg border border-asm-line bg-white py-2 pl-9 pr-3 text-[13px] text-asm-navy placeholder:text-asm-muted focus:border-asm-blue focus:outline-none focus:ring-2 focus:ring-asm-blue"
      />
    </div>
  )
}
