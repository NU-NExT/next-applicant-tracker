const STEPS = ["Resume", "Profile", "General Questions", "Position Questions", "Review"] as const;

type WizardStepperProps = {
  currentStep: number;
};

export function WizardStepper({ currentStep }: WizardStepperProps) {
  return (
    <nav className="flex items-center justify-center gap-2">
      {STEPS.map((label, i) => {
        const isActive = i === currentStep;
        const isCompleted = i < currentStep;
        return (
          <div key={label} className="flex items-center gap-2">
            {i > 0 && (
              <div
                className={`h-px w-8 ${isCompleted ? "bg-[#1f6f5f]" : "bg-[#c7c7c7]"}`}
              />
            )}
            <div className="flex items-center gap-1.5">
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium ${
                  isActive
                    ? "bg-[#1f6f5f] text-white"
                    : isCompleted
                      ? "bg-[#1f6f5f]/20 text-[#1f6f5f]"
                      : "bg-[#e5e5e5] text-[#888]"
                }`}
              >
                {isCompleted ? "\u2713" : i + 1}
              </span>
              <span
                className={`text-sm ${
                  isActive ? "font-semibold text-[#1f1f1f]" : "text-[#666]"
                }`}
              >
                {label}
              </span>
            </div>
          </div>
        );
      })}
    </nav>
  );
}
