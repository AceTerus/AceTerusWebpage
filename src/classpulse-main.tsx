import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import ClassPulseApp from "./ClassPulseApp";

createRoot(document.getElementById("classpulse-root")!).render(
  <StrictMode>
    <ClassPulseApp />
  </StrictMode>
);
