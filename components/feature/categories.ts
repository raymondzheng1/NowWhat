/**
 * Display category labels for the legacy What Now? decode corpus entries (used by the
 * Ask / Decode result headers). The M-Lean /start flow uses the procedural data layer
 * directly and does not need this map.
 */
export const CATEGORY: Record<string, string> = {
  "vic-renting": "Renting · Notice to vacate",
  "vic-fines": "Fines · Infringements",
  "vic-public-housing": "Public & community housing",
  "vic-generic": "Victorian government decision",
};
