export default function RegistryStatusBadge({ status }) {
  if (status === 'Locked') {
    return (
      <span className="status-locked">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        Locked
      </span>
    )
  }
  if (status === 'Owner Non-Responsive') {
    return (
      <span className="status-pending">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        Certified Pending
      </span>
    )
  }
  if (status === 'Pending Owner') {
    return (
      <span className="status-pending">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
        Pending Owner
      </span>
    )
  }
  return (
    <span className="status-draft">
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
        <circle cx="12" cy="12" r="10" />
      </svg>
      Draft
    </span>
  )
}
