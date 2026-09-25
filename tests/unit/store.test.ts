import { addMark, readMarks } from "../../src/terminal/achievements/store.ts";
import { beforeEach, it } from "node:test";
import assert from "node:assert/strict";

// Bun ne fournit pas de stockage local. Ce faux stockage en a le contrat, et rien d'autre.
const saved = new Map<string, string>();

globalThis.localStorage = {
  clear: () => {
    saved.clear();
  },
  // Le contrat de Storage rend « null » pour une clé absente.
  getItem: (key) => {
    // oxlint-disable-next-line unicorn/no-null
    return saved.get(key) ?? null;
  },
  key: (index) => {
    // oxlint-disable-next-line unicorn/no-null
    return [...saved.keys()][index] ?? null;
  },
  get length() {
    return saved.size;
  },
  removeItem: (key) => {
    saved.delete(key);
  },
  setItem: (key, value) => {
    saved.set(key, value);
  },
};

beforeEach(() => {
  saved.clear();
});

// Deux onglets débloquent le même succès : le succès ne compte qu'une fois.
it("should keep a mark once when it is added twice", () => {
  addMark("first-command");
  addMark("first-command");

  assert.deepEqual(readMarks(), ["first-command"]);
});
