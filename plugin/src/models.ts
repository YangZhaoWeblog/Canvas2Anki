export const ANKI_CONNECT_URL = "http://127.0.0.1:8765";
export const ANKI_CONNECT_VERSION = 6;
export const DEFAULT_DECK = "Default";
export const CARD_META_RE = /<!--card:(.*?)-->/;
export const CARD_META_GLOBAL_RE = /<!--card:.*?-->/g;

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

export interface PluginSettings {
  colorR: number;
  colorG: number;
  colorB: number;
  modelName: string;
  frontField: string;
  backField: string;
}
