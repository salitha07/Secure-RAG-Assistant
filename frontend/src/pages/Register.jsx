import { useState } from "react";
import {
  Link,
  useNavigate,
} from "react-router-dom";

import {
  registerUser,
} from "../services/api";


function Register() {
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] =
    useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");
  const [showPassword, setShowPassword] =
    useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] =
    useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 12) {
      setError(
        "Password must contain at least 12 characters.",
      );
      return;
    }

    setIsSubmitting(true);

    try {
      await registerUser({
        full_name: fullName,
        email,
        password,
      });

      navigate("/login", {
        replace: true,
        state: {
          success:
            "Account created. You can now sign in.",
        },
      });
    } catch (requestError) {
      setError(
        requestError.message
        ?? "Registration failed.",
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
            SECURE ONBOARDING
          </p>

          <h1>
            Access knowledge without crossing boundaries.
          </h1>

          <p className="introduction-text">
            Every account begins with Employee access.
            Higher roles must be assigned by an authorized
            administrator.
          </p>

          <ul className="feature-list">
            <li>Passwords protected using Argon2</li>
            <li>Short-lived JWT access tokens</li>
            <li>Database-verified user roles</li>
          </ul>
        </div>
      </section>

      <section className="auth-form-section">
        <div className="auth-card">
          <div className="auth-card-heading">
            <p className="eyebrow">
              CREATE ACCOUNT
            </p>
            <h2>Join Secure RAG</h2>
            <p>
              Register using your company details.
            </p>
          </div>

          {error && (
            <div
              className="error-message"
              role="alert"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <label htmlFor="full-name">
              Full name
            </label>

            <input
              id="full-name"
              type="text"
              autoComplete="name"
              placeholder="Your full name"
              value={fullName}
              onChange={(event) =>
                setFullName(event.target.value)
              }
              required
            />

            <label htmlFor="register-email">
              Email address
            </label>

            <input
              id="register-email"
              type="email"
              autoComplete="email"
              placeholder="you@company.com"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              required
            />

            <label htmlFor="register-password">
              Password
            </label>

            <div className="password-field">
              <input
                id="register-password"
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                autoComplete="new-password"
                placeholder="At least 12 characters"
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                minLength={12}
                required
              />

              <button
                type="button"
                className="password-toggle"
                aria-pressed={showPassword}
                onClick={() =>
                  setShowPassword(
                    (current) => !current,
                  )
                }
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>

            <label htmlFor="confirm-password">
              Confirm password
            </label>

            <input
              id="confirm-password"
              type={
                showPassword
                  ? "text"
                  : "password"
              }
              autoComplete="new-password"
              placeholder="Enter password again"
              value={confirmPassword}
              onChange={(event) =>
                setConfirmPassword(
                  event.target.value,
                )
              }
              required
            />

            <button
              className="primary-button"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting
                ? "Creating account..."
                : "Create secure account"}
            </button>
          </form>

          <p className="auth-switch">
            Already registered?{" "}
            <Link to="/login">Sign in</Link>
          </p>

          <p className="security-note">
            New accounts receive Employee access only.
          </p>
        </div>
      </section>
    </main>
  );
}


export default Register;