import { NavLink, Outlet } from "react-router-dom";
import { CATEGORIES, CATEGORY_LABELS } from "./types";
import { ALL_ITEMS, VENUES, countsByCategory } from "./data";
import { scenarioTotal, formatTotal } from "./lib/budget";

function leadingVenueTotal(): number {
  if (VENUES.length === 0) return 0;
  // The most-progressed venue (booked > shortlisted > …), tie-broken by name.
  const rank = ["booked", "shortlisted", "quoted", "contacted", "considering", "passed"];
  const lead = [...VENUES].sort(
    (a, b) => rank.indexOf(a.status ?? "considering") - rank.indexOf(b.status ?? "considering")
  )[0];
  return scenarioTotal(lead);
}

export function App() {
  const counts = countsByCategory();
  const total = leadingVenueTotal();

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
          <div className="foot-label">Leading estimate</div>
          <div className="foot-value tnum">{total > 0 ? formatTotal(total) : "—"}</div>
          <div className="foot-sub">
            {ALL_ITEMS.length} options tracked · top venue scenario
          </div>
        </div>
      </aside>

      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
