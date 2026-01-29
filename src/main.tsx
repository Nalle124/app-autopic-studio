import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import LogRocket from 'logrocket';
import App from "./App.tsx";
import "./index.css";

// Initialize LogRocket session recording
const isProduction = window.location.hostname === 'app-autopic-studio.lovable.app' || 
                     window.location.hostname === 'app.autopic.studio';

if (isProduction) {
  LogRocket.init('hf8qqpt/autopic');
  console.log('[LogRocket] Initialized on production:', window.location.hostname);
} else {
  console.log('[LogRocket] Skipped - not production:', window.location.hostname);
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
