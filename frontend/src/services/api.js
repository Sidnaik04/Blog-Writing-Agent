const BASE = "";

function authHeaders(token) {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export async function googleLogin(googleToken) {
  const res = await fetch(`${BASE}/auth/google`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: googleToken }),
  });
  if (!res.ok) throw new Error("Google login failed");
  return res.json();
}

// ── Blogs ─────────────────────────────────────────────────────────────────────

export async function getBlogs(token) {
  const res = await fetch(`${BASE}/blogs/`, { headers: authHeaders(token) });
  if (!res.ok) throw new Error("Failed to fetch blogs");
  return res.json();
}

export async function getBlog(token, blogId) {
  const res = await fetch(`${BASE}/blogs/${blogId}`, { headers: authHeaders(token) });
  if (!res.ok) throw new Error("Blog not found");
  return res.json();
}

export async function createBlog(token, { title, content_md }) {
  const res = await fetch(`${BASE}/blogs/`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ title, content_md }),
  });
  if (!res.ok) throw new Error("Failed to save blog");
  return res.json();
}

export async function deleteBlog(token, blogId) {
  const res = await fetch(`${BASE}/blogs/${blogId}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("Failed to delete blog");
  return res.json();
}

// ── Chat ──────────────────────────────────────────────────────────────────────

export async function chatWithBlog(token, { blog_id, question, api_key }) {
  const res = await fetch(`${BASE}/chat/`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ blog_id, question, api_key }),
  });
  if (!res.ok) throw new Error("Chat request failed");
  return res.json(); // { answer: string }
}

// ── Generation (SSE) ──────────────────────────────────────────────────────────
// Returns an EventSource-like async generator.
// Usage:
//   for await (const event of streamGenerate(token, topic, apiKey)) { ... }
//
// Each yielded value: { event: "update"|"final"|"error", data: any }

export async function* streamGenerate(token, topic, apiKey) {
  const res = await fetch(`${BASE}/generate/`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ topic, api_key: apiKey }),
  });

  if (!res.ok) {
    throw new Error(`Generation failed: ${res.status}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // SSE messages are separated by double newlines
    const parts = buffer.split("\n\n");
    buffer = parts.pop(); // last incomplete chunk stays in buffer

    for (const part of parts) {
      if (!part.trim()) continue;

      let eventType = "message";
      let dataStr = "";

      for (const line of part.split("\n")) {
        if (line.startsWith("event: ")) eventType = line.slice(7).trim();
        if (line.startsWith("data: ")) dataStr = line.slice(6).trim();
      }

      if (!dataStr) continue;

      let parsed;
      try { parsed = JSON.parse(dataStr); } catch { parsed = dataStr; }

      yield { event: eventType, data: parsed };
    }
  }
}
