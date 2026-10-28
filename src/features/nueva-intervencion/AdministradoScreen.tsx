import { useEffect, useRef, useState } from 'react';
import { MotivoNoIdentificado } from '@pas-sjl/shared-types';
import { db } from '../../lib/db';
import { guardarAdministrado, marcarAdministradoNoIdentificado } from './administrado.repository';
import { validarNumeroDocumento, type TipoDocumentoAdministrado } from './validacion-documento';
import { consultarLicenciaItse, type ResumenLicenciaItse } from './bases-municipales.repository';
import { consultarNombrePorDni } from './dni-nombre.repository';

/**
 * HU-04 — Registrar datos del administrado.
 * Criterios de aceptación:
 *  - campos: tipo y N° de documento, nombres/razón social, domicilio,
 *    distrito, giro/uso, N° de licencia de funcionamiento (opcional)
 *  - validación de formato de DNI/RUC
 *  - permite guardar aunque falten campos no obligatorios (licencia)
 *
 * HU-05 — Marcar administrado no identificado.
 * Criterios de aceptación:
 *  - botón explícito "No se pudo identificar", con motivo
 *  - la intervención avanza igual, anclada solo por GPS
 *  - queda marcada como "Pendiente de saneamiento" (ver HU-19, resumen)
 */

import type { ReactNode } from 'react';
import WizardHeader from '../../components/WizardHeader';
import FotoDniAmpliable from '../../components/FotoDniAmpliable';
import { cn } from '../../lib/cn';
import {
  alerta,
  appContainer,
  btnCampo,
  btnCampoSecundario,
  campoRelleno,
  campoRellenoEtiqueta,
  campoRellenoIcono,
  campoRellenoInput,
  opcionCheck,
  opcionIcono,
  opcionTarjeta,
  saneamientoNotice,
  saneamientoNoticeDesc,
  saneamientoNoticeIcon,
  saneamientoNoticeTitle,
  tarjetaSuave,
} from '../../lib/ui';

const svg = (contenido: ReactNode) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {contenido}
  </svg>
);

const MOTIVOS: { valor: MotivoNoIdentificado; etiqueta: string; desc: string; icono: ReactNode }[] = [
  {
    valor: MotivoNoIdentificado.VIA_PUBLICA,
    etiqueta: 'Vía pública',
    desc: 'Comercio o actividad realizada en espacio público sin puesto fijo',
    icono: svg(<path d="M4 19L8 5M20 19L16 5M12 6v2M12 11v2M12 16v2" />),
  },
  {
    valor: MotivoNoIdentificado.SIN_OCUPANTE,
    etiqueta: 'Sin ocupante',
    desc: 'Predio o local cerrado, sin personas que atiendan',
    icono: svg(<><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></>),
  },
  {
    valor: MotivoNoIdentificado.SE_NEGO,
    etiqueta: 'Se negó',
    desc: 'El administrado o encargado rechazó brindar sus datos',
    icono: svg(<><circle cx="12" cy="12" r="10" /><path d="M4.93 4.93l14.14 14.14" /></>),
  },
  {
    valor: MotivoNoIdentificado.OTRO,
    etiqueta: 'Otro motivo',
    desc: 'Situación excepcional registrada por el fiscalizador',
    icono: svg(<><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></>),
  },
];

const TIPOS_DOCUMENTO: { valor: TipoDocumentoAdministrado; etiqueta: string }[] = [
  { valor: 'DNI', etiqueta: 'DNI' },
  { valor: 'RUC', etiqueta: 'RUC' },
  { valor: 'OTRO', etiqueta: 'Otro' },
];

// Selector segmentado: reemplaza al <select>, cuya lista la dibuja el sistema (azul) y no se puede estilar.
const segmentos = 'flex gap-1 p-1 mb-3 bg-bg-subtle border border-solid border-border rounded-pill';
function segmento(activo: boolean): string {
  return cn(
    'flex-1 py-2 rounded-pill border-none text-sm font-bold cursor-pointer transition-all duration-150',
    activo
      ? 'bg-linear-135 from-campo-700 to-campo-900 text-white shadow-[0_4px_10px_-4px_rgba(101,10,64,0.5)]'
      : 'bg-transparent text-text-muted hover:text-campo-700',
  );
}
const seccionTitulo = 'text-[0.725rem] font-bold uppercase tracking-[0.06em] text-text-muted mb-2.5';
const requerido = "after:content-['_*'] after:text-danger";

/** Campo relleno con ícono y etiqueta (mismo estilo que el login y los pasos 1-2). */
function Campo({
  id,
  etiqueta,
  obligatorio,
  icono,
  children,
}: {
  id: string;
  etiqueta: string;
  obligatorio?: boolean;
  icono: ReactNode;
  children: ReactNode;
}) {
  return (
    <label className={cn(campoRelleno, 'mb-3')} htmlFor={id}>
      <span className={campoRellenoIcono}>{icono}</span>
      <span className="flex-1 min-w-0">
        <span className={cn(campoRellenoEtiqueta, obligatorio && requerido)}>{etiqueta}</span>
        {children}
      </span>
    </label>
  );
}

interface Props {
  localId: string;
  onFinalizar: (resultado: { identificado: boolean }) => void;
  onVolver: () => void;
}

export default function AdministradoScreen({ localId, onFinalizar, onVolver }: Props) {
  const [mostrandoNoIdentificado, setMostrandoNoIdentificado] = useState(false);
  const [tipoDocumento, setTipoDocumento] = useState<TipoDocumentoAdministrado>('DNI');
  const [numeroDocumento, setNumeroDocumento] = useState('');
  const [nombresRazonSocial, setNombresRazonSocial] = useState('');
  const [domicilio, setDomicilio] = useState('');
  // Precargado: casi toda intervención es en San Juan de Lurigancho (la
  // municipalidad solo fiscaliza dentro de su propia jurisdicción) — sigue
  // siendo editable por si el domicilio del administrado queda en otro
  // distrito colindante.
  const [distrito, setDistrito] = useState('San Juan de Lurigancho');
  const [giroUso, setGiroUso] = useState('');
  const [numeroLicenciaFuncionamiento, setNumeroLicenciaFuncionamiento] = useState('');
  const [motivo, setMotivo] = useState<MotivoNoIdentificado | null>(null);
  const [motivoDetalle, setMotivoDetalle] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Consulta en línea de licencia e ITSE (ayuda para elegir el código; nunca bloquea).
  const [consulta, setConsulta] = useState<ResumenLicenciaItse | null | 'sin-datos'>(null);
  const [consultando, setConsultando] = useState(false);

  // Nombre a partir del DNI (solo el nombre; nunca bloquea: si no hay conexión se escribe como siempre).
  const [estadoNombre, setEstadoNombre] = useState<'idle' | 'consultando' | 'completado' | 'no-encontrado' | 'sin-servicio'>('idle');
  // Foto oficial del DNI: solo para comprobar a la persona en el sitio. No se guarda ni se sincroniza.
  const [fotoDni, setFotoDni] = useState<string | null>(null);
  const nombreAutocompletado = useRef<string | null>(null);
  const nombreActual = useRef('');
  nombreActual.current = nombresRazonSocial;

  useEffect(() => {
    // Un nombre que se completó solo es de ESE DNI: si el DNI cambia, se quita para no dejar el de otra persona.
    const quitarSiEraAutomatico = () => {
      const escrito = nombreActual.current.trim();
      if (escrito && escrito === nombreAutocompletado.current) setNombresRazonSocial('');
      nombreAutocompletado.current = null;
    };
    const dni = numeroDocumento.trim();
    if (tipoDocumento !== 'DNI' || !/^\d{8}$/.test(dni)) {
      quitarSiEraAutomatico();
      setEstadoNombre('idle');
      setFotoDni(null);
      return;
    }
    const escrito = nombreActual.current.trim();
    // Si el fiscalizador ya escribió un nombre (o se precargó uno guardado), no se le pisa: solo se trae la foto.
    const respetarNombre = !!escrito && escrito !== nombreAutocompletado.current;
    if (!respetarNombre) quitarSiEraAutomatico();
    setFotoDni(null);
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      setEstadoNombre(respetarNombre ? 'idle' : 'sin-servicio');
      return;
    }
    let cancelado = false;
    setEstadoNombre(respetarNombre ? 'idle' : 'consultando');
    consultarNombrePorDni(dni).then((r) => {
      if (cancelado) return;
      if (r.estado !== 'ok') {
        setEstadoNombre(respetarNombre ? 'idle' : r.estado);
        return;
      }
      setFotoDni(r.foto);
      // Si ya había un nombre (o mientras tanto escribió otro), no se le pisa.
      if (respetarNombre || nombreActual.current.trim()) {
        setEstadoNombre('idle');
        return;
      }
      nombreAutocompletado.current = r.nombreCompleto;
      setNombresRazonSocial(r.nombreCompleto);
      setEstadoNombre('completado');
    });
    return () => {
      cancelado = true;
    };
  }, [tipoDocumento, numeroDocumento]);

  // La dirección de la intervención ya se capturó al iniciar: sirve de punto de partida del domicilio intervenido.
  const [domicilioDeLaIntervencion, setDomicilioDeLaIntervencion] = useState(false);

  // HU-19: precarga lo ya guardado, sea el camino identificado o no-identificado.
  useEffect(() => {
    Promise.all([db.administrados.get(localId), db.intervenciones.get(localId)]).then(([administrado, intervencion]) => {
      const ubicacion = intervencion?.direccionAproximada?.trim() ?? '';
      if (!administrado) {
        if (ubicacion) {
          setDomicilio(ubicacion);
          setDomicilioDeLaIntervencion(true);
        }
        return;
      }
      if (!administrado.identificado) {
        setMostrandoNoIdentificado(true);
        if (administrado.motivoNoIdentificado) setMotivo(administrado.motivoNoIdentificado);
        setMotivoDetalle(administrado.motivoNoIdentificadoDetalle ?? '');
        return;
      }
      setTipoDocumento((administrado.tipoDocumento as TipoDocumentoAdministrado) ?? 'DNI');
      setNumeroDocumento(administrado.numeroDocumento ?? '');
      setNombresRazonSocial(administrado.nombresRazonSocial ?? '');
      if (administrado.domicilio) {
        setDomicilio(administrado.domicilio);
      } else if (ubicacion) {
        setDomicilio(ubicacion);
        setDomicilioDeLaIntervencion(true);
      }
      setDistrito(administrado.distrito || 'San Juan de Lurigancho');
      setGiroUso(administrado.giroUso ?? '');
      setNumeroLicenciaFuncionamiento(administrado.numeroLicenciaFuncionamiento ?? '');
    });
  }, [localId]);

  async function handleGuardar() {
    const errorDocumento = validarNumeroDocumento(tipoDocumento, numeroDocumento);
    if (errorDocumento) {
      setError(errorDocumento);
      return;
    }
    if (!nombresRazonSocial.trim() || !domicilio.trim() || !distrito.trim() || !giroUso.trim()) {
      setError('Nombres/razón social, domicilio, distrito y giro/uso son obligatorios.');
      return;
    }

    setGuardando(true);
    setError(null);
    try {
      await guardarAdministrado(localId, {
        tipoDocumento,
        numeroDocumento: numeroDocumento.trim(),
        nombresRazonSocial: nombresRazonSocial.trim(),
        domicilio: domicilio.trim(),
        distrito: distrito.trim(),
        giroUso: giroUso.trim(),
        numeroLicenciaFuncionamiento,
      });
      onFinalizar({ identificado: true });
    } finally {
      setGuardando(false);
    }
  }

  // Con "Otro motivo" el fiscalizador debe describir la situación (mín. 10 caracteres).
  const detalleCompleto = motivo !== MotivoNoIdentificado.OTRO || motivoDetalle.trim().length >= 10;

  async function handleConfirmarNoIdentificado() {
    if (!motivo || !detalleCompleto || guardando) return;
    setGuardando(true);
    setError(null);
    try {
      await marcarAdministradoNoIdentificado(localId, motivo, motivoDetalle);
      onFinalizar({ identificado: false });
    } finally {
      setGuardando(false);
    }
  }

  if (mostrandoNoIdentificado) {
    return (
      <div className={appContainer}>
        <WizardHeader
          pasoActual={3}
          totalPasos={8}
          titulo="Administrado No Identificado"
          subtitulo="Registro anclado únicamente a la ubicación GPS capturada"
          onVolver={onVolver}
          deshabilitarVolver={guardando}
        />

        <div className={cn(tarjetaSuave, 'p-4')}>
          <div className={cn(saneamientoNotice, 'rounded-[14px]')}>
            <div className={saneamientoNoticeIcon}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <div>
              <div className={saneamientoNoticeTitle}>Pendiente de saneamiento legal</div>
              <div className={saneamientoNoticeDesc}>
                La intervención continuará el proceso y quedará marcada para regularización en gabinete.
              </div>
            </div>
          </div>

          <p className="text-[0.9375rem] font-bold text-text-title mb-3">
            Motivo de no identificación <span className="text-danger">*</span>
          </p>

          <div className="flex flex-col gap-2.5" role="radiogroup" aria-label="Motivo de no identificación">
            {MOTIVOS.map((opcion) => {
              const seleccionada = motivo === opcion.valor;
              return (
                <button
                  key={opcion.valor}
                  type="button"
                  role="radio"
                  aria-checked={seleccionada}
                  className={opcionTarjeta(seleccionada)}
                  onClick={() => setMotivo(opcion.valor)}
                >
                  <span className={opcionIcono(seleccionada)}>{opcion.icono}</span>
                  <span className="flex-1 min-w-0">
                    <span className={cn('block text-[0.9375rem] font-bold leading-tight', seleccionada ? 'text-campo-800' : 'text-text-title')}>
                      {opcion.etiqueta}
                    </span>
                    <span className="block text-xs text-text-muted mt-0.5 leading-snug">{opcion.desc}</span>
                  </span>
                  <span className={opcionCheck(seleccionada)} aria-hidden="true">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  </span>
                </button>
              );
            })}
          </div>

          {motivo === MotivoNoIdentificado.OTRO && (
            <label className={cn(campoRelleno, 'items-start mt-4')} htmlFor="motivo-detalle">
              <span className="flex-1 min-w-0">
                <span className={cn(campoRellenoEtiqueta, requerido)}>Describe el motivo</span>
                <textarea
                  id="motivo-detalle"
                  className={cn(campoRellenoInput, 'resize-y min-h-20 text-[0.9375rem] font-medium leading-snug')}
                  value={motivoDetalle}
                  onChange={(e) => setMotivoDetalle(e.target.value)}
                  maxLength={300}
                  rows={3}
                  placeholder="Qué ocurrió y por qué no se pudo identificar (mínimo 10 caracteres)"
                />
              </span>
            </label>
          )}
        </div>

        <div className="flex flex-col gap-2.5 mt-6">
          <button
            type="button"
            className={btnCampo}
            onClick={handleConfirmarNoIdentificado}
            disabled={!motivo || !detalleCompleto || guardando}
          >
            {guardando ? 'Guardando…' : 'Confirmar y Continuar'}
          </button>
          <button
            type="button"
            className={btnCampoSecundario}
            onClick={() => setMostrandoNoIdentificado(false)}
            disabled={guardando}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            <span>Volver a identificar al administrado</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={appContainer}>
      <WizardHeader
        pasoActual={3}
        totalPasos={8}
        titulo="Datos del Administrado"
        subtitulo="Identificación de la persona natural o jurídica intervenida"
        onVolver={onVolver}
        deshabilitarVolver={guardando}
      />

      <div className={cn(tarjetaSuave, 'p-4')}>
        <div className={seccionTitulo}>Documento de identidad</div>
        <div className={segmentos} role="radiogroup" aria-label="Tipo de documento">
          {TIPOS_DOCUMENTO.map((tipo) => (
            <button
              key={tipo.valor}
              type="button"
              role="radio"
              aria-checked={tipoDocumento === tipo.valor}
              className={segmento(tipoDocumento === tipo.valor)}
              onClick={() => setTipoDocumento(tipo.valor)}
            >
              {tipo.etiqueta}
            </button>
          ))}
        </div>

        <Campo
          id="numero-documento"
          etiqueta={tipoDocumento === 'OTRO' ? 'N° de documento' : `N° de ${tipoDocumento}`}
          obligatorio
          icono={svg(<><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="2" /><line x1="15" y1="8" x2="17" y2="8" /><line x1="15" y1="12" x2="17" y2="12" /><line x1="7" y1="16" x2="17" y2="16" /></>)}
        >
          <input
            id="numero-documento"
            type="text"
            inputMode={tipoDocumento === 'OTRO' ? 'text' : 'numeric'}
            className={campoRellenoInput}
            value={numeroDocumento}
            onChange={(e) => setNumeroDocumento(e.target.value)}
            placeholder={tipoDocumento === 'RUC' ? '11 dígitos' : tipoDocumento === 'DNI' ? '8 dígitos' : 'N° de identidad'}
          />
        </Campo>

        {estadoNombre !== 'idle' && (
          <p className="text-[0.75rem] text-text-light -mt-2 mb-3">
            {estadoNombre === 'consultando' && 'Buscando el nombre…'}
            {estadoNombre === 'completado' && 'Nombre completado desde RENIEC. Verifícalo con el documento y corrígelo si hace falta.'}
            {estadoNombre === 'no-encontrado' && 'No se encontró ese DNI. Escribe el nombre.'}
            {estadoNombre === 'sin-servicio' && 'Sin conexión para buscar el nombre. Escríbelo.'}
          </p>
        )}

        {fotoDni && <FotoDniAmpliable foto={fotoDni} />}

        {numeroDocumento.trim().length >= 8 && (
          <div className="mb-4">
            <button
              type="button"
              className={cn(btnCampoSecundario, 'min-h-11 text-sm')}
              disabled={consultando}
              onClick={async () => {
                setConsultando(true);
                const r = await consultarLicenciaItse(numeroDocumento);
                setConsulta(r ?? 'sin-datos');
                setConsultando(false);
              }}
            >
              {consultando ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="animate-spin">
                  <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <circle cx="11" cy="11" r="7" />
                  <path d="M21 21l-4.35-4.35" />
                </svg>
              )}
              <span>{consultando ? 'Consultando…' : 'Consultar licencia e ITSE'}</span>
            </button>
            <p className="text-[0.6875rem] text-text-light text-center mt-1 mb-0">Requiere conexión · no bloquea el registro</p>
            {consulta === 'sin-datos' && (
              <div className="text-[0.8rem] text-text-muted mt-[0.4rem]">No se pudo consultar (sin conexión). Puedes continuar.</div>
            )}
            {consulta && consulta !== 'sin-datos' && (
              <div className="mt-2 rounded-[14px] border border-solid border-campo-100 bg-campo-50 p-3 text-[0.8125rem] text-text-body flex flex-col gap-1">
                <div>
                  <strong>Licencia:</strong> {consulta.tieneLicenciaVigente ? 'vigente' : consulta.licencia ? 'no vigente' : 'no registra'}
                  {consulta.licencia ? ` · N° ${consulta.licencia.numero ?? '—'} · ${consulta.licencia.giro ?? ''}${consulta.licencia.horario ? ` · ${consulta.licencia.horario}` : ''}` : ''}
                </div>
                <div>
                  <strong>ITSE:</strong> {consulta.tieneItseVigente ? 'vigente' : consulta.itse ? 'vencido' : 'no registra'}
                  {consulta.riesgo ? ` · riesgo ${consulta.riesgo}` : ''}
                  {consulta.itse?.caduca ? ` · caduca ${consulta.itse.caduca.slice(0, 10).split('-').reverse().join('/')}` : ''}
                </div>
                {consulta.sugerenciaCuis && (
                  <div className="text-campo-700 font-semibold">Código sugerido: {consulta.sugerenciaCuis}. Tú decides.</div>
                )}
              </div>
            )}
          </div>
        )}

        <div className={cn(seccionTitulo, 'mt-2')}>Datos del intervenido</div>
        <Campo
          id="nombres-razon-social"
          etiqueta="Nombres / Razón social"
          obligatorio
          icono={svg(<><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>)}
        >
          <input
            id="nombres-razon-social"
            type="text"
            className={campoRellenoInput}
            value={nombresRazonSocial}
            onChange={(e) => setNombresRazonSocial(e.target.value)}
            placeholder="Nombre completo o razón social"
          />
        </Campo>

        <Campo
          id="domicilio"
          etiqueta="Domicilio intervenido"
          obligatorio
          icono={svg(<><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></>)}
        >
          <input
            id="domicilio"
            type="text"
            className={campoRellenoInput}
            value={domicilio}
            onChange={(e) => {
              setDomicilio(e.target.value);
              setDomicilioDeLaIntervencion(false);
            }}
            placeholder="Av., Jr., Calle, N° o Mz. Lt."
          />
        </Campo>
        {domicilioDeLaIntervencion && (
          <p className="text-[0.75rem] text-text-light -mt-2 mb-3">Se llenó con la dirección de la intervención. Cámbiala si el domicilio es otro.</p>
        )}

        <Campo
          id="distrito"
          etiqueta="Distrito"
          obligatorio
          icono={svg(<><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></>)}
        >
          <input
            id="distrito"
            type="text"
            className={campoRellenoInput}
            value={distrito}
            onChange={(e) => setDistrito(e.target.value)}
            placeholder="San Juan de Lurigancho"
          />
        </Campo>

        <Campo
          id="giro-uso"
          etiqueta="Giro / Actividad"
          obligatorio
          icono={svg(<><path d="M3 9l1-5h16l1 5" /><path d="M4 9v11h16V9" /><path d="M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0" /></>)}
        >
          <input
            id="giro-uso"
            type="text"
            className={campoRellenoInput}
            value={giroUso}
            onChange={(e) => setGiroUso(e.target.value)}
            placeholder="Bodega, Taller, etc."
          />
        </Campo>

        <Campo
          id="licencia-funcionamiento"
          etiqueta="N° Licencia de funcionamiento (opcional)"
          icono={svg(<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><path d="M9 15l2 2 4-4" /></>)}
        >
          <input
            id="licencia-funcionamiento"
            type="text"
            className={campoRellenoInput}
            value={numeroLicenciaFuncionamiento}
            onChange={(e) => setNumeroLicenciaFuncionamiento(e.target.value)}
            placeholder="Si la exhibe"
          />
        </Campo>

        {error && (
          <div className={cn(alerta('error'), 'rounded-[14px] mt-1 mb-0!')} role="alert">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{error}</span>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2.5 mt-6">
        <button type="button" className={btnCampo} onClick={handleGuardar} disabled={guardando}>
          {guardando ? (
            <span>Guardando…</span>
          ) : (
            <>
              <span>Guardar Administrado</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </>
          )}
        </button>

        <button
          type="button"
          className={btnCampoSecundario}
          onClick={() => setMostrandoNoIdentificado(true)}
          disabled={guardando}
        >
          No se pudo identificar al administrado
        </button>
      </div>
    </div>
  );
}
