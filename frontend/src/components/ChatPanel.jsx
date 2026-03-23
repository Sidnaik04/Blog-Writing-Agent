import { useState } from "react";
import API from "../services/api";

export default function ChatPanel({ blogId }) {
  const [q, setQ] = useState("");
  const [ans, setAns] = useState("");

  const ask = async () => {
    const res = await API.post("/chat/", {
      blog_id: blogId,
      question: q,
      api_key: "YOUR_GEMINI_KEY",
    });

    setAns(res.data.answer);
  };

  return (
    <div className="mt-4">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="text-black p-2"
      />
      <button onClick={ask} className="ml-2 bg-green-500 px-3 py-1">
        Ask
      </button>

      <p className="mt-2">{ans}</p>
    </div>
  );
}