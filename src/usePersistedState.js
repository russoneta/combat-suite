import { useEffect, useState } from "react";

// useState que se sincroniza con localStorage bajo `key`.
// Si el storage no está disponible (modo privado, lleno), degrada a estado en memoria.
export function usePersistedState(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw != null ? JSON.parse(raw) : initial;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* sin persistencia: seguimos en memoria */
    }
  }, [key, value]);

  return [value, setValue];
}
