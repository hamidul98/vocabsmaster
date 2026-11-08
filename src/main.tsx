import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import "./index.css";
import App from "./App";
import { LibraryProvider } from "./hooks/useLibrary";
import { ProgressProvider } from "./lib/progress";
import { AuthProvider } from "./lib/sync";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <HashRouter>
      <LibraryProvider>
        <ProgressProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </ProgressProvider>
      </LibraryProvider>
    </HashRouter>
  </StrictMode>,
);
