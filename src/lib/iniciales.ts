/** "JUAN CARLOS PEREZ" -> "JC"; cadena vacía si no hay nombre. */
export function iniciales(nombres: string): string {
  return nombres
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0].toUpperCase())
    .join('');
}
