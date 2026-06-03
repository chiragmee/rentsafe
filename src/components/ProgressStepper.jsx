const STEPS = [
  { label: 'Upload' },
  { label: 'Review' },
  { label: 'Registry' },
  { label: 'Owner' },
  { label: 'Verify' },
  { label: 'Sign' },
]

export default function ProgressStepper({ currentStep }) {
  return (
    <div className="flex items-center justify-between mb-8 w-full">
      {STEPS.map((step, i) => {
        const state = i < currentStep ? 'done' : i === currentStep ? 'active' : 'upcoming'
        const isLast = i === STEPS.length - 1
        return (
          <div key={step.label} className="flex items-center flex-1 last:flex-none">
            {/* Circle */}
            <div className="flex flex-col items-center flex-shrink-0">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-all
                ${state === 'done'    ? 'bg-[#2E9E6B] border-[#2E9E6B] text-white' : ''}
                ${state === 'active'  ? 'bg-navy border-navy text-white' : ''}
                ${state === 'upcoming'? 'bg-white border-gray-300 text-gray-400' : ''}
              `}>
                {state === 'done'
                  ? <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                  : i + 1}
              </div>
              {/* Label: visible on sm+, active label always visible */}
              <span className={`text-[9px] mt-1 font-medium whitespace-nowrap leading-none
                ${state === 'active' ? 'text-navy' : 'text-gray-400'}
                ${state === 'active' ? '' : 'hidden sm:block'}
              `}>{step.label}</span>
            </div>
            {/* Connector */}
            {!isLast && (
              <div className={`flex-1 h-px mx-1 mb-4 ${i < currentStep ? 'bg-[#2E9E6B]' : 'bg-gray-200'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}
