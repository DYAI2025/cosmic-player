import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "./styles/cyberpunk-theme.css";
import { App } from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <div className="cyberpunk-theme w-full h-full min-h-screen">
      <App />
    </div>
  </StrictMode>
);
