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
  if (!res.ok) {
    const errorData = await res
      .json()
      .catch(() => ({ detail: "Unknown error" }));
    const detail = errorData.detail || res.statusText;
    console.error(`HTTP ${res.status} when creating blog:`, detail);
    throw new Error(`Failed to save blog: ${res.status} - ${detail}`);
  }
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
//
// Event types:
//   - "log": Status message (e.g., graph building)
//   - "update": LangGraph step output
//   - "final": Generation complete with final markdown
//   - "error": Error occurred during generation

export async function* streamGenerate(token, topic, apiKey) {
  console.log("Starting blog generation (job-based architecture)");

  let jobId = null;

  try {
    // Step 1: Create job and get job_id
    console.log("Step 1: Creating generation job...");
    const createRes = await fetch(`${API_BASE}/generate/`, {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({ topic, api_key: apiKey }),
    });

    if (!createRes.ok) {
      console.error(
        "HTTP error creating job:",
        createRes.status,
        createRes.statusText,
      );
      throw new Error(
        `Failed to create job: ${createRes.status} ${createRes.statusText}`,
      );
    }

    const jobData = await createRes.json();
    jobId = jobData.job_id;

    if (!jobId) {
      throw new Error("Server did not return a job_id");
    }

    console.log(`Job created: ${jobId}`);
    console.log(`Step 2: Connecting to stream...`);

    // Step 2: Stream events from the job
    const streamRes = await fetch(`${API_BASE}/generate/stream/${jobId}`, {
      method: "GET",
      headers: authHeaders(token),
    });

    if (!streamRes.ok) {
      console.error(
        "Stream HTTP error:",
        streamRes.status,
        streamRes.statusText,
      );
      throw new Error(
        `Stream connection failed: ${streamRes.status} ${streamRes.statusText}`,
      );
    }

    if (!streamRes.body) {
      throw new Error("Response body is not readable");
    }

    console.log(`Stream connected for job ${jobId}, reading events...`);

    const reader = streamRes.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let eventCount = 0;
    let hasError = false;

    while (true) {
      let chunk;
      try {
        const { done, value } = await reader.read();
        chunk = value;

        if (done) {
          // Stream ended, process remaining buffer
          if (buffer.trim()) {
            console.log(`Processing final buffer: ${buffer.length} bytes`);
          }
          break;
        }
      } catch (readError) {
        console.error("Stream read error:", readError.message);
        throw new Error(`Failed to read stream: ${readError.message}`);
      }

      if (chunk) {
        const text = decoder.decode(chunk, { stream: true });
        buffer += text;
        console.log(`Received chunk: ${text.length} bytes`);
      }

      // Process complete SSE messages (separated by double newlines)
      const parts = buffer.split("\n\n");

      // Keep the last part in buffer (it might be incomplete)
      buffer = parts.pop() || "";

      for (const part of parts) {
        if (!part.trim()) continue;

        // Split by "event:" to handle multiple events that might be in one part
        const eventStrs = part.split(/(?=event:)/).filter((s) => s.trim());

        for (const eventStr of eventStrs) {
          let eventType = "unknown";
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
            console.log("Empty data for event, skipping");
            continue;
          }

          let parsed;
          try {
            parsed = JSON.parse(dataStr);
          } catch (parseError) {
            console.error(
              "Failed to parse JSON:",
              parseError.message,
              "Data preview:",
              dataStr.substring(0, 150),
            );
            parsed = { raw: dataStr };
          }

          eventCount++;
          console.log(`Event #${eventCount}: ${eventType}`, {
            dataType: typeof parsed,
            preview:
              typeof parsed === "object"
                ? JSON.stringify(parsed).substring(0, 100)
                : String(parsed).substring(0, 100),
          });

          // Track errors to prevent infinite loops
          if (eventType === "error") {
            hasError = true;
          }

          yield { event: eventType, data: parsed };

          // Stop processing after final event
          if (eventType === "final") {
            console.log(`Final event received (event #${eventCount})`);
            reader.cancel();
            return;
          }

          // Safety: stop after error event
          if (hasError) {
            console.log(`Stopping after error event`);
            reader.cancel();
            return;
          }
        }
      }
    }

    // CRITICAL: Process remaining buffer after stream ends
    // The final event often arrives in the last chunk and stays in the buffer
    if (buffer.trim()) {
      console.log(
        `Processing final buffer after stream end: ${buffer.length} bytes`,
      );

      // Split by "event:" to handle any remaining events
      const eventStrs = buffer.split(/(?=event:)/).filter((s) => s.trim());

      for (const eventStr of eventStrs) {
        let eventType = "unknown";
        let dataLines = [];

        for (const line of eventStr.split("\n")) {
          const trimmed = line.trim();
          if (trimmed.startsWith("event: ")) {
            eventType = trimmed.slice(7).trim();
          } else if (trimmed.startsWith("data: ")) {
            dataLines.push(trimmed.slice(6));
          }
        }

        const dataStr = dataLines.join("\n").trim();

        if (!dataStr) {
          console.log("Empty data in final buffer, skipping");
          continue;
        }

        let parsed;
        try {
          parsed = JSON.parse(dataStr);
        } catch (parseError) {
          console.error(
            "Failed to parse final event JSON:",
            parseError.message,
            "Data preview:",
            dataStr.substring(0, 200),
          );
          parsed = { raw: dataStr };
        }

        eventCount++;
        console.log(`Event #${eventCount}: ${eventType} (from final buffer)`, {
          dataType: typeof parsed,
          preview:
            typeof parsed === "object"
              ? JSON.stringify(parsed).substring(0, 150)
              : String(parsed).substring(0, 150),
        });

        yield { event: eventType, data: parsed };

        // Final event should close the stream
        if (eventType === "final") {
          console.log(
            `Final event received from buffer (event #${eventCount})`,
          );
          return;
        }
      }
    }

    console.log(`Stream ended normally. Total events processed: ${eventCount}`);

    if (eventCount === 0) {
      console.warn(
        "No events received from stream. This might indicate a backend issue.",
      );
    }
  } catch (error) {
    console.error("streamGenerate error:", error.message);
    console.error("Stack:", error.stack);

    // Yield error event so UI can handle it
    yield {
      event: "error",
      data: {
        error: error.message,
        jobId: jobId || "unknown",
      },
    };

    throw error;
  }
}
