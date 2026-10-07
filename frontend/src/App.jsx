import {
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import Audit from "./pages/Audit";
import Chat from "./pages/Chat";
import Documents from "./pages/Documents";
import AdminUsers from "./pages/AdminUsers";
import Login from "./pages/Login";
import Register from "./pages/Register";

import {
  isAuthenticated,
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
            <Chat />
          </ProtectedRoute>
        }
      />

      <Route
        path="/documents"
        element={
          <ProtectedRoute>
            <Documents />
          </ProtectedRoute>
        }
      />

      <Route
        path="/audit"
        element={
          <ProtectedRoute>
            <Audit />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/users"
        element={
          <ProtectedRoute>
            <AdminUsers />
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