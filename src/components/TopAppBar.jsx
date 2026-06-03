import { Link, useNavigate } from 'react-router-dom'

function ShieldIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  )
}

export default function TopAppBar({ agreementId }) {
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-navy font-display font-semibold text-lg">
          <ShieldIcon />
          <span>RentSafe</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {agreementId && (
            <>
              <Link to={`/dashboard?id=${agreementId}`} className="btn-ghost text-gray-600 text-sm px-3 py-1.5">
                Dashboard
              </Link>
              <Link to={`/registry?id=${agreementId}`} className="btn-ghost text-gray-600 text-sm px-3 py-1.5">
                Registry
              </Link>
            </>
          )}
        </nav>

        <button className="btn-primary text-xs px-3 py-1.5 gap-1.5">
          <ShieldIcon />
          Guardian Protocol
        </button>
      </div>
    </header>
  )
}
