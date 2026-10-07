import "../styles/theme-toggle.css";

function ThemeToggle({ theme, onToggle }) {
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={onToggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      <span className="theme-toggle-icon" aria-hidden="true">
        {isDark ? "☀️" : "🌙"}
      </span>

      {isDark ? "Light mode" : "Dark mode"}
    </button>
  );
}

export default ThemeToggle;