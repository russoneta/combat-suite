import { useState } from "react";
import Calculadora from "./Calculadora.jsx";
import Tracker from "./Tracker.jsx";

// Dos vistas → no hace falta router, alcanza un useState.
const TABS = [
  { id: "calc", label: "Calculadora" },
  { id: "track", label: "Gestor de combate" },
];

export default function App() {
  const [tab, setTab] = useState(() => {
    // un link de combate compartido (?c=...) abre directo en el gestor
    try {
      return new URLSearchParams(window.location.search).has("c") ? "track" : "calc";
    } catch {
      return "calc";
    }
  });
  // Puente calculadora → gestor: daño calculado que viaja a la bitácora.
  const [danoEntrante, setDanoEntrante] = useState(null);

  const enviarDanoAlGestor = (valor) => {
    setDanoEntrante({ valor, ts: Date.now() }); // ts re-dispara aunque el valor repita
    setTab("track");
  };

  return (
    <div className="app-shell">
      <nav className="app-nav">
        <div className="app-nav-brand">COMBAT SUITE</div>
        <span className="app-alpha">ALPHA</span>
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
        {tab === "calc" ? (
          <Calculadora onEnviarDano={enviarDanoAlGestor} />
        ) : (
          <Tracker danoEntrante={danoEntrante} onConsumirDano={() => setDanoEntrante(null)} />
        )}
      </main>

      <footer className="app-foot">
        <div className="app-credit">CALCULADORA &amp; GESTOR — by <b>TAKE</b></div>
        <div className="app-pd">P.D.: maldito seas darthsaren <em>(chiquitito)</em></div>
      </footer>
    </div>
  );
}
