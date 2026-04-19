import { Plugin } from "obsidian";

export default class Canvas2AnkiPlugin extends Plugin {
  async onload() {
    console.log("Canvas2Anki loaded");
  }
  onunload() {
    console.log("Canvas2Anki unloaded");
  }
}
