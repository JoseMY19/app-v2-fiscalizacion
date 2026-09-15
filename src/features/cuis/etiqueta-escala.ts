/**
 * HU-08: el backlog pide mostrar "nivel de riesgo (bajo/medio/alto/muy
 * alto)", pero ese dato no existe en la ordenanza ni en el modelo — lo
 * único real es `escala` (L/G/MG). Se muestra la escala real con su
 * nombre completo en vez de inventar una escala de 4 niveles.
 */
const ETIQUETAS: Record<'L' | 'G' | 'MG', string> = {
  L: 'Leve',
  G: 'Grave',
  MG: 'Muy grave',
};

export function etiquetaEscala(escala: 'L' | 'G' | 'MG'): string {
  return ETIQUETAS[escala];
}
