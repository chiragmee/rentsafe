import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import TopAppBar from '../components/TopAppBar'
import { getAgreement, getAssets, getRooms, upsertSignature } from '../services/supabase'
import { calculateScore, saveProtectionScore } from '../services/protectionScore'
import { downloadProtectionReport } from '../services/generatePdf'
import { track } from '../services/analytics'

const CONFIDENCE_CONFIG = {
  HIGH:   { color: 'text-[#2E9E6B]', bg: 'bg-[#2E9E6B]/10', border: 'border-[#2E9E6B]/30', label: 'Strong Protection' },
  MEDIUM: { color: 'text-[#E8A020]', bg: 'bg-[#E8A020]/10', border: 'border-[#E8A020]/30', label: 'Moderate Protection' },
  LOW:    { color: 'text-[#E05252]', bg: 'bg-[#E05252]/10', border: 'border-[#E05252]/20', label: 'Weak Protection' },
}

function ScoreRing({ score }) {
  const radius = 54
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference
  const color = score >= 90 ? '#2E9E6B' : score >= 70 ? '#E8A020' : '#E05252'

  return (
    <div className="relative w-36 h-36 mx-auto">
      <svg width="144" height="144" className="-rotate-90">
        <circle cx="72" cy="72" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="10" />
        <circle cx="72" cy="72" r={radius} fill="none" stroke={color} strokeWidth="10"
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s ease' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display font-bold text-3xl text-navy">{score}</span>
        <span className="text-xs text-gray-400 font-medium">/ 100</span>
      </div>
    </div>
  )
}

function CoverageRow({ label, value, max, color }) {
  const pct = Math.round((value / max) * 100)
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-600">{label}</span>
        <span className="font-semibold text-ink">{value}/{max} pts</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  )
}

export default function ProtectionScore() {
  const [params] = useSearchParams()
  const id = params.get('id')
  const navigate = useNavigate()
  const [agreement, setAgreement] = useState(null)
  const [scoreData, setScoreData] = useState(null)
  const [assets, setAssets] = useState([])
  const [rooms, setRooms] = useState([])
  const [sending, setSending] = useState(false)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    if (!id) return
    Promise.all([getAgreement(id), getAssets(id), getRooms(id)]).then(async ([ag, items, rms]) => {
      setAgreement(ag)
      setAssets(items)
      setRooms(rms)
      const hasVideo = !!ag.walkthrough_video_url
      const calculated = calculateScore({ assets: items, rooms: rms, hasVideo })
      setScoreData(calculated)
      await saveProtectionScore(id, {
        score: calculated.score,
        room_coverage_percent: calculated.room_coverage_percent,
        asset_coverage_percent: calculated.asset_coverage_percent,
        photo_coverage_percent: calculated.photo_coverage_percent,
        walkthrough_video_present: hasVideo,
        estimated_recovery_confidence: calculated.estimated_recovery_confidence,
      })
      track('protection_score_generated', id, { score: calculated.score })
    })
  }, [id])

  async function handleInviteOwner() {
    setSending(true)
    await upsertSignature({
      agreement_id: id,
      registry_status: 'Pending Owner',
      owner_notified_at: new Date().toISOString(),
    })
    track('owner_invited', id)
    navigate(`/sign?id=${id}`)
  }

  async function handleDownload() {
    setDownloading(true)
    track('protection_report_downloaded', id)
    await downloadProtectionReport(id, scoreData)
    setDownloading(false)
  }

  if (!agreement || !scoreData) return (
    <div className="min-h-screen bg-paper flex items-center justify-center">
      <div className="flex gap-1">{[0,1,2].map(i => (
        <div key={i} className="w-2 h-2 bg-navy rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
      ))}</div>
    </div>
  )

  const conf = CONFIDENCE_CONFIG[scoreData.estimated_recovery_confidence]
  const { breakdown } = scoreData

  return (
    <div className="min-h-screen bg-paper">
      <TopAppBar agreementId={id} />
      <div className="max-w-lg mx-auto px-4 py-10">

        {/* Hero score card */}
        <div className={`card border ${conf.border} ${conf.bg} mb-6 text-center py-8`}>
          <p className="section-label mb-4">Deposit Protection Score</p>
          <ScoreRing score={scoreData.score} />
          <div className={`inline-flex items-center gap-2 mt-4 px-4 py-1.5 rounded-full border ${conf.border} ${conf.bg}`}>
            <div className={`w-2 h-2 rounded-full ${scoreData.estimated_recovery_confidence === 'HIGH' ? 'bg-[#2E9E6B]' : scoreData.estimated_recovery_confidence === 'MEDIUM' ? 'bg-[#E8A020]' : 'bg-[#E05252]'}`} />
            <span className={`text-sm font-semibold ${conf.color}`}>{conf.label}</span>
          </div>
          <p className="text-sm text-gray-500 mt-3 max-w-xs mx-auto">
            {scoreData.score >= 90
              ? 'This registry contains strong evidence for future deposit disputes.'
              : scoreData.score >= 70
              ? 'Good coverage. Add photos and a walkthrough video to strengthen your case.'
              : 'Add conditions, photos, and a walkthrough video to improve your score.'}
          </p>
        </div>

        {/* Coverage breakdown */}
        <div className="card mb-6">
          <p className="section-label mb-4">Coverage Breakdown</p>
          <div className="space-y-4">
            <CoverageRow label="Rooms Documented" value={breakdown.roomScore} max={30} color="#2E9E6B" />
            <CoverageRow label="Assets Documented" value={breakdown.assetScore} max={30} color="#D4A853" />
            <CoverageRow label="Photos Uploaded" value={breakdown.photoScore} max={20} color="#0F1B2D" />
            <CoverageRow label="Walkthrough Video" value={breakdown.videoScore} max={20} color="#6366f1" />
          </div>
        </div>

        {/* Checklist */}
        <div className="card mb-8">
          <p className="section-label mb-3">What's Documented</p>
          <div className="space-y-2">
            {[
              { label: 'Rooms documented', done: breakdown.roomScore >= 20 },
              { label: 'Assets documented', done: breakdown.assetScore >= 20 },
              { label: 'Photos uploaded', done: breakdown.photoScore >= 10 },
              { label: 'Walkthrough video recorded', done: breakdown.videoScore > 0 },
            ].map(({ label, done }) => (
              <div key={label} className="flex items-center gap-2.5 text-sm">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${done ? 'bg-[#2E9E6B]' : 'bg-gray-200'}`}>
                  {done
                    ? <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                    : <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                  }
                </div>
                <span className={done ? 'text-ink' : 'text-gray-400'}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <button onClick={handleDownload} disabled={downloading} className="btn-secondary w-full justify-center py-3 gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            {downloading ? 'Generating…' : 'Download Protection Report'}
          </button>
          <button onClick={handleInviteOwner} disabled={sending} className="btn-primary w-full justify-center py-3 gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
            {sending ? 'Sending…' : 'Invite Owner to Strengthen Evidence →'}
          </button>
        </div>
      </div>
    </div>
  )
}
