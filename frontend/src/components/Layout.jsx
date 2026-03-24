import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { IconLogout, IconPen } from "./ui";

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const navLinks = [
    { to: "/generate", label: "Generate" },
    { to: "/blogs", label: "My Blogs" },
  ];

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      {/* Top nav */}
      <header className="border-b border-rule bg-surface sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-5 h-13 flex items-center justify-between" style={{ height: "52px" }}>
          {/* Logo */}
          <Link to="/generate" className="flex items-center gap-2 group">
            <div className="w-7 h-7 bg-accent rounded-md flex items-center justify-center">
              <IconPen size={13} className="text-white" />
            </div>
            <span className="font-semibold text-ink text-sm tracking-tight">BlogAgent</span>
          </Link>

          {/* Nav links */}
          <nav className="flex items-center gap-1">
            {navLinks.map(({ to, label }) => {
              const active = location.pathname.startsWith(to);
              return (
                <Link
                  key={to}
                  to={to}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    active
                      ? "bg-surface-3 text-ink"
                      : "text-ink-3 hover:text-ink hover:bg-surface-2"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </nav>

          {/* User */}
          <div className="flex items-center gap-3">
            {user?.picture && (
              <img
                src={user.picture}
                alt={user.name}
                className="w-7 h-7 rounded-full ring-1 ring-rule"
              />
            )}
            <span className="text-sm text-ink-3 hidden sm:block">{user?.name}</span>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-md text-ink-4 hover:text-ink hover:bg-surface-2 transition-colors"
              title="Log out"
            >
              <IconLogout size={15} />
            </button>
          </div>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-5 py-8">
        {children}
      </main>
    </div>
  );
}
