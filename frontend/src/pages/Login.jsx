import { useEffect, useContext, useRef } from "react";
import { AuthContext } from "../context/AuthContext";
import API from "../services/api";

export default function Login() {
  const { login } = useContext(AuthContext);
  const isInitializedRef = useRef(false);

  useEffect(() => {
    if (!window.google || isInitializedRef.current) return;

    const handleCredentialResponse = async (response) => {
      try {
        const res = await API.post("/auth/google", {
          token: response.credential,
        });

        login(res.data);
      } catch (err) {
        console.error(err);
        alert("Login failed");
      }
    };

    window.google.accounts.id.initialize({
      client_id:
        "1044436977990-7ag16e8shc10054tma2ve99b78tc95un.apps.googleusercontent.com",
      callback: handleCredentialResponse,
    });

    window.google.accounts.id.renderButton(
      document.getElementById("googleBtn"),
      { theme: "outline", size: "large" },
    );

    isInitializedRef.current = true;
  }, [login]);

  return (
    <div className="h-screen flex items-center justify-center bg-black text-white">
      <div id="googleBtn"></div>
    </div>
  );
}
