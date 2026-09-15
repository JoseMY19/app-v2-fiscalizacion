import { beforeEach, describe, expect, it } from 'vitest';
import { MotivoNoIdentificado } from '@pas-sjl/shared-types';
import { db } from '../../lib/db';
import { guardarAdministrado, marcarAdministradoNoIdentificado, obtenerAdministrado } from './administrado.repository';

const INTERVENCION_ID = 'intervencion-de-prueba';

describe('administrado.repository — HU-04 / HU-05', () => {
  beforeEach(async () => {
    await db.administrados.clear();
  });

  it('caso feliz (HU-04): guarda al administrado identificado sin licencia', async () => {
    await guardarAdministrado(INTERVENCION_ID, {
      tipoDocumento: 'DNI',
      numeroDocumento: '45678912',
      nombresRazonSocial: 'Juan Pérez',
      domicilio: 'Av. Los Próceres 100',
      distrito: 'San Juan de Lurigancho',
      giroUso: 'Vivienda',
      numeroLicenciaFuncionamiento: '',
    });

    const registro = await obtenerAdministrado(INTERVENCION_ID);
    expect(registro?.identificado).toBe(true);
    // la licencia vacía nunca se guarda como string vacío — o hay dato, o no está.
    expect(registro?.numeroLicenciaFuncionamiento).toBeUndefined();
    expect(registro?.motivoNoIdentificado).toBeUndefined();
  });

  it('caso borde (HU-05): marcar no identificado no exige ningún dato de identidad', async () => {
    await marcarAdministradoNoIdentificado(INTERVENCION_ID, MotivoNoIdentificado.SE_NEGO);

    const registro = await obtenerAdministrado(INTERVENCION_ID);
    expect(registro?.identificado).toBe(false);
    expect(registro?.motivoNoIdentificado).toBe(MotivoNoIdentificado.SE_NEGO);
    expect(registro?.numeroDocumento).toBeUndefined();
    expect(registro?.nombresRazonSocial).toBeUndefined();
  });
});
