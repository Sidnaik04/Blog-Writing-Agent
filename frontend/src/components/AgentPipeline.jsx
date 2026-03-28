import {
  RotateCw,
  Search,
  BookOpen,
  PenTool,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Circle,
} from "lucide-react";

// Maps LangGraph node names to display info with lucide icons
const AGENT_NODES = {
  router: {
    label: "Router",
    desc: "Analyzing topic & deciding research mode",
    Icon: RotateCw,
  },
  research: {
    label: "Researcher",
    desc: "Searching the web via Tavily",
    Icon: Search,
  },
  orchestrator: {
    label: "Planner",
    desc: "Creating structured blog outline",
    Icon: BookOpen,
  },
  worker: {
    label: "Writers",
    desc: "Drafting sections in parallel",
    Icon: PenTool,
  },
  reducer: {
    label: "Finisher",
    desc: "Merging, adding images & polishing",
    Icon: Sparkles,
  },
};

const FALLBACK_STEPS = [
  "router",
  "research",
  "orchestrator",
  "worker",
  "reducer",
];

function guessStepFromData(data) {
  if (!data || typeof data !== "object") return null;
  const keys = Object.keys(data);
  // LangGraph stream updates: { node_name: { ...state } }
  for (const k of keys) {
    if (AGENT_NODES[k]) return k;
  }
  // Check nested keys
  for (const k of keys) {
    if (typeof data[k] === "object") {
      const inner = Object.keys(data[k] || {});
      for (const ik of inner) {
        if (AGENT_NODES[ik]) return ik;
      }
    }
  }
  return null;
}

export default function AgentPipeline({
  steps,
  activeStep,
  completedSteps,
  errorStep,
}) {
  const displaySteps = FALLBACK_STEPS;

  return (
    <div className="space-y-3">
      {displaySteps.map((key, i) => {
        const meta = AGENT_NODES[key] || {
          label: key,
          desc: "",
          Icon: Circle,
        };
        const { Icon } = meta;
        const isDone = completedSteps.includes(key);
        const isActive = activeStep === key;
        const isError = errorStep === key;

        return (
          <div
            key={key}
            className={`group relative rounded-lg border px-4 py-3 transition-all duration-300 ${
              isActive
                ? "border-accent bg-accent/5 shadow-md shadow-accent/30"
                : isDone
                  ? "border-accent/30 bg-accent/5"
                  : isError
                    ? "border-red-400 bg-red-50"
                    : "border-rule/30 bg-surface-2"
            }`}
          >
            <div className="flex items-start gap-3">
              {/* Icon with size constraints */}
              <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center pt-0.5">
                {isActive && (
                  <div className="relative w-5 h-5 flex items-center justify-center">
                    <Icon
                      size={20}
                      className="text-accent animate-spin"
                      strokeWidth={2}
                    />
                  </div>
                )}
                {isDone && (
                  <CheckCircle2
                    size={20}
                    className="text-accent"
                    strokeWidth={2.5}
                  />
                )}
                {isError && (
                  <AlertCircle
                    size={20}
                    className="text-red-600"
                    strokeWidth={2}
                  />
                )}
                {!isActive && !isDone && !isError && (
                  <Circle size={20} className="text-rule/40" strokeWidth={2} />
                )}
              </div>

              {/* Text content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3
                    className={`text-sm font-semibold ${
                      isActive
                        ? "text-accent"
                        : isDone
                          ? "text-ink-2"
                          : isError
                            ? "text-red-600"
                            : "text-ink-3"
                    }`}
                  >
                    {meta.label}
                  </h3>
                  <span className="text-xs text-rule/50 font-mono">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>
                {meta.desc && (
                  <p
                    className={`text-xs mt-0.5 ${
                      isActive
                        ? "text-ink-3"
                        : isDone
                          ? "text-ink-4"
                          : "text-ink-4"
                    }`}
                  >
                    {meta.desc}
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Add custom animation styles
export { guessStepFromData, AGENT_NODES };
