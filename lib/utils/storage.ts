/** localStorage with try/catch and an in-memory fallback (private windows, blocked storage). */
const memory = new Map<string, string>();

export const safeStorage = {
  get(key: string): string | null {
    try {
      const v = window.localStorage.getItem(key);
      return v ?? memory.get(key) ?? null;
    } catch {
      return memory.get(key) ?? null;
    }
  },
  set(key: string, value: string): boolean {
    memory.set(key, value);
    try {
      window.localStorage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  },
  remove(key: string) {
    memory.delete(key);
    try { window.localStorage.removeItem(key); } catch { /* ignore */ }
  },
  getJSON<T>(key: string): T | null {
    const raw = this.get(key);
    if (!raw) return null;
    try { return JSON.parse(raw) as T; } catch { return null; }
  },
  setJSON(key: string, value: unknown): boolean {
    return this.set(key, JSON.stringify(value));
  }
};
