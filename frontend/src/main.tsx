import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { RenderErrorBoundary } from "./components/RenderErrorBoundary";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RenderErrorBoundary title="页面渲染出现异常">
      <App />
    </RenderErrorBoundary>
  </StrictMode>,
);
