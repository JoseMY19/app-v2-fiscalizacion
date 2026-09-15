import { defineConfig } from 'vitest/config';

// Entorno 'node', no 'jsdom': por ahora los tests son de lógica y
// repositorios (Dexie sobre fake-indexeddb), no de renderizado de
// componentes. Si más adelante se agregan tests de UI con
// @testing-library/react, ese es el momento de sumar jsdom.
export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./src/test/setup.ts'],
  },
});
