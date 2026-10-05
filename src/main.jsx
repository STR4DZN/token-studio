import React from "react";
import { createRoot } from "react-dom/client";
import { Suite } from "./Suite.jsx";
import "./styles.css";
import "./editor.css";
import './sheet.css';

createRoot(document.getElementById("root")).render(
  <Suite />,
);
