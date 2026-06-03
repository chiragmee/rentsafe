import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import TopAppBar from '../components/TopAppBar'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../services/supabase'

const ADMIN_EMAIL = 'chirag.mewara.18@gmail.com'

const FUNNEL_EVENTS = [
  { key: 'agreement_uploaded',       label: 'Agreements Uploaded' },
  { key: 'agreement_parsed',         label: 'Agreements Parsed' },
  { key: 'review_completed',         label: 'Reviews Completed' },
  { key: 'bhk_setup_completed',      label: 'BHK Setups Completed' },
  { key: 'registry_started',         label: 'Registries Started' },
  { key: 'registry_completed',       label: 'Registries Completed' },
  { key: 'protection_score_generated', label: 'Protection Scores Generated' },
  { key: 'protection_report_downloaded', label: 'Reports Downloaded' },
  { key: 'owner_invited',            label: 'Owners Invited' },
  { key: 'owner_opened',             label: 'Owners Opened Link' },
  { key: 'owner_signed',             label: 'Owners Signed' },
  { key: 'moveout_started',          label: 'Move-Outs Started' },
  { key: 'settlement_generated',     label: 'Settlements Generated' },
  { key: 'settlement_completed',     label: 'Settlements Completed' },
]

export default function AdminAnalytics() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [counts, setCounts] = useState({})
  const [loading, setLoading] = useState(true)
  const [recentEvents, setRecentEvents] = useState([])

  useEffect(() => {
    if (user === undefined) return
    if (!user || user.email !== ADMIN_EMAIL) {
      navigate('/')
      return
    }
    loadData()
  }, [user])

  async function loadData() {
    setLoading(true)
    const { data } = await supabase
      .from('analytics_events')
      .select('event_name')
    if (data) {
      const c = {}
      data.forEach(e => { c[e.event_name] = (c[e.event_name] || 0) + 1 })
      setCounts(c)
    }
    const { data: recent } = await supabase
      .from('analytics_events')
      .select('event_name, agreement_id, created_at')
      .order('created_at', { ascending: false })
      .limit(50)
    setRecentEvents(recent ?? [])
    setLoading(false)
  }

  const topCount = counts[FUNNEL_EVENTS[0].key] || 1

  return (
    <div className="min-h-screen bg-paper">
      <TopAppBar />
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="page-title mb-1">Founder Analytics</h1>
            <p className="text-sm text-gray-400">Conversion funnel · Live data from Supabase</p>
          </div>
          <button onClick={loadData} className="btn-ghost text-sm border border-gray-200">
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="flex gap-1 justify-center py-16">
            {[0,1,2].map(i => <div key={i} className="w-2 h-2 bg-navy rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
          </div>
        ) : (
          <>
            {/* Funnel */}
            <div className="card mb-6">
              <p className="section-label mb-4">Conversion Funnel</p>
              <div className="space-y-2.5">
                {FUNNEL_EVENTS.map(({ key, label }, i) => {
                  const count = counts[key] || 0
                  const pct = Math.round((count / topCount) * 100)
                  const prevCount = i > 0 ? (counts[FUNNEL_EVENTS[i-1].key] || 0) : null
                  const dropoff = prevCount && prevCount > 0 ? Math.round(((prevCount - count) / prevCount) * 100) : null

                  return (
                    <div key={key}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-gray-600">{label}</span>
                        <div className="flex items-center gap-3">
                          {dropoff !== null && dropoff > 0 && (
                            <span className="text-xs text-[#E05252]">−{dropoff}%</span>
                          )}
                          <span className="font-semibold text-ink w-8 text-right">{count}</span>
                        </div>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-navy rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, opacity: 1 - (i * 0.04) }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Summary stats */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              {[
                { label: 'Total Uploads', value: counts['agreement_uploaded'] || 0 },
                { label: 'Completed Registry', value: counts['registry_completed'] || 0 },
                { label: 'Owner Signed', value: counts['owner_signed'] || 0 },
              ].map(({ label, value }) => (
                <div key={label} className="card text-center py-4">
                  <p className="font-display font-bold text-3xl text-navy">{value}</p>
                  <p className="text-xs text-gray-400 mt-1">{label}</p>
                </div>
              ))}
            </div>

            {/* Recent events */}
            <div className="card">
              <p className="section-label mb-3">Recent Activity (last 50)</p>
              <div className="space-y-1.5 max-h-80 overflow-y-auto">
                {recentEvents.map((e, i) => (
                  <div key={i} className="flex items-center justify-between text-xs py-1.5 border-b border-gray-100 last:border-0">
                    <span className="font-mono text-navy bg-navy/5 px-2 py-0.5 rounded">{e.event_name}</span>
                    <span className="text-gray-400">
                      {new Date(e.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
                {recentEvents.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-4">No events yet</p>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
