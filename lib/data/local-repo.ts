import type { AppData } from "@/types/database";
import type { Op, Repository } from "./repository";
import { safeStorage } from "@/lib/utils/storage";
import { demoCoupons } from "@/lib/demo/coupons";

const key = (userId: string) => `mpp:data:v1:${userId}`;

/** Demo-mode repository: the whole dataset lives in this browser's localStorage. */
export const localRepo: Repository = {
  kind: "local",
  async load(userId) {
    const data = safeStorage.getJSON<AppData>(key(userId));
    if (!data) return null;
    // Demo coupons are regenerated so their dates stay current.
    data.coupons = demoCoupons();
    return data;
  },
  async apply(_ops: Op[], next: AppData) {
    const ok = safeStorage.setJSON(key(next.profile.id), next);
    if (!ok) console.warn("MyPantryPal: browser storage is full or blocked; changes are kept for this session only.");
  },
  async replaceAll(data) {
    safeStorage.setJSON(key(data.profile.id), data);
  },
  async deleteAll(userId) {
    safeStorage.remove(key(userId));
  }
};
