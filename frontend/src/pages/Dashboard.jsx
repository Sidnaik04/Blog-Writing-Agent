import { useEffect, useState } from "react";
import API from "../services/api";

export default function Dashboard() {
  const [blogs, setBlogs] = useState([]);

  useEffect(() => {
    API.get("/blogs/").then((res) => setBlogs(res.data));
  }, []);

  return (
    <div className="p-6 bg-black text-white min-h-screen">
      <h1 className="text-2xl mb-4">Your Blogs</h1>

      {blogs.map((b) => (
        <div key={b.id} className="p-4 bg-gray-900 mb-2 rounded">
          {b.title}
        </div>
      ))}
    </div>
  );
}