// Dexie necesita IndexedDB real; en el entorno de test (Node) se
// polyfillea con fake-indexeddb para poder probar los repositorios sin
// un navegador real.
import 'fake-indexeddb/auto';

// HU-28 usa localStorage para la sesión y la identidad de dispositivo (ver
// features/auth). Node no lo tiene — polyfill mínimo en memoria, sin
// agregar jsdom solo por esto.
class LocalStorageEnMemoria implements Storage {
  private datos = new Map<string, string>();
  get length() {
    return this.datos.size;
  }
  clear(): void {
    this.datos.clear();
  }
  getItem(key: string): string | null {
    return this.datos.has(key) ? this.datos.get(key)! : null;
  }
  key(index: number): string | null {
    return [...this.datos.keys()][index] ?? null;
  }
  removeItem(key: string): void {
    this.datos.delete(key);
  }
  setItem(key: string, value: string): void {
    this.datos.set(key, value);
  }
}

if (typeof globalThis.localStorage === 'undefined') {
  globalThis.localStorage = new LocalStorageEnMemoria();
}
