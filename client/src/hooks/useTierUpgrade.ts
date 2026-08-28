import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@/auth/AuthContext'
import { TIER_ORDER } from '@/lib/tiers'
import { markCelebrationSeen } from '@/services/api/users'

export type CelebratableTier = 'gold' | 'diamond'

/**
 * Detects when the authenticated user's tier has advanced past what they've
 * already celebrated, and returns the new tier so an overlay can be shown.
 *
 * The "seen" flag is stored server-side (`user.celebrationSeenTier`) so it
 * survives cache clears and device/browser switches. The API call fires the
 * instant the celebration is triggered, not on dismiss, so navigation away
 * mid-animation never causes a replay.
 */
export function useTierUpgrade(): {
  celebrationTier: CelebratableTier | null
  dismiss: () => void
} {
  const { user, setUser } = useAuth()
  const [celebrationTier, setCelebrationTier] = useState<CelebratableTier | null>(null)
  const markedRef = useRef(false)

  useEffect(() => {
    if (!user) return

    const currentTier = user.tier
    const seenTier = user.celebrationSeenTier ?? 'silver'

    const currentRank = TIER_ORDER.indexOf(currentTier)
    const seenRank = TIER_ORDER.indexOf(seenTier)

    if (currentRank > seenRank && (currentTier === 'gold' || currentTier === 'diamond')) {
      if (markedRef.current) return
      markedRef.current = true

      // Persist immediately — before animation plays — so any remount,
      // navigation, or device switch won't replay it.
      markCelebrationSeen()
        .then(() => {
          // Sync the updated field into AuthContext so the hook
          // doesn't re-fire on the next render.
          setUser({ ...user, celebrationSeenTier: currentTier })
        })
        .catch(() => {
          // Fire-and-forget: if the API call fails (offline, flaky network),
          // the celebration still shows. It may replay next session, which is
          // acceptable — better than silently never celebrating.
          markedRef.current = false
        })

      setCelebrationTier(currentTier)
    }
  }, [user?.id, user?.tier, user?.celebrationSeenTier]) // eslint-disable-line react-hooks/exhaustive-deps

  const dismiss = () => setCelebrationTier(null)

  return { celebrationTier, dismiss }
}
