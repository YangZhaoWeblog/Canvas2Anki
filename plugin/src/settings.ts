import { App, PluginSettingTab, Setting } from "obsidian";
import type Canvas2AnkiPlugin from "./main";
import type { PluginSettings } from "./models";

export function isConfigured(s: PluginSettings | null): s is PluginSettings {
  return (
    s !== null &&
    s.modelName !== "" &&
    s.frontField !== "" &&
    s.backField !== "" &&
    s.colorR >= 0 && s.colorR <= 255 &&
    s.colorG >= 0 && s.colorG <= 255 &&
    s.colorB >= 0 && s.colorB <= 255
  );
}

export class Canvas2AnkiSettingTab extends PluginSettingTab {
  plugin: Canvas2AnkiPlugin;

  constructor(app: App, plugin: Canvas2AnkiPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Canvas2Anki Settings" });

    const s = this.plugin.settings;

    containerEl.createEl("h3", { text: "导出颜色 (RGB)" });

    new Setting(containerEl)
      .setName("R")
      .addText((t) =>
        t.setValue(String(s.colorR)).onChange(async (v) => {
          s.colorR = clampColor(v);
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName("G")
      .addText((t) =>
        t.setValue(String(s.colorG)).onChange(async (v) => {
          s.colorG = clampColor(v);
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName("B")
      .addText((t) =>
        t.setValue(String(s.colorB)).onChange(async (v) => {
          s.colorB = clampColor(v);
          await this.plugin.saveSettings();
        })
      );

    containerEl.createEl("h3", { text: "Anki 模板" });

    new Setting(containerEl)
      .setName("模板名")
      .setDesc("Anki 中的笔记类型名称")
      .addText((t) =>
        t.setValue(s.modelName).onChange(async (v) => {
          s.modelName = v.trim();
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName("正面字段")
      .addText((t) =>
        t.setValue(s.frontField).onChange(async (v) => {
          s.frontField = v.trim();
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName("背面字段")
      .addText((t) =>
        t.setValue(s.backField).onChange(async (v) => {
          s.backField = v.trim();
          await this.plugin.saveSettings();
        })
      );
  }
}

function clampColor(v: string): number {
  const n = parseInt(v, 10);
  if (isNaN(n)) return 0;
  return Math.max(0, Math.min(255, n));
}
