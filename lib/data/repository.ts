import type { AppData, CollectionName, Profile, UserPreferences } from "@/types/database";

export type Op =
  | { type: "upsert"; table: CollectionName; row: { id: string } & Record<string, unknown> }
  | { type: "remove"; table: CollectionName; id: string }
  | { type: "profile"; row: Profile }
  | { type: "preferences"; row: UserPreferences };

export interface Repository {
  kind: "local" | "supabase";
  load(userId: string): Promise<AppData | null>;
  apply(ops: Op[], next: AppData): Promise<void>;
  replaceAll(data: AppData): Promise<void>;
  deleteAll(userId: string): Promise<void>;
}
