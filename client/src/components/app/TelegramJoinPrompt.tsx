import { useEffect, useState } from 'react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { TelegramIcon } from '@/components/app/icons'
import { deriveTelegram } from '@/config/payment'
import { useSettings } from '@/hooks/queries'

const SEEN_KEY = 'asm-telegram-prompt-seen'

/**
 * A one-time nudge to join the Telegram group, shown the first time a user
 * lands anywhere inside the app shell. Gated by localStorage rather than a
 * server field (see useTierUpgrade for that heavier pattern) — this is a
 * marketing nudge, not state that needs to survive a device switch, so the
 * lighter mechanism is the right tradeoff.
 */
export function TelegramJoinPrompt() {
  const { data: settings } = useSettings()
  const [open, setOpen] = useState(false)

  const { url } = settings ? deriveTelegram(settings) : { url: '' }

  useEffect(() => {
    if (!url) return
    if (localStorage.getItem(SEEN_KEY)) return
    setOpen(true)
  }, [url])

  const dismiss = () => {
    localStorage.setItem(SEEN_KEY, '1')
    setOpen(false)
  }

  const join = () => {
    localStorage.setItem(SEEN_KEY, '1')
    window.open(url, '_blank', 'noopener,noreferrer')
    setOpen(false)
  }

  if (!url) return null

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) dismiss() }}>
      <DialogContent className="asm-dialog rounded-2xl sm:max-w-[380px]">
        <DialogHeader className="items-center text-center">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-asm-blue-tint text-asm-blue">
            <TelegramIcon className="size-7" />
          </span>
          <DialogTitle>Join our Telegram community</DialogTitle>
          <DialogDescription>
            Get instant updates, connect with other investors, and reach the team directly.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="sm:flex-col sm:gap-2">
          <Button type="button" onClick={join} className="w-full">
            Join Telegram
          </Button>
          <Button type="button" variant="ghost" onClick={dismiss} className="w-full">
            Maybe later
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
