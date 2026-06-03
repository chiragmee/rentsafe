import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import TopAppBar from '../components/TopAppBar'
import AuthModal from '../components/AuthModal'
import { useAuth } from '../contexts/AuthContext'

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

function FairDeductionSimulator({ onProtect }) {
  const [deposit, setDeposit] = useState('')
  const [rent, setRent] = useState('')
  const [damagedItems, setDamagedItems] = useState(0)
  const [missingItems, setMissingItems] = useState(0)
  const [ownerClaim, setOwnerClaim] = useState('')
  const [months, setMonths] = useState(11)

  const dep = +deposit || 0
  const mo = +rent || 0

  // Fair deduction calculation using standard depreciation
  const depreciationFactor = Math.max(0.3, 1 - (months / 12) * 0.15) // 15%/yr depreciation
  const fairDamage = Math.round(damagedItems * 3000 * depreciationFactor)
  const fairMissing = Math.round(missingItems * 2500)
  const fairDeduction = mo + fairDamage + fairMissing
  const fairRefund = Math.max(0, dep - fairDeduction)
  const claim = +ownerClaim || 0
  const excess = claim > fairDeduction ? claim - fairDeduction : 0
  const hasResult = dep > 0 && mo > 0

  return (
    <div className="max-w-2xl mx-auto card border-navy/10">
      <div className="grid sm:grid-cols-2 gap-4 mb-6">
        {[
          { label: 'Security Deposit (₹)', value: deposit, setter: setDeposit, placeholder: '50000' },
          { label: 'Monthly Rent (₹)', value: rent, setter: setRent, placeholder: '13000' },
        ].map(({ label, value, setter, placeholder }) => (
          <div key={label}>
            <label className="text-xs text-gray-500 mb-1.5 block">{label}</label>
            <input type="number" className="input-field" placeholder={placeholder}
              value={value} onChange={e => setter(e.target.value)} />
          </div>
        ))}
        <div>
          <label className="text-xs text-gray-500 mb-1.5 block">Tenancy Duration (months)</label>
          <input type="number" min={1} max={60} className="input-field" value={months}
            onChange={e => setMonths(+e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1.5 block">What Owner is Claiming (₹)</label>
          <input type="number" className="input-field" placeholder="e.g. 25000"
            value={ownerClaim} onChange={e => setOwnerClaim(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1.5 block">Damaged Items (count)</label>
          <input type="number" min={0} max={20} className="input-field" value={damagedItems}
            onChange={e => setDamagedItems(+e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1.5 block">Missing Items (count)</label>
          <input type="number" min={0} max={20} className="input-field" value={missingItems}
            onChange={e => setMissingItems(+e.target.value)} />
        </div>
      </div>

      {hasResult ? (
        <div className="border-t border-gray-100 pt-5">
          <div className="grid sm:grid-cols-3 gap-4 mb-5">
            <div className="text-center p-4 bg-[#2E9E6B]/8 border border-[#2E9E6B]/20 rounded">
              <p className="text-xs text-gray-500 mb-1">Fair Deduction</p>
              <p className="font-display font-bold text-xl text-[#2E9E6B]">
                ₹{fairDeduction.toLocaleString('en-IN')}
              </p>
              <p className="text-xs text-gray-400 mt-1">Last rent + damage (depreciated)</p>
            </div>
            <div className="text-center p-4 bg-[#2E9E6B]/8 border border-[#2E9E6B]/20 rounded">
              <p className="text-xs text-gray-500 mb-1">You Should Get Back</p>
              <p className="font-display font-bold text-xl text-[#2E9E6B]">
                ₹{fairRefund.toLocaleString('en-IN')}
              </p>
              <p className="text-xs text-gray-400 mt-1">Based on fair calculation</p>
            </div>
            {claim > 0 && (
              <div className={`text-center p-4 rounded border ${excess > 0 ? 'bg-[#E05252]/8 border-[#E05252]/20' : 'bg-gray-50 border-gray-200'}`}>
                <p className="text-xs text-gray-500 mb-1">Potential Excess Deduction</p>
                <p className={`font-display font-bold text-xl ${excess > 0 ? 'text-[#E05252]' : 'text-[#2E9E6B]'}`}>
                  {excess > 0 ? `₹${excess.toLocaleString('en-IN')}` : 'None'}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {excess > 0 ? 'Owner may be overcharging' : 'Owner claim looks fair'}
                </p>
              </div>
            )}
          </div>
          {excess > 0 && (
            <div className="text-center">
              <p className="text-sm text-gray-500 mb-3">
                Protect yourself with documented evidence — dispute this with proof.
              </p>
              <button onClick={onProtect} className="btn-primary px-6 py-2.5 mx-auto">
                Protect My Deposit →
              </button>
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-gray-400 text-center pt-2">Enter deposit and rent to see your calculation.</p>
      )}
    </div>
  )
}

export default function Landing() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [authModal, setAuthModal] = useState(null) // null | { role, redirectTo }

  function handleTenantClick() {
    if (user) { navigate('/upload'); return }
    setAuthModal({ role: 'tenant', redirectTo: `${window.location.origin}/upload` })
  }

  function handleOwnerClick() {
    if (user) { navigate('/owner-review/enter'); return }
    setAuthModal({ role: 'owner', redirectTo: `${window.location.origin}/owner-review/enter` })
  }

  return (
    <div className="min-h-screen bg-paper flex flex-col">
      {authModal && (
        <AuthModal
          role={authModal.role}
          redirectTo={authModal.redirectTo}
          onClose={() => {
            setAuthModal(null)
            navigate(authModal.role === 'owner' ? '/owner-review/enter' : '/upload')
          }}
        />
      )}
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
              <button onClick={handleTenantClick} className="btn-primary text-base px-6 py-3">
                Start as Tenant
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </button>
              <button onClick={handleOwnerClick} className="btn-secondary text-base px-6 py-3">
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

      {/* Fair Deduction Simulator */}
      <section className="border-t border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 md:py-20">
          <div className="text-center mb-10">
            <h2 className="font-display text-3xl font-semibold text-navy mb-3">Is your owner deducting too much?</h2>
            <p className="text-gray-500">Enter the numbers — find out what's fair in 30 seconds. No login required.</p>
          </div>
          <FairDeductionSimulator onProtect={handleTenantClick} />
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
