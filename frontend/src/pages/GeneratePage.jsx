import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useAuth } from "../context/AuthContext";
import { streamGenerate, createBlog } from "../services/api";
import AgentPipeline, { guessStepFromData } from "../components/AgentPipeline";
import {
  Button,
  Spinner,
  IconKey,
  IconCopy,
  IconCheck,
  IconDownload,
  IconPen,
  IconArrow,
} from "../components/ui";
import Layout from "../components/Layout";

const PHASES = {
  idle: "idle",
  running: "running",
  done: "done",
  error: "error",
};

function extractFinalContent(finalData) {
  if (!finalData) return "";
  // Try common field names from LangGraph state
  if (typeof finalData === "string") return finalData;
  return (
    finalData.final ||
    finalData.content ||
    finalData.blog ||
    finalData.result ||
    finalData.output ||
    ""
  );
}

function extractTitle(content, topic) {
  const match = content.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : topic;
}

export default function GeneratePage() {
  const { token, apiKey, setApiKey } = useAuth();
  const navigate = useNavigate();

  const [topic, setTopic] = useState("");
  const [localApiKey, setLocalApiKey] = useState(apiKey);
  const [showApiKey, setShowApiKey] = useState(!apiKey);

  const [phase, setPhase] = useState(PHASES.idle);
  const [stepKeys, setStepKeys] = useState([]);
  const [activeStep, setActiveStep] = useState(null);
  const [completedSteps, setCompletedSteps] = useState([]);
  const [errorStep, setErrorStep] = useState(null);
  const [streamLog, setStreamLog] = useState([]);

  const [finalContent, setFinalContent] = useState("");
  const [finalTopic, setFinalTopic] = useState("");
  const [view, setView] = useState("preview"); // preview | raw
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saved, setSaved] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const abortRef = useRef(false);
  const startTimeRef = useRef(null);
  const previousStepRef = useRef(null);

  // Calculate estimated remaining time (assuming ~240 seconds total)
  const estimatedTotalSeconds = 240;
  const estimatedRemaining = Math.max(
    0,
    estimatedTotalSeconds - elapsedSeconds,
  );
  const remainingMinutes = Math.floor(estimatedRemaining / 60);
  const remainingSeconds = estimatedRemaining % 60;

  // When activeStep changes, mark the previous step as completed
  useEffect(() => {
    if (phase === PHASES.running && activeStep) {
      if (previousStepRef.current && previousStepRef.current !== activeStep) {
        // New step started, mark previous as completed
        const prevStep = previousStepRef.current;
        setCompletedSteps((prev) =>
          prev.includes(prevStep) ? prev : [...prev, prevStep],
        );
      }
      previousStepRef.current = activeStep;
    }
  }, [activeStep, phase]);

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    if (!localApiKey.trim()) {
      setShowApiKey(true);
      return;
    }

    setApiKey(localApiKey.trim());
    abortRef.current = false;
    setPhase(PHASES.running);
    setStepKeys([]);
    setActiveStep(null);
    setCompletedSteps([]);
    setErrorStep(null);
    setStreamLog([]);
    setFinalContent("");
    setFinalTopic(topic.trim());

    try {
      console.log("🔄 Starting stream... about to enter for-await loop");

      for await (const { event, data } of streamGenerate(
        token,
        topic.trim(),
        localApiKey.trim(),
      )) {
        console.log("📡 Raw event received:", {
          event,
          dataType: typeof data,
          dataKeys: typeof data === "object" ? Object.keys(data) : "not-object",
        });

        if (abortRef.current) break;

        if (event === "update") {
          // Detect which node just ran
          const stepKey = guessStepFromData(data);

          console.log("📨 SSE Update event:", {
            stepKey,
            dataKeys: Object.keys(data || {}),
            data,
          });

          setStreamLog((prev) => [...prev, { event, data, stepKey }]);

          if (stepKey) {
            // Add step to list if not already there
            setStepKeys((prev) =>
              prev.includes(stepKey) ? prev : [...prev, stepKey],
            );

            // Set current step as active (useEffect will handle marking previous as completed)
            setActiveStep(stepKey);
          }
        } else if (event === "log") {
          console.log("📝 Log event from backend:", data);
        }

        if (event === "final") {
          const content = extractFinalContent(data);
          console.log("🎉 Final content received:", {
            dataKeys:
              typeof data === "object" ? Object.keys(data) : "not-object",
            contentLength: content.length,
            contentPreview: content.substring(0, 100),
          });
          setFinalContent(content);

          // ✅ CRITICAL: Set phase to done immediately when final content arrives
          setPhase(PHASES.done);

          // Mark the last active step as completed
          if (activeStep) {
            setCompletedSteps((prev) =>
              prev.includes(activeStep) ? prev : [...prev, activeStep],
            );
          }

          setActiveStep(null);
          previousStepRef.current = null;
          if (content && content.trim().length > 0) {
            try {
              const title = extractTitle(content, finalTopic);
              setSaving(true);
              createBlog(token, { title, content_md: content })
                .then((blog) => {
                  console.log("✅ Blog auto-saved:", blog.id);
                  setSaving(false);
                  setSaved(true);
                })
                .catch((err) => {
                  console.error("❌ Auto-save failed:", err.message);
                  setSaveError(err.message);
                  setSaving(false);
                });
            } catch (err) {
              console.error("❌ Error during auto-save:", err);
              setSaveError(err.message);
            }
          }
        }

        if (event === "error") {
          const msg = typeof data === "string" ? data : JSON.stringify(data);
          setErrorStep(activeStep);
          setPhase(PHASES.error);
          setStreamLog((prev) => [...prev, { event: "error", message: msg }]);
        }
      }
    } catch (err) {
      console.error("❌ Error in for-await loop:", err.message, err);
      setPhase(PHASES.error);
      setStreamLog((prev) => [
        ...prev,
        { event: "error", message: err.message },
      ]);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(finalContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([finalContent], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${finalTopic.slice(0, 50).replace(/\s+/g, "-").toLowerCase()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError("");
    try {
      const title = extractTitle(finalContent, finalTopic);
      const blog = await createBlog(token, { title, content_md: finalContent });
      navigate(`/blogs/${blog.id}`);
    } catch (e) {
      setSaveError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    abortRef.current = true;
    setPhase(PHASES.idle);
    setFinalContent("");
    setTopic("");
    setSaved(false);
    setSaveError("");
    setElapsedSeconds(0);
    setStepKeys([]);
    setActiveStep(null);
    setCompletedSteps([]);
    previousStepRef.current = null;
    startTimeRef.current = null;
  };

  // Timer for elapsed time during generation
  useEffect(() => {
    let interval;
    if (phase === PHASES.running) {
      if (!startTimeRef.current) {
        startTimeRef.current = Date.now();
      }
      interval = setInterval(() => {
        setElapsedSeconds(
          Math.floor((Date.now() - startTimeRef.current) / 1000),
        );
      }, 1000);
    } else {
      setElapsedSeconds(0);
      startTimeRef.current = null;
    }
    return () => clearInterval(interval);
  }, [phase]);

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        {/* ── Idle: input form ── */}
        {phase === PHASES.idle && (
          <div className="animate-slide-up space-y-6">
            <div>
              <h1 className="font-serif text-2xl text-ink mb-1">
                Generate a Blog
              </h1>
              <p className="text-sm text-ink-3">
                Describe a topic and your AI agent pipeline will plan, write,
                and edit it.
              </p>
            </div>

            {/* API Key */}
            {showApiKey ? (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-ink-3 uppercase tracking-wide flex items-center gap-1.5">
                  <IconKey size={13} /> Google Gemini API Key
                </label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={localApiKey}
                    onChange={(e) => setLocalApiKey(e.target.value)}
                    placeholder="AIza..."
                    className="flex-1 border border-rule rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent font-mono"
                  />
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setApiKey(localApiKey);
                      setShowApiKey(false);
                    }}
                    disabled={!localApiKey.trim()}
                  >
                    Save
                  </Button>
                </div>
                <p className="text-xs text-ink-4">
                  Stored in your browser only, never sent to our servers.
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-ink-3">
                <IconKey size={13} />
                <span>API key saved</span>
                <button
                  onClick={() => setShowApiKey(true)}
                  className="text-accent hover:underline text-xs"
                >
                  change
                </button>
              </div>
            )}

            {/* Topic input */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-ink-3 uppercase tracking-wide">
                Topic / Prompt
              </label>
              <textarea
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey))
                    handleGenerate();
                }}
                placeholder="e.g. The rise of AI agents in software development…"
                rows={4}
                className="w-full border border-rule rounded-lg px-3.5 py-3 text-sm bg-white text-ink placeholder-ink-4 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent resize-none leading-relaxed"
              />
              <p className="text-xs text-ink-4">⌘ + Enter to generate</p>
            </div>

            <Button
              onClick={handleGenerate}
              disabled={!topic.trim() || !localApiKey.trim()}
              size="lg"
              className="w-full"
            >
              <IconPen size={15} />
              Generate Blog
            </Button>
          </div>
        )}

        {/* ── Running: live pipeline ── */}
        {phase === PHASES.running && (
          <div className="animate-fade-in space-y-8">
            {/* Header with elapsed time */}
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="relative">
                      <Spinner size={20} className="text-accent" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-ink">
                        Generating Your Blog
                      </h2>
                      <p className="text-sm text-ink-3 mt-1">"{finalTopic}"</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Timer display */}
              <div className="flex items-center gap-6 px-5 py-4 bg-gradient-to-r from-accent/5 to-accent-light/5 rounded-xl border border-accent/20">
                <div>
                  <p className="text-xs font-semibold text-ink-3 uppercase tracking-wider mb-1">
                    Elapsed Time
                  </p>
                  <p className="font-mono font-bold text-accent text-xl">
                    {Math.floor(elapsedSeconds / 60)}m{" "}
                    {String(elapsedSeconds % 60).padStart(2, "0")}s
                  </p>
                </div>
                <div className="h-12 w-px bg-rule/20" />
                <div>
                  <p className="text-xs font-semibold text-ink-3 uppercase tracking-wider mb-1">
                    Est. Remaining
                  </p>
                  <p className="font-mono font-bold text-ink-2 text-xl">
                    ~{remainingMinutes}m{" "}
                    {String(remainingSeconds).padStart(2, "0")}s
                  </p>
                </div>
              </div>
            </div>

            <AgentPipeline
              steps={stepKeys}
              activeStep={activeStep}
              completedSteps={completedSteps}
              errorStep={errorStep}
            />

            {/* Raw stream log */}
            {streamLog.length > 0 && (
              <details className="group">
                <summary className="text-xs text-ink-4 cursor-pointer hover:text-ink-3 select-none list-none flex items-center gap-1">
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="transition-transform group-open:rotate-90"
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                  Stream log ({streamLog.length} events)
                </summary>
                <div className="mt-2 bg-ink rounded-lg p-3 max-h-40 overflow-y-auto scrollbar-thin">
                  {streamLog.map((entry, i) => (
                    <div
                      key={i}
                      className="text-xs font-mono text-surface-3 mb-1"
                    >
                      <span className="text-accent-light">[{entry.event}]</span>{" "}
                      {entry.stepKey && (
                        <span className="text-yellow-400">
                          {entry.stepKey}{" "}
                        </span>
                      )}
                      <span className="opacity-50">
                        {JSON.stringify(entry.data || entry.message).slice(
                          0,
                          120,
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        )}

        {/* ── Error ── */}
        {phase === PHASES.error && (
          <div className="animate-fade-in space-y-4">
            <div className="border border-red-200 bg-red-50 rounded-lg p-4">
              <p className="text-sm font-medium text-red-700 mb-1">
                Generation failed
              </p>
              <p className="text-xs text-red-500 font-mono">
                {streamLog
                  .filter((e) => e.event === "error")
                  .map((e) => e.message)
                  .join(" ") || "Unknown error"}
              </p>
            </div>
            <AgentPipeline
              steps={stepKeys}
              activeStep={null}
              completedSteps={completedSteps}
              errorStep={errorStep}
            />
            <Button variant="secondary" onClick={handleReset}>
              Try again
            </Button>
          </div>
        )}

        {/* ── Done: blog output ── */}
        {phase === PHASES.done && finalContent && (
          <div className="animate-fade-in space-y-5">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#2d5a27"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span className="text-sm text-accent font-medium">
                    Generated
                  </span>
                </div>
                <h2 className="font-serif text-xl text-ink leading-snug">
                  {extractTitle(finalContent, finalTopic)}
                </h2>
                <p className="text-xs text-ink-4 mt-1">
                  {finalContent.split(/\s+/).filter(Boolean).length} words
                </p>
              </div>
              <Button variant="secondary" size="sm" onClick={handleReset}>
                New blog
              </Button>
            </div>

            {/* Toolbar */}
            <div className="flex items-center justify-between">
              <div className="flex gap-1">
                {["preview", "raw"].map((v) => (
                  <button
                    key={v}
                    onClick={() => setView(v)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-colors ${
                      view === v
                        ? "bg-surface-3 text-ink"
                        : "text-ink-4 hover:text-ink hover:bg-surface-2"
                    }`}
                  >
                    {v === "preview" ? "Preview" : "Markdown"}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={handleCopy}>
                  {copied ? (
                    <IconCheck size={13} className="text-accent" />
                  ) : (
                    <IconCopy size={13} />
                  )}
                  {copied ? "Copied" : "Copy"}
                </Button>
                <Button variant="ghost" size="sm" onClick={handleDownload}>
                  <IconDownload size={13} />
                  .md
                </Button>
              </div>
            </div>

            {/* Content */}
            <div className="border border-rule rounded-xl bg-white overflow-hidden">
              <div className="max-h-[52vh] overflow-y-auto scrollbar-thin px-6 py-5">
                {view === "preview" ? (
                  <div className="prose-blog">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {finalContent}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <pre className="text-xs font-mono text-ink-2 whitespace-pre-wrap leading-relaxed">
                    {finalContent}
                  </pre>
                )}
              </div>
            </div>

            {/* Save */}
            <div className="flex flex-col gap-3">
              {saved ? (
                <div className="flex items-center gap-3">
                  <div className="flex-1 flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg p-3">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#2d5a27"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span className="text-sm font-medium text-green-700">
                      Blog saved! Download or view in My Blogs.
                    </span>
                  </div>
                </div>
              ) : (
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  size="lg"
                  className="w-full"
                >
                  {saving ? (
                    <Spinner size={15} />
                  ) : (
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                      <polyline points="17 21 17 13 7 13 7 21" />
                      <polyline points="7 3 7 8 15 8" />
                    </svg>
                  )}
                  {saving ? "Saving…" : "Save to My Blogs"}
                </Button>
              )}
              {saved && (
                <Button
                  variant="secondary"
                  size="lg"
                  onClick={() => navigate("/blogs")}
                >
                  <IconArrow size={14} />
                  View My Blogs
                </Button>
              )}
            </div>
            {saveError && <p className="text-xs text-red-500">{saveError}</p>}
          </div>
        )}
      </div>
    </Layout>
  );
}
