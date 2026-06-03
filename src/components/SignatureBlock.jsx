import { useState } from 'react'

export default function SignatureBlock({ role, name, phone, onSigned, alreadySigned, signedAt }) {
  const [otp, setOtp] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSendOtp() {
    setLoading(true)
    await new Promise((r) => setTimeout(r, 600))
    setSent(true)
    setLoading(false)
  }

  async function handleConfirm() {
    if (otp.length !== 4) { setError('Enter a 4-digit OTP'); return }
    setLoading(true)
    await new Promise((r) => setTimeout(r, 500))
    onSigned()
    setLoading(false)
  }

  if (alreadySigned) {
    return (
      <div className="card border-[#2E9E6B]/30 bg-[#2E9E6B]/5">
        <div className="flex items-center justify-between">
          <div>
            <p className="section-label mb-1">{role} Signature</p>
            <p className="font-display font-semibold text-navy">{name}</p>
          </div>
          <div className="text-right">
            <span className="status-locked">Signed</span>
            {signedAt && (
              <p className="text-xs text-gray-400 mt-1">
                {new Date(signedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
              </p>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      <p className="section-label mb-3">{role} Signature</p>
      <p className="font-semibold text-navy mb-1">{name}</p>
      <p className="text-sm text-gray-500 mb-4">{phone}</p>

      {!sent ? (
        <button onClick={handleSendOtp} disabled={loading} className="btn-primary w-full justify-center">
          {loading ? 'Sending…' : `Send OTP & Sign as ${role}`}
        </button>
      ) : (
        <div className="space-y-3">
          <div>
            <label className="section-label mb-1.5 block">Enter OTP</label>
            <input
              type="tel"
              maxLength={4}
              value={otp}
              onChange={(e) => { setOtp(e.target.value.replace(/\D/g, '')); setError('') }}
              placeholder="4-digit OTP"
              className="input-field text-center text-xl tracking-widest font-mono w-32"
            />
            {error && <p className="text-xs text-[#E05252] mt-1">{error}</p>}
            <p className="text-xs text-gray-400 mt-1">Enter any 4-digit number for MVP</p>
          </div>
          <button onClick={handleConfirm} disabled={loading} className="btn-primary">
            {loading ? 'Confirming…' : 'Confirm & Sign'}
          </button>
        </div>
      )}
    </div>
  )
}
