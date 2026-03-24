import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import LoginPage from "./pages/LoginPage";
import GeneratePage from "./pages/GeneratePage";
import BlogsPage from "./pages/BlogsPage";
import BlogDetailPage from "./pages/BlogDetailPage";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/generate" element={<ProtectedRoute><GeneratePage /></ProtectedRoute>} />
          <Route path="/blogs" element={<ProtectedRoute><BlogsPage /></ProtectedRoute>} />
          <Route path="/blogs/:id" element={<ProtectedRoute><BlogDetailPage /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/generate" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
