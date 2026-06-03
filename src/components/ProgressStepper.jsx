const STEPS = [
  { label: 'Upload', path: '/upload' },
  { label: 'Review', path: '/review-parsed' },
  { label: 'Registry', path: '/registry' },
  { label: 'Owner', path: '/owner-review' },
  { label: 'Verify', path: '/verify-costs' },
  { label: 'Sign', path: '/sign' },
]

export default function ProgressStepper({ currentStep }) {
  return (
    <div className="flex items-center gap-0 mb-8 overflow-x-auto">
      {STEPS.map((step, i) => {
        const state = i < currentStep ? 'done' : i === currentStep ? 'active' : 'upcoming'
        return (
          <div key={step.label} className="flex items-center">
            <div className="flex flex-col items-center">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-all
                ${state === 'done' ? 'bg-[#2E9E6B] border-[#2E9E6B] text-white' : ''}
                ${state === 'active' ? 'bg-navy border-navy text-white' : ''}
                ${state === 'upcoming' ? 'bg-white border-gray-300 text-gray-400' : ''}
              `}>
                {state === 'done' ? (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : i + 1}
              </div>
              <span className={`text-[10px] mt-1 font-medium whitespace-nowrap
                ${state === 'active' ? 'text-navy' : 'text-gray-400'}
              `}>{step.label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`w-8 h-px mb-5 mx-1 ${i < currentStep ? 'bg-[#2E9E6B]' : 'bg-gray-200'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}
