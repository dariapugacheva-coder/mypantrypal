// The presentation build never talks to Supabase; this keeps the client library out of the bundle.
export function getSupabase(): null { return null; }
