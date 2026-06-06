import { Routes, Route, Navigate } from 'react-router-dom'
import AutoExportWatcher from './components/AutoExportWatcher'
import OfflineIndicator from './components/OfflineIndicator'
import SupabaseConfigBanner from './components/SupabaseConfigBanner'
import ProtectedRoute from './components/ProtectedRoute'
import EncryptionGate from './components/EncryptionGate'
import Home from './pages/Home'
import NoteEditor from './pages/NoteEditor'
import Graph from './pages/Graph'
import Trash from './pages/Trash'
import Search from './pages/Search'
import Settings from './pages/Settings'
import Dashboard from './pages/Dashboard'
import Review from './pages/Review'
import ShareNote from './pages/ShareNote'

function AuthenticatedApp() {
  return (
    <ProtectedRoute>
      <EncryptionGate>
        <SupabaseConfigBanner />
        <AutoExportWatcher />
        <OfflineIndicator />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/notes/edit" element={<NoteEditor />} />
          <Route path="/note/index.html" element={<Navigate to="/notes/edit" replace />} />
          <Route path="/note/:id" element={<NoteEditor />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/review" element={<Review />} />
          <Route path="/graph" element={<Graph />} />
          <Route path="/search" element={<Search />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/trash" element={<Trash />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </EncryptionGate>
    </ProtectedRoute>
  )
}

function App() {
  return (
    <Routes>
      <Route path="/share/:noteId" element={<ShareNote />} />
      <Route path="*" element={<AuthenticatedApp />} />
    </Routes>
  )
}

export default App
