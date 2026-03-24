import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { googleLogin } from "../services/api";
import { Spinner } from "../components/ui";

// Google Identity Services
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

export default function LoginPage() {
  const { login, token } = useAuth();
  const navigate = useNavigate();
  const btnRef = useRef(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Load Google GSI script
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
  }, []);

  // Initialize Google Sign-In once script is loaded
  useEffect(() => {
    if (token) {
      navigate("/generate");
      return;
    }

    if (!window.google) return;

    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: handleCredentialResponse,
    });

    window.google.accounts.id.renderButton(btnRef.current, {
      theme: "outline",
      size: "large",
      text: "continue_with",
      shape: "rectangular",
      width: 280,
    });
  }, [token, GOOGLE_CLIENT_ID]);

  const handleCredentialResponse = async (response) => {
    setLoading(true);
    setError("");
    try {
      const data = await googleLogin(response.credential);
      login(data.access_token, data.user);
      navigate("/generate");
    } catch (e) {
      setError("Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4">
      <div className="w-full max-w-sm animate-slide-up">
        {/* Logo mark */}
        <div className="flex justify-center mb-8">
          <div className="w-12 h-12 bg-accent rounded-xl flex items-center justify-center shadow-sm">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
          </div>
        </div>

        <h1 className="font-serif text-2xl text-ink text-center mb-1">
          Blog Writing Agent
        </h1>
        <p className="text-ink-3 text-sm text-center mb-8">
          Sign in to generate and manage your AI-written blogs.
        </p>

        {/* Feature list */}
        <div className="space-y-2.5 mb-8">
          {[
            "Multi-agent pipeline: Planner → Writer → Editor",
            "Streamed generation with live step updates",
            "Save, browse, and chat with your blogs",
          ].map((feat) => (
            <div
              key={feat}
              className="flex items-start gap-2.5 text-sm text-ink-2"
            >
              <div className="mt-0.5 w-4 h-4 rounded-full bg-accent-muted flex items-center justify-center flex-shrink-0">
                <svg
                  width="9"
                  height="9"
                  viewBox="0 0 12 12"
                  fill="none"
                  stroke="#2d5a27"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="10 3 5 9 2 6" />
                </svg>
              </div>
              {feat}
            </div>
          ))}
        </div>

        <div className="border border-rule rounded-xl p-6 bg-white shadow-sm">
          {loading ? (
            <div className="flex items-center justify-center py-3">
              <Spinner size={20} className="text-ink-3" />
            </div>
          ) : (
            <div className="flex justify-center">
              <div ref={btnRef} />
            </div>
          )}

          {!GOOGLE_CLIENT_ID && (
            <p className="mt-3 text-xs text-center text-ink-4 font-mono">
              Set VITE_GOOGLE_CLIENT_ID in .env
            </p>
          )}

          {error && (
            <p className="mt-3 text-sm text-red-600 text-center">{error}</p>
          )}
        </div>

        <p className="text-xs text-ink-4 text-center mt-4">
          Your API key is stored locally and never saved on our servers.
        </p>
      </div>
    </div>
  );
}
