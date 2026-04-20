import { Card, CARD_META_RE, CARD_META_GLOBAL_RE, DEFAULT_DECK } from "./models";

// ── types for raw Canvas JSON ──────────────────────────────────────────────
interface RawNode {
  id: string;
  type: "text" | "file" | "group" | string;
  text?: string;
  file?: string;
  label?: string;
  color?: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface RawEdge {
  id: string;
  fromNode: string;
  toNode: string;
}

interface CanvasData {
  nodes: RawNode[];
  edges: RawEdge[];
}

// ── public result type ─────────────────────────────────────────────────────
export interface ParseResult {
  cards: Card[];
  warnings: string[];
  deletions: Card[];
}

// ── helpers ────────────────────────────────────────────────────────────────

/**
 * Split text on the FIRST bare `---` separator (not inside a code fence).
 * Returns [front, back] or null if no bare separator exists.
 */
export function splitQA(text: string): [string, string] | null {
  const lines = text.split("\n");
  let inFence = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trimEnd().match(/^```/)) {
      inFence = !inFence;
    }
    if (!inFence && line.trim() === "---") {
      const front = lines.slice(0, i).join("\n");
      const back = lines.slice(i + 1).join("\n");
      return [front, back];
    }
  }
  return null;
}

/** Parse `<!--card:{JSON}-->` and return the id field, or null. */
export function extractMeta(text: string): number | null {
  const m = CARD_META_RE.exec(text);
  if (!m) return null;
  try {
    const obj = JSON.parse(m[1]);
    return typeof obj.id === "number" ? obj.id : null;
  } catch {
    return null;
  }
}

/** Remove all `<!--card:...-->` occurrences from text. */
export function stripMeta(text: string): string {
  return text.replace(CARD_META_GLOBAL_RE, "").trim();
}

/** Extract #hashtags (ASCII + CJK), return tags array and cleaned text. */
export function extractTags(text: string): { tags: string[]; text: string } {
  const TAG_RE = /#([\w\u4e00-\u9fff]+)/g;
  const tags: string[] = [];
  const cleaned = text.replace(TAG_RE, (_match, tag) => {
    tags.push(tag);
    return "";
  }).replace(/\s{2,}/g, " ").trim();
  return { tags, text: cleaned };
}

/** Build the append string for a linked target node. */
export function appendTarget(node: RawNode): string {
  if (node.type === "file" && node.file) {
    const lower = node.file.toLowerCase();
    const isMedia = /\.(png|jpg|jpeg|gif|svg|webp|mp4|pdf)$/.test(lower);
    return isMedia ? `![[${node.file}]]` : `[[${node.file}]]`;
  }
  if (node.type === "text" && node.text) {
    return stripMeta(node.text);
  }
  return "";
}

/** Return the label of the smallest group that contains (cx, cy), or null. */
export function findDeck(
  cx: number,
  cy: number,
  groups: RawNode[]
): string | null {
  let best: RawNode | null = null;
  let bestArea = Infinity;
  for (const g of groups) {
    if (
      cx >= g.x &&
      cx <= g.x + g.width &&
      cy >= g.y &&
      cy <= g.y + g.height
    ) {
      const area = g.width * g.height;
      if (area < bestArea) {
        bestArea = area;
        best = g;
      }
    }
  }
  return best?.label ?? null;
}

// ── main export ────────────────────────────────────────────────────────────

export function parseCanvas(json: string, exportColor: string, deleteGroupLabel: string): ParseResult {
  const data: CanvasData = JSON.parse(json);
  const nodes: RawNode[] = data.nodes ?? [];
  const edges: RawEdge[] = data.edges ?? [];

  const cards: Card[] = [];
  const warnings: string[] = [];
  const deletions: Card[] = [];

  // Build lookup maps
  const nodeById = new Map<string, RawNode>(nodes.map((n) => [n.id, n]));
  const groups = nodes.filter((n) => n.type === "group");

  // Identify DELETE group (by label match)
  const deleteGroups = groups.filter(
    (g) => g.label?.trim() === deleteGroupLabel.trim()
  );

  /** Returns true if node center is inside any DELETE group */
  function isInDeleteGroup(node: RawNode): boolean {
    const cx = node.x + node.width / 2;
    const cy = node.y + node.height / 2;
    return deleteGroups.some(
      (g) => cx >= g.x && cx <= g.x + g.width && cy >= g.y && cy <= g.y + g.height
    );
  }

  // Outgoing edges per node
  const edgesFrom = new Map<string, string[]>();
  for (const e of edges) {
    if (!edgesFrom.has(e.fromNode)) edgesFrom.set(e.fromNode, []);
    edgesFrom.get(e.fromNode)!.push(e.toNode);
  }

  for (const node of nodes) {
    if (node.type !== "text" || !node.text) continue;

    const rawText = node.text;
    const ankiId = extractMeta(rawText);

    // DELETE group branch: color-independent, only checks ankiId
    if (isInDeleteGroup(node)) {
      if (ankiId !== null) {
        deletions.push({
          nodeId: node.id,
          front: "",
          back: "",
          deck: DEFAULT_DECK,
          tags: [],
          ankiId,
        });
      } else {
        warnings.push(`Node ${node.id}: in DELETE group but has no ankiId — skipped`);
      }
      continue;
    }

    // Normal export branch: color must match
    const isMatch = node.color === exportColor;
    if (!isMatch) continue;

    // Matching node — must have a QA separator
    const clean = stripMeta(rawText);
    const split = splitQA(clean);
    if (!split) {
      warnings.push(`Node ${node.id}: no Q/A separator found`);
      continue;
    }

    let [rawFront, rawBack] = split;

    // Append edge targets to back, sorted by y position
    const targetIds = edgesFrom.get(node.id) ?? [];
    const targets = targetIds
      .map((id) => nodeById.get(id))
      .filter((n): n is RawNode => !!n)
      .sort((a, b) => a.y - b.y);

    for (const t of targets) {
      const appended = appendTarget(t);
      if (appended) rawBack = rawBack + "\n" + appended;
    }

    // Extract tags from front and back
    const frontResult = extractTags(rawFront.trim());
    const backResult = extractTags(rawBack.trim());
    const tags = [...new Set([...frontResult.tags, ...backResult.tags])];

    // Determine deck via group containment (center point of node)
    const cx = node.x + node.width / 2;
    const cy = node.y + node.height / 2;
    const deck = findDeck(cx, cy, groups) ?? DEFAULT_DECK;

    cards.push({
      nodeId: node.id,
      front: frontResult.text,
      back: backResult.text,
      deck,
      tags,
      ankiId,
    });
  }

  return { cards, warnings, deletions };
}
