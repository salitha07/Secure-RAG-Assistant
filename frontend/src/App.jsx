import {
  Navigate,
  Route,
  Routes,
  useNavigate,
} from "react-router-dom";
import Register from "./pages/Register";

import Login from "./pages/Login";
import {
  isAuthenticated,
  logoutUser,
} from "./services/api";


function ProtectedRoute({ children }) {
  if (!isAuthenticated()) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  return children;
}


function ChatPlaceholder() {
  const navigate = useNavigate();

  function handleLogout() {
    logoutUser();
    navigate("/login", {
      replace: true,
    });
  }

  return (
    <main className="placeholder-page">
      <div className="placeholder-card">
        <p className="eyebrow">
          AUTHENTICATION SUCCESSFUL
        </p>

        <h1>Secure chat is ready next.</h1>

        <p>
          Your JWT access token is now attached to
          protected API requests.
        </p>

        <button
          className="primary-button"
          type="button"
          onClick={handleLogout}
        >
          Sign out
        </button>
      </div>
    </main>
  );
}


function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <Navigate
            to={
              isAuthenticated()
                ? "/chat"
                : "/login"
            }
            replace
          />
        }
      />

      <Route
        path="/login"
        element={<Login />}
      />
      <Route
  path="/register"
  element={<Register />}
/>

      <Route
        path="/chat"
        element={
          <ProtectedRoute>
            <ChatPlaceholder />
          </ProtectedRoute>
        }
      />

      <Route
        path="*"
        element={
          <Navigate
            to="/"
            replace
          />
        }
      />
    </Routes>
  );
}


export default App;