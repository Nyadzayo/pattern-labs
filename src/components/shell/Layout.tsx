import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { useGlobalShortcuts } from '@/lib/useGlobalShortcuts'

export function Layout() {
  useGlobalShortcuts()
  return (
    <div className="flex h-full">
      <Sidebar />
      <main className="min-w-0 flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}
