import { useMemo } from "react";

export default function StreamingOutput({ streamText }) {
  const parsed = useMemo(() => {
    if (!streamText) return [];

    const lines = streamText.split("\n");
    const updates = [];

    lines.forEach((line) => {
      if (line.startsWith("data:")) {
        try {
          const json = JSON.parse(line.replace("data:", "").trim());
          updates.push(json);
        } catch {
          // Silently ignore invalid JSON chunks
        }
      }
    });

    return updates;
  }, [streamText]);

  return (
    <div className="mt-4 space-y-3">
      {parsed.map((item, idx) => (
        <div
          key={idx}
          className="bg-gray-900 p-3 rounded border border-gray-800"
        >
          <pre className="text-sm whitespace-pre-wrap">
            {JSON.stringify(item, null, 2)}
          </pre>
        </div>
      ))}
    </div>
  );
}
