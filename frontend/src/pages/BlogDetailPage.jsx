import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useAuth } from "../context/AuthContext";
import { getBlog, deleteBlog, chatWithBlog } from "../services/api";
import {
  Button,
  Spinner,
  IconTrash,
  IconChat,
  IconSend,
  IconArrow,
  IconKey,
  IconCopy,
  IconCheck,
} from "../components/ui";
import Layout from "../components/Layout";

export default function BlogDetailPage() {
  const { id } = useParams();
  const { token, apiKey } = useAuth();
  const navigate = useNavigate();

  const [blog, setBlog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [view, setView] = useState("preview");
  const [copied, setCopied] = useState(false);

  // Chat panel
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatApiKey, setChatApiKey] = useState(apiKey);
  const [showChatKey, setShowChatKey] = useState(!apiKey);
  const chatEndRef = useRef(null);

  useEffect(() => {
    const fetch = async () => {
      try {
        const data = await getBlog(token, id);
        setBlog(data);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleDelete = async () => {
    if (!window.confirm("Delete this blog?")) return;
    setDeleting(true);
    try {
      await deleteBlog(token, id);
      navigate("/blogs");
    } catch (e) {
      alert(e.message);
      setDeleting(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(blog.content_md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleChat = async () => {
    const q = question.trim();
    if (!q || !chatApiKey.trim()) return;

    setMessages((prev) => [...prev, { role: "user", text: q }]);
    setQuestion("");
    setChatLoading(true);

    try {
      const res = await chatWithBlog(token, {
        blog_id: parseInt(id),
        question: q,
        api_key: chatApiKey.trim(),
      });
      setMessages((prev) => [...prev, { role: "assistant", text: res.answer }]);
    } catch (e) {
      setMessages((prev) => [...prev, { role: "error", text: e.message }]);
    } finally {
      setChatLoading(false);
    }
  };

  if (loading)
    return (
      <Layout>
        <div className="flex items-center justify-center py-20">
          <Spinner size={24} className="text-ink-4" />
        </div>
      </Layout>
    );

  if (error)
    return (
      <Layout>
        <div className="max-w-2xl mx-auto">
          <div className="border border-red-200 bg-red-50 rounded-lg p-4 text-sm text-red-600">
            {error}
          </div>
          <Link
            to="/blogs"
            className="mt-4 inline-flex items-center gap-1.5 text-sm text-ink-3 hover:text-ink"
          >
            <IconArrow size={14} direction="left" /> Back to blogs
          </Link>
        </div>
      </Layout>
    );

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        {/* Back */}
        <Link
          to="/blogs"
          className="inline-flex items-center gap-1.5 text-sm text-ink-4 hover:text-ink mb-5 transition-colors"
        >
          <IconArrow size={13} direction="left" />
          My Blogs
        </Link>

        {/* Title row */}
        <div className="flex items-start justify-between gap-4 mb-5">
          <h1 className="font-serif text-2xl text-ink leading-snug flex-1">
            {blog.title}
          </h1>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setChatOpen(!chatOpen)}
            >
              <IconChat size={13} />
              Chat
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? <Spinner size={13} /> : <IconTrash size={13} />}
            </Button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between mb-3">
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
          <Button variant="ghost" size="sm" onClick={handleCopy}>
            {copied ? (
              <IconCheck size={13} className="text-accent" />
            ) : (
              <IconCopy size={13} />
            )}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>

        {/* Blog content */}
        <div className="border border-rule rounded-xl bg-white overflow-hidden mb-6">
          <div
            className="px-6 py-6 overflow-y-auto scrollbar-thin"
            style={{ maxHeight: chatOpen ? "40vh" : "65vh" }}
          >
            {view === "preview" ? (
              <div className="prose-blog">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {blog.content_md}
                </ReactMarkdown>
              </div>
            ) : (
              <pre className="text-xs font-mono text-ink-2 whitespace-pre-wrap leading-relaxed">
                {blog.content_md}
              </pre>
            )}
          </div>
        </div>

        {/* ── Chat Panel ── */}
        {chatOpen && (
          <div className="border border-rule rounded-xl bg-white overflow-hidden animate-slide-up">
            <div className="px-4 py-3 border-b border-rule flex items-center gap-2">
              <IconChat size={14} className="text-ink-3" />
              <span className="text-sm font-medium text-ink">
                Chat with this blog
              </span>
              <span className="text-xs text-ink-4 ml-1">
                — ask questions, get summaries
              </span>
            </div>

            {/* API key for chat */}
            {showChatKey && (
              <div className="px-4 py-3 border-b border-rule bg-surface-2">
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={chatApiKey}
                    onChange={(e) => setChatApiKey(e.target.value)}
                    placeholder="Google Gemini API key (AIza...)"
                    className="flex-1 border border-rule rounded-lg px-3 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent font-mono"
                  />
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setShowChatKey(false)}
                    disabled={!chatApiKey.trim()}
                  >
                    Set
                  </Button>
                </div>
              </div>
            )}

            {/* Messages */}
            <div className="px-4 py-3 space-y-3 max-h-56 overflow-y-auto scrollbar-thin">
              {messages.length === 0 && (
                <p className="text-xs text-ink-4 text-center py-4">
                  Ask anything about this blog — summaries, clarifications, key
                  takeaways…
                </p>
              )}
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] px-3 py-2 rounded-xl text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-accent text-white rounded-br-sm"
                        : msg.role === "error"
                          ? "bg-red-50 text-red-600 border border-red-200"
                          : "bg-surface-2 text-ink-2 rounded-bl-sm"
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="bg-surface-2 px-3 py-2 rounded-xl rounded-bl-sm flex gap-1 items-center">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="step-dot w-1.5 h-1.5 rounded-full bg-ink-4 block"
                      />
                    ))}
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <div className="px-3 py-2.5 border-t border-rule flex gap-2">
              <input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleChat();
                  }
                }}
                placeholder="Ask a question…"
                className="flex-1 border border-rule rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                disabled={chatLoading || !chatApiKey.trim()}
              />
              <Button
                onClick={handleChat}
                disabled={!question.trim() || chatLoading || !chatApiKey.trim()}
                size="sm"
              >
                <IconSend size={13} />
              </Button>
            </div>

            {!chatApiKey && (
              <p className="text-xs text-center text-ink-4 pb-2">
                <button
                  onClick={() => setShowChatKey(true)}
                  className="text-accent underline"
                >
                  Set your API key
                </button>{" "}
                to chat
              </p>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
