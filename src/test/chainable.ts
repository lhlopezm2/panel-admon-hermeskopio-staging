import { vi } from "vitest";

/**
 * El query builder real de supabase-js es "thenable": se puede encadenar
 * (.select().eq().order()...) y también awaitear directamente sin llamar a
 * .single() al final. Este helper imita ambos usos con un único objeto que
 * se retorna a sí mismo en cada método de encadenamiento.
 *
 * `result` puede ser un valor fijo o una función — usa una función cuando el
 * test necesita simular que la fila cambió entre una llamada y la siguiente
 * (p. ej. releer `businesses` después de bloquear/desbloquear).
 */
export function chainable<T>(
  result: T | (() => T),
) {
  const getResult = typeof result === "function" ? (result as () => T) : () => result;

  const builder: Record<string, unknown> = {};
  const self = () => builder;

  builder.select = vi.fn(self);
  builder.eq = vi.fn(self);
  builder.order = vi.fn(self);
  builder.update = vi.fn(self);
  builder.single = vi.fn(() => Promise.resolve(getResult()));
  builder.then = (
    onFulfilled?: (value: T) => unknown,
    onRejected?: (reason: unknown) => unknown,
  ) => Promise.resolve(getResult()).then(onFulfilled, onRejected);

  return builder as typeof builder & {
    select: ReturnType<typeof vi.fn>;
    eq: ReturnType<typeof vi.fn>;
    order: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    single: ReturnType<typeof vi.fn>;
  };
}
