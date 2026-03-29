const API_BASE = import.meta.env.VITE_API_URL;

function authHeaders(token) {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export async function googleLogin(googleToken) {
  const res = await fetch(`${API_BASE}/auth/google`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: googleToken }),
  });
  if (!res.ok) throw new Error("Google login failed");
  return res.json();
}

// ── Blogs ─────────────────────────────────────────────────────────────────────

export async function getBlogs(token) {
  const res = await fetch(`${API_BASE}/blogs/`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("Failed to fetch blogs");
  return res.json();
}

export async function getBlog(token, blogId) {
  const res = await fetch(`${API_BASE}/blogs/${blogId}`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("Blog not found");
  return res.json();
}

export async function createBlog(token, { title, content_md }) {
  const res = await fetch(`${API_BASE}/blogs/`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ title, content_md }),
  });
  if (!res.ok) throw new Error("Failed to save blog");
  return res.json();
}

export async function deleteBlog(token, blogId) {
  const res = await fetch(`${API_BASE}/blogs/${blogId}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("Failed to delete blog");
  return res.json();
}

// ── Chat ──────────────────────────────────────────────────────────────────────

export async function chatWithBlog(token, { blog_id, question, api_key }) {
  const res = await fetch(`${API_BASE}/chat/`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ blog_id, question, api_key }),
  });
  if (!res.ok) throw new Error("Chat request failed");
  return res.json(); // { answer: string }
}

// ── Generation (Job-based with SSE streaming) ────────────────────────────────
// Two-step process:
// 1. POST /generate/ returns { job_id }
// 2. GET /stream/{job_id} streams SSE events
//
// Returns an async generator.
// Usage:
//   for await (const event of streamGenerate(token, topic, apiKey)) { ... }
//
// Each yielded value: { event: "update"|"final"|"error"|"log", data: any }

export async function* streamGenerate(token, topic, apiKey) {
  console.log("🚀 Starting blog generation (job-based)...");

  // Step 1: Create job and get job_id
  const createRes = await fetch(`${API_BASE}/generate/`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ topic, api_key: apiKey }),
  });

  if (!createRes.ok) {
    console.error("❌ HTTP error:", createRes.status, createRes.statusText);
    throw new Error(`Failed to create job: ${createRes.status}`);
  }

  const jobData = await createRes.json();
  const jobId = jobData.job_id;

  console.log(`✅ Job created: ${jobId}. Connecting to stream...`);

  // Step 2: Stream events from the job
  const streamRes = await fetch(`${API_BASE}/generate/stream/${jobId}`, {
    method: "GET",
    headers: authHeaders(token),
  });

  if (!streamRes.ok) {
    console.error(
      "❌ Stream HTTP error:",
      streamRes.status,
      streamRes.statusText,
    );
    throw new Error(`Stream connection failed: ${streamRes.status}`);
  }

  console.log("✅ Stream connected, reading events...");

  const reader = streamRes.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let eventCount = 0;

  while (true) {
    const { done, value } = await reader.read();

    if (value) {
      const text = decoder.decode(value, { stream: true });
      buffer += text;
      console.log("📥 Received chunk:", text.length, "bytes");
    }

    // Process complete SSE messages (separated by double newlines)
    const parts = buffer.split("\n\n");

    // Keep the last part in buffer (it might be incomplete)
    if (!done) {
      buffer = parts.pop();
    } else {
      // If stream is done, process everything including last part
      buffer = "";
    }

    for (const part of parts) {
      if (!part.trim()) continue;

      // Split by "event:" to handle multiple events that might be in one part
      const eventStrs = part.split(/(?=event:)/).filter((s) => s.trim());

      for (const eventStr of eventStrs) {
        let eventType = "message";
        let dataLines = [];

        for (const line of eventStr.split("\n")) {
          const trimmed = line.trim();
          if (trimmed.startsWith("event: ")) {
            eventType = trimmed.slice(7).trim();
          } else if (trimmed.startsWith("data: ")) {
            dataLines.push(trimmed.slice(6));
          }
        }

        // Join data lines with newline (proper SSE format)
        const dataStr = dataLines.join("\n").trim();

        if (!dataStr) {
          console.log("⚠️ Empty data in event, skipping");
          continue;
        }

        let parsed;
        try {
          parsed = JSON.parse(dataStr);
        } catch (e) {
          console.error(
            "❌ Failed to parse JSON:",
            e.message,
            "Data preview:",
            dataStr.substring(0, 100),
          );
          parsed = dataStr;
        }

        eventCount++;
        console.log(`📊 Event #${eventCount}:`, {
          eventType,
          dataType: typeof parsed,
          dataPreview:
            typeof parsed === "object"
              ? Object.keys(parsed)
              : String(parsed).substring(0, 50),
        });

        yield { event: eventType, data: parsed };
      }
    }

    if (done) {
      console.log(`✅ Stream ended. Total events: ${eventCount}`);
      break;
    }
  }
}
