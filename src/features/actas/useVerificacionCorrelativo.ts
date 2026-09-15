import { useEffect, useState } from 'react';
import type { TipoActa } from '@pas-sjl/shared-types';
import { verificarCorrelativoDisponible } from './correlativo.repository';

export type EstadoCorrelativo = 'vacio' | 'verificando' | 'disponible' | 'duplicado' | 'sin_verificar';

const DEBOUNCE_MS = 400;

/**
 * HU-16: verifica unicidad contra el backend mientras el fiscalizador
 * escribe. 'duplicado' es la única razón real para bloquear el guardado —
 * 'sin_verificar' (sin conexión o backend caído) nunca bloquea, se guarda
 * local y se resuelve al sincronizar.
 */
export function useVerificacionCorrelativo(
  tipo: TipoActa,
  numero: string,
  excluirIntervencionId?: string,
): EstadoCorrelativo {
  const [estado, setEstado] = useState<EstadoCorrelativo>('vacio');

  useEffect(() => {
    const numeroLimpio = numero.trim();
    if (!numeroLimpio) {
      setEstado('vacio');
      return;
    }

    setEstado('verificando');
    let vigente = true;
    const timeoutId = setTimeout(async () => {
      const disponible = await verificarCorrelativoDisponible(tipo, numeroLimpio, excluirIntervencionId);
      if (!vigente) return;
      setEstado(disponible === null ? 'sin_verificar' : disponible ? 'disponible' : 'duplicado');
    }, DEBOUNCE_MS);

    return () => {
      vigente = false;
      clearTimeout(timeoutId);
    };
  }, [tipo, numero, excluirIntervencionId]);

  return estado;
}

export function textoEstadoCorrelativo(estado: EstadoCorrelativo): string | null {
  switch (estado) {
    case 'verificando':
      return 'Verificando disponibilidad…';
    case 'disponible':
      return 'Disponible.';
    case 'duplicado':
      return 'Este correlativo ya existe — verifica el número.';
    case 'sin_verificar':
      return 'Sin conexión: se guardará local y se validará al sincronizar.';
    default:
      return null;
  }
}
