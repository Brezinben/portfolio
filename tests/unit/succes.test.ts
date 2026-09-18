// Le catalogue des succès, et ce qui le tient honnête : une clé stable, une icône dessinée,
// et un déclencheur que le répartiteur accepte vraiment.

import {
  ACHIEVEMENTS,
  type Context,
  SEEN_MARK,
  interpret,
  keepKnown,
  seenCount,
  unlockedBy,
  wonCount,
} from "../../src/interpret.ts";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { it } from "node:test";
import { readFileSync } from "node:fs";

const read = (name: string) =>
    readFileSync(fileURLToPath(new URL(`../../src/${name}`, import.meta.url)), "utf8"),
  sprite = read("assets/succes.svg"),
  texte = read("texte.html"),
  settings = read("terminal/settings.ts"),
  CONTEXT: Context = {
    columns: 60,
    current: { cmd: "bd whoami", id: "whoami" },
    details: [],
    feedback: {},
    jokeIndex: 0,
    jokes: ["une blague", "une autre"],
    mascot: "here",
    model: false,
    sections: [{ ask: "Benjamin David.", id: "whoami", label: "whoami" }],
    share: {},
    shareTargets: [],
    themes: ["dark"],
  },
  // Ce que la coquille lit dans les effets pour savoir ce qu'une ligne tapée débloque.
  keyOf = (typed: string) => {
    const effect = interpret(typed, CONTEXT).effects.find(
      (entry) => entry.type === "track" && entry.event === "commande",
    );

    return effect?.type === "track" ? unlockedBy(String(effect.props["cmd"])) : undefined;
  };

// Deux succes qui partagent une cle n'en font qu'un : le second ne se debloque jamais, et
// rien d'autre ne le signale.
it("should give every achievement its own key", () => {
  assert.equal(new Set(ACHIEVEMENTS.map((entry) => entry.key)).size, ACHIEVEMENTS.length);
});

// Une icône manquante laisse un trou dans la liste, que rien d'autre ne signale : le
// « use » d'un symbole absent ne dessine rien et ne lève rien.
it("should draw every icon the catalogue names", () => {
  for (const { icon, key } of ACHIEVEMENTS) {
    assert.ok(sprite.includes(`id="i-${icon}"`), `the sprite has no icon for ${key}`);
  }

  for (const icon of ["locked", "trophy"]) {
    assert.ok(sprite.includes(`id="i-${icon}"`), `the sprite has no ${icon}`);
  }
});

// Un déclencheur qui ne correspond à rien laisse un succès inatteignable. Le répartiteur
// tranche, pas le catalogue : le nom canonique sort de lui, alias déjà résolus.
it("should unlock from a command the dispatcher accepts", () => {
  const expected = {
    "/benjamin": "name",
    "/coffee": "coffee",
    "/cowsay salut": "cowsay",
    "/joke": "joke",
    "/propose une idée": "propose",
    "/sudo": "sudo",
    "/vim": "vim",
    clear: "clear",
    cls: "clear",
    copy: "email",
    email: "email",
    help: "help",
    ls: "ls",
    "share lien": "share",
    shutdown: "shutdown",
    sleep: "sleep",
  };

  for (const [typed, key] of Object.entries(expected)) {
    assert.equal(keyOf(typed), key, `typing « ${typed} » should unlock ${key}`);
  }
});

it("should unlock nothing from a command that does not exist", () => {
  assert.equal(keyOf("pipo"), undefined);
});

// Le catalogue bouge, le stockage non. Une clé retirée doit disparaître sans laisser
// d'orphelin, et une valeur inventée ne doit pas entrer dans l'état.
it("should keep only the keys and marks it knows", () => {
  assert.deepEqual(
    keepKnown(["help", "konami", "theme:noctis", "sec:whoami", "act:bike", "seen:3", "theme:", ""]),
    ["help", "theme:noctis", "sec:whoami", "act:bike", "seen:3"],
  );
});

it("should count the won keys apart from the progress marks", () => {
  assert.equal(wonCount(["help", "ls", "theme:dark", "sec:whoami", "seen:2"]), 2);
  assert.equal(wonCount([]), 0);
});

it("should read the seen count, and read zero when the mark is absent", () => {
  assert.equal(seenCount(["help", `${SEEN_MARK}4`]), 4);
  assert.equal(seenCount(["help"]), 0);
});

// La version texte n'a pas de construction : son script est écrit en clair. Sans ce
// croisement, la page écrirait dans une clé que personne ne lit.
it("should make the text version write into the storage the terminal reads", () => {
  const declared = settings.match(/ACHIEVEMENTS_KEY = "(?<key>[^"]+)"/u)?.groups?.["key"] ?? "";

  assert.ok(declared !== "", "settings.ts no longer declares the storage key");
  assert.ok(texte.includes(declared), `texte.html does not write into ${declared}`);
  assert.ok(texte.includes("text-version"), "texte.html does not write its achievement key");
});
