import { parseCanvas } from "./parser";
import { mdToAnkiHtml } from "./converter";
import type { AnkiClient } from "./anki-client";
import { MODEL_NAME, FRONT_FIELD, BACK_FIELD } from "./models";
import type { ExportStats, PluginSettings } from "./models";

export interface ExportParams {
  canvasJson: string;
  client: AnkiClient;
  settings: PluginSettings;
  vaultName: string;
  canvasPath: string;
  readBinary: (path: string) => Promise<ArrayBuffer | null>;
  findFile: (name: string) => string | null;
}

export interface ExportResult {
  stats: ExportStats;
  warnings: string[];
  idWriteback: Record<string, number>;
  deletedNodeIds: string[];
}

export async function exportCanvas(params: ExportParams): Promise<ExportResult> {
  const { canvasJson, client, settings, vaultName, canvasPath } = params;
  const { cards, warnings, deletions } = parseCanvas(canvasJson, settings.exportColor, settings.deleteGroupLabel);

  const stats: ExportStats = { added: 0, updated: 0, deleted: 0, skipped: warnings.length };
  const idWriteback: Record<string, number> = {};

  const decks = new Set(cards.map((c) => c.deck));
  for (const deck of decks) {
    await client.createDeck(deck);
  }

  for (const card of cards) {
    await uploadMedia(card.front, params);
    await uploadMedia(card.back, params);

    const frontHtml = mdToAnkiHtml(card.front, vaultName);
    let backHtml = mdToAnkiHtml(card.back, vaultName);

    backHtml += `<br><a href="obsidian://open?vault=${vaultName}&file=${canvasPath}">📎 Canvas</a>`;

    const fields: Record<string, string> = {
      [FRONT_FIELD]: frontHtml,
      [BACK_FIELD]: backHtml,
    };

    if (card.ankiId) {
      try {
        await client.updateNoteFields(card.ankiId, fields);
        idWriteback[card.nodeId] = card.ankiId;
        stats.updated++;
      } catch (e: any) {
        warnings.push(`WARN: "${card.front.slice(0, 30)}" 更新失败 — ${e.message}`);
        stats.skipped++;
      }
    } else {
      try {
        const noteId = await client.addNote(card.deck, MODEL_NAME, fields, card.tags);
        idWriteback[card.nodeId] = noteId;
        stats.added++;
      } catch (e: any) {
        warnings.push(`WARN: "${card.front.slice(0, 30)}" 跳过 — ${e.message}`);
        stats.skipped++;
      }
    }
  }

  const deletedNodeIds: string[] = [];
  for (const d of deletions) {
    try {
      await client.deleteNotes([d.ankiId!]);
      deletedNodeIds.push(d.nodeId);
      stats.deleted++;
    } catch (e: any) {
      warnings.push(`WARN: 删除失败 (ankiId=${d.ankiId}) — ${e.message}`);
      stats.skipped++;
    }
  }

  return { stats, warnings, idWriteback, deletedNodeIds };
}

async function uploadMedia(text: string, params: ExportParams): Promise<void> {
  const regex = /!\[\[(.*?)\]\]/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const ref = match[1];
    const filename = ref.split("/").pop() ?? ref;
    let filePath = params.findFile(ref) ?? params.findFile(filename);
    if (!filePath) continue;
    const data = await params.readBinary(filePath);
    if (!data) continue;
    const base64 = arrayBufferToBase64(data);
    await params.client.storeMediaFile(filename, base64);
  }
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
