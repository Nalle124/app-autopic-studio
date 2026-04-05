import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./i18n";

// Render first, then initialize Sentry after hydration to reduce TTI
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// Defer Sentry initialization to after first render
if ('requestIdleCallback' in window) {
  (window as any).requestIdleCallback(() => initSentry());
} else {
  setTimeout(() => initSentry(), 2000);
}

function initSentry() {
  import("@sentry/react").then((Sentry) => {
    Sentry.init({
      dsn: "https://ab0de2c7ce85481637775284cd17965a@o4510804615364608.ingest.de.sentry.io/4510804621000784",
      sendDefaultPii: true,
      integrations: [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration()
      ],
      tracesSampleRate: 1.0,
      tracePropagationTargets: ["localhost", /^https:\/\/app\.autopic\.studio/, /^https:\/\/app-autopic-studio\.lovable\.app/],
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
    });
  });
}
