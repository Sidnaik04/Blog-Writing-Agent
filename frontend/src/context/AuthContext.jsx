import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("token") || null);
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("user")); } catch { return null; }
  });
  // API key stored locally (never sent to our backend for storage)
  const [apiKey, setApiKeyState] = useState(() => localStorage.getItem("openai_api_key") || "");

  const login = (accessToken, userInfo) => {
    setToken(accessToken);
    setUser(userInfo);
    localStorage.setItem("token", accessToken);
    localStorage.setItem("user", JSON.stringify(userInfo));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  };

  const setApiKey = (key) => {
    setApiKeyState(key);
    localStorage.setItem("openai_api_key", key);
  };

  return (
    <AuthContext.Provider value={{ token, user, login, logout, apiKey, setApiKey }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
