import { useState } from "react";

import StreamingOutput from "../components/StreamingOutput";

export default function Generate() {
  const [output, setOutput] = useState("");

  const generate = async () => {
    const res = await fetch("http://127.0.0.1:8000/generate/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + localStorage.getItem("token"),
      },
      body: JSON.stringify({
        topic: "Future of AI",
        api_key: "YOUR_GEMINI_KEY",
      }),
    });

    const reader = res.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      setOutput((prev) => prev + decoder.decode(value));
    }
  };

  return (
    <div className="p-6 bg-black text-white min-h-screen">
      <button onClick={generate} className="bg-blue-500 px-4 py-2 rounded">
        Generate
      </button>

      <pre className="mt-4 whitespace-pre-wrap">
        <StreamingOutput streamText={output} />
      </pre>
    </div>
  );
}
