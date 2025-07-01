 // ---------- FRONTEND CODE (Login.jsx) ----------
import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { GoogleLogin, GoogleOAuthProvider } from "@react-oauth/google";
import { useNavigate } from "react-router-dom";
import { useAuth } from './AuthContext';
import './login.css';

export default function Login() {
  const { login } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isAnimating, setIsAnimating] = useState(false);
  const [activeInput, setActiveInput] = useState(null);
  const canvasRef = useRef(null);
  const navigate = useNavigate();

  const clientId = "677219864654-vut2tlu52rsn8jjbvv4lg3mk2544uvmp.apps.googleusercontent.com";

  useEffect(() => {
    const colors = ["#fad0c4", "#fbc2eb", "#a6c1ee"];
    let currentIndex = 0;

    const changeBackground = () => {
      const nextIndex = (currentIndex + 1) % colors.length;
      document.body.style.background = `linear-gradient(45deg, ${colors[currentIndex]}, ${colors[nextIndex]})`;
      currentIndex = nextIndex;
    };

    const interval = setInterval(changeBackground, 5000);
    changeBackground();

    return () => clearInterval(interval);
  }, []);

  const toggleMode = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    setTimeout(() => {
      setIsLogin(!isLogin);
      setIsAnimating(false);
    }, 300);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const url = isLogin ? "http://localhost:5000/login" : "http://localhost:5000/signup";
    const data = isLogin
      ? { identifier, password }
      : { email: identifier, password, confirmPassword, username };

    try {
      const res = await axios.post(url, data, {
        withCredentials: true
      });
      setMessage(res.data.message);
      login(res.data.user); // Update auth context
      triggerCelebration();
    } catch (err) {
      setMessage(err.response?.data?.message || "Something went wrong");
      const authContainer = document.querySelector(".auth-container");
      authContainer.classList.add("shake");
      setTimeout(() => authContainer.classList.remove("shake"), 500);
    }
  };

  const triggerCelebration = () => {
    document.body.classList.add("celebrate");
    setTimeout(() => {
      document.body.classList.remove("celebrate");
      navigate("/dashboard");
    }, 1500);
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      const res = await axios.post("http://localhost:5000/google-login", {
        token: credentialResponse.credential,
      }, {
        withCredentials: true
      });
      setMessage(res.data.message);
      login(res.data.user); // Update auth context
      triggerCelebration();
    } catch (err) {
      setMessage("Google login failed: " + (err.response?.data?.message || err.message));
      const authContainer = document.querySelector(".auth-container");
      authContainer.classList.add("shake");
      setTimeout(() => authContainer.classList.remove("shake"), 500);
    }
  };

  const handleGoogleFailure = () => {
    setMessage("Google login was cancelled or failed");
    const authContainer = document.querySelector(".auth-container");
    authContainer.classList.add("shake");
    setTimeout(() => authContainer.classList.remove("shake"), 500);
  };

  return (
    <GoogleOAuthProvider clientId={clientId}>
      {/* Floating particles canvas */}
      <canvas 
        ref={canvasRef} 
        className="floating-particles"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 0,
          pointerEvents: 'none'
        }}
      />

      {/* Floating elements */}
      <div className="floating-elements">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="floating-element"
            style={{
              left: `${Math.random() * 90 + 5}%`,
              top: `${Math.random() * 90 + 5}%`,
              animationDuration: `${Math.random() * 20 + 10}s`,
              animationDelay: `${Math.random() * 5}s`,
            }}
          />
        ))}
      </div>

      <div className="background-light"></div>

      <div className={`auth-container ${isAnimating ? "container-transition" : ""}`}>
        <h2 className={`title ${isAnimating ? (isLogin ? "title-enter" : "title-exit") : ""}`}>
          {isLogin ? "Welcome Back" : "Create Account"}
        </h2>

        {message && (
          <div className="error-message">
            {message}
            <button className="error-close" onClick={() => setMessage("")}>&times;</button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="form-container">
          {!isLogin && (
            <div className={`input-container ${activeInput === 3 ? "active" : ""}`}
              onMouseEnter={() => !activeInput && setActiveInput(3)}
              onMouseLeave={() => activeInput === 3 && setActiveInput(null)}>
              <input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required={!isLogin}
                onFocus={() => setActiveInput(3)}
                onBlur={() => setActiveInput(null)}
              />
              <div className="input-highlight"></div>
            </div>
          )}

          <div className={`input-container ${activeInput === 0 ? "active" : ""}`}
            onMouseEnter={() => !activeInput && setActiveInput(0)}
            onMouseLeave={() => activeInput === 0 && setActiveInput(null)}>
            <input
              type="text"
              placeholder={isLogin ? "Email or Username" : "Email"}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
              onFocus={() => setActiveInput(0)}
              onBlur={() => setActiveInput(null)}
            />
            <div className="input-highlight"></div>
          </div>

          <div className={`input-container ${activeInput === 1 ? "active" : ""}`}
            onMouseEnter={() => !activeInput && setActiveInput(1)}
            onMouseLeave={() => activeInput === 1 && setActiveInput(null)}>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              onFocus={() => setActiveInput(1)}
              onBlur={() => setActiveInput(null)}
            />
            <div className="input-highlight"></div>
          </div>

          {!isLogin && (
            <div className={`input-container confirm-password ${!isLogin ? "show" : "hide"}`}
              onMouseEnter={() => !activeInput && setActiveInput(2)}
              onMouseLeave={() => activeInput === 2 && setActiveInput(null)}>
              <input
                type="password"
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required={!isLogin}
                onFocus={() => setActiveInput(2)}
                onBlur={() => setActiveInput(null)}
              />
              <div className="input-highlight"></div>
            </div>
          )}

          <button type="submit" className={`btn ${!isLogin ? "puffy-btn" : "soft-btn"}`}>
            {isLogin ? "Login" : "Sign Up"}
            <span className="btn-glow"></span>
          </button>
        </form>

        <div className="or-divider">
          <div className="divider-line"></div>
          <span>or</span>
          <div className="divider-line"></div>
        </div>

        <div className="google-btn-wrapper">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleFailure}
            shape="pill"
            theme="filled_blue"
            size="large"
            text={isLogin ? "continue_with" : "signup_with"}
          />
        </div>

        <p className="toggle-text">
          {isLogin ? "Don't have an account?" : "Already have an account?"} {" "}
          <span className="toggle-link" onClick={toggleMode}>
            {isLogin ? "Sign Up" : "Login"}
          </span>
        </p>
      </div>
    </GoogleOAuthProvider>
  );
}