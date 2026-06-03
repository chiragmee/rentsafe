export default function ComplianceBanner({ flags }) {
  if (!flags || flags.length === 0) return null
  return (
    <div className="space-y-2 mb-6">
      {flags.map((flag) => (
        <div key={flag.id} className={flag.severity === 'error' ? 'compliance-banner' : 'amber-banner'}>
          <div className={`mt-0.5 flex-shrink-0 ${flag.severity === 'error' ? 'text-[#E05252]' : 'text-[#E8A020]'}`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <div>
            <p className={`text-sm font-semibold mb-0.5 ${flag.severity === 'error' ? 'text-[#E05252]' : 'text-[#E8A020]'}`}>
              Non-Compliant Clause Detected
            </p>
            <p className="text-sm text-ink/80">{flag.message}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
