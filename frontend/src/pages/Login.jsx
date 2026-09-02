import { useState } from "react";


import {
  loginUser,
} from "../services/api";
import {
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";

function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] =
    useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] =
    useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await loginUser({
        email,
        password,
      });

      navigate("/chat", {
        replace: true,
      });
    } catch (requestError) {
      setError(
        requestError.message
        ?? "Login failed. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-introduction">
        <div className="brand">
          <div className="brand-icon">S</div>
          <span>Secure RAG Assistant</span>
        </div>

        <div className="introduction-content">
          <p className="eyebrow">
            ROLE-AUTHORIZED AI
          </p>

          <h1>
            Company knowledge,
            protected by design.
          </h1>

          <p className="introduction-text">
            Ask questions using only the information
            your verified role is allowed to access.
          </p>

          <ul className="feature-list">
            <li>Role-based document retrieval</li>
            <li>Grounded answers with citations</li>
            <li>Secure JWT authentication</li>
          </ul>
        </div>
      </section>

      <section className="auth-form-section">
        <div className="auth-card">
          <div className="auth-card-heading">
            <p className="eyebrow">WELCOME BACK</p>
            <h2>Sign in to your account</h2>
            <p>
              Enter your registered account details.
            </p>
          </div>
          {location.state?.success && (
  <div
    className="success-message"
    role="status"
  >
    {location.state.success}
  </div>
)}

          {error && (
            <div
              className="error-message"
              role="alert"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <label htmlFor="email">
              Email address
            </label>

            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@company.com"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              required
            />

            <label htmlFor="password">
              Password
            </label>

            <div className="password-field">
              <input
                id="password"
                name="password"
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                required
              />

              <button
                type="button"
                className="password-toggle"
                onClick={() =>
                  setShowPassword(
                    (current) => !current,
                  )
                }
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>

            <button
              className="primary-button"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting
                ? "Signing in..."
                : "Sign in securely"}
            </button>
          </form>
          <p className="auth-switch">
  New to Secure RAG?{" "}
  <Link to="/register">
    Create an account
  </Link>
</p>

          <p className="security-note">
            Your access is limited by the role stored
            in the secure database.
          </p>
        </div>
      </section>
    </main>
  );
}


export default Login;