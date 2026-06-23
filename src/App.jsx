import { useState } from "react";
import Calculadora from "./Calculadora.jsx";
import Tracker from "./Tracker.jsx";

// Dos vistas → no hace falta router, alcanza un useState.
const TABS = [
  { id: "calc", label: "Calculadora" },
  { id: "track", label: "Gestor de combate" },
];

export default function App() {
  const [tab, setTab] = useState("calc");

  return (
    <div className="app-shell">
      <nav className="app-nav">
        <div className="app-nav-brand">COMBAT SUITE</div>
        <div className="app-nav-tabs">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={"app-tab" + (tab === t.id ? " is-active" : "")}
              onClick={() => setTab(t.id)}
              aria-current={tab === t.id ? "page" : undefined}
            >
              {t.label}
            </button>
          ))}
        </div>
      </nav>

      <main>
        {tab === "calc" ? <Calculadora /> : <Tracker />}
      </main>
    </div>
  );
}
