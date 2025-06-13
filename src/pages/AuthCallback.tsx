import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Clerk will handle the session, then redirect
    // Optionally, you can show a loading spinner here
    // After a short delay, redirect to chat or home
    const timeout = setTimeout(() => {
      navigate("/chat");
    }, 1500);
    return () => clearTimeout(timeout);
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="text-lg font-semibold mb-2">Completing sign-in...</div>
        <div className="text-gray-500">Please wait while we log you in.</div>
      </div>
    </div>
  );
};

export default AuthCallback; 