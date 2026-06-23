import { useRef, useMemo } from "react";
import { calcular } from "./engine.js";
import { usePersistedState } from "./usePersistedState.js";

// ── Presentación: estrella de cómic del daño final ──────────────────
function burstPath(cx, cy, n, outer, inner, jit) {
  let seed = 7;
  const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  let p = "";
  for (let i = 0; i < n * 2; i++) {
    const ang = (Math.PI / n) * i - Math.PI / 2;
    const base = i % 2 === 0 ? outer : inner;
    const r = base * (1 - jit / 2 + rnd() * jit);
    p += (i === 0 ? "M" : "L") + (cx + Math.cos(ang) * r).toFixed(1) + " " + (cy + Math.sin(ang) * r).toFixed(1) + " ";
  }
  return p + "Z";
}
const BURST = burstPath(150, 150, 15, 142, 94, 0.16);

// ── UI ──────────────────────────────────────────────────────────────
const EJEMPLO = {
  baseOrigen: "manual", base: "115", mult: "1.35",
  potPct: "0", potFijo: "0",
  defHab: "0", defHabModo: "normal", defHabPct: "0",
  res: "0", resModo: "normal", resPct: "0",
  redPct: "0", inmFactor: "1",
};
const STATS_INI = [
  { id: "fue", nombre: "FUE", valor: "800" },
  { id: "arma", nombre: "ARMA", valor: "350" },
];

export default function Calculadora({ onEnviarDano }) {
  const [s, setS] = usePersistedState("cs.calc.s", EJEMPLO);
  const [stats, setStats] = usePersistedState("cs.calc.stats", STATS_INI);
  const idRef = useRef(null);
  if (idRef.current === null) {
    // arranca el contador por encima del mayor stat "sN" ya guardado (evita colisión tras recargar)
    idRef.current = stats.reduce((mx, st) => {
      const m = /^s(\d+)$/.exec(st.id);
      return m ? Math.max(mx, +m[1]) : mx;
    }, 0);
  }

  const statSel = stats.find((st) => st.id === s.baseOrigen);
  const baseEf = s.baseOrigen === "manual" ? s.base : statSel ? statSel.valor : "0";
  const r = useMemo(() => calcular({ ...s, base: baseEf }), [s, baseEf]);

  const set = (k) => (e) => setS({ ...s, [k]: e.target.value });
  const editStat = (id, campo, val) => setStats((ss) => ss.map((st) => (st.id === id ? { ...st, [campo]: val } : st)));
  const addStat = () => setStats((ss) => [...ss, { id: "s" + ++idRef.current, nombre: "", valor: "" }]);
  const delStat = (id) => {
    setStats((ss) => ss.filter((st) => st.id !== id));
    if (s.baseOrigen === id) setS({ ...s, baseOrigen: "manual" });
  };
  const reset = () => { setS(EJEMPLO); setStats(STATS_INI); };
  const limpiar = () => setS({ baseOrigen: "manual", base: "", mult: "1", potPct: "0", potFijo: "0", defHab: "0", defHabModo: "normal", defHabPct: "0", res: "0", resModo: "normal", resPct: "0", redPct: "0", inmFactor: "1" });

  return (
    <div className="cb-root">
      <style>{CSS}</style>

      <header className="cb-head">
        <div className="cb-logo">
          <div className="cb-logo-main">STAR INDUSTRIES</div>
          <div className="cb-logo-sub">COMBAT SUITE — CALCULADORA DE DAÑO</div>
        </div>
        <div className="cb-actions">
          <button className="cb-btn" onClick={reset}>Ejemplo</button>
          <button className="cb-btn" onClick={limpiar}>Limpiar</button>
        </div>
      </header>

      {/* MIS STATS */}
      <section className="cb-stats-sec">
        <div className="cb-tag cb-tag-yellow">Mis stats</div>
        <div className="cb-stats">
          {stats.map((st) => (
            <div className="cb-stat-card" key={st.id}>
              <input className="cb-stat-name" value={st.nombre} onChange={(e) => editStat(st.id, "nombre", e.target.value)} placeholder="STAT" />
              <input className="cb-stat-val" inputMode="decimal" value={st.valor} onChange={(e) => editStat(st.id, "valor", e.target.value)} placeholder="0" />
              <button className="cb-stat-x" onClick={() => delStat(st.id)} title="Quitar">✕</button>
            </div>
          ))}
          <button className="cb-stat-add" onClick={addStat}>+ stat</button>
        </div>
        <div className="cb-stats-hint">Cargá tus atributos ofensivos (FUE, ARMA, Calibre…). Después elegís de cuál sale el daño base.</div>
      </section>

      <div className="cb-grid">
        {/* ATACANTE */}
        <section className="cb-panel">
          <div className="cb-tag cb-tag-red">¡Atacante!</div>
          <Field label="Daño base" hint={s.baseOrigen === "manual" ? "Si la hab. es FUE×1.35 → elegí FUE y poné 1.35 abajo" : `Tomado de tu ${statSel?.nombre || "stat"}. Editalo en «Mis stats».`}>
            <div className="cb-base">
              <select className="cb-in" value={s.baseOrigen} onChange={set("baseOrigen")}>
                <option value="manual">Manual</option>
                {stats.map((st) => <option key={st.id} value={st.id}>{st.nombre || "—"}</option>)}
              </select>
              <input className="cb-in" inputMode="decimal"
                value={s.baseOrigen === "manual" ? s.base : statSel ? statSel.valor : ""}
                onChange={s.baseOrigen === "manual" ? set("base") : undefined}
                readOnly={s.baseOrigen !== "manual"} placeholder="0" />
            </div>
          </Field>
          <Field label="Multiplicador de habilidad" hint="El ×N de la habilidad (ej. 1.35)">
            <input className="cb-in" inputMode="decimal" value={s.mult} onChange={set("mult")} placeholder="1" />
          </Field>
          <Field label="Potenciadores %" hint="Tope +20% combinando dos · uno solo si ≥ +50%">
            <input className="cb-in" inputMode="decimal" value={s.potPct} onChange={set("potPct")} placeholder="0" />
          </Field>
          <Field label="Potenciadores fijos" hint="Se aplican sobre el valor ya potenciado">
            <input className="cb-in" inputMode="decimal" value={s.potFijo} onChange={set("potFijo")} placeholder="0" />
          </Field>
        </section>

        {/* DEFENSOR */}
        <section className="cb-panel">
          <div className="cb-tag cb-tag-blue">¡Defensor!</div>
          <div className="cb-trio">
            <Field label="Defensa hab."><input className="cb-in" inputMode="decimal" value={s.defHab} onChange={set("defHab")} placeholder="0" /></Field>
            <Field label="Modo">
              <select className="cb-in" value={s.defHabModo} onChange={set("defHabModo")}>
                <option value="normal">Normal</option><option value="atraviesa">Atraviesa</option><option value="ignora">Ignora</option>
              </select>
            </Field>
            <Field label="% ignora"><input className="cb-in" inputMode="decimal" value={s.defHabPct} onChange={set("defHabPct")} placeholder="0" /></Field>
          </div>
          <div className="cb-trio">
            <Field label="Resistencia"><input className="cb-in" inputMode="decimal" value={s.res} onChange={set("res")} placeholder="0" /></Field>
            <Field label="Modo" hint="solo si la hab. lo indica">
              <select className="cb-in" value={s.resModo} onChange={set("resModo")}>
                <option value="normal">Normal</option><option value="atraviesa">Atraviesa</option><option value="ignora">Ignora</option>
              </select>
            </Field>
            <Field label="% ignora"><input className="cb-in" inputMode="decimal" value={s.resPct} onChange={set("resPct")} placeholder="0" /></Field>
          </div>
          <div className="cb-duo">
            <Field label="Reducción %" hint="Suman hasta un máx. del 25%"><input className="cb-in" inputMode="decimal" value={s.redPct} onChange={set("redPct")} placeholder="0" /></Field>
            <Field label="Inmunidad" hint="1 índole=100% · 1 de 2=50% · de 3: 1→25% / 2→75%">
              <select className="cb-in" value={s.inmFactor} onChange={set("inmFactor")}>
                <option value="1">Ninguna</option><option value="0">Total — reduce 100%</option>
                <option value="0.5">Parcial — reduce 50%</option><option value="0.25">Parcial — reduce 75%</option><option value="0.75">Parcial — reduce 25%</option>
              </select>
            </Field>
          </div>
        </section>
      </div>

      {/* OUTPUT */}
      <section className="cb-out">
        <div className="cb-out-head">Secuencia de cálculo</div>
        <ol className="cb-steps">
          {r.pasos.map((p) => (
            <li key={p.k} className={"cb-step" + (p.on ? "" : " off")}>
              <span className="cb-step-k">{p.k}</span>
              <span className="cb-step-label">{p.label}</span>
              <span className="cb-step-expr">{p.expr}</span>
              <span className="cb-step-val">{fmt(p.val)}</span>
            </li>
          ))}
        </ol>
      </section>

      <div className="cb-final">
        <div className="cb-final-tag">Daño final</div>
        <div className="cb-burst">
          <svg viewBox="0 0 300 300" className="cb-burst-svg" aria-hidden="true">
            <path d={BURST} fill="var(--yellow)" stroke="var(--ink)" strokeWidth="7" strokeLinejoin="round" />
          </svg>
          <div className="cb-final-num">{r.final}</div>
        </div>
        <div className="cb-final-pre">antes de redondeo · {fmt(r.preFloor)}</div>
        {onEnviarDano && (
          <button className="cb-send" onClick={() => onEnviarDano(r.final)} title="Manda este daño a la bitácora del gestor">
            Enviar al gestor ▸
          </button>
        )}
      </div>
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <label className="cb-field">
      <span className="cb-label">{label}</span>
      {children}
      {hint ? <span className="cb-hint">{hint}</span> : null}
    </label>
  );
}
function fmt(x) { const r = Math.round(x * 100) / 100; return Number.isInteger(r) ? String(r) : r.toFixed(2); }

const CSS = `
.cb-root{
  background-color:var(--paper);
  background-image:radial-gradient(rgba(230,36,41,.16) 1.1px, transparent 1.3px);
  background-size:8px 8px;
  color:var(--ink); font-family:var(--body);
  padding:24px; border:4px solid var(--ink); border-radius:6px;
  max-width:900px; margin:0 auto; box-shadow:7px 7px 0 var(--ink);
}
.cb-head{display:flex; align-items:flex-start; gap:16px; margin-bottom:20px; flex-wrap:wrap;}
.cb-logo{transform:rotate(-1.4deg);}
.cb-logo-main{display:inline-block; background:var(--red); color:var(--white);
  font-family:var(--display); font-size:clamp(26px,6vw,40px); letter-spacing:.04em;
  padding:6px 16px 4px; border:3px solid var(--ink); border-radius:4px; box-shadow:5px 5px 0 var(--ink);
  text-shadow:2px 2px 0 #000,-2px 2px 0 #000,2px -2px 0 #000,-2px -2px 0 #000,2px 0 0 #000,-2px 0 0 #000,0 2px 0 #000,0 -2px 0 #000;}
.cb-logo-sub{display:inline-block; margin-top:8px; background:var(--yellow); color:var(--ink);
  font-family:var(--display); font-size:13px; letter-spacing:.08em; padding:3px 11px; border:2.5px solid var(--ink); transform:rotate(.8deg);}
.cb-actions{margin-left:auto; display:flex; gap:9px;}
.cb-btn{background:var(--yellow); color:var(--ink); font-family:var(--display); font-size:15px;
  letter-spacing:.05em; text-transform:uppercase; border:3px solid var(--ink); border-radius:4px;
  padding:7px 15px; cursor:pointer; box-shadow:3px 3px 0 var(--ink); transition:transform .08s, box-shadow .08s;}
.cb-btn:hover{transform:translate(3px,3px); box-shadow:0 0 0 var(--ink);}
.cb-btn:focus-visible{outline:3px solid var(--blue); outline-offset:2px;}

.cb-tag{display:inline-block; font-family:var(--display); font-size:16px; letter-spacing:.05em;
  color:var(--white); padding:4px 13px; border:3px solid var(--ink); border-radius:3px;
  box-shadow:3px 3px 0 var(--ink); margin-bottom:14px; transform:rotate(-1.5deg);
  text-shadow:1.5px 1.5px 0 #000,-1.5px 1.5px 0 #000,1.5px -1.5px 0 #000,-1.5px -1.5px 0 #000;}
.cb-tag-red{background:var(--red);} .cb-tag-blue{background:var(--blue);}
.cb-tag-yellow{background:var(--yellow); color:var(--ink); text-shadow:none;}

.cb-stats-sec{background:var(--white); border:3.5px solid var(--ink); border-radius:5px;
  padding:14px 16px 16px; box-shadow:5px 5px 0 var(--ink); margin-bottom:16px;}
.cb-stats{display:flex; flex-wrap:wrap; gap:10px; align-items:center;}
.cb-stat-card{display:flex; align-items:center; gap:0; border:2.5px solid var(--ink); border-radius:5px; overflow:hidden; background:#faf6ea;}
.cb-stat-name{width:74px; border:none; border-right:2.5px solid var(--ink); background:var(--yellow); color:var(--ink);
  font-family:var(--display); font-size:14px; letter-spacing:.04em; padding:7px 8px; text-transform:uppercase;}
.cb-stat-name:focus{outline:none; background:#ffe96b;}
.cb-stat-val{width:78px; border:none; background:var(--white); color:var(--ink); font-family:var(--body);
  font-weight:800; font-size:14px; font-variant-numeric:tabular-nums; padding:7px 8px;}
.cb-stat-val:focus{outline:none; box-shadow:inset 0 0 0 2px var(--blue);}
.cb-stat-x{border:none; border-left:2.5px solid var(--ink); background:var(--white); color:var(--ink);
  width:28px; cursor:pointer; font-weight:900; font-size:12px;}
.cb-stat-x:hover{background:var(--red); color:var(--white);}
.cb-stat-add{border:2.5px dashed var(--ink); border-radius:5px; background:transparent; color:var(--mut);
  font-family:var(--display); font-size:14px; letter-spacing:.04em; padding:8px 14px; cursor:pointer; text-transform:uppercase;}
.cb-stat-add:hover{color:var(--ink); background:rgba(255,212,0,.25);}
.cb-stats-hint{font-size:10.5px; color:var(--mut); font-weight:600; margin-top:10px;}

.cb-grid{display:grid; grid-template-columns:1fr 1fr; gap:18px; margin-bottom:18px;}
@media (max-width:660px){.cb-grid{grid-template-columns:1fr;}}
.cb-panel{background:var(--white); border:3.5px solid var(--ink); border-radius:5px;
  padding:26px 16px 16px; position:relative; box-shadow:5px 5px 0 var(--ink);}
.cb-panel .cb-tag{position:absolute; top:-15px; left:14px; transform:rotate(-2deg); margin:0;}

.cb-field{display:flex; flex-direction:column; gap:5px; margin-bottom:13px;}
.cb-label{font-family:var(--display); font-size:13px; letter-spacing:.06em; text-transform:uppercase; color:var(--ink);}
.cb-hint{font-size:10px; color:var(--mut); line-height:1.35; font-weight:600;}
.cb-in{background:var(--white); color:var(--ink); border:2.5px solid var(--ink); border-radius:4px;
  padding:9px 11px; font-family:var(--body); font-weight:800; font-size:15px;
  font-variant-numeric:tabular-nums; width:100%; box-sizing:border-box; transition:.1s;}
.cb-in:focus{outline:none; border-color:var(--blue); box-shadow:0 0 0 3px rgba(46,111,212,.28);}
.cb-in[readonly]{background:#efe9da; color:var(--mut);}
select.cb-in{cursor:pointer;}
.cb-base{display:grid; grid-template-columns:1fr 1fr; gap:7px;}
.cb-trio{display:grid; grid-template-columns:1.2fr 1fr .8fr; gap:9px;}
.cb-duo{display:grid; grid-template-columns:1fr 1.4fr; gap:9px;}
@media (max-width:500px){.cb-trio,.cb-duo,.cb-base{grid-template-columns:1fr;}}

.cb-out{background:var(--white); border:3.5px solid var(--ink); border-radius:5px; overflow:hidden; box-shadow:5px 5px 0 var(--ink); margin-bottom:22px;}
.cb-out-head{background:var(--blue); color:var(--white); font-family:var(--display); font-size:16px; letter-spacing:.07em;
  text-transform:uppercase; padding:9px 16px; border-bottom:3.5px solid var(--ink);
  text-shadow:1.5px 1.5px 0 #000,-1.5px 1.5px 0 #000,1.5px -1.5px 0 #000,-1.5px -1.5px 0 #000;}
.cb-steps{list-style:none; margin:0; padding:8px 0;}
.cb-step{display:grid; grid-template-columns:34px 1fr auto auto; align-items:center; gap:12px; padding:7px 16px; font-size:13px; font-weight:700;}
.cb-step + .cb-step{border-top:2px dashed rgba(26,22,32,.18);}
.cb-step-k{width:26px; height:26px; display:grid; place-items:center; justify-self:start; background:var(--yellow); color:var(--ink);
  border:2.5px solid var(--ink); border-radius:50%; font-family:var(--display); font-size:14px;}
.cb-step-label{color:var(--ink);}
.cb-step-expr{font-family:var(--body); font-weight:800; font-size:12px; color:var(--red); text-align:right;}
.cb-step-val{font-weight:900; font-size:15px; color:var(--ink); text-align:right; min-width:60px; font-variant-numeric:tabular-nums;}
.cb-step.off{opacity:.3;}
.cb-step.off .cb-step-k{background:#e9e4d6;}
.cb-step.off .cb-step-expr,.cb-step.off .cb-step-val{color:var(--mut);}

.cb-final{display:flex; flex-direction:column; align-items:center; gap:6px;}
.cb-final-tag{background:var(--red); color:var(--white); font-family:var(--display); font-size:17px; letter-spacing:.1em;
  text-transform:uppercase; padding:5px 16px; border:3px solid var(--ink); border-radius:3px; box-shadow:3px 3px 0 var(--ink);
  transform:rotate(-1.5deg); z-index:2; margin-bottom:-6px;
  text-shadow:1.5px 1.5px 0 #000,-1.5px 1.5px 0 #000,1.5px -1.5px 0 #000,-1.5px -1.5px 0 #000;}
.cb-burst{position:relative; width:240px; height:240px; display:grid; place-items:center;}
.cb-burst-svg{position:absolute; inset:0; width:100%; height:100%; filter:drop-shadow(5px 6px 0 rgba(26,22,32,.85));}
.cb-final-num{position:relative; z-index:1; font-family:var(--display); font-size:64px; line-height:1; color:var(--ink);
  font-variant-numeric:tabular-nums; text-shadow:3px 3px 0 rgba(255,255,255,.35);}
.cb-final-pre{font-size:11px; color:var(--mut); font-weight:700; font-variant-numeric:tabular-nums;}
.cb-send{margin-top:12px; background:var(--blue); color:var(--white); font-family:var(--display); font-size:15px;
  letter-spacing:.05em; text-transform:uppercase; border:3px solid var(--ink); border-radius:4px;
  padding:8px 18px; cursor:pointer; box-shadow:3px 3px 0 var(--ink); transition:transform .08s, box-shadow .08s;
  text-shadow:1.5px 1.5px 0 #000,-1.5px 1.5px 0 #000,1.5px -1.5px 0 #000,-1.5px -1.5px 0 #000;}
.cb-send:hover{transform:translate(3px,3px); box-shadow:0 0 0 var(--ink);}
.cb-send:focus-visible{outline:3px solid var(--blue); outline-offset:2px;}

@media (prefers-reduced-motion:reduce){.cb-btn{transition:none;}}
`;
