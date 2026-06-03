import { useNavigate } from 'react-router-dom'
import TopAppBar from '../components/TopAppBar'

function ShieldCheckIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  )
}

function HeroMockup() {
  return (
    <div className="relative bg-white border border-gray-200 rounded-lg p-6 shadow-low max-w-sm ml-auto">
      <div className="flex items-center gap-1.5 mb-4">
        <div className="w-3 h-3 rounded-full bg-gray-200" />
        <div className="w-3 h-3 rounded-full bg-gray-200" />
        <div className="w-3 h-3 rounded-full bg-gray-200" />
        <div className="ml-auto flex items-center gap-1 text-[#2E9E6B] text-xs font-semibold">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          Secured
        </div>
      </div>
      <div className="space-y-2 mb-6">
        <div className="h-3 bg-gray-100 rounded w-2/3" />
        <div className="h-2 bg-gray-100 rounded w-full" />
        <div className="h-2 bg-gray-100 rounded w-4/5" />
        <div className="h-2 bg-gray-100 rounded w-3/5" />
      </div>
      <div className="flex items-center justify-center mb-4">
        <ShieldCheckIcon size={48} />
      </div>
      <div className="border-t border-gray-100 pt-4">
        <p className="section-label mb-1">Tenant Signature</p>
        <div className="flex items-center justify-between">
          <p className="font-display text-2xl text-gold font-semibold">Verified</p>
          <div className="w-10 h-10 bg-gold/15 border border-gold/30 rounded flex items-center justify-center text-gold">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
            </svg>
          </div>
        </div>
        <div className="border-b-2 border-dashed border-gray-200 mt-2" />
      </div>
    </div>
  )
}

function StepCard({ number, title, description, icon }) {
  return (
    <div className="card flex flex-col gap-4 p-6">
      <div className="w-10 h-10 border border-gray-200 rounded flex items-center justify-center text-navy">
        {icon}
      </div>
      <div>
        <p className="section-label mb-1">Step {String(number).padStart(2, '0')}</p>
        <h3 className="font-display text-xl font-semibold text-navy mb-2">{title}</h3>
        <p className="text-sm text-gray-500 leading-relaxed">{description}</p>
      </div>
    </div>
  )
}

export default function Landing() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen bg-paper flex flex-col">
      <TopAppBar />

      {/* Hero */}
      <section className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-16 md:py-24">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="font-display text-4xl md:text-5xl font-bold text-navy leading-tight mb-4">
              Your deposit.<br />Protected by proof.
            </h1>
            <p className="text-lg text-gray-500 mb-8 leading-relaxed">
              Upload your rent agreement. Document every item. Never lose your deposit unfairly again.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 mb-8">
              <button onClick={() => navigate('/upload')} className="btn-primary text-base px-6 py-3">
                Start as Tenant
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </button>
              <button onClick={() => navigate('/owner-review/enter')} className="btn-secondary text-base px-6 py-3">
                I'm an Owner — Review & Sign
              </button>
            </div>
            <div className="flex items-center gap-2 text-sm text-[#2E9E6B]">
              <ShieldCheckIcon size={16} />
              <span className="font-medium">Legal-grade verification. Trust Layer enabled.</span>
            </div>
          </div>
          <div className="hidden md:block">
            <HeroMockup />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-white border-t border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 md:py-20">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl font-semibold text-navy mb-3">How it works</h2>
            <p className="text-gray-500">The Guardian Protocol ensures transparency in three simple steps.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <StepCard
              number={1}
              title="Upload agreement"
              description="Securely digitize your lease into our immutable legal vault for persistent access."
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              }
            />
            <StepCard
              number={2}
              title="Document flat"
              description="Capture time-stamped evidence of the property's condition to prevent future disputes."
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
              }
            />
            <StepCard
              number={3}
              title="Both parties sign"
              description="A cryptographically secured lock is applied once both the owner and tenant verify the record."
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                </svg>
              }
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-navy text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <p className="font-display text-gold font-semibold text-lg mb-1">RentSafe</p>
            <p className="text-gray-400 text-xs">© 2024 RentSafe Guardian Protocol. All rights reserved.</p>
            <p className="text-gray-400 text-xs mt-1">Free to use. No account required.</p>
          </div>
          <div className="flex gap-6 text-sm text-gray-400">
            <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">Trust & Safety</a>
            <a href="#" className="hover:text-white transition-colors">Audit Logs</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
