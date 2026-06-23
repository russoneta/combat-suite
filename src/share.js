// Serialización del estado del combate para compartir por URL (?c=...).
// base64 url-safe sobre el JSON, seguro para UTF-8 (nombres con acentos/emojis).

function utf8ToB64(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

function b64ToUtf8(b64) {
  const bin = atob(b64);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function encodeCombate(state) {
  const json = JSON.stringify(state);
  return utf8ToB64(json).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeCombate(payload) {
  try {
    let b64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    while (b64.length % 4) b64 += "=";
    const o = JSON.parse(b64ToUtf8(b64));
    if (!o || !Array.isArray(o.combatientes)) return null;
    return {
      combatientes: o.combatientes,
      movidas: Array.isArray(o.movidas) ? o.movidas : [],
      ronda: Number(o.ronda) || 1,
    };
  } catch {
    return null;
  }
}
