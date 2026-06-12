import { HashRouter, Route, Routes } from 'react-router-dom'
import { Layout } from '@/components/shell/Layout'
import { Dashboard } from '@/pages/Dashboard'
import { ModulePage } from '@/pages/ModulePage'
import { Settings } from '@/pages/Settings'
import { Placeholder } from '@/pages/Placeholder'

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="module/:moduleId" element={<ModulePage />} />
          <Route path="module/:moduleId/problem/:problemId" element={<Placeholder title="Practice arena" phase="Phase 4" />} />
          <Route path="review" element={<Placeholder title="Review due cards" phase="Phase 5" />} />
          <Route path="mock" element={<Placeholder title="Mock interview" phase="Phase 5" />} />
          <Route path="decide" element={<Placeholder title="Which pattern do I use?" phase="Phase 7" />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<Placeholder title="Not found" phase="another universe" />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
