import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
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
import MyAgreements from './pages/MyAgreements'
import ProtectionScore from './pages/ProtectionScore'
import AdminAnalytics from './pages/AdminAnalytics'
import './index.css'

export default function App() {
  return (
    <AuthProvider>
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
          <Route path="/my-agreements" element={<MyAgreements />} />
          <Route path="/protection-score" element={<ProtectionScore />} />
          <Route path="/admin/analytics" element={<AdminAnalytics />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
