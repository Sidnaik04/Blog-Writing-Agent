import { Link } from "react-router-dom";

export default function Sidebar() {
  return (
    <div className="w-60 bg-gray-950 text-white min-h-screen p-4 border-r border-gray-800">
      
      <h2 className="text-xl mb-6">Menu</h2>

      <nav className="flex flex-col gap-3">
        <Link
          to="/dashboard"
          className="hover:bg-gray-800 p-2 rounded"
        >
          📊 Dashboard
        </Link>

        <Link
          to="/generate"
          className="hover:bg-gray-800 p-2 rounded"
        >
          ⚡ Generate Blog
        </Link>
      </nav>
    </div>
  );
}