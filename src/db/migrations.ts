// Explicit schema version log for AppDatabase (src/db/database.ts).
//
// v1 (current): initial schema — see database.ts `version(1).stores(...)`.
//
// When the schema changes, add a new `db.version(n).stores({...}).upgrade(tx => ...)`
// block in database.ts (never mutate an existing `.version()` call), bump
// CURRENT_SCHEMA_VERSION here, and describe the change above.
export const CURRENT_SCHEMA_VERSION = 1;
