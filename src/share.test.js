import { describe, it, expect } from "vitest";
import { encodeCombate, decodeCombate } from "./share.js";

describe("share — round-trip de combate por URL", () => {
  it("encode/decode preserva el estado (incluye acentos)", () => {
    const state = {
      combatientes: [
        { id: 1, nombre: "Joseph Star — Mark I", bando: "A", vitMax: 750, vel: 6, vigMax: 3, vigorRestante: 3, huido: false },
        { id: 2, nombre: "Oponénte ñ", bando: "B", vitMax: 1000, vel: 5, vigMax: 1, vigorRestante: 1, huido: false },
      ],
      movidas: [{ id: 101, ronda: 1, ejecutorId: 1, objetivoId: 2, pa: 2, dano: 155, nota: "golpe" }],
      ronda: 2,
    };
    expect(decodeCombate(encodeCombate(state))).toEqual(state);
  });

  it("el payload es url-safe (sin +, / ni =)", () => {
    const p = encodeCombate({ combatientes: [{ id: 1, bando: "A" }], movidas: [], ronda: 1 });
    expect(p).not.toMatch(/[+/=]/);
  });

  it("decode tolera basura o estructura inválida → null", () => {
    expect(decodeCombate("no-es-base64-válido!!!")).toBeNull();
    expect(decodeCombate(encodeCombate({ foo: 1 }))).toBeNull(); // sin combatientes
  });
});
