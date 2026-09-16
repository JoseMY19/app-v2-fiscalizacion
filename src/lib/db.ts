import Dexie, { type Table } from 'dexie';
import type {
  BaseCalculo,
  EstadoIntervencion,
  ModoNotificacion,
  MotivoNoIdentificado,
  OrigenIntervencion,
  OrigenUbicacion,
  TipoActuacion,
} from '@pas-sjl/shared-types';

/**
 * HT-02 del backlog: esquema de IndexedDB local.
 * Espejo simplificado de las tablas del backend (ver prisma/schema.prisma)
 * para lo que el aplicativo necesita mientras está offline. NO es un
 * duplicado 1:1 del schema de Prisma — solo lo que se captura en campo.
 */

export interface IntervencionLocal {
  localId: string; // uuid generado en el cliente, ver nota abajo — se usa TAMBIÉN como Intervencion.id en el servidor (HU-24, idempotencia)
  serverId?: string; // se llena cuando el servidor confirma la creacion
  // HU-28: identidad de la sesión autenticada en el momento de crear la
  // intervención, grabada de una vez para que sobreviva aunque el
  // dispositivo cambie de fiscalizador después (o la sesión expire a mitad
  // de un operativo). Requerida para sincronizar (FK obligatoria en el
  // backend), pero opcional acá porque HU-01 pudo correr antes de que
  // existiera login en versiones viejas de la app.
  fiscalizadorId?: string;
  fechaHoraInicio: string;
  // HU-01: latitud/longitud son opcionales porque el respaldo de dirección
  // manual (cuando el GPS no fija señal en 15s) no produce coordenadas
  // reales — nunca se inventa un lat/long falso. origenUbicacion distingue
  // los tres casos; ver el enum en @pas-sjl/shared-types.
  latitud?: number;
  longitud?: number;
  gpsPrecisionM?: number;
  origenUbicacion: OrigenUbicacion;
  direccionAproximada?: string;
  origen?: OrigenIntervencion;
  referenciaOrigen?: string;
  tipoActuacion?: TipoActuacion;
  estado: EstadoIntervencion;
  versionLocal: number;
  creadoEn: string;
  actualizadoEn: string;
}

/**
 * HU-04/HU-05: datos del administrado, 1:1 con la intervención — mismo
 * criterio que ADMINISTRADO en Prisma (ver erd-sp1-decisiones.md §2.8):
 * no es una tabla maestra de personas, es una copia propia de esta
 * intervención. Todos los campos de identidad son opcionales porque HU-05
 * permite avanzar sin ellos (identificado=false + motivoNoIdentificado);
 * nunca se inventa un valor para poder "completar" el registro.
 */
export interface AdministradoLocal {
  intervencionLocalId: string; // FK 1:1, misma semántica que Administrado.intervencionId en Prisma
  identificado: boolean;
  motivoNoIdentificado?: MotivoNoIdentificado;
  tipoDocumento?: string;
  numeroDocumento?: string;
  nombresRazonSocial?: string;
  domicilio?: string;
  distrito?: string;
  giroUso?: string;
  numeroLicenciaFuncionamiento?: string;
  actualizadoEn: string;
}

export interface FotoLocal {
  id?: number;
  intervencionLocalId: string;
  actaTipo?: string;
  blob: Blob; // ya comprimida antes de guardar aqui, ver HT-03
  capturadaEn: string;
  sincronizada: boolean;
}

/**
 * HU-18: firma capturada en el propio dispositivo del fiscalizador. La
 * firma del administrado NO se captura digitalmente aquí — es el celular
 * personal (BYOD) de otra persona, validez legal débil sin validación del
 * área legal; esa evidencia es una foto del acta física firmada (HU-17).
 */
export interface FirmaLocal {
  id?: number;
  intervencionLocalId: string;
  rol: 'INSPECTOR';
  blob: Blob;
  capturadaEn: string;
  sincronizada: boolean; // HU-24: igual que FotoLocal.sincronizada — evidencia sube independiente del bundle
}

export interface ColaSincronizacion {
  id?: number;
  intervencionLocalId: string;
  intentoNumero: number;
  ultimoIntentoEn?: string;
  estado: 'PENDIENTE' | 'ERROR' | 'OK';
  detalleError?: string;
}

export interface CuisCodigoCache {
  id: string;
  codigo: string;
  descripcion: string | null;
  requiereDesambiguacion: boolean;
  escalasJson: string; // JSON.stringify de las escalas, se parsea al usar
  // HU-14: booleano calculado en el backend (categoría 8 · Urbanismo).
  // Puede faltar en cache viejo (re-sincroniza), se trata como false.
  sugiereValorizacionObra?: boolean;
}

/**
 * HU-07/HU-08: código(s) CUIS elegidos para esta intervención.
 * Solo guarda los IDs (igual que INTERVENCION_CUIS en Prisma, ver
 * erd-sp1-decisiones.md §1) — el detalle a mostrar se resuelve uniendo
 * contra cuisCache, nunca se copia el % o la descripción acá porque esos
 * valores pertenecen al código CUIS, no a la intervención.
 */
export interface IntervencionCuisLocal {
  id?: number;
  intervencionLocalId: string;
  cuisCodigoId: string;
  cuisEscalaMontoId?: string; // ausente solo si el código tiene una única escala
  seleccionadoEn: string;
}

/**
 * HU-11: acta de exhortación, 1:1 con la intervención (camino A).
 * "código de infracción" y "medida provisional" del criterio de HU-11 no
 * se duplican aquí — ya están en intervencionCuis/cuisCache (HU-07/08); el
 * fiscalizador solo los consulta para elegir baseCalculo/redactar el texto.
 */
export interface ActaExhortacionLocal {
  intervencionLocalId: string; // 1:1, PK
  numeroCorrelativo: string; // HU-16 lo formaliza después; por ahora input simple
  presuntaInfraccion: string;
  // Elegido explícitamente por el fiscalizador, nunca preseleccionado — ver
  // docs/cuis/reporte-calidad.md, el catálogo no dice hoy la base de cada código.
  baseCalculo: BaseCalculo;
  // NULLABLE A PROPÓSITO: solo se calcula si baseCalculo=UIT_FIJO. Mismo
  // criterio que NotificacionCargo.montoPasibleMulta (erd-sp1-decisiones.md §2.3).
  montoPosibleDeuda?: number;
  plazoSubsanacion?: string;
  observaciones?: string;
  creadoEn: string;
}

/** HU-12: acta de fiscalización municipal, 1:1 con la intervención (caminos B y C). */
export interface ActaFiscalizacionLocal {
  intervencionLocalId: string; // 1:1, PK
  numeroCorrelativo: string;
  hechosVerificados: string;
  observacionesAdministrado?: string;
  creadoEn: string;
}

/**
 * HU-13: notificación de cargo, 1:1 con la intervención (camino C).
 * HU-20/HU-21 completan modoNotificacion/fechaNotificacion/receptor/
 * negativa/domicilio en un paso posterior del mismo flujo — SIEMPRE
 * mediante lectura-y-fusión del registro completo (nunca reconstruirlo
 * solo con los campos de esa pantalla, se perdería montoPasibleMulta/
 * baseCalculo de HU-13).
 */
export interface NotificacionCargoLocal {
  intervencionLocalId: string; // 1:1, PK
  numeroCorrelativo: string;
  baseCalculo: BaseCalculo;
  montoPasibleMulta?: number; // NULLABLE A PROPÓSITO, igual que en Prisma
  medidaComplementaria?: string;
  // Opcional: solo aplica a infracciones con un vehículo involucrado.
  placaRodaje?: string;
  fechaDeteccion: string; // heredada de Intervencion.fechaHoraInicio — cero doble digitación
  // NULLABLE A PROPÓSITO — HU-21 lo llena cuando se responde "¿se entregó
  // en el acto?". Si la respuesta es "No", fechaNotificacion queda vacía
  // para siempre (motor de plazos), nunca se completa con otra fecha.
  fechaNotificacion?: string;
  modoNotificacion?: ModoNotificacion;
  receptorNombre?: string;
  receptorDocumento?: string;
  receptorRelacion?: string;
  // HU-20: constancia de negativa — dispara testigos + características del domicilio.
  seNegoIdentificarse?: boolean;
  seNegoFirmar?: boolean;
  domicilioPuertas?: string;
  domicilioPisos?: string;
  domicilioNumeroSuministro?: string;
  domicilioObservaciones?: string;
  creadoEn: string;
}

/** HU-20: testigos cuando hay negativa. orden 1 y 2, siempre exactamente 2. */
export interface TestigoLocal {
  id?: number;
  intervencionLocalId: string;
  orden: 1 | 2;
  nombre: string;
  documento: string;
}

/** HU-13: cache local del valor de UIT por año, sincronizado desde GET /uit/parametros. */
export interface ParametroUitCache {
  id: string;
  anio: number;
  valorSoles: number;
  vigenteDesde: string; // ISO date
  vigenteHasta: string | null;
}

/**
 * HU-14: acta de medida provisional. NO es 1:1 — Prisma no le pone
 * @@unique([intervencionId]), una intervención puede tener más de una
 * (ej. clausura de un local y paralización de otra área). tipoMedida se
 * restringe a CLAUSURA/PARALIZACION: Retención y Decomiso van por
 * ActaAdicional (ver erd-sp1-decisiones.md §2.5 y la sesión de HU-14).
 */
export interface ActaMedidaProvisionalLocal {
  id?: number;
  intervencionLocalId: string;
  numeroCorrelativo: string;
  tipoMedida: 'CLAUSURA' | 'PARALIZACION';
  descripcion?: string;
  lugarEjecucion?: string;
  observacionesAdministrado?: string;
  creadoEn: string;
}

/** HU-14: acta de valorización de obra. Tampoco es 1:1, igual que ActaMedidaProvisional. */
export interface ActaValorizacionObraLocal {
  id?: number;
  intervencionLocalId: string;
  numeroCorrelativo: string;
  estadoObra?: string;
  creadoEn: string;
}

/**
 * HU-14: tabla genérica para Retención de Vehículos y Decomiso — el área
 * legal todavía no cerró el formato de estas actas (erd-sp1-decisiones.md
 * §2.5), por eso `detalle` es texto libre en vez de campos estructurados.
 */
export interface ActaAdicionalLocal {
  id?: number;
  intervencionLocalId: string;
  tipo: 'RETENCION_VEHICULO' | 'DECOMISO';
  numeroCorrelativo: string;
  detalle?: string;
  creadoEn: string;
}

class PasCampoDB extends Dexie {
  intervenciones!: Table<IntervencionLocal, string>;
  fotos!: Table<FotoLocal, number>;
  colaSincronizacion!: Table<ColaSincronizacion, number>;
  cuisCache!: Table<CuisCodigoCache, string>;
  administrados!: Table<AdministradoLocal, string>;
  intervencionCuis!: Table<IntervencionCuisLocal, number>;
  actasExhortacion!: Table<ActaExhortacionLocal, string>;
  actasFiscalizacion!: Table<ActaFiscalizacionLocal, string>;
  notificacionesCargo!: Table<NotificacionCargoLocal, string>;
  uitCache!: Table<ParametroUitCache, string>;
  actasMedidaProvisional!: Table<ActaMedidaProvisionalLocal, number>;
  actasValorizacionObra!: Table<ActaValorizacionObraLocal, number>;
  actasAdicionales!: Table<ActaAdicionalLocal, number>;
  firmas!: Table<FirmaLocal, number>;
  testigos!: Table<TestigoLocal, number>;

  constructor() {
    super('pas-campo-db');
    // version(1): esquema inicial de HT-02. Al agregar campos nuevos,
    // sube la version y usa .upgrade() — nunca borres el historial de
    // versiones, algunos dispositivos van a abrir la app sin haber
    // sincronizado la version anterior todavia.
    this.version(1).stores({
      intervenciones: 'localId, serverId, estado, creadoEn',
      fotos: '++id, intervencionLocalId, sincronizada',
      colaSincronizacion: '++id, intervencionLocalId, estado',
      cuisCache: 'id, codigo',
    });
    // version(2): HU-04/HU-05, tabla administrados (1:1 con intervenciones
    // por intervencionLocalId). No hay migración de datos porque la tabla
    // es nueva, no cambia una existente.
    this.version(2).stores({
      intervenciones: 'localId, serverId, estado, creadoEn',
      fotos: '++id, intervencionLocalId, sincronizada',
      colaSincronizacion: '++id, intervencionLocalId, estado',
      cuisCache: 'id, codigo',
      administrados: 'intervencionLocalId',
    });
    // version(3): HU-07/HU-08, tabla intervencionCuis (N:1 con
    // intervenciones). Tabla nueva, sin migración de datos.
    this.version(3).stores({
      intervenciones: 'localId, serverId, estado, creadoEn',
      fotos: '++id, intervencionLocalId, sincronizada',
      colaSincronizacion: '++id, intervencionLocalId, estado',
      cuisCache: 'id, codigo',
      administrados: 'intervencionLocalId',
      intervencionCuis: '++id, intervencionLocalId',
    });
    // version(4): HU-11/HU-12/HU-13, actas 1:1 + cache de UIT. Tablas
    // nuevas, sin migración de datos.
    this.version(4).stores({
      intervenciones: 'localId, serverId, estado, creadoEn',
      fotos: '++id, intervencionLocalId, sincronizada',
      colaSincronizacion: '++id, intervencionLocalId, estado',
      cuisCache: 'id, codigo',
      administrados: 'intervencionLocalId',
      intervencionCuis: '++id, intervencionLocalId',
      actasExhortacion: 'intervencionLocalId',
      actasFiscalizacion: 'intervencionLocalId',
      notificacionesCargo: 'intervencionLocalId',
      uitCache: 'id, anio',
    });
    // version(5): HU-14, actas adicionales (N:1 con intervenciones, no
    // 1:1 — una intervención puede tener varias). Tablas nuevas.
    this.version(5).stores({
      intervenciones: 'localId, serverId, estado, creadoEn',
      fotos: '++id, intervencionLocalId, sincronizada',
      colaSincronizacion: '++id, intervencionLocalId, estado',
      cuisCache: 'id, codigo',
      administrados: 'intervencionLocalId',
      intervencionCuis: '++id, intervencionLocalId',
      actasExhortacion: 'intervencionLocalId',
      actasFiscalizacion: 'intervencionLocalId',
      notificacionesCargo: 'intervencionLocalId',
      uitCache: 'id, anio',
      actasMedidaProvisional: '++id, intervencionLocalId',
      actasValorizacionObra: '++id, intervencionLocalId',
      actasAdicionales: '++id, intervencionLocalId',
    });
    // version(6): HU-18, tabla firmas. Tabla nueva.
    this.version(6).stores({
      intervenciones: 'localId, serverId, estado, creadoEn',
      fotos: '++id, intervencionLocalId, sincronizada',
      colaSincronizacion: '++id, intervencionLocalId, estado',
      cuisCache: 'id, codigo',
      administrados: 'intervencionLocalId',
      intervencionCuis: '++id, intervencionLocalId',
      actasExhortacion: 'intervencionLocalId',
      actasFiscalizacion: 'intervencionLocalId',
      notificacionesCargo: 'intervencionLocalId',
      uitCache: 'id, anio',
      actasMedidaProvisional: '++id, intervencionLocalId',
      actasValorizacionObra: '++id, intervencionLocalId',
      actasAdicionales: '++id, intervencionLocalId',
      firmas: '++id, intervencionLocalId',
    });
    // version(7): HU-20, tabla testigos. Tabla nueva.
    this.version(7).stores({
      intervenciones: 'localId, serverId, estado, creadoEn',
      fotos: '++id, intervencionLocalId, sincronizada',
      colaSincronizacion: '++id, intervencionLocalId, estado',
      cuisCache: 'id, codigo',
      administrados: 'intervencionLocalId',
      intervencionCuis: '++id, intervencionLocalId',
      actasExhortacion: 'intervencionLocalId',
      actasFiscalizacion: 'intervencionLocalId',
      notificacionesCargo: 'intervencionLocalId',
      uitCache: 'id, anio',
      actasMedidaProvisional: '++id, intervencionLocalId',
      actasValorizacionObra: '++id, intervencionLocalId',
      actasAdicionales: '++id, intervencionLocalId',
      firmas: '++id, intervencionLocalId',
      testigos: '++id, intervencionLocalId',
    });
    // version(8): HU-24. usuariosCache (tabla nueva); firmas gana el
    // índice "sincronizada" (mismo campo que fotos, para que el motor de
    // sincronización filtre evidencia pendiente sin escanear todo).
    this.version(8)
      .stores({
        intervenciones: 'localId, serverId, estado, creadoEn',
        fotos: '++id, intervencionLocalId, sincronizada',
        colaSincronizacion: '++id, intervencionLocalId, estado',
        cuisCache: 'id, codigo',
        administrados: 'intervencionLocalId',
        intervencionCuis: '++id, intervencionLocalId',
        actasExhortacion: 'intervencionLocalId',
        actasFiscalizacion: 'intervencionLocalId',
        notificacionesCargo: 'intervencionLocalId',
        uitCache: 'id, anio',
        actasMedidaProvisional: '++id, intervencionLocalId',
        actasValorizacionObra: '++id, intervencionLocalId',
        actasAdicionales: '++id, intervencionLocalId',
        firmas: '++id, intervencionLocalId, sincronizada',
        testigos: '++id, intervencionLocalId',
        usuariosCache: 'id, dni',
      })
      .upgrade(async (tx) => {
        // Firmas ya guardadas antes de HU-24 no tienen `sincronizada` —
        // se tratan como pendientes, nunca se asumen ya subidas.
        await tx
          .table('firmas')
          .toCollection()
          .modify((firma: { sincronizada?: boolean }) => {
            if (firma.sincronizada === undefined) firma.sincronizada = false;
          });
      });
    // version(9): HU-28 reemplaza la pantalla "¿Quién eres?" por login real
    // (usuario/contraseña + tokens); la sesión vive en localStorage, no en
    // Dexie (no es un dato de dominio versionado), así que usuariosCache
    // ya no hace falta.
    this.version(9).stores({
      intervenciones: 'localId, serverId, estado, creadoEn',
      fotos: '++id, intervencionLocalId, sincronizada',
      colaSincronizacion: '++id, intervencionLocalId, estado',
      cuisCache: 'id, codigo',
      administrados: 'intervencionLocalId',
      intervencionCuis: '++id, intervencionLocalId',
      actasExhortacion: 'intervencionLocalId',
      actasFiscalizacion: 'intervencionLocalId',
      notificacionesCargo: 'intervencionLocalId',
      uitCache: 'id, anio',
      actasMedidaProvisional: '++id, intervencionLocalId',
      actasValorizacionObra: '++id, intervencionLocalId',
      actasAdicionales: '++id, intervencionLocalId',
      firmas: '++id, intervencionLocalId, sincronizada',
      testigos: '++id, intervencionLocalId',
      usuariosCache: null,
    });
  }
}

export const db = new PasCampoDB();
