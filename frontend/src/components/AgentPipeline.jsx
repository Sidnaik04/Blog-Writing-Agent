// Maps LangGraph node names (from graph.stream updates) to display info.
// The keys match what your langgraph_service nodes are named.
// Adjust AGENT_NODES keys to match your actual node names.
const AGENT_NODES = {
  planner:   { label: "Planner",  desc: "Researching topic & outlining sections",    icon: "📋" },
  researcher:{ label: "Researcher",desc: "Gathering evidence & references",          icon: "🔍" },
  writer:    { label: "Writer",   desc: "Drafting content from the outline",          icon: "✍️" },
  editor:    { label: "Editor",   desc: "Refining tone, flow & quality",              icon: "✅" },
};

const FALLBACK_STEPS = ["planner", "writer", "editor"];

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

export default function AgentPipeline({ steps, activeStep, completedSteps, errorStep }) {
  // steps = array of step keys e.g. ["planner","writer","editor"]
  const displaySteps = steps.length > 0 ? steps : FALLBACK_STEPS;

  return (
    <div className="space-y-2">
      {displaySteps.map((key, i) => {
        const meta = AGENT_NODES[key] || { label: key, desc: "", icon: "⚙️" };
        const isDone = completedSteps.includes(key);
        const isActive = activeStep === key;
        const isError = errorStep === key;
        const isPending = !isDone && !isActive && !isError;

        return (
          <div
            key={key}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-all duration-300 ${
              isActive  ? "border-accent/40 bg-accent-muted"  :
              isDone    ? "border-rule bg-surface-2"           :
              isError   ? "border-red-200 bg-red-50"           :
                          "border-rule bg-surface"
            }`}
          >
            {/* Status indicator */}
            <div className="w-5 h-5 flex-shrink-0 flex items-center justify-center">
              {isDone && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2d5a27" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              )}
              {isActive && (
                <span className="flex gap-0.5">
                  {[0,1,2].map(i => (
                    <span key={i} className="step-dot w-1.5 h-1.5 rounded-full bg-accent block" />
                  ))}
                </span>
              )}
              {isError && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              )}
              {isPending && (
                <span className="w-2 h-2 rounded-full bg-rule block" />
              )}
            </div>

            {/* Label */}
            <span className={`text-sm font-medium ${
              isActive ? "text-accent" :
              isDone   ? "text-ink-2"  :
              isError  ? "text-red-600":
                         "text-ink-4"
            }`}>
              {meta.icon} {meta.label}
            </span>

            {/* Description */}
            <span className="text-xs text-ink-4 flex-1">{meta.desc}</span>

            {/* Step number */}
            <span className="text-xs text-ink-4 font-mono">{String(i + 1).padStart(2, "0")}</span>
          </div>
        );
      })}
    </div>
  );
}

export { guessStepFromData, AGENT_NODES };
