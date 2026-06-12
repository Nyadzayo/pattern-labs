import { useSyncExternalStore } from 'react'
import { getState, subscribe, type AppState } from './storage'

/** Subscribe a component to the whole app state (small app — coarse is fine). */
export function useAppState(): AppState {
  return useSyncExternalStore(subscribe, getState, getState)
}
