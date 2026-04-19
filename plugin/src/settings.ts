import { App, PluginSettingTab, Setting } from "obsidian";
import type Canvas2AnkiPlugin from "./main";
import type { PluginSettings } from "./models";

/** Canvas preset color index → Obsidian CSS variable name */
const COLOR_CSS_VARS: Record<string, string> = {
  "1": "--color-red",
  "2": "--color-orange",
  "3": "--color-yellow",
  "4": "--color-green",
  "5": "--color-cyan",
  "6": "--color-purple",
};

export function isConfigured(s: PluginSettings | null): s is PluginSettings {
  return s !== null && s.exportColor >= "1" && s.exportColor <= "6";
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

    // ── Color picker: 6 clickable swatches ──
    const colorSetting = new Setting(containerEl)
      .setName("导出颜色")
      .setDesc("Canvas 中哪个预设颜色代表要导出的卡片");

    const swatchContainer = colorSetting.controlEl.createDiv({
      cls: "canvas2anki-swatch-row",
    });
    swatchContainer.style.display = "flex";
    swatchContainer.style.gap = "6px";

    const swatches: HTMLElement[] = [];

    for (const [idx, cssVar] of Object.entries(COLOR_CSS_VARS)) {
      const swatch = swatchContainer.createDiv({ cls: "canvas2anki-swatch" });
      const resolved = getComputedStyle(document.body).getPropertyValue(cssVar).trim();
      swatch.style.backgroundColor = resolved || cssVar;
      swatch.style.width = "28px";
      swatch.style.height = "28px";
      swatch.style.borderRadius = "6px";
      swatch.style.cursor = "pointer";
      swatch.style.border = "2px solid transparent";
      swatch.style.transition = "border-color 0.15s";

      if (idx === this.plugin.settings.exportColor) {
        swatch.style.border = "2px solid var(--text-normal)";
      }

      swatch.addEventListener("click", async () => {
        this.plugin.settings.exportColor = idx;
        await this.plugin.saveSettings();
        // Update highlight
        for (const s of swatches) {
          s.style.border = "2px solid transparent";
        }
        swatch.style.border = "2px solid var(--text-normal)";
      });

      swatches.push(swatch);
    }

    // ── Delete keyword ──
    new Setting(containerEl)
      .setName("删除关键词")
      .setDesc("节点文本中包含此关键词时，导出将删除对应 Anki 卡片")
      .addText((t) =>
        t
          .setValue(this.plugin.settings.deleteKeyword)
          .onChange(async (v) => {
            this.plugin.settings.deleteKeyword = v.trim();
            await this.plugin.saveSettings();
          })
      );
  }
}
