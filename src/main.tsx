import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import '@/content'
import { getState, touchStreak } from '@/lib/storage'

// Sync the theme class (the inline script in index.html handles first paint;
// this covers state imported/reset at runtime).
document.documentElement.classList.toggle('dark', getState().theme === 'dark')
touchStreak()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
