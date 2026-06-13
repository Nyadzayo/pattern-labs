import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { getState } from '@/lib/storage'
import { dailyWarmup } from '@/lib/warmup'
import { WarmupSession } from '@/components/warmup/WarmupSession'

export function WarmupPage() {
  const navigate = useNavigate()
  // Snapshot the steps once at mount so SM-2/progress changes mid-session don't
  // reshuffle the deck under the learner.
  const steps = useMemo(() => dailyWarmup(getState()), [])
  return <WarmupSession steps={steps} onClose={() => navigate('/')} />
}
