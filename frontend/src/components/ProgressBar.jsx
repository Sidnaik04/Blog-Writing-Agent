export default function ProgressBar({
  activeStep,
  completedSteps = [],
  isError = false,
}) {
  // Define 5 steps with 20% each
  const steps = [
    { name: "router", label: "Router", progress: 20 },
    { name: "research", label: "Research", progress: 40 },
    { name: "orchestrator", label: "Orchestrator", progress: 60 },
    { name: "worker", label: "Worker", progress: 80 },
    { name: "reducer", label: "Finisher", progress: 100 },
  ];

  // Find current progress based on active step
  const currentStepIndex = activeStep
    ? steps.findIndex((s) => s.name === activeStep)
    : -1;
  const currentStep = currentStepIndex >= 0 ? steps[currentStepIndex] : null;
  const progressPercent = isError ? 0 : currentStep ? currentStep.progress : 0;

  return (
    <div className="space-y-4">
      {/* Progress header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isError ? (
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#ef4444"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          ) : progressPercent === 100 ? (
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#2d5a27"
              strokeWidth="2"
            >
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          ) : (
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#2d5a27"
              strokeWidth="2"
              className="animate-bounce"
            >
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8" />
            </svg>
          )}
          <span className="text-xs font-semibold text-ink-2 uppercase tracking-wide">
            {isError ? "Generation Failed" : "Generating"}
          </span>
        </div>
        <span className="text-sm font-mono font-bold text-accent">
          Step {currentStepIndex + 1}/5
        </span>
      </div>

      {/* Main progress bar */}
      <div className="relative h-3 bg-rule/15 rounded-full overflow-hidden border border-rule/30 shadow-inner">
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${
            isError
              ? "bg-gradient-to-r from-red-400 to-red-500"
              : "bg-gradient-to-r from-accent to-accent-light"
          }`}
          style={{
            width: `${progressPercent}%`,
            boxShadow:
              !isError && progressPercent > 0 && progressPercent < 100
                ? `0 0 20px rgba(45, 90, 39, 0.6), inset 0 0 10px rgba(255,255,255,0.3)`
                : "none",
          }}
        />

        {/* Shimmer effect */}
        {!isError && progressPercent > 0 && progressPercent < 100 && (
          <div
            className="absolute top-0 bottom-0 w-1/4 bg-gradient-to-r from-transparent via-white to-transparent opacity-40"
            style={{
              left: `${progressPercent}%`,
              animation: "shimmer 1.5s ease-in-out infinite",
            }}
          />
        )}
      </div>

      {/* Percentage and current step */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-ink-3 font-medium">
          {currentStep ? currentStep.label : ""}
        </span>
        <span className="font-mono font-bold text-accent">
          {progressPercent}%
        </span>
      </div>

      {/* Step indicators */}
      <div className="flex gap-1">
        {steps.map((step, i) => {
          const isCompleted = completedSteps.includes(step.name);
          const isActive = i === currentStepIndex;

          return (
            <div
              key={step.name}
              className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                isError
                  ? "bg-red-400"
                  : isCompleted
                    ? "bg-accent"
                    : isActive
                      ? "bg-accent-light ring-1 ring-accent"
                      : "bg-rule/20"
              }`}
              style={{
                boxShadow:
                  isActive && !isError
                    ? `0 0 8px rgba(45, 90, 39, 0.5)`
                    : "none",
              }}
            />
          );
        })}
      </div>

      <style>{`
        @keyframes shimmer {
          0%, 100% {
            transform: translateX(-100%);
            opacity: 0;
          }
          50% {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
