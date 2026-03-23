import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import API from "../services/api";
import ChatPanel from "../components/ChatPanel";
import ReactMarkdown from "react-markdown";

export default function BlogView() {
  const { id } = useParams();
  const [blog, setBlog] = useState(null);

  useEffect(() => {
    API.get(`/blogs/${id}`).then((res) => setBlog(res.data));
  }, [id]);

  if (!blog) return <div className="p-6 text-white">Loading...</div>;

  return (
    <div className="flex bg-black text-white min-h-screen">
      {/* MAIN CONTENT */}
      <div className="w-2/3 p-6">
        <h1 className="text-3xl font-bold mb-4">{blog.title}</h1>

        <div className="bg-gray-900 p-4 rounded whitespace-pre-wrap">
          <ReactMarkdown>{blog.content_md}</ReactMarkdown>
        </div>
      </div>

      {/* CHAT */}
      <div className="w-1/3 border-l border-gray-800 p-4">
        <h2 className="text-xl mb-2">Ask about this blog</h2>
        <ChatPanel blogId={blog.id} />
      </div>
    </div>
  );
}
