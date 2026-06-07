import { NavLink, Outlet } from "react-router-dom";
import { CATEGORIES, CATEGORY_LABELS } from "./types";
import { ALL_ITEMS, countsByCategory, REVIEW_ITEMS } from "./data";
import { budgetStatus, leadingScenarioTotal, formatTotal } from "./lib/budget";

export function App() {
  const counts = countsByCategory();
  const total = leadingScenarioTotal();
  const budget = budgetStatus(total);

  return (
    <div className="app">
      <aside className="sidebar">
        <NavLink to="/" className="wordmark">
          <span className="mark-the">The</span>
          <span className="mark-main">Wedding Edit</span>
          <div className="mark-rule" />
        </NavLink>

        <nav className="nav">
          <NavLink to="/" end className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
            <span className="nav-icon">◆</span> Overview
          </NavLink>
          <NavLink
            to="/compare"
            className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
          >
            <span className="nav-icon">⇄</span> Compare
          </NavLink>
          <NavLink
            to="/review"
            className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
          >
            <span className="nav-icon">🔎</span> Review
            {REVIEW_ITEMS.length > 0 && (
              <span className="nav-count nav-count-badge">{REVIEW_ITEMS.length}</span>
            )}
          </NavLink>
          <NavLink
            to="/preferences"
            className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
          >
            <span className="nav-icon">⚙</span> Preferences
          </NavLink>

          <div className="nav-group-label">Categories</div>
          {CATEGORIES.map((cat) => (
            <NavLink
              key={cat}
              to={`/category/${cat}`}
              className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
            >
              <span className="nav-icon">{CATEGORY_LABELS[cat].icon}</span>
              {CATEGORY_LABELS[cat].plural}
              <span className="nav-count">{counts[cat]}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-foot">
          <div className="foot-label">Budget</div>
          <div className="foot-value tnum">{formatTotal(budget.budget)}</div>
          <div className="foot-bar">
            <span
              className={budget.over ? "over" : ""}
              style={{ width: `${Math.min(100, budget.pct)}%` }}
            />
          </div>
          <div className="foot-sub">
            {total > 0 ? (
              budget.over ? (
                <span style={{ color: "var(--claret)" }}>
                  {formatTotal(-budget.remaining)} over · leading scenario
                </span>
              ) : (
                <>{formatTotal(budget.remaining)} left · leading scenario</>
              )
            ) : (
              <>{ALL_ITEMS.length} options tracked</>
            )}
          </div>
        </div>
      </aside>

      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
