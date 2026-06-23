import { describe, it, expect } from "vitest";
import { calcular, aplicarDefensa, bonusPA, vitActual, paDisponible, estadoDe } from "./engine.js";

// Estado neutro de la calculadora: sin potenciadores ni defensas.
const NEUTRO = {
  base: "0", mult: "1", potPct: "0", potFijo: "0",
  defHab: "0", defHabModo: "normal", defHabPct: "0",
  res: "0", resModo: "normal", resPct: "0",
  redPct: "0", inmFactor: "1",
};

describe("calcular — caso de control del sistema", () => {
  it("base 115 × mult 1.35, sin defensas → 155", () => {
    const r = calcular({ ...NEUTRO, base: "115", mult: "1.35" });
    expect(r.final).toBe(155);
    expect(r.preFloor).toBeCloseTo(155.25, 5); // FLOOR recorta el .25
  });
});

describe("calcular — resistencia y FLOOR", () => {
  it("resta la resistencia en modo normal y aplica FLOOR", () => {
    // 777 × 1.5 = 1165.5 ; − RES 300 = 865.5 ; FLOOR → 865
    const r = calcular({ ...NEUTRO, base: "777", mult: "1.5", res: "300" });
    expect(r.preFloor).toBeCloseTo(865.5, 5);
    expect(r.final).toBe(865);
  });

  it("la resistencia nunca deja el daño por debajo de 0", () => {
    const r = calcular({ ...NEUTRO, base: "100", mult: "1", res: "9999" });
    expect(r.final).toBe(0);
  });
});

describe("aplicarDefensa — % que ignora la defensa", () => {
  it("directo + max(0, resto − RES)", () => {
    // 30% de 1000 entra directo (300); el resto (700) choca con RES 200 → 500
    expect(aplicarDefensa(1000, 200, "normal", 30)).toBe(800);
  });

  it("integrado en calcular() sobre la resistencia", () => {
    const r = calcular({ ...NEUTRO, base: "1000", mult: "1", res: "200", resPct: "30" });
    expect(r.final).toBe(800);
  });

  it("modo 'ignora' devuelve el daño intacto", () => {
    expect(aplicarDefensa(500, 200, "ignora", 0)).toBe(500);
  });

  it("modo 'atraviesa' pasa entero si supera la defensa", () => {
    expect(aplicarDefensa(500, 200, "atraviesa", 0)).toBe(500);
    expect(aplicarDefensa(150, 200, "atraviesa", 0)).toBe(0); // 150 ≤ 200 → bloquea
  });
});

describe("bonusPA — inferioridad numérica", () => {
  it("topes por cupos: 1v2 → +2, 1v3 → +4, 2v3 → +2", () => {
    expect(bonusPA(1, 2)).toBe(2);
    expect(bonusPA(1, 3)).toBe(4);
    expect(bonusPA(2, 3)).toBe(2);
  });
  it("sin inferioridad → 0", () => {
    expect(bonusPA(2, 2)).toBe(0);
    expect(bonusPA(3, 1)).toBe(0);
    expect(bonusPA(3, 3)).toBe(0);
  });
});

describe("gestor — VIT, PA y estado", () => {
  const A1 = { id: 1, bando: "A", vitMax: 1000, huido: false };
  const B1 = { id: 2, bando: "B", vitMax: 1000, huido: false };
  const B2 = { id: 3, bando: "B", vitMax: 1000, huido: false };

  it("vitActual descuenta el daño recibido y se clampa a [0, vitMax]", () => {
    const movidas = [{ objetivoId: 1, dano: 300 }];
    expect(vitActual(A1, movidas)).toBe(700);
    expect(vitActual(A1, [{ objetivoId: 1, dano: 5000 }])).toBe(0);
    // daño negativo = curación, sin pasar de vitMax
    expect(vitActual(A1, [{ objetivoId: 1, dano: -300 }])).toBe(1000);
  });

  it("paDisponible suma el bonus por inferioridad de cupos (1 vs 2 → 8+2)", () => {
    const campo = [A1, B1, B2];
    expect(paDisponible(A1, campo)).toBe(10); // PA_BASE 8 + 2
    expect(paDisponible(B1, campo)).toBe(8);  // bando mayoritario, sin bonus
  });

  it("estadoDe distingue pie / caído / huido", () => {
    expect(estadoDe(A1, [])).toBe("pie");
    expect(estadoDe(A1, [{ objetivoId: 1, dano: 1000 }])).toBe("caido");
    expect(estadoDe({ ...A1, huido: true }, [])).toBe("huido");
  });
});
