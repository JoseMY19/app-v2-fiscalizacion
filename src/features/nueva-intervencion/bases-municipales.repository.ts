import { API_BASE_URL } from '../../lib/config';
import { fetchAutenticado } from '../auth/fetch-autenticado';

/** Resumen de la consulta de licencia e ITSE (bases municipales semanales). */
export interface ResumenLicenciaItse {
  tieneLicenciaVigente: boolean;
  tieneItseVigente: boolean;
  riesgo: string | null;
  sugerenciaCuis: string | null;
  licencia: { numero: string | null; giro: string | null; horario: string | null; estado: string | null } | null;
  itse: { certificado: string | null; caduca: string | null; vigente: boolean } | null;
}

/**
 * Consulta en línea por RUC/DNI. Requiere conexión: `null` = no se pudo
 * consultar (sin red o el servidor falló). Nunca bloquea el registro: es
 * solo una ayuda para elegir el código (el ITSE depende del riesgo).
 */
export async function consultarLicenciaItse(documento: string): Promise<ResumenLicenciaItse | null> {
  try {
    const r = await fetchAutenticado(`${API_BASE_URL}/bases-municipales/consulta?q=${encodeURIComponent(documento.trim())}`);
    if (!r.ok) return null;
    const d = await r.json();
    const l = d.licencias?.[0] ?? null;
    const i = d.itse?.[0] ?? null;
    return {
      ...d.resumen,
      licencia: l ? { numero: l.numeroLicencia, giro: l.giro, horario: l.horaInicio ? `${l.horaInicio}–${l.horaFin ?? ''}` : null, estado: l.estado } : null,
      itse: i ? { certificado: i.numeroCertificado, caduca: i.fechaCaducidad, vigente: i.vigente } : null,
    };
  } catch {
    return null;
  }
}
