import type { Context, Effect, Outcome } from "../../src/interpret.ts";
import assert from "node:assert/strict";
import { interpret } from "../../src/interpret.ts";
import { it } from "node:test";

const CONTEXT: Context = {
    columns: 60,
    current: { cmd: "bd whoami --verbose", id: "whoami" },
    details: [
      {
        ask: "Chez Kereis depuis 2026 : preuves de concept IA, serveurs MCP.",
        id: "m-kereis",
        label: "Kereis",
      },
    ],
    feedback: {},
    jokeIndex: 0,
    jokes: ["une blague", "une autre"],
    mascot: "here",
    model: false,
    sections: [
      {
        ask: "Benjamin David, développeur IA et full stack à Nantes.",
        id: "whoami",
        label: "whoami",
      },
      { ask: "Vue, React, NestJS, PostgreSQL, accessibilité RGAA.", id: "stack", label: "stack" },
    ],
    share: {},
    shareTargets: [],
    themes: ["dark", "light", "noctis"],
  },
  // Le meme contexte, avec un modele local disponible : la recherche lui laisse choisir.
  AVEC_MODELE: Context = { ...CONTEXT, model: true },
  texts = (result: Outcome) => result.lines.map((line) => line.t),
  // Ce qu'une commande met dans le resultat, la ou le journal ne recoit que l'echo.
  resultTexts = (result: Outcome) => (result.result ?? []).map((line) => line.t ?? ""),
  kinds = (result: Outcome) => result.effects.map((effect) => effect.type),
  // Retrouver un effet par son genre, en gardant le type precis que l'union lui donne.
  effectOf = <K extends Effect["type"]>(result: Outcome, kind: K) =>
    result.effects.find((entry): entry is Extract<Effect, { type: K }> => entry.type === kind);

it("should produce nothing on an empty input", () => {
  for (const empty of ["", "   ", "\t"]) {
    assert.deepEqual(interpret(empty, CONTEXT), { effects: [], lines: [] });
  }
});

it("should echo the typed line", () => {
  const result = interpret("ls", CONTEXT);

  assert.equal(result.lines[0]?.t, "ls");
  assert.equal(result.lines[0]?.m, "›");
});

it("should normalize repeated spaces", () => {
  const spaced = interpret("cd    stack", CONTEXT),
    single = interpret("cd stack", CONTEXT);

  assert.deepEqual(texts(spaced), texts(single));
  assert.deepEqual(kinds(spaced), kinds(single));
});

// L'écho reprend la ligne telle qu'elle a été tapée, préfixe compris : seule la sortie
// doit être identique.
it("should accept the slash and the colon prefixes", () => {
  for (const prefix of ["/", ":", "//"]) {
    const prefixed = interpret(`${prefix}sudo`, CONTEXT);

    assert.equal(prefixed.lines[0]?.t, `${prefix}sudo`);
    assert.deepEqual(texts(prefixed).slice(1), texts(interpret("/sudo", CONTEXT)).slice(1));
  }
});

it("should track every command", () => {
  const effect = effectOf(interpret("/sudo", CONTEXT), "track");

  assert.equal(effect?.event, "commande");
  assert.deepEqual(effect?.props, { cmd: "sudo" });
});

it("should list the sections then the missions with ls", () => {
  const result = interpret("ls", CONTEXT);

  assert.equal(result.lines[1]?.t, "whoami   stack");
  assert.equal(result.lines[2]?.t, "m-kereis");
});

// La reponse de help ne tient pas dans le journal d'un ecran large : elle reclame le
// resultat, et le journal ne garde que l'echo de la commande.
it("should list the commands and recall the keyboard in the result of help", () => {
  const result = interpret("help", CONTEXT),
    body = resultTexts(result).join("\n");

  assert.match(body, /ls · cd <section>/);
  assert.match(body, /Clavier/);
  assert.deepEqual(texts(result), ["help"]);
  assert.ok(result.effects.some((effect) => effect.type === "say"));
});

it("should leave the result to the section on an ordinary command", () => {
  assert.equal(interpret("ls", CONTEXT).result, undefined);
});

it("should treat aide and the question mark as aliases of help", () => {
  for (const alias of ["aide", "?"]) {
    assert.deepEqual(
      resultTexts(interpret(alias, CONTEXT)),
      resultTexts(interpret("help", CONTEXT)),
    );
  }
});

it("should navigate to a section named alone", () => {
  const result = interpret("stack", CONTEXT);

  assert.ok(result.effects.some((effect) => effect.type === "navigate" && effect.id === "stack"));
  assert.match(result.lines[1]?.t ?? "", /section « stack » chargée/);
});

it("should navigate with cd, and with its aliases open and bd", () => {
  for (const verb of ["cd", "open", "bd"]) {
    const result = interpret(`${verb} stack`, CONTEXT);

    assert.ok(
      result.effects.some((effect) => effect.type === "navigate" && effect.id === "stack"),
      `${verb} must navigate`,
    );
  }
});

// Retaper la commande de la section en cours la rejoue, plutôt que de l'empiler.
it("should replay the section when its command is typed again", () => {
  const result = interpret("bd whoami --verbose", CONTEXT);

  assert.deepEqual(kinds(result), ["track", "replay"]);
  assert.deepEqual(result.lines, []);
});

it("should empty the log without showing anything", () => {
  const result = interpret("clear", CONTEXT);

  assert.ok(result.effects.some((effect) => effect.type === "clear"));
  assert.deepEqual(result.lines, []);
});

it("should refuse and say so on sudo", () => {
  const result = interpret("/sudo", CONTEXT);

  assert.match(result.lines[1]?.t ?? "", /sudoers/);
  assert.equal(result.lines[1]?.m, "✗");
});

it("should answer 418 on coffee", () => {
  assert.equal(interpret("/coffee", CONTEXT).lines[1]?.m, "418");
});

it("should trap vim, nano and emacs the same way", () => {
  for (const editor of ["/vim", "/nano", "/emacs"]) {
    assert.match(interpret(editor, CONTEXT).lines[1]?.t ?? "", /:q!/);
  }
});

it("should put the mascot to sleep on sleep", () => {
  const result = interpret("sleep", CONTEXT);

  assert.ok(
    result.effects.some((effect) => effect.type === "say" && effect.expression === "sleep"),
  );
});

it("should introduce Benjamin and give his address", () => {
  const result = interpret("/benjamin", CONTEXT);

  assert.match(texts(result).join("\n"), /benjamin\.david1@hotmail\.fr/);
  assert.ok(
    result.effects.some((effect) => effect.type === "track" && effect.event === "easter_egg"),
  );
});

it("should treat brezinben as an alias of benjamin", () => {
  assert.deepEqual(
    texts(interpret("/brezinben", CONTEXT)).slice(1),
    texts(interpret("/benjamin", CONTEXT)).slice(1),
  );
});

// La blague est tiree au hasard, mais jamais deux fois la meme d'affilee.
it("should draw a joke different from the previous one", () => {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const result = interpret("/joke", { ...CONTEXT, jokeIndex: 0 }),
      patch = effectOf(result, "state"),
      index = Number(patch?.patch["jokeIndex"]);

    assert.notEqual(index, 0, "the current joke does not repeat");
    assert.equal(result.lines[1]?.t, CONTEXT.jokes[index]);
  }
});

// Un easter egg sans slash n'est pas une commande de terminal.
it("should not recognize an easter egg typed without its slash", () => {
  const result = interpret("joke", CONTEXT);

  assert.match(result.lines[1]?.t ?? "", /commande introuvable : joke/u);
  assert.match(result.lines[1]?.t ?? "", /essayez \/joke/u);
});

it("should accept the real commands without a slash", () => {
  for (const command of ["help", "ls", "clear"]) {
    assert.ok(
      !interpret(command, CONTEXT).lines.some((entry) => /introuvable/u.test(entry.t)),
      `${command} must stay a command`,
    );
  }
});

it("should say so and track an unknown command", () => {
  const result = interpret("xyzzy", CONTEXT);

  assert.match(result.lines[1]?.t ?? "", /commande introuvable : xyzzy/);
  assert.ok(
    result.effects.some(
      (effect) => effect.type === "track" && effect.event === "commande_inconnue",
    ),
  );
});

it("should ignore the case of the command", () => {
  assert.deepEqual(
    texts(interpret("/SUDO", CONTEXT)).slice(1),
    texts(interpret("/sudo", CONTEXT)).slice(1),
  );
});

// L'interpréteur ne doit toucher à rien : ni DOM, ni réseau, ni minuteur.
it("should stay synchronous and free of side effects", () => {
  const before = JSON.stringify(CONTEXT);

  for (const command of ["ls", "help", "joke", "cd stack", "xyzzy", "shutdown", "matrix"]) {
    const result = interpret(command, CONTEXT);

    assert.ok(Array.isArray(result.lines));
    assert.ok(Array.isArray(result.effects));
  }

  assert.equal(JSON.stringify(CONTEXT), before, "the context must not be mutated");
});

// Chaque expression proposée doit jouer sa propre feuille. Une commande qui annonce quelque
// chose et ne le fait pas est pire que son absence.
it("should give each offered expression its own state", () => {
  for (const expression of ["alert", "happy", "laugh", "sad", "scared", "sleep"]) {
    const result = interpret(`/slime ${expression}`, CONTEXT),
      emote = effectOf(result, "emote");

    assert.equal(emote?.expression, expression, `${expression} must emit its own expression`);
  }
});

// « idle » reste dans le type, « say » s'en sert. La commande, elle, ne le propose plus :
// il ne montrait rien.
it("should no longer offer idle as an expression of slime", () => {
  const result = interpret("/slime idle", CONTEXT);

  assert.equal(effectOf(result, "emote"), undefined);
  // La première ligne est l'écho de la saisie : elle porte « idle » quoi qu'il arrive.
  assert.ok(
    texts(result)
      .slice(1)
      .some((text) => text.includes("/slime expression <nom>")),
  );
  assert.ok(
    !texts(result)
      .slice(1)
      .some((text) => text.includes("idle")),
  );
});

it("should blow the mascot up on slime kill", () => {
  assert.ok(kinds(interpret("/slime kill", CONTEXT)).includes("blowUp"));
});

it("should drop the mascot on slime drop", () => {
  assert.ok(kinds(interpret("/slime drop", CONTEXT)).includes("drop"));
});

it("should play the named activity on slime activity", () => {
  const activity = effectOf(interpret("/slime activity bike", CONTEXT), "activity");

  assert.equal(activity?.name, "bike");
});

// Une activité demande un accessoire : elle ne se tire jamais au hasard, et un nom inconnu
// rend la liste plutôt qu'une animation prise au hasard.
it("should list the activities when slime activity gets no known name", () => {
  const result = interpret("/slime activity xyzzy", CONTEXT);

  assert.equal(effectOf(result, "activity"), undefined);
  assert.ok(texts(result).some((text) => text.includes("slime activity <nom>")));
});

// Quatre alias sur dix-huit seulement sont proposés par l'autocomplétion. Les autres ne
// tomberaient sous aucun test : cette table est leur seule protection.
it("should make each alias behave like its command", () => {
  const pairs: [string, string][] = [
    ["?", "help"],
    ["aide", "help"],
    ["/brezinben", "/benjamin"],
    ["/cat", "/slime"],
    ["cls", "clear"],
    ["copy", "email"],
    ["dir", "ls"],
    ["/emacs", "/vim"],
    ["exit", "shutdown"],
    ["/feedback", "/propose"],
    ["/idee", "/propose"],
    ["ask✨ où", "ask où"],
    ["/mascotte", "/slime"],
    ["/nano", "/vim"],
    ["partager", "share"],
    ["poweroff", "shutdown"],
    ["restart", "reboot"],
    ["resume", "cv"],
    ["sendmail", "send-mail"],
    ["set", "options"],
    ["write", "send-mail"],
  ];

  for (const [alias, command] of pairs) {
    assert.deepEqual(
      texts(interpret(alias, CONTEXT)).slice(1),
      texts(interpret(command, CONTEXT)).slice(1),
      `${alias} must say what ${command} says`,
    );
    assert.deepEqual(
      kinds(interpret(alias, CONTEXT)),
      kinds(interpret(command, CONTEXT)),
      `${alias} must do what ${command} does`,
    );
  }
});

// Ces commandes n'ont pas encore de partie pure. Le descripteur est tout ce qu'elles
// rendent, et le ticket qui les finira doit savoir lequel il reprend.
it("should return its own descriptor for each delegated command", () => {
  const expected: [string, Effect["type"]][] = [
    ["email", "email"],
    ["options", "options"],
    ["send-mail", "sendMail"],
  ];

  for (const [command, kind] of expected) {
    assert.ok(kinds(interpret(command, CONTEXT)).includes(kind), `${command} must return ${kind}`);
  }
});

it("should answer with a passage of the corpus, never with generated text", () => {
  const result = interpret("ask accessibilité RGAA", CONTEXT);

  assert.ok(texts(result).includes("stack"), "ask must name the source of its answer");
  assert.ok(
    texts(result).some((t) => t.includes("accessibilité RGAA")),
    "the answer is the text of the corpus",
  );
});

// Sans modele, la reponse part telle quelle : aucun descripteur, personne pour le lire.
it("should answer alone and describe no candidate when ask runs without a model", () => {
  const result = interpret("ask nantes développeur", CONTEXT);

  assert.equal(effectOf(result, "ask"), undefined);
  assert.ok(texts(result).some((t) => t.includes("Nantes")));
});

// Le modele voit tous les passages, pas seulement ceux qui partagent un mot avec la
// question. Ne lui donner que les trouvailles lexicales le reduirait a les reclasser.
it("should submit every passage to the model when ask runs with one", () => {
  const descripteur = effectOf(interpret("ask nantes développeur", AVEC_MODELE), "ask");

  assert.equal(descripteur?.query, "nantes développeur");
  assert.deepEqual(descripteur?.candidates, ["whoami", "stack", "m-kereis"]);
});

// La reponse attend le modele, mais elle voyage avec le descripteur : elle sort si le
// modele echoue, et la coquille n'a pas a la reconstruire.
it("should keep the corpus answer waiting in the descriptor when ask runs with a model", () => {
  const result = interpret("ask nantes développeur", AVEC_MODELE),
    descripteur = effectOf(result, "ask");

  assert.deepEqual(texts(result), ["ask nantes développeur"], "nothing is shown yet");
  assert.ok(
    (descripteur?.lexical ?? []).some((entry) => entry.t.includes("Nantes")),
    "the lexical answer waits in reserve",
  );
});

// Le recouvrement de mots ne trouve rien des que la question est tournee autrement. C'est
// le cas ou un modele sert le plus : il doit etre consulte, pas court-circuite.
it("should consult the model even without a lexical match", () => {
  const descripteur = effectOf(interpret("ask zzzzz", AVEC_MODELE), "ask");

  assert.deepEqual(descripteur?.candidates, ["whoami", "stack", "m-kereis"]);
  assert.ok(
    (descripteur?.lexical ?? []).some((entry) => entry.t.includes("rien ne répond")),
    "the refusal waits in reserve, in case the model finds nothing either",
  );
});

it("should say so and offer no candidate when ask finds no answer without a model", () => {
  const result = interpret("ask zzzzz", CONTEXT);

  assert.ok(texts(result).some((t) => t.includes("rien ne répond")));
  assert.equal(effectOf(result, "ask"), undefined);
});

it("should recall its usage when ask gets no question", () => {
  assert.ok(texts(interpret("ask", CONTEXT)).some((t) => t.startsWith("ask —")));
});

// Les deux modes partagent une branche. Sans ce test, corriger le texte de l'un
// emporterait le mode de l'autre en silence.
it("should return its own mode for shutdown and for reboot", () => {
  assert.equal(effectOf(interpret("shutdown", CONTEXT), "power")?.mode, "shutdown");
  assert.equal(effectOf(interpret("reboot", CONTEXT), "power")?.mode, "reboot");
});

it("should wake Neo up and scare the mascot on matrix", () => {
  const result = interpret("/matrix", CONTEXT);

  assert.match(result.lines[1]?.t ?? "", /Néo/u);
  assert.equal(effectOf(result, "emote")?.expression, "scared");
});

// Un easter egg annoncé sans son slash est refusé quand on le recopie. L'aide est le
// premier endroit où l'on cherche : elle ne doit pas envoyer dans le mur.
it("should never announce an easter egg without its slash in the help", () => {
  const result = interpret("help", CONTEXT),
    // La bulle de la mascotte est un texte d'aide de plus : elle nomme une commande.
    body = [...resultTexts(result), effectOf(result, "say")?.text ?? ""].join(" ");

  for (const egg of ["cowsay", "joke", "matrix", "propose", "slime"]) {
    assert.ok(body.includes(`/${egg}`), `help must write /${egg}`);
    assert.doesNotMatch(body, new RegExp(`(?<!/)\\b${egg}\\b`, "u"), `${egg} without its slash`);
  }
});

it("should carry in the slime usage the slash that it demands", () => {
  for (const command of ["/slime", "/slime nawak", "/slime activity"]) {
    for (const text of texts(interpret(command, CONTEXT)).slice(1)) {
      assert.match(text, /^\/slime /u, `${text} must start with /slime`);
    }
  }
});

it("should carry in the propose usage the slash that it demands", () => {
  assert.match(texts(interpret("/propose", CONTEXT))[1] ?? "", /^\/propose \[-y\] <idée>/u);
});

// Le test de section passait avant presque toutes les branches, sans regarder le verbe :
// n'importe quel mot suivi d'un identifiant y menait.
it("should navigate to the argument only with cd, bd and open", () => {
  for (const verb of ["bd", "cd", "open"]) {
    assert.equal(effectOf(interpret(`${verb} stack`, CONTEXT), "navigate")?.id, "stack", verb);
  }

  for (const other of ["xyzzy stack", "/sudo stack", "share stack", "clear stack"]) {
    assert.equal(effectOf(interpret(other, CONTEXT), "navigate"), undefined, other);
  }
});

it("should still navigate on a section or a mission name alone", () => {
  assert.equal(effectOf(interpret("stack", CONTEXT), "navigate")?.id, "stack");
  assert.equal(effectOf(interpret("m-kereis", CONTEXT), "navigate")?.id, "m-kereis");
});

it("should keep its text when an easter egg is followed by a section name", () => {
  assert.match(texts(interpret("/sudo stack", CONTEXT))[1] ?? "", /sudoers/u);
});

it("should still empty the log when clear is followed by a section name", () => {
  assert.ok(kinds(interpret("clear stack", CONTEXT)).includes("clear"));
});

// Huit thèmes, donc moins de dix : la commande les liste plutôt que de renvoyer à Tab.
it("should list the themes when theme gets no name", () => {
  const result = interpret("theme", CONTEXT);

  assert.match(texts(result)[1] ?? "", /^theme <nom> — dark · light · noctis$/u);
  assert.equal(effectOf(result, "theme"), undefined);
});

it("should apply the named theme", () => {
  assert.equal(effectOf(interpret("theme noctis", CONTEXT), "theme")?.name, "noctis");
});

it("should say so and recall the list on an unknown theme", () => {
  const result = interpret("theme xyzzy", CONTEXT);

  assert.equal(effectOf(result, "theme"), undefined);
  assert.match(texts(result)[1] ?? "", /thème inconnu : xyzzy/u);
  assert.ok(texts(result).some((text) => text.includes("theme <nom>")));
});

// « ai » et « ask » n'ont pas encore de partie pure. Les annoncer promet un résultat
// qui ne vient pas : leur code reste, leur annonce part.
it("should no longer announce the commands without a result in the help", () => {
  const shown = texts(interpret("help", CONTEXT)).slice(1).join(" ");

  assert.doesNotMatch(shown, /\bask\b/u);
  assert.doesNotMatch(shown, /\bai\b/u);
});

// Il n'y a pas de PDF à servir. La commande ouvre la version texte, qui porte le parcours
// complet, et le dit : une navigation muette se lit comme une commande cassée.
it("should announce what it does instead of staying silent on cv", () => {
  const result = interpret("cv", CONTEXT);

  assert.ok(kinds(result).includes("cv"));
  assert.match(texts(result)[1] ?? "", /version texte/u);
});

// « cd » est une commande, et l'aide l'annonce. Répondre « commande introuvable » à
// « cd » nu envoie chercher une faute là où il manque seulement un argument.
it("should explain what each navigation verb expects", () => {
  for (const verb of ["bd", "cd", "open"]) {
    const result = interpret(verb, CONTEXT);

    assert.doesNotMatch(texts(result).join(" "), /introuvable/u, verb);
    assert.ok(
      texts(result).some((text) => text.includes(`${verb} <section>`)),
      verb,
    );
    assert.ok(
      texts(result).some((text) => text.includes("whoami")),
      verb,
    );
  }
});

it("should say so and recall the sections on an unknown section", () => {
  const result = interpret("cd xyzzy", CONTEXT);

  assert.match(texts(result)[1] ?? "", /section inconnue : xyzzy/u);
  assert.ok(texts(result).some((text) => text.includes("whoami")));
});

it("should recall the targets on an unknown share target", () => {
  const result = interpret("share xyzzy", { ...CONTEXT, shareTargets: ["linkedin"] });

  assert.match(texts(result)[1] ?? "", /cible inconnue : xyzzy/u);
  assert.ok(texts(result).some((text) => text.includes("share <cible>")));
});

// À dix valeurs, la ligne déborde du volet : la complétion les montre mieux, et l'aide
// apprend la touche plutôt que de recopier une liste illisible.
const many = (count: number) =>
  Array.from({ length: count }, (_, index) => ({ id: `s-${index}`, label: `s-${index}` }));

it("should point to the tab key from ten values on", () => {
  const listed = interpret("cd", { ...CONTEXT, details: [], sections: many(9) }),
    deferred = interpret("cd", { ...CONTEXT, details: [], sections: many(10) });

  assert.match(texts(listed)[1] ?? "", /s-0 · s-1/u);
  assert.match(texts(deferred)[1] ?? "", /Tab propose les 10 valeurs/u);
});

// « expression » descend d'un niveau : il devient une sous-commande de slime, symétrique de
// « activity ». L'ancien alias « /expression » ne répond plus.
it("should play the named expression on slime expression", () => {
  assert.equal(
    effectOf(interpret("/slime expression happy", CONTEXT), "emote")?.expression,
    "happy",
  );
});

it("should list the expressions when slime expression gets no known expression", () => {
  for (const command of ["/slime expression", "/slime expression xyzzy"]) {
    const result = interpret(command, CONTEXT);

    assert.equal(effectOf(result, "emote"), undefined, command);
    assert.ok(
      texts(result).some((text) => text.includes("/slime expression <nom>")),
      command,
    );
  }
});

it("should no longer accept expression as a command of its own", () => {
  assert.match(
    texts(interpret("/expression happy", CONTEXT))[1] ?? "",
    /commande introuvable : expression/u,
  );
});

it("should no longer say that reboot shuts down", () => {
  assert.match(texts(interpret("reboot", CONTEXT))[1] ?? "", /Redémarrage/u);
  assert.match(texts(interpret("shutdown", CONTEXT))[1] ?? "", /Extinction/u);
});

// « jump » était un second nom pour « drop » : la feuille de saut n'a jamais été jouée
// par une commande.
it("should no longer accept slime jump as a second name for drop", () => {
  const result = interpret("/slime jump", CONTEXT);

  assert.equal(effectOf(result, "drop"), undefined);
  assert.ok(texts(result).some((text) => text.includes("/slime drop")));
});

it("should emit its expression and the glitch on matrix", () => {
  assert.deepEqual(kinds(interpret("/matrix", CONTEXT)), ["track", "track", "emote", "glitch"]);
});

// Le journal ne doit pas annoncer un geste que la coquille avale. La mascotte est absente
// pendant son explosion et pendant son voyage en train.
it("should refuse the command instead of lying when the mascot is away", () => {
  const away = { ...CONTEXT, mascot: "away" } as const;

  for (const command of [
    "/slime kill",
    "/slime drop",
    "/slime expression happy",
    "/slime evolve",
  ]) {
    const result = interpret(command, away);

    assert.match(texts(result)[1] ?? "", /le slime n'est pas la/u, command);
    assert.equal(effectOf(result, "emote"), undefined, command);
    assert.equal(effectOf(result, "blowUp"), undefined, command);
    assert.equal(effectOf(result, "drop"), undefined, command);
  }
});

// Le but se jouait sur l'aide : la coquille en deduisait « easter egg trouve, rien ne
// bouge ». Une commande qui liste son usage le dit maintenant.
it("should flag a slime usage listing as such", () => {
  for (const command of ["/slime", "/slime bogus", "/slime expression", "/slime activity"]) {
    assert.ok(effectOf(interpret(command, CONTEXT), "usage"), command);
  }

  assert.equal(effectOf(interpret("/slime kill", CONTEXT), "usage"), undefined);
  assert.equal(effectOf(interpret("/slime evolve", CONTEXT), "usage"), undefined);
  assert.equal(effectOf(interpret("/coffee", CONTEXT), "usage"), undefined);
});

// La chaine des formes. La coquille pose l'effet, l'interpreteur ne connait ni la forme
// courante ni la suivante : il ne dit que « change de forme ».
it("should ask for the form change on slime evolve", () => {
  const result = interpret("/slime evolve", CONTEXT);

  assert.ok(effectOf(result, "evolve"), "the effect is missing");
  assert.match(texts(result)[1] ?? "", /change de forme/u);
});

// Endormie n'est ni absente ni occupee : la mascotte est la, et elle le reste. Le refus
// nomme la cause et la sortie, comme les autres refus du mode hors ligne.
it("should sleep the mascot and refuse the command without a network", () => {
  const asleep = { ...CONTEXT, mascot: "asleep" } as const;

  for (const command of [
    "/slime kill",
    "/slime drop",
    "/slime evolve",
    "/slime expression happy",
    "/slime activity bike",
  ]) {
    const result = interpret(command, asleep);

    assert.match(texts(result)[1] ?? "", /dort tant que le réseau est coupé/u, command);
    assert.match(texts(result)[2] ?? "", /retour du réseau/u, command);
    assert.ok(effectOf(result, "usage"), command);

    for (const swallowed of ["blowUp", "drop", "evolve", "emote", "activity"] as const) {
      assert.equal(effectOf(result, swallowed), undefined, `${command} / ${swallowed}`);
    }
  }
});

// Occupee n'est pas absente : la mascotte est la, elle finit sa transformation. Le journal
// doit le dire, et non annoncer un geste que la coquille avale.
it("should refuse the command without lying during a form change", () => {
  const busy = { ...CONTEXT, mascot: "busy" } as const;

  for (const command of ["/slime evolve", "/slime kill", "/slime expression happy"]) {
    const result = interpret(command, busy);

    assert.match(texts(result)[1] ?? "", /change de forme/u, command);
    assert.ok(effectOf(result, "usage"), command);
    assert.equal(effectOf(result, "evolve"), undefined, command);
    assert.equal(effectOf(result, "blowUp"), undefined, command);
  }
});
