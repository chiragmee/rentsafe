import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing'
import Upload from './pages/Upload'
import ReviewParsed from './pages/ReviewParsed'
import BHKSetup from './pages/BHKSetup'
import Registry from './pages/Registry'
import OwnerReview from './pages/OwnerReview'
import VerifyCosts from './pages/VerifyCosts'
import Sign from './pages/Sign'
import Dashboard from './pages/Dashboard'
import MoveOut from './pages/MoveOut'
import Settlement from './pages/Settlement'
import './index.css'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/upload" element={<Upload />} />
        <Route path="/review-parsed" element={<ReviewParsed />} />
        <Route path="/bhk-setup" element={<BHKSetup />} />
        <Route path="/registry" element={<Registry />} />
        <Route path="/owner-review/:id" element={<OwnerReview />} />
        <Route path="/verify-costs" element={<VerifyCosts />} />
        <Route path="/sign" element={<Sign />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/moveout" element={<MoveOut />} />
        <Route path="/settlement" element={<Settlement />} />
      </Routes>
    </BrowserRouter>
  )
}
