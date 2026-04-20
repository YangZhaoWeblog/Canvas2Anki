export const ANKI_CONNECT_URL = "http://127.0.0.1:8765";
export const ANKI_CONNECT_VERSION = 6;
export const DEFAULT_DECK = "Default";
export const CARD_META_RE = /<!--card:(.*?)-->/;
export const CARD_META_GLOBAL_RE = /<!--card:.*?-->/g;

export const MODEL_NAME = "问答题";
export const FRONT_FIELD = "正面";
export const BACK_FIELD = "背面";

export interface Card {
  nodeId: string;
  front: string;
  back: string;
  deck: string;
  tags: string[];
  ankiId: number | null;
}

export interface ExportStats {
  added: number;
  updated: number;
  deleted: number;
  skipped: number;
}

/**
 * Parse existing <!--card:{JSON}--> from text.
 * Returns the parsed object, or {} if none found.
 */
export function parseMeta(text: string): Record<string, unknown> {
  const m = CARD_META_RE.exec(text);
  if (!m) return {};
  try { return JSON.parse(m[1]); } catch { return {}; }
}

/**
 * Strip all <!--card:...--> from text, return trimmed result.
 */
export function stripMeta(text: string): string {
  return text.replace(CARD_META_GLOBAL_RE, "").trimEnd();
}

/**
 * Merge new fields into existing metadata and append to text.
 * Preserves all existing fields (e.g. anc) not present in newFields.
 */
export function writeMeta(text: string, newFields: Record<string, unknown>): string {
  const existing = parseMeta(text);
  const merged = { ...existing, ...newFields };
  const clean = stripMeta(text);
  return clean + `\n<!--card:${JSON.stringify(merged)}-->`;
}

export interface PluginSettings {
  exportColor: string;      // "1"-"6", Canvas preset color index
  deleteGroupLabel: string; // group with this label triggers Anki deletion
}
