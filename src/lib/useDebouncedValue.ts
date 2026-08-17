import { useEffect, useState } from "react";

// Evita disparar una llamada RPC por cada tecla al buscar por email —
// espera `delayMs` de silencio antes de propagar el valor.
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
