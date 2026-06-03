import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

export default function AuthModal({ onClose, redirectTo, role }) {
  const { signInWithMagicLink } = useAuth()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email.includes('@')) { setError('Enter a valid email address'); return }
    setLoading(true)
    setError('')
    try {
      await signInWithMagicLink(email, redirectTo)
      setSent(true)
    } catch (err) {
      setError(err.message ?? 'Something went wrong. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-lg max-w-sm w-full p-6 shadow-lg" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="section-label mb-0.5">{role === 'owner' ? 'Owner' : 'Tenant'}</p>
            <h2 className="font-display font-semibold text-navy text-xl">Sign in to continue</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {!sent ? (
          <>
            <p className="text-sm text-gray-500 mb-5">
              We'll send a magic link to your email. Click it to sign in — no password needed.
            </p>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 mb-1.5 block">Email address</label>
                <input
                  type="email"
                  autoFocus
                  className="input-field"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError('') }}
                />
                {error && <p className="text-xs text-[#E05252] mt-1">{error}</p>}
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5">
                {loading ? 'Sending…' : 'Send Magic Link'}
              </button>
            </form>

            <div className="mt-4 pt-4 border-t border-gray-100">
              <button onClick={onClose} className="text-xs text-gray-400 hover:text-gray-600 w-full text-center transition-colors">
                Continue without signing in →
              </button>
            </div>
          </>
        ) : (
          <div className="text-center py-4">
            <div className="w-12 h-12 bg-[#2E9E6B]/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2E9E6B" strokeWidth="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
            </div>
            <h3 className="font-display font-semibold text-navy text-lg mb-2">Check your email</h3>
            <p className="text-sm text-gray-500 mb-1">We sent a magic link to</p>
            <p className="font-semibold text-ink text-sm mb-4">{email}</p>
            <p className="text-xs text-gray-400">Click the link in the email to sign in. You can close this.</p>
            <button onClick={onClose} className="btn-ghost text-sm mt-4 w-full justify-center">
              Continue without signing in →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
