import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";

export default function Navbar() {
  const { user, logout } = useContext(AuthContext);

  return (
    <div className="flex justify-between items-center px-6 py-3 bg-gray-900 text-white border-b border-gray-800">
      
      <h1 className="text-lg font-semibold">🧠 Blog Agent</h1>

      <div className="flex items-center gap-4">
        {user && (
          <>
            <img
              src={user.picture}
              alt="user"
              className="w-8 h-8 rounded-full"
            />
            <span>{user.name}</span>
          </>
        )}

        <button
          onClick={logout}
          className="bg-red-500 px-3 py-1 rounded text-sm"
        >
          Logout
        </button>
      </div>
    </div>
  );
}