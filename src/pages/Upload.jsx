import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import TopAppBar from '../components/TopAppBar'
import ProgressStepper from '../components/ProgressStepper'
import { parseAgreementFromPdf, parseAgreement } from '../services/claude'
import { createAgreement, insertAssets } from '../services/supabase'
import { track } from '../services/analytics'

const LOADING_STEPS = [
  'Reading your agreement…',
  'Checking for compliance issues…',
  'Extracting items…',
  'Almost done…',
]

const ACCEPTED_TYPES = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/msword': 'docx',
}

// PDF → base64 for Gemini inline
function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target.result.split(',')[1])
    reader.onerror = () => reject(new Error('Could not read file'))
    reader.readAsDataURL(file)
  })
}

// DOCX → plain text using mammoth
async function extractDocxText(file) {
  const mammoth = await import('mammoth')
  const arrayBuffer = await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target.result)
    reader.onerror = () => reject(new Error('Could not read file'))
    reader.readAsArrayBuffer(file)
  })
  const result = await mammoth.extractRawText({ arrayBuffer })
  return result.value
}

export default function Upload() {
  const navigate = useNavigate()
  const inputRef = useRef()
  const [dragging, setDragging] = useState(false)
  const [loadingStep, setLoadingStep] = useState(null)
  const [error, setError] = useState('')

  async function processFile(file) {
    if (!file || !ACCEPTED_TYPES[file.type]) {
      setError('Please upload a PDF or Word (.docx) file.')
      return
    }
    if (file.size > 20 * 1024 * 1024) {
      setError('File must be under 20MB.')
      return
    }
    setError('')

    try {
      setLoadingStep(0)
      const fileType = ACCEPTED_TYPES[file.type]

      track('agreement_uploaded')
      setLoadingStep(1)

      let parsed
      if (fileType === 'pdf') {
        const pdfBase64 = await readFileAsBase64(file)
        parsed = await parseAgreementFromPdf(pdfBase64)
      } else {
        const text = await extractDocxText(file)
        parsed = await parseAgreement(text)
      }
      track('agreement_parsed')

      setLoadingStep(2)
      const agreement = await createAgreement({
        tenant_name: parsed.tenant_name,
        owner_name: parsed.owner_name,
        tenant_phone: parsed.tenant_phone,
        owner_phone: parsed.owner_phone,
        property_address: parsed.property_address,
        property_state: parsed.property_state,
        monthly_rent: parsed.monthly_rent,
        deposit_amount: parsed.deposit_amount,
        tenure_start_date: parsed.tenure_start_date,
        tenure_months: parsed.tenure_months,
        rent_escalation_percent: parsed.rent_escalation_percent,
        escalation_trigger: parsed.escalation_trigger,
        notice_period_days: parsed.notice_period_days,
        raw_agreement_text: '',
      })

      if (parsed.items?.length) {
        await insertAssets(
          parsed.items.map((item) => ({
            agreement_id: agreement.id,
            item_name: item.item_name,
            category: item.category,
            tier: item.tier,
            quantity: item.quantity ?? 1,
          }))
        )
      }

      setLoadingStep(3)
      await new Promise((r) => setTimeout(r, 400))
      navigate(`/review-parsed?id=${agreement.id}`)
    } catch (err) {
      console.error(err)
      const msg = err.message || 'Something went wrong.'
      setError(msg.includes('parse') || msg.includes('JSON')
        ? 'Could not read the agreement. Please check the file and try again, or upload a different version.'
        : msg)
      setLoadingStep(null)
    }
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragging(false)
    processFile(e.dataTransfer.files[0])
  }

  const isLoading = loadingStep !== null

  return (
    <div className="min-h-screen bg-paper">
      <TopAppBar />
      <div className="max-w-2xl mx-auto px-4 py-10">
        <ProgressStepper currentStep={0} />

        <div className="text-center mb-8">
          <h1 className="page-title mb-2">Upload Your Rent Agreement</h1>
          <p className="page-subtitle">
            We'll read your agreement and pull out the important details automatically using the Guardian Protocol.
          </p>
        </div>

        <div className="card p-2 relative">
          <div className="absolute top-4 right-4">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-[#2E9E6B] border border-[#2E9E6B]/30 bg-[#2E9E6B]/8 px-2.5 py-1 rounded">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              END-TO-END ENCRYPTED
            </span>
          </div>

          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => !isLoading && inputRef.current?.click()}
            className={`border-2 border-dashed rounded transition-colors cursor-pointer m-4 p-12 flex flex-col items-center gap-4
              ${dragging ? 'border-navy bg-navy/5' : 'border-gray-300 hover:border-navy hover:bg-gray-50'}
              ${isLoading ? 'pointer-events-none opacity-60' : ''}
            `}
          >
            <div className="text-gray-400">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <path d="M12 12v6M9 15l3-3 3 3" />
              </svg>
            </div>

            {isLoading ? (
              <div className="text-center">
                <div className="flex gap-1 justify-center mb-3">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="w-2 h-2 bg-navy rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
                <p className="text-sm font-medium text-navy">{LOADING_STEPS[loadingStep]}</p>
              </div>
            ) : (
              <>
                <div className="text-center">
                  <p className="font-semibold text-ink">Drag & drop your PDF here</p>
                  <p className="text-sm text-gray-400 mt-1">or click to browse from your device</p>
                </div>
                <button className="btn-primary mt-2" onClick={(e) => { e.stopPropagation(); inputRef.current?.click() }}>
                  Browse Files
                </button>
                <p className="text-xs text-gray-400 flex items-center gap-1.5">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <line x1="3" y1="9" x2="21" y2="9" />
                    <line x1="9" y1="21" x2="9" y2="9" />
                  </svg>
                  PDF or Word (.docx) · Max 20MB
                </p>
              </>
            )}
          </div>

          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.doc,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="hidden"
            onChange={(e) => processFile(e.target.files[0])}
          />
        </div>

        {error && (
          <div className="compliance-banner mt-4">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E05252" strokeWidth="2" className="mt-0.5 flex-shrink-0">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
            <p className="text-sm text-ink">{error}</p>
          </div>
        )}

        <div className="card mt-6 bg-gray-50 border-gray-200">
          <div className="flex gap-3">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0F1B2D" strokeWidth="2" className="mt-0.5 flex-shrink-0">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <div>
              <p className="font-semibold text-sm text-ink mb-1">How it works</p>
              <p className="text-sm text-gray-500 leading-relaxed">
                Our legal-grade AI reads standard PDF lease agreements. It will attempt to highlight key dates, financial obligations, and non-standard clauses. You will always have the opportunity to review and manually edit any extracted data before creating a secure ledger entry.
              </p>
            </div>
          </div>
        </div>
      </div>

      <footer className="bg-navy text-white mt-16">
        <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <p className="font-display text-gold font-semibold">RentSafe</p>
          <div className="flex gap-6 text-sm text-gray-400">
            <a href="#" className="hover:text-white">Terms of Service</a>
            <a href="#" className="hover:text-white">Privacy Policy</a>
            <a href="#" className="hover:text-white">Trust & Safety</a>
            <a href="#" className="hover:text-white">Audit Logs</a>
          </div>
          <p className="text-xs text-gray-500">© 2024 RentSafe Guardian Protocol. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
