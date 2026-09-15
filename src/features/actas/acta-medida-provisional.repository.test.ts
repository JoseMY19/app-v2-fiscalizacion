import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../lib/db';
import { guardarActaMedidaProvisional, listarActasMedidaProvisional } from './acta-medida-provisional.repository';

const INTERVENCION_ID = 'intervencion-de-prueba';

describe('acta-medida-provisional.repository — HU-14 (no es 1:1)', () => {
  beforeEach(async () => {
    await db.actasMedidaProvisional.clear();
  });

  it('caso feliz: una intervención puede tener más de una medida provisional', async () => {
    await guardarActaMedidaProvisional(INTERVENCION_ID, { numeroCorrelativo: '001', tipoMedida: 'CLAUSURA' });
    await guardarActaMedidaProvisional(INTERVENCION_ID, { numeroCorrelativo: '002', tipoMedida: 'PARALIZACION' });

    const actas = await listarActasMedidaProvisional(INTERVENCION_ID);
    expect(actas).toHaveLength(2);
    expect(actas.map((a) => a.tipoMedida)).toEqual(['CLAUSURA', 'PARALIZACION']);
  });
});
