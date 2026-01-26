import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import LogRocket from 'logrocket';
import App from "./App.tsx";
import "./index.css";

// Initialize LogRocket session recording
LogRocket.init('hf8qqpt/autopic');

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
