import { useState, useRef, useMemo, useEffect } from "react";
import { PA_BASE, num, cupos, codigo, vitActual, paDisponible, paGastado, estadoDe } from "./engine.js";
import { usePersistedState } from "./usePersistedState.js";
import { encodeCombate, decodeCombate } from "./share.js";

// ── Datos iniciales ─────────────────────────────────────────────────
const INI = [
  { id: 1, nombre: "Joseph Star — Mark I", bando: "A", vitMax: 750, vel: 6, vigMax: 3, vigorRestante: 3, huido: false },
  { id: 2, nombre: "Oponente", bando: "B", vitMax: 1000, vel: 5, vigMax: 1, vigorRestante: 1, huido: false },
];

export default function Tracker({ danoEntrante, onConsumirDano }) {
  const [combatientes, setCombatientes] = usePersistedState("cs.track.combatientes", INI);
  const [movidas, setMovidas] = usePersistedState("cs.track.movidas", []);
  const [ronda, setRonda] = usePersistedState("cs.track.ronda", 1);
  const idRef = useRef(null);
  if (idRef.current === null) {
    // arranca por encima del mayor id presente (combatientes + movidas) para no colisionar tras recargar
    idRef.current = Math.max(100, ...combatientes.map((c) => c.id), ...movidas.map((m) => m.id));
  }
  const nid = () => ++idRef.current;

  // Importar un combate compartido por URL (?c=...) una sola vez, y limpiar el param.
  const urlImported = useRef(false);
  useEffect(() => {
    if (urlImported.current) return;
    urlImported.current = true;
    const shared = decodeCombate(new URLSearchParams(window.location.search).get("c") || "");
    if (shared) {
      setCombatientes(shared.combatientes);
      setMovidas(shared.movidas);
      setRonda(shared.ronda);
    }
    const url = new URL(window.location.href);
    if (url.searchParams.has("c")) {
      url.searchParams.delete("c");
      window.history.replaceState({}, "", url);
    }
  }, [setCombatientes, setMovidas, setRonda]);

  // Compartir el combate actual como link (estado serializado en la URL).
  const [copiado, setCopiado] = useState(false);
  const compartir = async () => {
    const url = new URL(window.location.href);
    url.searchParams.set("c", encodeCombate({ combatientes, movidas, ronda }));
    const link = url.toString();
    try {
      await navigator.clipboard.writeText(link);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      window.prompt("Copiá el link del combate:", link);
    }
  };

  const ordenTurnos = useMemo(() => {
    return combatientes
      .filter((c) => estadoDe(c, movidas) === "pie")
      .slice()
      .sort((a, b) => b.vel - a.vel || a.id - b.id);
  }, [combatientes, movidas]);

  const editar = (id, campo, valor) =>
    setCombatientes((cs) => cs.map((c) => (c.id === id ? { ...c, [campo]: valor } : c)));
  const ajustarVigor = (id, delta) =>
    setCombatientes((cs) =>
      cs.map((c) => (c.id === id ? { ...c, vigorRestante: Math.max(0, Math.min(c.vigMax, c.vigorRestante + delta)) } : c))
    );
  const toggleHuir = (id) =>
    setCombatientes((cs) => cs.map((c) => (c.id === id ? { ...c, huido: !c.huido } : c)));
  const quitar = (id) => setCombatientes((cs) => cs.filter((c) => c.id !== id));
  const agregar = (bando) => {
    if (cupos(combatientes, bando) >= 3) return;
    setCombatientes((cs) => [
      ...cs,
      { id: nid(), nombre: "Nuevo combatiente", bando, vitMax: 1000, vel: 5, vigMax: 1, vigorRestante: 1, huido: false },
    ]);
  };
  const nuevaRonda = () => setRonda((r) => r + 1);
  const reiniciar = () => { setCombatientes(INI); setMovidas([]); setRonda(1); };

  const bandoA = combatientes.filter((c) => c.bando === "A");
  const bandoB = combatientes.filter((c) => c.bando === "B");

  return (
    <div className="tk-root">
      <style>{CSS}</style>

      <header className="tk-head">
        <div className="tk-logo">
          <div className="tk-logo-main">STAR INDUSTRIES</div>
          <div className="tk-logo-sub">COMBAT SUITE — GESTOR DE COMBATE</div>
        </div>
        <div className="tk-round">
          <div className="tk-round-box"><span>Ronda</span><b>{ronda}</b></div>
          <button className="tk-btn" onClick={nuevaRonda}>Nueva ronda ▸</button>
          <button className="tk-btn tk-btn-ghost" onClick={compartir}>{copiado ? "¡Copiado! ✓" : "Compartir ▸"}</button>
          <button className="tk-btn tk-btn-ghost" onClick={reiniciar}>Reiniciar</button>
        </div>
      </header>

      <div className="tk-banderas">
        <Bando titulo="Bando A" color="red" lista={bandoA} {...{ combatientes, movidas, ronda, editar, ajustarVigor, toggleHuir, quitar }} onAdd={() => agregar("A")} />
        <Bando titulo="Bando B" color="blue" lista={bandoB} {...{ combatientes, movidas, ronda, editar, ajustarVigor, toggleHuir, quitar }} onAdd={() => agregar("B")} />
      </div>

      <section className="tk-turnos">
        <div className="tk-sec-tag tk-sec-blue">Orden de turnos · por velocidad</div>
        <div className="tk-chips">
          {ordenTurnos.length === 0 && <span className="tk-empty">Nadie en pie.</span>}
          {ordenTurnos.map((c) => (
            <span key={c.id} className={"tk-chip " + (c.bando === "A" ? "tk-chip-red" : "tk-chip-blue")}>
              <b>{codigo(c, combatientes)}</b> {c.nombre.split(" — ")[0]} <em>VEL {c.vel}</em>
            </span>
          ))}
        </div>
      </section>

      <Bitacora
        combatientes={combatientes}
        movidas={movidas}
        ronda={ronda}
        nid={nid}
        danoEntrante={danoEntrante}
        onConsumirDano={onConsumirDano}
        onAdd={(m) => setMovidas((ms) => [...ms, m])}
        onDel={(id) => setMovidas((ms) => ms.filter((m) => m.id !== id))}
      />
    </div>
  );
}

// ── Bando con sus cartas ────────────────────────────────────────────
function Bando({ titulo, color, lista, combatientes, movidas, ronda, editar, ajustarVigor, toggleHuir, quitar, onAdd }) {
  return (
    <section className="tk-bando">
      <div className={"tk-sec-tag " + (color === "red" ? "tk-sec-red" : "tk-sec-blue")}>{titulo}</div>
      <div className="tk-cartas">
        {lista.map((c) => (
          <Carta key={c.id} c={c} combatientes={combatientes} movidas={movidas} ronda={ronda} editar={editar} ajustarVigor={ajustarVigor} toggleHuir={toggleHuir} quitar={quitar} />
        ))}
        {lista.length < 3 && (
          <button className="tk-add" onClick={onAdd}>+ Agregar a {titulo}</button>
        )}
      </div>
    </section>
  );
}

// ── Carta de combatiente ────────────────────────────────────────────
function Carta({ c, combatientes, movidas, ronda, editar, ajustarVigor, toggleHuir, quitar }) {
  const vit = vitActual(c, movidas);
  const pct = c.vitMax > 0 ? (vit / c.vitMax) * 100 : 0;
  const estado = estadoDe(c, movidas);
  const paDisp = paDisponible(c, combatientes);
  const paGas = paGastado(c, movidas, ronda);
  const exceso = paGas > paDisp;
  const bonus = paDisp - PA_BASE;
  const cod = codigo(c, combatientes);
  const barColor = pct > 50 ? "#3FB24B" : pct > 25 ? "#FFD400" : "#E62429";

  return (
    <div className={"tk-carta" + (estado !== "pie" ? " tk-down" : "")}>
      <div className="tk-carta-top">
        <span className={"tk-cod " + (c.bando === "A" ? "tk-cod-red" : "tk-cod-blue")}>{cod}</span>
        <input className="tk-name" value={c.nombre} onChange={(e) => editar(c.id, "nombre", e.target.value)} />
        <button className="tk-x" onClick={() => quitar(c.id)} title="Quitar">✕</button>
      </div>

      {estado !== "pie" && <div className={"tk-estado " + (estado === "huido" ? "tk-estado-huido" : "tk-estado-caido")}>{estado === "huido" ? "HUIDO" : "¡CAÍDO!"}</div>}

      <div className="tk-vit">
        <div className="tk-vit-bar">
          <div className="tk-vit-fill" style={{ width: pct + "%", background: barColor }} />
          <span className="tk-vit-txt">{vit} / {c.vitMax}</span>
        </div>
      </div>

      <div className="tk-stats">
        <label className="tk-stat">
          <span>VIT máx</span>
          <input inputMode="numeric" value={c.vitMax} onChange={(e) => editar(c.id, "vitMax", num(e.target.value))} />
        </label>
        <label className="tk-stat">
          <span>VEL</span>
          <input inputMode="numeric" value={c.vel} onChange={(e) => editar(c.id, "vel", num(e.target.value))} />
        </label>
        <label className="tk-stat">
          <span>VIG máx</span>
          <input inputMode="numeric" value={c.vigMax} onChange={(e) => editar(c.id, "vigMax", num(e.target.value))} />
        </label>
      </div>

      <div className="tk-meta">
        <div className="tk-vigor">
          <span className="tk-meta-lbl">Vigor</span>
          <button onClick={() => ajustarVigor(c.id, -1)}>−</button>
          <b>{c.vigorRestante}<small>/{c.vigMax}</small></b>
          <button onClick={() => ajustarVigor(c.id, +1)}>+</button>
        </div>
        <div className={"tk-pa" + (exceso ? " tk-pa-bad" : "")}>
          <span className="tk-meta-lbl">PA ronda</span>
          <b>{paGas} / {paDisp}</b>
          {bonus > 0 && <em className="tk-pa-bonus">+{bonus} inf.</em>}
        </div>
      </div>

      <button className={"tk-huir" + (c.huido ? " on" : "")} onClick={() => toggleHuir(c.id)}>
        {c.huido ? "Reincorporar" : "Marcar huida"}
      </button>
    </div>
  );
}

// ── Bitácora ────────────────────────────────────────────────────────
function Bitacora({ combatientes, movidas, ronda, nid, danoEntrante, onConsumirDano, onAdd, onDel }) {
  const enPie = combatientes;
  const [ej, setEj] = useState("");
  const [ob, setOb] = useState("");
  const [pa, setPa] = useState("1");
  const [dano, setDano] = useState("");
  const [nota, setNota] = useState("");

  // Precarga el daño cuando llega desde la calculadora (puente entre módulos).
  useEffect(() => {
    if (danoEntrante && danoEntrante.valor != null) setDano(String(danoEntrante.valor));
  }, [danoEntrante]);

  const ejId = ej || (combatientes[0] && combatientes[0].id) || "";
  const obId = ob || (combatientes[1] && combatientes[1].id) || (combatientes[0] && combatientes[0].id) || "";

  const nombreDe = (id) => {
    const c = combatientes.find((x) => x.id === Number(id));
    return c ? codigo(c, combatientes) + " " + c.nombre.split(" — ")[0] : "—";
  };

  const registrar = () => {
    if (dano === "" && num(pa) === 0) return;
    onAdd({ id: nid(), ronda, ejecutorId: Number(ejId), objetivoId: Number(obId), pa: num(pa), dano: num(dano), nota: nota.trim() });
    setDano(""); setNota(""); setPa("1");
    onConsumirDano?.();
  };

  const visibles = movidas.slice().reverse();

  return (
    <section className="tk-bitacora">
      <div className="tk-sec-tag tk-sec-red">Bitácora de combate</div>

      <div className="tk-form">
        <label className="tk-f">
          <span>Ejecuta</span>
          <select value={ejId} onChange={(e) => setEj(e.target.value)}>
            {enPie.map((c) => <option key={c.id} value={c.id}>{codigo(c, combatientes)} · {c.nombre.split(" — ")[0]}</option>)}
          </select>
        </label>
        <label className="tk-f">
          <span>Objetivo</span>
          <select value={obId} onChange={(e) => setOb(e.target.value)}>
            {enPie.map((c) => <option key={c.id} value={c.id}>{codigo(c, combatientes)} · {c.nombre.split(" — ")[0]}</option>)}
          </select>
        </label>
        <label className="tk-f tk-f-sm">
          <span>PA</span>
          <input inputMode="numeric" value={pa} onChange={(e) => setPa(e.target.value)} />
        </label>
        <label className="tk-f tk-f-sm">
          <span>Daño{danoEntrante && danoEntrante.valor != null ? <em className="tk-from-calc">↳ calc</em> : null}</span>
          <input inputMode="decimal" value={dano} onChange={(e) => setDano(e.target.value)} placeholder="0" />
        </label>
        <label className="tk-f">
          <span>Nota (opcional)</span>
          <input value={nota} onChange={(e) => setNota(e.target.value)} placeholder="habilidad, efecto…" />
        </label>
        <button className="tk-btn tk-reg" onClick={registrar}>Registrar ▸</button>
      </div>
      <div className="tk-form-hint">Daño negativo = curación. El número de daño sale del motor de cálculo.</div>

      <ul className="tk-log">
        {visibles.length === 0 && <li className="tk-empty">Todavía no hay movidas registradas.</li>}
        {visibles.map((m) => {
          const cura = num(m.dano) < 0;
          return (
            <li key={m.id} className="tk-log-row">
              <span className="tk-log-r">R{m.ronda}</span>
              <span className="tk-log-act">{nombreDe(m.ejecutorId)} <i>→</i> {nombreDe(m.objetivoId)}</span>
              <span className="tk-log-pa">{m.pa} PA</span>
              <span className={"tk-log-dano " + (cura ? "tk-cura" : "tk-hit")}>{cura ? "+" + Math.abs(num(m.dano)) + " VIT" : num(m.dano) + " daño"}</span>
              {m.nota && <span className="tk-log-nota">{m.nota}</span>}
              <button className="tk-x tk-x-sm" onClick={() => onDel(m.id)}>✕</button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

const CSS = `
.tk-root{
  background-color:var(--paper);
  background-image:radial-gradient(rgba(230,36,41,.16) 1.1px, transparent 1.3px);
  background-size:8px 8px;
  color:var(--ink); font-family:var(--body);
  padding:24px; border:4px solid var(--ink); border-radius:6px;
  max-width:980px; margin:0 auto; box-shadow:7px 7px 0 var(--ink);
}
.tk-head{display:flex; align-items:flex-start; gap:16px; margin-bottom:22px; flex-wrap:wrap;}
.tk-logo{transform:rotate(-1.4deg);}
.tk-logo-main{display:inline-block; background:var(--red); color:var(--white);
  font-family:var(--display); font-size:clamp(24px,5vw,36px); letter-spacing:.04em;
  padding:6px 15px 4px; border:3px solid var(--ink); border-radius:4px; box-shadow:5px 5px 0 var(--ink);
  text-shadow:2px 2px 0 #000,-2px 2px 0 #000,2px -2px 0 #000,-2px -2px 0 #000,2px 0 0 #000,-2px 0 0 #000,0 2px 0 #000,0 -2px 0 #000;}
.tk-logo-sub{display:inline-block; margin-top:8px; background:var(--yellow); color:var(--ink);
  font-family:var(--display); font-size:12px; letter-spacing:.08em; padding:3px 10px;
  border:2.5px solid var(--ink); transform:rotate(.8deg);}
.tk-round{margin-left:auto; display:flex; align-items:center; gap:10px; flex-wrap:wrap;}
.tk-round-box{display:flex; flex-direction:column; align-items:center; line-height:1;
  background:var(--white); border:3px solid var(--ink); border-radius:4px; padding:5px 13px; box-shadow:3px 3px 0 var(--ink);}
.tk-round-box span{font-family:var(--display); font-size:10px; letter-spacing:.1em; color:var(--mut);}
.tk-round-box b{font-family:var(--display); font-size:26px;}

.tk-btn{background:var(--yellow); color:var(--ink); font-family:var(--display); font-size:15px;
  letter-spacing:.04em; text-transform:uppercase; border:3px solid var(--ink); border-radius:4px;
  padding:8px 15px; cursor:pointer; box-shadow:3px 3px 0 var(--ink); transition:transform .08s, box-shadow .08s;}
.tk-btn:hover{transform:translate(3px,3px); box-shadow:0 0 0 var(--ink);}
.tk-btn:focus-visible{outline:3px solid var(--blue); outline-offset:2px;}
.tk-btn-ghost{background:var(--white);}

.tk-sec-tag{display:inline-block; font-family:var(--display); font-size:15px; letter-spacing:.05em;
  color:var(--white); padding:4px 13px; border:3px solid var(--ink); border-radius:3px;
  box-shadow:3px 3px 0 var(--ink); transform:rotate(-1.5deg); margin-bottom:14px;
  text-shadow:1.5px 1.5px 0 #000,-1.5px 1.5px 0 #000,1.5px -1.5px 0 #000,-1.5px -1.5px 0 #000;}
.tk-sec-red{background:var(--red);}
.tk-sec-blue{background:var(--blue);}

.tk-banderas{display:grid; grid-template-columns:1fr 1fr; gap:18px; margin-bottom:20px;}
@media (max-width:720px){.tk-banderas{grid-template-columns:1fr;}}
.tk-cartas{display:flex; flex-direction:column; gap:14px;}

.tk-carta{background:var(--white); border:3.5px solid var(--ink); border-radius:5px; padding:13px;
  box-shadow:5px 5px 0 var(--ink); position:relative;}
.tk-down{opacity:.72;}
.tk-carta-top{display:flex; align-items:center; gap:9px; margin-bottom:11px;}
.tk-cod{font-family:var(--display); font-size:15px; color:var(--white); padding:2px 9px;
  border:2.5px solid var(--ink); border-radius:3px;
  text-shadow:1.5px 1.5px 0 #000,-1.5px 1.5px 0 #000,1.5px -1.5px 0 #000,-1.5px -1.5px 0 #000;}
.tk-cod-red{background:var(--red);} .tk-cod-blue{background:var(--blue);}
.tk-name{flex:1; border:2px solid var(--ink); border-radius:4px; padding:5px 8px;
  font-family:var(--body); font-weight:800; font-size:14px; background:var(--white); color:var(--ink); min-width:0;}
.tk-name:focus{outline:none; border-color:var(--blue); box-shadow:0 0 0 2px rgba(46,111,212,.25);}
.tk-x{background:var(--white); border:2px solid var(--ink); border-radius:4px; width:26px; height:26px;
  font-weight:900; cursor:pointer; color:var(--ink); flex:0 0 auto;}
.tk-x:hover{background:var(--red); color:var(--white);}
.tk-x-sm{width:22px; height:22px; font-size:11px;}

.tk-estado{position:absolute; top:9px; right:42px; font-family:var(--display); font-size:14px;
  padding:2px 9px; border:2.5px solid var(--ink); transform:rotate(-4deg); color:var(--white);
  text-shadow:1.5px 1.5px 0 #000,-1.5px 1.5px 0 #000;}
.tk-estado-caido{background:var(--red);} .tk-estado-huido{background:var(--mut);}

.tk-vit{margin-bottom:11px;}
.tk-vit-bar{position:relative; height:26px; background:#efe9da; border:3px solid var(--ink);
  border-radius:4px; overflow:hidden;}
.tk-vit-fill{position:absolute; inset:0 auto 0 0; height:100%; transition:width .2s;}
.tk-vit-txt{position:absolute; inset:0; display:grid; place-items:center; font-family:var(--display);
  font-size:14px; color:var(--ink); text-shadow:1px 1px 0 rgba(255,255,255,.7);}

.tk-stats{display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px; margin-bottom:11px;}
.tk-stat{display:flex; flex-direction:column; gap:3px;}
.tk-stat span{font-family:var(--display); font-size:11px; letter-spacing:.04em; color:var(--mut);}
.tk-stat input{border:2px solid var(--ink); border-radius:4px; padding:5px 7px; font-family:var(--body);
  font-weight:800; font-size:14px; font-variant-numeric:tabular-nums; width:100%; box-sizing:border-box; background:var(--white); color:var(--ink);}
.tk-stat input:focus{outline:none; border-color:var(--blue); box-shadow:0 0 0 2px rgba(46,111,212,.25);}

.tk-meta{display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:11px;}
.tk-meta-lbl{font-family:var(--display); font-size:11px; letter-spacing:.04em; color:var(--mut); display:block; margin-bottom:3px;}
.tk-vigor,.tk-pa{background:#faf6ea; border:2.5px solid var(--ink); border-radius:4px; padding:6px 8px;}
.tk-vigor{display:flex; align-items:center; gap:7px; flex-wrap:wrap;}
.tk-vigor button{width:24px; height:24px; border:2px solid var(--ink); border-radius:4px; background:var(--yellow);
  font-family:var(--display); font-size:15px; cursor:pointer; line-height:1;}
.tk-vigor b,.tk-pa b{font-family:var(--display); font-size:18px;}
.tk-vigor small,.tk-pa small{font-size:11px; color:var(--mut);}
.tk-pa{display:flex; flex-direction:column;}
.tk-pa-row{display:flex; align-items:baseline; gap:6px;}
.tk-pa-bonus{font-family:var(--body); font-weight:800; font-size:10px; color:var(--blue); margin-left:6px;}
.tk-pa-bad b{color:var(--red);}
.tk-pa-bad{box-shadow:0 0 0 2px var(--red);}

.tk-huir{width:100%; background:var(--white); border:2.5px solid var(--ink); border-radius:4px;
  font-family:var(--display); font-size:13px; letter-spacing:.04em; text-transform:uppercase;
  padding:6px; cursor:pointer; color:var(--ink);}
.tk-huir:hover{background:#efe9da;}
.tk-huir.on{background:var(--mut); color:var(--white);}

.tk-add{border:3px dashed var(--ink); border-radius:5px; background:transparent; padding:12px;
  font-family:var(--display); font-size:14px; letter-spacing:.04em; text-transform:uppercase;
  color:var(--mut); cursor:pointer;}
.tk-add:hover{color:var(--ink); background:rgba(255,212,0,.25);}

.tk-turnos{margin-bottom:20px;}
.tk-chips{display:flex; flex-wrap:wrap; gap:9px;}
.tk-chip{font-family:var(--body); font-size:12px; font-weight:700; color:var(--ink);
  background:var(--white); border:2.5px solid var(--ink); border-radius:4px; padding:5px 10px; box-shadow:2px 2px 0 var(--ink);}
.tk-chip b{font-family:var(--display); margin-right:4px;}
.tk-chip em{font-style:normal; color:var(--mut); font-size:10px; margin-left:5px;}
.tk-chip-red{border-left:6px solid var(--red);} .tk-chip-blue{border-left:6px solid var(--blue);}

.tk-bitacora{background:var(--white); border:3.5px solid var(--ink); border-radius:5px; padding:16px; box-shadow:5px 5px 0 var(--ink);}
.tk-form{display:grid; grid-template-columns:1.3fr 1.3fr .6fr .7fr 1.4fr auto; gap:9px; align-items:end;}
@media (max-width:760px){.tk-form{grid-template-columns:1fr 1fr;}}
.tk-f{display:flex; flex-direction:column; gap:4px;}
.tk-f span{font-family:var(--display); font-size:11px; letter-spacing:.04em; color:var(--mut);}
.tk-f select,.tk-f input{border:2.5px solid var(--ink); border-radius:4px; padding:8px; font-family:var(--body);
  font-weight:800; font-size:13px; background:var(--white); color:var(--ink); width:100%; box-sizing:border-box; font-variant-numeric:tabular-nums;}
.tk-f select:focus,.tk-f input:focus{outline:none; border-color:var(--blue); box-shadow:0 0 0 2px rgba(46,111,212,.25);}
.tk-reg{align-self:end;}
.tk-form-hint{font-size:10.5px; color:var(--mut); font-weight:600; margin-top:7px;}
.tk-from-calc{font-style:normal; color:var(--blue); font-weight:800; font-size:9px; background:rgba(46,111,212,.14);
  border:1.5px solid var(--blue); border-radius:3px; padding:0 4px; margin-left:5px; vertical-align:middle;}

.tk-log{list-style:none; margin:14px 0 0; padding:0; display:flex; flex-direction:column; gap:6px;}
.tk-log-row{display:flex; align-items:center; gap:9px; flex-wrap:wrap; background:#faf6ea;
  border:2.5px solid var(--ink); border-radius:4px; padding:7px 10px; font-size:13px;}
.tk-log-r{font-family:var(--display); font-size:12px; background:var(--ink); color:var(--white); padding:1px 6px; border-radius:3px;}
.tk-log-act{font-weight:800;} .tk-log-act i{font-style:normal; color:var(--red); font-weight:900; margin:0 2px;}
.tk-log-pa{font-weight:700; color:var(--mut); font-size:12px;}
.tk-log-dano{font-family:var(--display); font-size:14px; padding:1px 8px; border:2px solid var(--ink); border-radius:3px;}
.tk-hit{background:var(--red); color:var(--white);}
.tk-cura{background:var(--green); color:var(--white);}
.tk-log-nota{font-size:12px; color:var(--mut); font-style:italic;}
.tk-log-row .tk-x{margin-left:auto;}

.tk-empty{color:var(--mut); font-weight:600; font-size:13px; padding:4px 0;}

@media (prefers-reduced-motion:reduce){.tk-btn,.tk-vit-fill{transition:none;}}
`;
