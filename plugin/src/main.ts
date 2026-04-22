import { Notice, Plugin, TFile } from "obsidian";
import { AnkiClient } from "./anki-client";
import { exportCanvas } from "./exporter";
import type { PluginSettings } from "./models";
import { Canvas2AnkiSettingTab, isConfigured } from "./settings";

const DEFAULT_SETTINGS: PluginSettings = {
  exportColor: "4",
  deleteGroupLabel: "DELETE",
};

export default class Canvas2AnkiPlugin extends Plugin {
  settings: PluginSettings = { ...DEFAULT_SETTINGS };

  async onload() {
    await this.loadSettings();

    this.addRibbonIcon("upload", "Export Canvas to Anki", () => this.runExport());

    this.addCommand({
      id: "export-current-canvas",
      name: "Export current canvas",
      callback: () => this.runExport(),
    });

    this.addSettingTab(new Canvas2AnkiSettingTab(this.app, this));
  }

  async loadSettings() {
    const data = await this.loadData();
    this.settings = Object.assign({}, DEFAULT_SETTINGS, data ?? {});
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  private async runExport() {
    if (!isConfigured(this.settings)) {
      new Notice("请先在设置中配置 Canvas2Anki 导出颜色");
      (this.app as any).setting?.open?.();
      (this.app as any).setting?.openTabById?.(this.manifest.id);
      return;
    }

    const activeFile = this.app.workspace.getActiveFile();
    if (!activeFile || activeFile.extension !== "canvas") {
      new Notice("请先打开一个 Canvas 文件");
      return;
    }

    const client = new AnkiClient();
    try {
      await client.version();
    } catch (e: any) {
      new Notice(e.message, 5000);
      return;
    }

    const canvasJson = await this.app.vault.read(activeFile);
    const vaultName = this.app.vault.getName();
    const canvasPath = activeFile.path;

    const allFiles = this.app.vault.getFiles();
    const findFile = (name: string): string | null => {
      const exact = allFiles.find((f) => f.path === name);
      if (exact) return exact.path;
      const byName = allFiles.find((f) => f.name === name.split("/").pop());
      return byName?.path ?? null;
    };
    const readBinary = async (path: string): Promise<ArrayBuffer | null> => {
      const file = this.app.vault.getAbstractFileByPath(path);
      if (file instanceof TFile) {
        return this.app.vault.readBinary(file);
      }
      return null;
    };

    try {
      const result = await exportCanvas({
        canvasJson,
        client,
        settings: this.settings,
        vaultName,
        canvasPath,
        readBinary,
        findFile,
      });

      if (Object.keys(result.idWriteback).length > 0 || result.deletedNodeIds.length > 0) {
        await this.writebackToCanvas(activeFile, result.idWriteback, result.deletedNodeIds);
      }

      const { added, updated, deleted, skipped } = result.stats;
      new Notice(`✓ ${added} 新建, ${updated} 更新, ${deleted} 删除, ${skipped} 跳过`, 4000);

      if (result.warnings.length > 0) {
        console.warn("[Canvas2Anki] Warnings:", result.warnings);
      }
    } catch (e: any) {
      new Notice(`导出失败: ${e.message}`, 5000);
    }
  }

  private async writebackToCanvas(
    file: TFile,
    idWriteback: Record<string, number>,
    deletedNodeIds: string[]
  ) {
    const raw = await this.app.vault.read(file);
    const data = JSON.parse(raw);

    for (const node of data.nodes) {
      if (node.id in idWriteback) {
        node.canvas2anki = { id: idWriteback[node.id] };
      }
      if (deletedNodeIds.includes(node.id)) {
        delete node.canvas2anki;
      }
    }

    await this.app.vault.modify(file, JSON.stringify(data, null, "\t"));
  }
}
