// ── Motor de combate (lógica pura, compartida) ──────────────────────
// Sin dependencias de React. La calculadora y el gestor importan de acá.
// NO modificar la matemática: los tests de paridad (engine.test.js) la
// congelan. Caso de control: base 115 × mult 1.35, sin defensas → 155.

// Parser numérico tolerante: cualquier valor → número, NaN → 0.
export const num = (v) => { const x = parseFloat(v); return isNaN(x) ? 0 : x; };

// ── Constantes del sistema (no tocar) ───────────────────────────────
export const PA_BASE = 8;

// ── Calculadora de daño ─────────────────────────────────────────────
// Orden del Sistema de Combate MHRPG:
// 1 base×mult · 2 potenciadores(%→fijo) · 3 def.habilidad · 4 resistencia
// · 5 reducción%(tope25) · 6 inmunidad · 7 FLOOR
export function aplicarDefensa(dano, defensa, modo, pctIgnora) {
  if (defensa <= 0) return dano;
  if (modo === "ignora") return dano; // 9.2.3 — ignora la defensa entera
  if (pctIgnora > 0) {
    // 9.2.3.1 / 9.2.3.2 — porción entra directa, el resto choca con la defensa
    const directo = dano * (pctIgnora / 100);
    const resto = dano - directo;
    return directo + Math.max(0, resto - defensa);
  }
  if (modo === "atraviesa") {
    // 9.2.2 — si el daño supera la defensa, la ignora; si no, bloquea normal
    return dano > defensa ? dano : Math.max(0, dano - defensa);
  }
  return Math.max(0, dano - defensa);
}

function descrDef(val, modo, pct) {
  if (modo === "ignora") return `${val} — ignorada`;
  if (pct > 0) return `${val} · ${pct}% directo`;
  if (modo === "atraviesa") return `${val} — atraviesa`;
  return `−${val}`;
}

export function calcular(s) {
  const pasos = [];
  const base = num(s.base);
  const mult = num(s.mult) || 1;

  let d = base * mult;
  pasos.push({ k: 1, label: "Base × Multiplicador", expr: `${base} × ${mult}`, val: d, on: true });

  const pct = num(s.potPct);
  d = d * (1 + pct / 100);
  pasos.push({ k: 2, label: "Potenciadores %", expr: pct ? `+${pct}%` : "—", val: d, on: pct !== 0 });

  const fijo = num(s.potFijo);
  d = d + fijo;
  pasos.push({ k: 3, label: "Potenciadores fijos", expr: fijo ? `+${fijo}` : "—", val: d, on: fijo !== 0 });

  const defHab = num(s.defHab);
  d = aplicarDefensa(d, defHab, s.defHabModo, num(s.defHabPct));
  pasos.push({ k: 4, label: "Defensa de habilidad", expr: defHab ? descrDef(defHab, s.defHabModo, num(s.defHabPct)) : "—", val: d, on: defHab > 0 });

  const res = num(s.res);
  d = aplicarDefensa(d, res, s.resModo, num(s.resPct));
  pasos.push({ k: 5, label: "Resistencia (pasiva)", expr: res ? descrDef(res, s.resModo, num(s.resPct)) : "—", val: d, on: res > 0 });

  const redRaw = num(s.redPct);
  const red = Math.min(redRaw, 25);
  d = d * (1 - red / 100);
  pasos.push({ k: 6, label: "Reducción %", expr: redRaw ? `−${red}%${redRaw > 25 ? "  (tope 25%)" : ""}` : "—", val: d, on: redRaw !== 0 });

  const inm = parseFloat(s.inmFactor);
  d = d * inm;
  pasos.push({ k: 7, label: "Inmunidad", expr: inm < 1 ? `×${inm}` : "—", val: d, on: inm < 1 });

  return { pasos, final: Math.max(0, Math.floor(d)), preFloor: d };
}

// ── Gestor de combate (lógica pura) ─────────────────────────────────
export function cupos(combatientes, bando) {
  return combatientes.filter((c) => c.bando === bando).length;
}

// Bonus de PA por inferioridad numérica (regla 1.4.1). Se cuenta por
// CUPOS de bando: caer o huir sigue ocupando hueco (1.2.5 / 1.4.5).
export function bonusPA(propio, rival) {
  if (propio >= rival) return 0;
  if (propio === 1 && rival === 2) return 2;
  if (propio === 1 && rival === 3) return 4;
  if (propio === 2 && rival === 3) return 2;
  return 0;
}

export function codigo(c, combatientes) {
  const mismos = combatientes.filter((x) => x.bando === c.bando);
  return c.bando + (mismos.findIndex((x) => x.id === c.id) + 1);
}

export function vitActual(c, movidas) {
  const recibido = movidas
    .filter((m) => m.objetivoId === c.id)
    .reduce((a, m) => a + num(m.dano), 0);
  return Math.max(0, Math.min(c.vitMax, c.vitMax - recibido));
}

export function paDisponible(c, combatientes) {
  const mio = cupos(combatientes, c.bando);
  const otro = cupos(combatientes, c.bando === "A" ? "B" : "A");
  return PA_BASE + bonusPA(mio, otro);
}

export function paGastado(c, movidas, ronda) {
  return movidas
    .filter((m) => m.ejecutorId === c.id && m.ronda === ronda)
    .reduce((a, m) => a + num(m.pa), 0);
}

export function estadoDe(c, movidas) {
  if (c.huido) return "huido";
  if (vitActual(c, movidas) <= 0) return "caido";
  return "pie";
}
