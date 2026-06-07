import React from "react";
import ReactDOM from "react-dom/client";
import { createHashRouter, RouterProvider } from "react-router-dom";
import "./styles.css";
import { App } from "./App";
import { Overview } from "./pages/Overview";
import { CategoryPage } from "./pages/CategoryPage";
import { ComparePage } from "./pages/ComparePage";
import { ReviewPage } from "./pages/ReviewPage";
import { PreferencesPage } from "./pages/PreferencesPage";
import { ItemDetail } from "./pages/ItemDetail";

// Hash routing keeps the app a pure static site — no server rewrites needed
// when opened from the built files or the dev server.
const router = createHashRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <Overview /> },
      { path: "compare", element: <ComparePage /> },
      { path: "review", element: <ReviewPage /> },
      { path: "preferences", element: <PreferencesPage /> },
      { path: "category/:category", element: <CategoryPage /> },
      { path: "item/:id", element: <ItemDetail /> },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
