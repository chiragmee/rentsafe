import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import TopAppBar from '../components/TopAppBar'
import { useAuth } from '../contexts/AuthContext'
import { getMyAgreements } from '../services/supabase'

function fmt(n) { return n ? `₹${Number(n).toLocaleString('en-IN')}` : '—' }
function fmtDate(d) { return d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—' }

function addMonths(date, months) {
  if (!date || !months) return null
  const d = new Date(date)
  d.setMonth(d.getMonth() + months)
  return d
}

export default function MyAgreements() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [agreements, setAgreements] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) { navigate('/'); return }
    getMyAgreements()
      .then(setAgreements)
      .finally(() => setLoading(false))
  }, [user])

  return (
    <div className="min-h-screen bg-paper">
      <TopAppBar />
      <div className="max-w-3xl mx-auto px-4 py-10">

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="page-title mb-1">My Agreements</h1>
            <p className="text-sm text-gray-400">{user?.email}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => navigate('/upload')} className="btn-primary text-sm py-2 px-4">
              + New Agreement
            </button>
            <button onClick={signOut} className="btn-ghost text-sm border border-gray-200">
              Sign out
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex gap-1 justify-center py-16">
            {[0,1,2].map(i => <div key={i} className="w-2 h-2 bg-navy rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
          </div>
        ) : agreements.length === 0 ? (
          <div className="card text-center py-16">
            <div className="w-12 h-12 bg-navy/5 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0F1B2D" strokeWidth="1.5">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            </div>
            <p className="font-display font-semibold text-navy text-lg mb-2">No agreements yet</p>
            <p className="text-sm text-gray-400 mb-6">Upload your first rent agreement to get started.</p>
            <button onClick={() => navigate('/upload')} className="btn-primary mx-auto">
              Upload Agreement →
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {agreements.map(ag => {
              const endDate = addMonths(ag.tenure_start_date, ag.tenure_months)
              const daysLeft = endDate ? Math.ceil((endDate - Date.now()) / (1000 * 60 * 60 * 24)) : null
              const isActive = daysLeft !== null && daysLeft > 0

              return (
                <div
                  key={ag.id}
                  onClick={() => navigate(`/dashboard?id=${ag.id}`)}
                  className="card hover:border-navy hover:shadow-low transition-all cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isActive ? 'bg-[#2E9E6B]' : 'bg-gray-300'}`} />
                        <p className="font-semibold text-ink truncate">{ag.property_address ?? 'Unknown property'}</p>
                      </div>
                      <p className="text-xs text-gray-400 ml-4">
                        {ag.tenant_name} · {ag.owner_name}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-mono font-semibold text-sm text-ink">{fmt(ag.monthly_rent)}<span className="text-gray-400 font-normal">/mo</span></p>
                      <p className="text-xs text-gray-400 mt-0.5">Deposit {fmt(ag.deposit_amount)}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                    <p className="text-xs text-gray-400">
                      {fmtDate(ag.tenure_start_date)} → {endDate ? fmtDate(endDate.toISOString()) : '—'}
                    </p>
                    {daysLeft !== null && (
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                        daysLeft <= 0 ? 'bg-gray-100 text-gray-400' :
                        daysLeft <= 45 ? 'bg-[#E8A020]/15 text-[#E8A020]' :
                        'bg-[#2E9E6B]/10 text-[#2E9E6B]'
                      }`}>
                        {daysLeft <= 0 ? 'Expired' : `${daysLeft}d left`}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
