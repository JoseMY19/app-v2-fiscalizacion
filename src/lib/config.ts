// HT-04-ish: un solo lugar para la URL del backend. En producción (PWA en
// el celular del fiscalizador) esto se define en tiempo de build via
// VITE_API_BASE_URL; en desarrollo cae al backend local por defecto.
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';
