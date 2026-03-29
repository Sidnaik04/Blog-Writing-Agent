import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getBlogs, deleteBlog } from "../services/api";
import {
  Button,
  Spinner,
  IconTrash,
  IconChat,
  IconArrow,
  IconPen,
  IconCopy,
} from "../components/ui";
import DownloadDropdown from "../components/DownloadDropdown";
import Layout from "../components/Layout";

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function BlogsPage() {
  const { token } = useAuth();
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(null);
  const [copied, setCopied] = useState(null);

  const fetchBlogs = async () => {
    setLoading(true);
    try {
      const data = await getBlogs(token);
      setBlogs(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlogs();
  }, []);

  const handleDelete = async (e, blogId) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm("Delete this blog?")) return;
    setDeleting(blogId);
    try {
      await deleteBlog(token, blogId);
      setBlogs((prev) => prev.filter((b) => b.id !== blogId));
    } catch (e) {
      alert(e.message);
    } finally {
      setDeleting(null);
    }
  };

  const handleCopy = (e, content) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };



  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-serif text-2xl text-ink">My Blogs</h1>
            <p className="text-sm text-ink-3 mt-0.5">
              {blogs.length} saved {blogs.length === 1 ? "blog" : "blogs"}
            </p>
          </div>
          <Button as={Link} to="/generate" size="sm">
            <IconPen size={13} />
            New Blog
          </Button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <Spinner size={24} className="text-ink-4" />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="border border-red-200 bg-red-50 rounded-lg p-4 text-sm text-red-600">
            {error}
            <button onClick={fetchBlogs} className="ml-2 underline">
              Retry
            </button>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && blogs.length === 0 && (
          <div className="text-center py-20 border border-dashed border-rule rounded-xl">
            <div className="w-10 h-10 bg-surface-2 rounded-full flex items-center justify-center mx-auto mb-3">
              <IconPen size={18} className="text-ink-4" />
            </div>
            <p className="text-sm font-medium text-ink-2 mb-1">No blogs yet</p>
            <p className="text-xs text-ink-4 mb-4">
              Generate your first blog to get started.
            </p>
            <Link to="/generate">
              <Button size="sm">Generate a Blog</Button>
            </Link>
          </div>
        )}

        {/* Blog list */}
        {!loading && blogs.length > 0 && (
          <div className="space-y-2 animate-fade-in">
            {blogs.map((blog) => (
              <Link
                key={blog.id}
                to={`/blogs/${blog.id}`}
                className="group block border border-rule rounded-xl bg-white hover:border-ink-4 hover:shadow-sm transition-all duration-150 px-5 py-4"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <h2 className="font-medium text-sm text-ink truncate group-hover:text-accent transition-colors">
                      {blog.title}
                    </h2>
                    {blog.content_md && (
                      <p className="text-xs text-ink-4 mt-0.5 line-clamp-1">
                        {blog.content_md.replace(/[#*`]/g, "").slice(0, 120)}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-2">
                      {blog.created_at && (
                        <span className="text-xs text-ink-4">
                          {timeAgo(blog.created_at)}
                        </span>
                      )}
                      <span className="text-xs text-ink-4">
                        {blog.content_md?.split(/\s+/).filter(Boolean).length ||
                          0}{" "}
                        words
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={(e) => handleCopy(e, blog.content_md)}
                      className="p-1.5 rounded-md text-ink-4 hover:text-accent hover:bg-surface-2 transition-colors opacity-0 group-hover:opacity-100"
                      title="Copy"
                    >
                      <IconCopy size={13} />
                    </button>
                    <DownloadDropdown
                      content={blog.content_md}
                      title={blog.title}
                      variant="icon"
                      stopPropagation
                    />
                    <button
                      onClick={(e) => handleDelete(e, blog.id)}
                      className="p-1.5 rounded-md text-ink-4 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                      title="Delete"
                    >
                      {deleting === blog.id ? (
                        <Spinner size={13} />
                      ) : (
                        <IconTrash size={13} />
                      )}
                    </button>
                    <span className="text-ink-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <IconArrow size={14} />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
