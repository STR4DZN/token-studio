import React, { useState, useEffect } from "react";
import { App } from "./App.jsx";
import { SheetEditor } from "./SheetEditor.jsx";
export function Suite({ host = {} }) {
  const [mode, setMode] = useState(host.initialMode || "images"),
    [sheetVisited, setSheetVisited] = useState(host.initialMode === "sheet"),
    [actorState,setActorState] = useState({});
  const boundHost = {...host,...actorState};
  function sheetApplied(result) {
    setActorState(current=>({...current,...result}));
    host.onSheetApplied?.(result);
  }
  useEffect(() => {
    if (host.mode) {
      setMode(host.mode);
      if (host.mode === "sheet") setSheetVisited(true);
    }
  }, [host.mode]);
  function select(m) {
    setMode(m);
    if (m === "sheet") setSheetVisited(true);
  }
  return (
    <div className="ts-app ts-suite">
      <nav className="ts-suite-nav" aria-label="Ferramentas do mestre">
        <div className="ts-suite-switch">
          <button
            aria-pressed={mode === "images"}
            onClick={() => select("images")}
          >
            <i className="fa-solid fa-crop-simple" /> Imagens e tokens
          </button>
          <button
            aria-pressed={mode === "sheet"}
            onClick={() => select("sheet")}
          >
            <i className="fa-solid fa-address-card" /> Ficha do mestre
          </button>
        </div>
        <span>
          <i className="fa-solid fa-user-shield" />{" "}
          {host.isFoundry
            ? "Edição do mestre"
            : "Prévia local • alterações salvas neste navegador"}
        </span>
      </nav>
      <div className="ts-suite-pane" hidden={mode !== "images"}>
        <App host={boundHost} />
      </div>
      {sheetVisited && (
        <div className="ts-suite-pane" hidden={mode !== "sheet"}>
          <SheetEditor host={{...boundHost,onSheetApplied:sheetApplied}} />
        </div>
      )}
    </div>
  );
}
