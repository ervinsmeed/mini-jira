import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import LocalizedApp from "./LocalizedApp";
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <LocalizedApp />
  </StrictMode>,
);
