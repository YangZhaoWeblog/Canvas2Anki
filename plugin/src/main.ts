import { Plugin } from "obsidian";
import type { PluginSettings } from "./models";

const DEFAULT_SETTINGS: PluginSettings = {
  colorR: 64,
  colorG: 196,
  colorB: 104,
  modelName: "问答题",
  frontField: "正面",
  backField: "背面",
};

export default class Canvas2AnkiPlugin extends Plugin {
  settings: PluginSettings = DEFAULT_SETTINGS;

  async onload() {
    await this.loadSettings();
    console.log("Canvas2Anki loaded");
  }

  onunload() {
    console.log("Canvas2Anki unloaded");
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}
