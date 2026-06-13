import { HashRouter, Route, Routes } from 'react-router-dom'
import { Layout } from '@/components/shell/Layout'
import { Dashboard } from '@/pages/Dashboard'
import { ModulePage } from '@/pages/ModulePage'
import { ProblemPage } from '@/pages/ProblemPage'
import { CheatSheetPage } from '@/pages/CheatSheetPage'
import { DecisionTreePage } from '@/pages/DecisionTreePage'
import { ReviewPage } from '@/pages/ReviewPage'
import { GalleryPage } from '@/pages/GalleryPage'
import { MockInterviewPage } from '@/pages/MockInterviewPage'
import { DrillsPage } from '@/pages/DrillsPage'
import { Settings } from '@/pages/Settings'
import { Placeholder } from '@/pages/Placeholder'
import '@/content/primitives' // self-register the Primitives Lab catalog

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="module/:moduleId" element={<ModulePage />} />
          <Route path="module/:moduleId/problem/:problemId" element={<ProblemPage />} />
          <Route path="review" element={<ReviewPage />} />
          <Route path="drills" element={<DrillsPage />} />
          <Route path="drills/:primitiveId" element={<DrillsPage />} />
          <Route path="mock" element={<MockInterviewPage />} />
          <Route path="cheatsheet/:moduleId" element={<CheatSheetPage />} />
          <Route path="gallery/:vizId?" element={<GalleryPage />} />
          <Route path="decide" element={<DecisionTreePage />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<Placeholder title="Not found" phase="another universe" />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
