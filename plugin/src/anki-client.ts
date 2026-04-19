import { requestUrl } from "obsidian";
import { ANKI_CONNECT_URL, ANKI_CONNECT_VERSION } from "./models";

export class AnkiClient {
  private url: string;

  constructor(url = ANKI_CONNECT_URL) {
    this.url = url;
  }

  private async request(action: string, params: Record<string, any> = {}): Promise<any> {
    const payload = { action, version: ANKI_CONNECT_VERSION, params };
    let resp;
    try {
      resp = await requestUrl({
        url: this.url,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (e) {
      throw new Error("无法连接 AnkiConnect。请确认 Anki 已打开且 AnkiConnect 插件已安装。");
    }
    const body = resp.json;
    if (body.error) throw new Error(`AnkiConnect: ${body.error}`);
    return body.result;
  }

  async version(): Promise<number> {
    return this.request("version");
  }

  async createDeck(deck: string): Promise<number> {
    return this.request("createDeck", { deck });
  }

  async addNote(
    deck: string,
    model: string,
    fields: Record<string, string>,
    tags: string[] = []
  ): Promise<number> {
    return this.request("addNote", {
      note: {
        deckName: deck,
        modelName: model,
        fields,
        tags,
        options: { allowDuplicate: false },
      },
    });
  }

  async updateNoteFields(noteId: number, fields: Record<string, string>): Promise<void> {
    await this.request("updateNoteFields", { note: { id: noteId, fields } });
  }

  async deleteNotes(noteIds: number[]): Promise<void> {
    await this.request("deleteNotes", { notes: noteIds });
  }

  async storeMediaFile(filename: string, dataBase64: string): Promise<string> {
    return this.request("storeMediaFile", { filename, data: dataBase64 });
  }
}
