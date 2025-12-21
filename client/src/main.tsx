import React from "react";
import ReactDOM from "react-dom/client";
import OfflineApp from "./OfflineApp.tsx";
import "./index.css";
import "./styles/print.css"; // System print mode CSS
import { registerSW, initPWAPrompt } from "./lib/pwa.ts";

// Initialize PWA features
registerSW();
initPWAPrompt();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <OfflineApp />
  </React.StrictMode>
);
