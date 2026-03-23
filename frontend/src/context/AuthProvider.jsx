import { useState } from "react";
import { AuthContext } from "./AuthContext";
import { setAuthToken } from "../services/api";

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  const login = (data) => {
    localStorage.setItem("token", data.access_token);
    setAuthToken(data.access_token);
    setUser(data.user);
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
