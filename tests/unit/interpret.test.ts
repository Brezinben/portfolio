import type { Context, Effect, Outcome } from "../../src/interpret.ts";
import assert from "node:assert/strict";
import { interpret } from "../../src/interpret.ts";
import { test } from "node:test";

const CONTEXT: Context = {
    columns: 60,
    current: { cmd: "bd whoami --verbose", id: "whoami" },
    details: [{ id: "m-kereis", label: "Kereis" }],
    feedback: {},
    jokeIndex: 0,
    jokes: ["une blague", "une autre"],
    mascot: "here",
    sections: [
      { id: "whoami", label: "whoami" },
      { id: "stack", label: "stack" },
    ],
    share: {},
    shareTargets: [],
    themes: ["dark", "light", "noctis"],
  },
  texts = (result: Outcome) => result.lines.map((line) => line.t),
  // Ce qu'une commande met dans le resultat, la ou le journal ne recoit que l'echo.
  resultTexts = (result: Outcome) => (result.result ?? []).map((line) => line.t ?? ""),
  kinds = (result: Outcome) => result.effects.map((effect) => effect.type),
  // Retrouver un effet par son genre, en gardant le type precis que l'union lui donne.
  effectOf = <K extends Effect["type"]>(result: Outcome, kind: K) =>
    result.effects.find((entry): entry is Extract<Effect, { type: K }> => entry.type === kind);

test("une entrée vide ne produit rien", () => {
  for (const empty of ["", "   ", "\t"]) {
    assert.deepEqual(interpret(empty, CONTEXT), { effects: [], lines: [] });
  }
});

test("la ligne saisie est renvoyée en écho", () => {
  const result = interpret("ls", CONTEXT);

  assert.equal(result.lines[0]?.t, "ls");
  assert.equal(result.lines[0]?.m, "›");
});

test("les espaces multiples sont normalisés", () => {
  const spaced = interpret("cd    stack", CONTEXT),
    single = interpret("cd stack", CONTEXT);

  assert.deepEqual(texts(spaced), texts(single));
  assert.deepEqual(kinds(spaced), kinds(single));
});

// L'écho reprend la ligne telle qu'elle a été tapée, préfixe compris : seule la sortie
// doit être identique.
test("les préfixes slash et deux-points sont acceptés", () => {
  for (const prefix of ["/", ":", "//"]) {
    const prefixed = interpret(`${prefix}sudo`, CONTEXT);

    assert.equal(prefixed.lines[0]?.t, `${prefix}sudo`);
    assert.deepEqual(texts(prefixed).slice(1), texts(interpret("/sudo", CONTEXT)).slice(1));
  }
});

test("chaque commande est marquée", () => {
  const effect = effectOf(interpret("/sudo", CONTEXT), "track");

  assert.equal(effect?.event, "commande");
  assert.deepEqual(effect?.props, { cmd: "sudo" });
});

test("ls liste les sections puis les fiches", () => {
  const result = interpret("ls", CONTEXT);

  assert.equal(result.lines[1]?.t, "whoami   stack");
  assert.equal(result.lines[2]?.t, "m-kereis");
});

// La reponse de help ne tient pas dans le journal d'un ecran large : elle reclame le
// resultat, et le journal ne garde que l'echo de la commande.
test("help liste les commandes et rappelle le clavier dans le résultat", () => {
  const result = interpret("help", CONTEXT),
    body = resultTexts(result).join("\n");

  assert.match(body, /ls · cd <section>/);
  assert.match(body, /Clavier/);
  assert.deepEqual(texts(result), ["help"]);
  assert.ok(result.effects.some((effect) => effect.type === "say"));
});

test("une commande ordinaire laisse le résultat à la section", () => {
  assert.equal(interpret("ls", CONTEXT).result, undefined);
});

test("aide et point d'interrogation sont des alias de help", () => {
  for (const alias of ["aide", "?"]) {
    assert.deepEqual(
      resultTexts(interpret(alias, CONTEXT)),
      resultTexts(interpret("help", CONTEXT)),
    );
  }
});

test("un nom de section seul y navigue", () => {
  const result = interpret("stack", CONTEXT);

  assert.ok(result.effects.some((effect) => effect.type === "navigate" && effect.id === "stack"));
  assert.match(result.lines[1]?.t ?? "", /section « stack » chargée/);
});

test("cd navigue aussi, et open et bd en sont des alias", () => {
  for (const verb of ["cd", "open", "bd"]) {
    const result = interpret(`${verb} stack`, CONTEXT);

    assert.ok(
      result.effects.some((effect) => effect.type === "navigate" && effect.id === "stack"),
      `${verb} doit naviguer`,
    );
  }
});

// Retaper la commande de la section en cours la rejoue, plutôt que de l'empiler.
test("retaper la commande de la section la rejoue", () => {
  const result = interpret("bd whoami --verbose", CONTEXT);

  assert.deepEqual(kinds(result), ["track", "replay"]);
  assert.deepEqual(result.lines, []);
});

test("clear vide le journal sans rien afficher", () => {
  const result = interpret("clear", CONTEXT);

  assert.ok(result.effects.some((effect) => effect.type === "clear"));
  assert.deepEqual(result.lines, []);
});

test("sudo refuse, et le signale", () => {
  const result = interpret("/sudo", CONTEXT);

  assert.match(result.lines[1]?.t ?? "", /sudoers/);
  assert.equal(result.lines[1]?.m, "✗");
});

test("coffee répond 418", () => {
  assert.equal(interpret("/coffee", CONTEXT).lines[1]?.m, "418");
});

test("vim, nano et emacs tombent dans le même piège", () => {
  for (const editor of ["/vim", "/nano", "/emacs"]) {
    assert.match(interpret(editor, CONTEXT).lines[1]?.t ?? "", /:q!/);
  }
});

test("pet caresse la mascotte", () => {
  const result = interpret("/pet", CONTEXT);

  assert.equal(result.lines[1]?.m, "♥");
  assert.ok(result.effects.some((effect) => effect.type === "say"));
});

test("sleep endort la mascotte", () => {
  const result = interpret("sleep", CONTEXT);

  assert.ok(
    result.effects.some((effect) => effect.type === "say" && effect.expression === "sleep"),
  );
});

test("benjamin se présente et donne son adresse", () => {
  const result = interpret("/benjamin", CONTEXT);

  assert.match(texts(result).join("\n"), /benjamin\.david1@hotmail\.fr/);
  assert.ok(
    result.effects.some((effect) => effect.type === "track" && effect.event === "easter_egg"),
  );
});

test("brezinben est un alias de benjamin", () => {
  assert.deepEqual(
    texts(interpret("/brezinben", CONTEXT)).slice(1),
    texts(interpret("/benjamin", CONTEXT)).slice(1),
  );
});

// La blague est tiree au hasard, mais jamais deux fois la meme d'affilee.
test("joke tire une blague différente de la précédente", () => {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const result = interpret("/joke", { ...CONTEXT, jokeIndex: 0 }),
      patch = effectOf(result, "state"),
      index = Number(patch?.patch["jokeIndex"]);

    assert.notEqual(index, 0, "la blague courante ne se répète pas");
    assert.equal(result.lines[1]?.t, CONTEXT.jokes[index]);
  }
});

// Un easter egg sans slash n'est pas une commande de terminal.
test("un easter egg tapé sans slash n'est pas reconnu", () => {
  const result = interpret("joke", CONTEXT);

  assert.match(result.lines[1]?.t ?? "", /commande introuvable : joke/u);
  assert.match(result.lines[1]?.t ?? "", /essayez \/joke/u);
});

test("les vraies commandes marchent sans slash", () => {
  for (const command of ["help", "ls", "clear"]) {
    assert.ok(
      !interpret(command, CONTEXT).lines.some((entry) => /introuvable/u.test(entry.t)),
      `${command} doit rester une commande`,
    );
  }
});

test("une commande inconnue le dit et se marque comme telle", () => {
  const result = interpret("xyzzy", CONTEXT);

  assert.match(result.lines[1]?.t ?? "", /commande introuvable : xyzzy/);
  assert.ok(
    result.effects.some(
      (effect) => effect.type === "track" && effect.event === "commande_inconnue",
    ),
  );
});

test("la casse de la commande est ignorée", () => {
  assert.deepEqual(
    texts(interpret("/SUDO", CONTEXT)).slice(1),
    texts(interpret("/sudo", CONTEXT)).slice(1),
  );
});

// L'interpréteur ne doit toucher à rien : ni DOM, ni réseau, ni minuteur.
test("l'interprétation reste synchrone et sans effet de bord", () => {
  const before = JSON.stringify(CONTEXT);

  for (const command of ["ls", "help", "joke", "cd stack", "xyzzy", "shutdown", "matrix"]) {
    const result = interpret(command, CONTEXT);

    assert.ok(Array.isArray(result.lines));
    assert.ok(Array.isArray(result.effects));
  }

  assert.equal(JSON.stringify(CONTEXT), before, "le contexte ne doit pas être muté");
});

// Chaque expression proposée doit jouer sa propre feuille. Une commande qui annonce quelque
// chose et ne le fait pas est pire que son absence.
test("chaque expression proposée rend son propre état", () => {
  for (const expression of ["alert", "happy", "laugh", "sad", "scared", "sleep"]) {
    const result = interpret(`/slime ${expression}`, CONTEXT),
      emote = effectOf(result, "emote");

    assert.equal(emote?.expression, expression, `« ${expression} » doit émettre son expression`);
  }
});

// « idle » reste dans le type, « say » s'en sert. La commande, elle, ne le propose plus :
// il ne montrait rien.
test("slime idle n'est plus une expression proposée", () => {
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

test("slime kill fait exploser la mascotte", () => {
  assert.ok(kinds(interpret("/slime kill", CONTEXT)).includes("blowUp"));
});

test("slime drop fait tomber la mascotte", () => {
  assert.ok(kinds(interpret("/slime drop", CONTEXT)).includes("drop"));
});

test("slime activity joue l'activité nommée", () => {
  const activity = effectOf(interpret("/slime activity bike", CONTEXT), "activity");

  assert.equal(activity?.name, "bike");
});

// Une activité demande un accessoire : elle ne se tire jamais au hasard, et un nom inconnu
// rend la liste plutôt qu'une animation prise au hasard.
test("slime activity sans nom connu liste les activités", () => {
  const result = interpret("/slime activity xyzzy", CONTEXT);

  assert.equal(effectOf(result, "activity"), undefined);
  assert.ok(texts(result).some((text) => text.includes("slime activity <nom>")));
});

// Quatre alias sur dix-huit seulement sont proposés par l'autocomplétion. Les autres ne
// tomberaient sous aucun test : cette table est leur seule protection.
test("chaque alias se comporte comme sa commande", () => {
  const pairs: [string, string][] = [
    ["?", "help"],
    ["aide", "help"],
    ["/brezinben", "/benjamin"],
    ["/cat", "/pet"],
    ["cls", "clear"],
    ["copy", "email"],
    ["dir", "ls"],
    ["/emacs", "/vim"],
    ["exit", "shutdown"],
    ["/feedback", "/propose"],
    ["ia", "ai"],
    ["/idee", "/propose"],
    ["/mascotte", "/pet"],
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
      `${alias} doit dire ce que dit ${command}`,
    );
    assert.deepEqual(
      kinds(interpret(alias, CONTEXT)),
      kinds(interpret(command, CONTEXT)),
      `${alias} doit faire ce que fait ${command}`,
    );
  }
});

// Ces commandes n'ont pas encore de partie pure. Le descripteur est tout ce qu'elles
// rendent, et le ticket qui les finira doit savoir lequel il reprend.
test("les commandes déléguées rendent chacune son descripteur", () => {
  const expected: [string, Effect["type"]][] = [
    ["ai", "probeAI"],
    ["ask", "ask"],
    ["email", "email"],
    ["options", "options"],
    ["send-mail", "sendMail"],
  ];

  for (const [command, kind] of expected) {
    assert.ok(kinds(interpret(command, CONTEXT)).includes(kind), `${command} doit rendre ${kind}`);
  }
});

test("ask transporte la question dans son descripteur", () => {
  assert.equal(effectOf(interpret("ask qui es-tu", CONTEXT), "ask")?.query, "qui es-tu");
});

// Les deux modes partagent une branche. Sans ce test, corriger le texte de l'un
// emporterait le mode de l'autre en silence.
test("shutdown et reboot rendent chacun son mode", () => {
  assert.equal(effectOf(interpret("shutdown", CONTEXT), "power")?.mode, "shutdown");
  assert.equal(effectOf(interpret("reboot", CONTEXT), "power")?.mode, "reboot");
});

test("matrix réveille Néo et effraie la mascotte", () => {
  const result = interpret("/matrix", CONTEXT);

  assert.match(result.lines[1]?.t ?? "", /Néo/u);
  assert.equal(effectOf(result, "emote")?.expression, "scared");
});

// Un easter egg annoncé sans son slash est refusé quand on le recopie. L'aide est le
// premier endroit où l'on cherche : elle ne doit pas envoyer dans le mur.
test("l'aide n'annonce jamais un easter egg sans son slash", () => {
  const result = interpret("help", CONTEXT),
    // La bulle de la mascotte est un texte d'aide de plus : elle nomme une commande.
    body = [...resultTexts(result), effectOf(result, "say")?.text ?? ""].join(" ");

  for (const egg of ["cowsay", "joke", "matrix", "pet", "propose", "slime"]) {
    assert.ok(body.includes(`/${egg}`), `help doit écrire /${egg}`);
    assert.doesNotMatch(body, new RegExp(`(?<!/)\\b${egg}\\b`, "u"), `${egg} sans slash`);
  }
});

test("l'aide de slime porte le slash qu'elle exige", () => {
  for (const command of ["/slime", "/slime nawak", "/slime activity"]) {
    for (const text of texts(interpret(command, CONTEXT)).slice(1)) {
      assert.match(text, /^\/slime /u, `« ${text} » doit commencer par /slime`);
    }
  }
});

test("l'aide de propose porte le slash qu'elle exige", () => {
  assert.match(texts(interpret("/propose", CONTEXT))[1] ?? "", /^\/propose \[-y\] <idée>/u);
});

// Le test de section passait avant presque toutes les branches, sans regarder le verbe :
// n'importe quel mot suivi d'un identifiant y menait.
test("seuls cd, bd et open naviguent vers leur argument", () => {
  for (const verb of ["bd", "cd", "open"]) {
    assert.equal(effectOf(interpret(`${verb} stack`, CONTEXT), "navigate")?.id, "stack", verb);
  }

  for (const other of ["xyzzy stack", "/sudo stack", "share stack", "clear stack"]) {
    assert.equal(effectOf(interpret(other, CONTEXT), "navigate"), undefined, other);
  }
});

test("un nom de section ou de fiche seul navigue toujours", () => {
  assert.equal(effectOf(interpret("stack", CONTEXT), "navigate")?.id, "stack");
  assert.equal(effectOf(interpret("m-kereis", CONTEXT), "navigate")?.id, "m-kereis");
});

test("un easter egg suivi d'un nom de section garde son texte", () => {
  assert.match(texts(interpret("/sudo stack", CONTEXT))[1] ?? "", /sudoers/u);
});

test("clear suivi d'un nom de section vide quand même le journal", () => {
  assert.ok(kinds(interpret("clear stack", CONTEXT)).includes("clear"));
});

// Huit thèmes, donc moins de dix : la commande les liste plutôt que de renvoyer à Tab.
test("theme sans nom liste les thèmes", () => {
  const result = interpret("theme", CONTEXT);

  assert.match(texts(result)[1] ?? "", /^theme <nom> — dark · light · noctis$/u);
  assert.equal(effectOf(result, "theme"), undefined);
});

test("theme applique le thème nommé", () => {
  assert.equal(effectOf(interpret("theme noctis", CONTEXT), "theme")?.name, "noctis");
});

test("un thème inconnu le dit et rappelle la liste", () => {
  const result = interpret("theme xyzzy", CONTEXT);

  assert.equal(effectOf(result, "theme"), undefined);
  assert.match(texts(result)[1] ?? "", /thème inconnu : xyzzy/u);
  assert.ok(texts(result).some((text) => text.includes("theme <nom>")));
});

// « ai » et « ask » n'ont pas encore de partie pure. Les annoncer promet un résultat
// qui ne vient pas : leur code reste, leur annonce part.
test("l'aide n'annonce plus les commandes sans résultat", () => {
  const shown = texts(interpret("help", CONTEXT)).slice(1).join(" ");

  assert.doesNotMatch(shown, /\bask\b/u);
  assert.doesNotMatch(shown, /\bai\b/u);
});

// Le CV n'est pas encore servi. La commande navigue vers whoami en attendant, et le dit :
// une navigation muette se lit comme une commande cassée.
test("cv annonce ce qu'il fait au lieu de se taire", () => {
  const result = interpret("cv", CONTEXT);

  assert.ok(kinds(result).includes("cv"));
  assert.match(texts(result)[1] ?? "", /whoami/u);
});

// « cd » est une commande, et l'aide l'annonce. Répondre « commande introuvable » à
// « cd » nu envoie chercher une faute là où il manque seulement un argument.
test("les verbes qui naviguent expliquent ce qu'ils attendent", () => {
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

test("une section inconnue le dit, et rappelle les sections", () => {
  const result = interpret("cd xyzzy", CONTEXT);

  assert.match(texts(result)[1] ?? "", /section inconnue : xyzzy/u);
  assert.ok(texts(result).some((text) => text.includes("whoami")));
});

test("une cible de partage inconnue rappelle les cibles", () => {
  const result = interpret("share xyzzy", { ...CONTEXT, shareTargets: ["linkedin"] });

  assert.match(texts(result)[1] ?? "", /cible inconnue : xyzzy/u);
  assert.ok(texts(result).some((text) => text.includes("share <cible>")));
});

// À dix valeurs, la ligne déborde du volet : la complétion les montre mieux, et l'aide
// apprend la touche plutôt que de recopier une liste illisible.
const many = (count: number) =>
  Array.from({ length: count }, (_, index) => ({ id: `s-${index}`, label: `s-${index}` }));

test("à partir de dix valeurs, l'aide renvoie à la tabulation", () => {
  const listed = interpret("cd", { ...CONTEXT, details: [], sections: many(9) }),
    deferred = interpret("cd", { ...CONTEXT, details: [], sections: many(10) });

  assert.match(texts(listed)[1] ?? "", /s-0 · s-1/u);
  assert.match(texts(deferred)[1] ?? "", /Tab propose les 10 valeurs/u);
});

// « expression » descend d'un niveau : il devient une sous-commande de slime, symétrique de
// « activity ». L'ancien alias « /expression » ne répond plus.
test("slime expression joue l'expression nommée", () => {
  assert.equal(
    effectOf(interpret("/slime expression happy", CONTEXT), "emote")?.expression,
    "happy",
  );
});

test("slime expression sans expression connue liste les expressions", () => {
  for (const command of ["/slime expression", "/slime expression xyzzy"]) {
    const result = interpret(command, CONTEXT);

    assert.equal(effectOf(result, "emote"), undefined, command);
    assert.ok(
      texts(result).some((text) => text.includes("/slime expression <nom>")),
      command,
    );
  }
});

test("expression n'est plus une commande à lui seul", () => {
  assert.match(
    texts(interpret("/expression happy", CONTEXT))[1] ?? "",
    /commande introuvable : expression/u,
  );
});

test("reboot ne dit plus qu'il éteint", () => {
  assert.match(texts(interpret("reboot", CONTEXT))[1] ?? "", /Redémarrage/u);
  assert.match(texts(interpret("shutdown", CONTEXT))[1] ?? "", /Extinction/u);
});

// « jump » était un second nom pour « drop » : la feuille de saut n'a jamais été jouée
// par une commande.
test("slime jump n'est plus un second nom pour drop", () => {
  const result = interpret("/slime jump", CONTEXT);

  assert.equal(effectOf(result, "drop"), undefined);
  assert.ok(texts(result).some((text) => text.includes("/slime drop")));
});

test("matrix n'émet plus que son expression", () => {
  assert.deepEqual(kinds(interpret("/matrix", CONTEXT)), ["track", "track", "emote"]);
});

// Le journal ne doit pas annoncer un geste que la coquille avale. La mascotte est absente
// pendant son explosion et pendant son voyage en train.
test("le slime absent refuse la commande au lieu de mentir", () => {
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
test("lister l'usage de slime le signale comme tel", () => {
  for (const command of ["/slime", "/slime bogus", "/slime expression", "/slime activity"]) {
    assert.ok(effectOf(interpret(command, CONTEXT), "usage"), command);
  }

  assert.equal(effectOf(interpret("/slime kill", CONTEXT), "usage"), undefined);
  assert.equal(effectOf(interpret("/slime evolve", CONTEXT), "usage"), undefined);
  assert.equal(effectOf(interpret("/coffee", CONTEXT), "usage"), undefined);
});

// La chaine des formes. La coquille pose l'effet, l'interpreteur ne connait ni la forme
// courante ni la suivante : il ne dit que « change de forme ».
test("slime evolve demande le changement de forme", () => {
  const result = interpret("/slime evolve", CONTEXT);

  assert.ok(effectOf(result, "evolve"), "l'effet manque");
  assert.match(texts(result)[1] ?? "", /change de forme/u);
});

// Occupee n'est pas absente : la mascotte est la, elle finit sa transformation. Le journal
// doit le dire, et non annoncer un geste que la coquille avale.
test("pendant un changement de forme, la commande est refusée sans mentir", () => {
  const busy = { ...CONTEXT, mascot: "busy" } as const;

  for (const command of ["/slime evolve", "/slime kill", "/slime expression happy"]) {
    const result = interpret(command, busy);

    assert.match(texts(result)[1] ?? "", /change de forme/u, command);
    assert.ok(effectOf(result, "usage"), command);
    assert.equal(effectOf(result, "evolve"), undefined, command);
    assert.equal(effectOf(result, "blowUp"), undefined, command);
  }
});
