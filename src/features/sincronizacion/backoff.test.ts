import { describe, expect, it } from 'vitest';
import { calcularEsperaMs, MAX_INTENTOS_AUTOMATICOS } from './backoff';

describe('calcularEsperaMs — HU-24 (backoff 5s/15s/60s/60s/60s)', () => {
  it('caso feliz: sigue la secuencia acordada', () => {
    expect(calcularEsperaMs(0)).toBe(5_000);
    expect(calcularEsperaMs(1)).toBe(15_000);
    expect(calcularEsperaMs(2)).toBe(60_000);
    expect(calcularEsperaMs(3)).toBe(60_000);
    expect(calcularEsperaMs(4)).toBe(60_000);
  });

  it('caso borde: después del 5º intento automático, deja de reintentar solo (requiere "Sincronizar ahora")', () => {
    expect(MAX_INTENTOS_AUTOMATICOS).toBe(5);
    expect(calcularEsperaMs(5)).toBeNull();
    expect(calcularEsperaMs(100)).toBeNull();
  });
});
