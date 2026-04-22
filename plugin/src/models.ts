export const ANKI_CONNECT_URL = "http://127.0.0.1:8765";
export const ANKI_CONNECT_VERSION = 6;
export const DEFAULT_DECK = "Default";

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

export interface Canvas2AnkiMeta {
  id: number;
}

export interface RawNode {
  canvas2anki?: Canvas2AnkiMeta;
  [key: string]: unknown;
}

export function readAnkiMeta(node: RawNode): Canvas2AnkiMeta | null {
  const meta = node.canvas2anki;
  if (!meta || typeof meta.id !== "number") return null;
  return meta;
}

export function writeAnkiMeta(node: RawNode, meta: Canvas2AnkiMeta): RawNode {
  return { ...node, canvas2anki: meta };
}

export function stripAnkiMeta(node: RawNode): RawNode {
  const { canvas2anki: _, ...rest } = node;
  return rest;
}

export interface PluginSettings {
  exportColor: string;      // "1"-"6", Canvas preset color index
  deleteGroupLabel: string; // group with this label triggers Anki deletion
}
