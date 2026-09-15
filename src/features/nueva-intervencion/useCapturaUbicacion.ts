import { useCallback, useState } from 'react';

/**
 * HU-01: captura de coordenadas GPS al iniciar una intervención.
 * `solicitar()` dispara el prompt nativo de permiso de ubicación si el
 * navegador todavía no lo tiene (comportamiento del propio
 * navigator.geolocation, no algo que este hook deba orquestar aparte).
 */

const TIMEOUT_MS = 15_000;

export type EstadoCapturaUbicacion =
  | { estado: 'inactivo' }
  | { estado: 'solicitando' }
  | { estado: 'capturado'; latitud: number; longitud: number; precisionM: number }
  | { estado: 'sin_senal' }
  | { estado: 'permiso_denegado' };

export function useCapturaUbicacion() {
  const [captura, setCaptura] = useState<EstadoCapturaUbicacion>({ estado: 'inactivo' });

  const solicitar = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setCaptura({ estado: 'sin_senal' });
      return;
    }

    setCaptura({ estado: 'solicitando' });

    navigator.geolocation.getCurrentPosition(
      (posicion) => {
        setCaptura({
          estado: 'capturado',
          latitud: posicion.coords.latitude,
          longitud: posicion.coords.longitude,
          precisionM: posicion.coords.accuracy,
        });
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setCaptura({ estado: 'permiso_denegado' });
          return;
        }
        // TIMEOUT (no fijó señal en 15s) o POSITION_UNAVAILABLE: HU-01 los
        // trata igual — se ofrece reintentar o dirección aproximada.
        setCaptura({ estado: 'sin_senal' });
      },
      { enableHighAccuracy: true, timeout: TIMEOUT_MS, maximumAge: 0 },
    );
  }, []);

  return { captura, solicitar };
}
