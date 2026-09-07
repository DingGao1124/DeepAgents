import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { RenderErrorBoundary } from "./components/RenderErrorBoundary";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RenderErrorBoundary title="Page rendering error">
      <App />
    </RenderErrorBoundary>
  </StrictMode>,
);
