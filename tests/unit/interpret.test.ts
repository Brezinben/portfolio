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

it("une entrée vide ne produit rien", () => {
  for (const empty of ["", "   ", "\t"]) {
    assert.deepEqual(interpret(empty, CONTEXT), { effects: [], lines: [] });
  }
});

it("la ligne saisie est renvoyée en écho", () => {
  const result = interpret("ls", CONTEXT);

  assert.equal(result.lines[0]?.t, "ls");
  assert.equal(result.lines[0]?.m, "›");
});

it("les espaces multiples sont normalisés", () => {
  const spaced = interpret("cd    stack", CONTEXT),
    single = interpret("cd stack", CONTEXT);

  assert.deepEqual(texts(spaced), texts(single));
  assert.deepEqual(kinds(spaced), kinds(single));
});

// L'écho reprend la ligne telle qu'elle a été tapée, préfixe compris : seule la sortie
// doit être identique.
it("les préfixes slash et deux-points sont acceptés", () => {
  for (const prefix of ["/", ":", "//"]) {
    const prefixed = interpret(`${prefix}sudo`, CONTEXT);

    assert.equal(prefixed.lines[0]?.t, `${prefix}sudo`);
    assert.deepEqual(texts(prefixed).slice(1), texts(interpret("/sudo", CONTEXT)).slice(1));
  }
});

it("chaque commande est marquée", () => {
  const effect = effectOf(interpret("/sudo", CONTEXT), "track");

  assert.equal(effect?.event, "commande");
  assert.deepEqual(effect?.props, { cmd: "sudo" });
});

it("ls liste les sections puis les fiches", () => {
  const result = interpret("ls", CONTEXT);

  assert.equal(result.lines[1]?.t, "whoami   stack");
  assert.equal(result.lines[2]?.t, "m-kereis");
});

// La reponse de help ne tient pas dans le journal d'un ecran large : elle reclame le
// resultat, et le journal ne garde que l'echo de la commande.
it("help liste les commandes et rappelle le clavier dans le résultat", () => {
  const result = interpret("help", CONTEXT),
    body = resultTexts(result).join("\n");

  assert.match(body, /ls · cd <section>/);
  assert.match(body, /Clavier/);
  assert.deepEqual(texts(result), ["help"]);
  assert.ok(result.effects.some((effect) => effect.type === "say"));
});

it("une commande ordinaire laisse le résultat à la section", () => {
  assert.equal(interpret("ls", CONTEXT).result, undefined);
});

it("aide et point d'interrogation sont des alias de help", () => {
  for (const alias of ["aide", "?"]) {
    assert.deepEqual(
      resultTexts(interpret(alias, CONTEXT)),
      resultTexts(interpret("help", CONTEXT)),
    );
  }
});

it("un nom de section seul y navigue", () => {
  const result = interpret("stack", CONTEXT);

  assert.ok(result.effects.some((effect) => effect.type === "navigate" && effect.id === "stack"));
  assert.match(result.lines[1]?.t ?? "", /section « stack » chargée/);
});

it("cd navigue aussi, et open et bd en sont des alias", () => {
  for (const verb of ["cd", "open", "bd"]) {
    const result = interpret(`${verb} stack`, CONTEXT);

    assert.ok(
      result.effects.some((effect) => effect.type === "navigate" && effect.id === "stack"),
      `${verb} doit naviguer`,
    );
  }
});

// Retaper la commande de la section en cours la rejoue, plutôt que de l'empiler.
it("retaper la commande de la section la rejoue", () => {
  const result = interpret("bd whoami --verbose", CONTEXT);

  assert.deepEqual(kinds(result), ["track", "replay"]);
  assert.deepEqual(result.lines, []);
});

it("clear vide le journal sans rien afficher", () => {
  const result = interpret("clear", CONTEXT);

  assert.ok(result.effects.some((effect) => effect.type === "clear"));
  assert.deepEqual(result.lines, []);
});

it("sudo refuse, et le signale", () => {
  const result = interpret("/sudo", CONTEXT);

  assert.match(result.lines[1]?.t ?? "", /sudoers/);
  assert.equal(result.lines[1]?.m, "✗");
});

it("coffee répond 418", () => {
  assert.equal(interpret("/coffee", CONTEXT).lines[1]?.m, "418");
});

it("vim, nano et emacs tombent dans le même piège", () => {
  for (const editor of ["/vim", "/nano", "/emacs"]) {
    assert.match(interpret(editor, CONTEXT).lines[1]?.t ?? "", /:q!/);
  }
});

it("sleep endort la mascotte", () => {
  const result = interpret("sleep", CONTEXT);

  assert.ok(
    result.effects.some((effect) => effect.type === "say" && effect.expression === "sleep"),
  );
});

it("benjamin se présente et donne son adresse", () => {
  const result = interpret("/benjamin", CONTEXT);

  assert.match(texts(result).join("\n"), /benjamin\.david1@hotmail\.fr/);
  assert.ok(
    result.effects.some((effect) => effect.type === "track" && effect.event === "easter_egg"),
  );
});

it("brezinben est un alias de benjamin", () => {
  assert.deepEqual(
    texts(interpret("/brezinben", CONTEXT)).slice(1),
    texts(interpret("/benjamin", CONTEXT)).slice(1),
  );
});

// La blague est tiree au hasard, mais jamais deux fois la meme d'affilee.
it("joke tire une blague différente de la précédente", () => {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const result = interpret("/joke", { ...CONTEXT, jokeIndex: 0 }),
      patch = effectOf(result, "state"),
      index = Number(patch?.patch["jokeIndex"]);

    assert.notEqual(index, 0, "la blague courante ne se répète pas");
    assert.equal(result.lines[1]?.t, CONTEXT.jokes[index]);
  }
});

// Un easter egg sans slash n'est pas une commande de terminal.
it("un easter egg tapé sans slash n'est pas reconnu", () => {
  const result = interpret("joke", CONTEXT);

  assert.match(result.lines[1]?.t ?? "", /commande introuvable : joke/u);
  assert.match(result.lines[1]?.t ?? "", /essayez \/joke/u);
});

it("les vraies commandes marchent sans slash", () => {
  for (const command of ["help", "ls", "clear"]) {
    assert.ok(
      !interpret(command, CONTEXT).lines.some((entry) => /introuvable/u.test(entry.t)),
      `${command} doit rester une commande`,
    );
  }
});

it("une commande inconnue le dit et se marque comme telle", () => {
  const result = interpret("xyzzy", CONTEXT);

  assert.match(result.lines[1]?.t ?? "", /commande introuvable : xyzzy/);
  assert.ok(
    result.effects.some(
      (effect) => effect.type === "track" && effect.event === "commande_inconnue",
    ),
  );
});

it("la casse de la commande est ignorée", () => {
  assert.deepEqual(
    texts(interpret("/SUDO", CONTEXT)).slice(1),
    texts(interpret("/sudo", CONTEXT)).slice(1),
  );
});

// L'interpréteur ne doit toucher à rien : ni DOM, ni réseau, ni minuteur.
it("l'interprétation reste synchrone et sans effet de bord", () => {
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
it("chaque expression proposée rend son propre état", () => {
  for (const expression of ["alert", "happy", "laugh", "sad", "scared", "sleep"]) {
    const result = interpret(`/slime ${expression}`, CONTEXT),
      emote = effectOf(result, "emote");

    assert.equal(emote?.expression, expression, `« ${expression} » doit émettre son expression`);
  }
});

// « idle » reste dans le type, « say » s'en sert. La commande, elle, ne le propose plus :
// il ne montrait rien.
it("slime idle n'est plus une expression proposée", () => {
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

it("slime kill fait exploser la mascotte", () => {
  assert.ok(kinds(interpret("/slime kill", CONTEXT)).includes("blowUp"));
});

it("slime drop fait tomber la mascotte", () => {
  assert.ok(kinds(interpret("/slime drop", CONTEXT)).includes("drop"));
});

it("slime activity joue l'activité nommée", () => {
  const activity = effectOf(interpret("/slime activity bike", CONTEXT), "activity");

  assert.equal(activity?.name, "bike");
});

// Une activité demande un accessoire : elle ne se tire jamais au hasard, et un nom inconnu
// rend la liste plutôt qu'une animation prise au hasard.
it("slime activity sans nom connu liste les activités", () => {
  const result = interpret("/slime activity xyzzy", CONTEXT);

  assert.equal(effectOf(result, "activity"), undefined);
  assert.ok(texts(result).some((text) => text.includes("slime activity <nom>")));
});

// Quatre alias sur dix-huit seulement sont proposés par l'autocomplétion. Les autres ne
// tomberaient sous aucun test : cette table est leur seule protection.
it("chaque alias se comporte comme sa commande", () => {
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
it("les commandes déléguées rendent chacune son descripteur", () => {
  const expected: [string, Effect["type"]][] = [
    ["email", "email"],
    ["options", "options"],
    ["send-mail", "sendMail"],
  ];

  for (const [command, kind] of expected) {
    assert.ok(kinds(interpret(command, CONTEXT)).includes(kind), `${command} doit rendre ${kind}`);
  }
});

it("ask répond avec le passage du corpus, jamais avec un texte produit", () => {
  const result = interpret("ask accessibilité RGAA", CONTEXT);

  assert.ok(texts(result).includes("stack"), "ask doit nommer la source de sa réponse");
  assert.ok(
    texts(result).some((t) => t.includes("accessibilité RGAA")),
    "la réponse est le texte du corpus",
  );
});

// Sans modele, la reponse part telle quelle : aucun descripteur, personne pour le lire.
it("sans modèle, ask répond seul et ne décrit aucun candidat", () => {
  const result = interpret("ask nantes développeur", CONTEXT);

  assert.equal(effectOf(result, "ask"), undefined);
  assert.ok(texts(result).some((t) => t.includes("Nantes")));
});

// Le modele voit tous les passages, pas seulement ceux qui partagent un mot avec la
// question. Ne lui donner que les trouvailles lexicales le reduirait a les reclasser.
it("avec un modèle, ask lui soumet tous les passages", () => {
  const descripteur = effectOf(interpret("ask nantes développeur", AVEC_MODELE), "ask");

  assert.equal(descripteur?.query, "nantes développeur");
  assert.deepEqual(descripteur?.candidates, ["whoami", "stack", "m-kereis"]);
});

// La reponse attend le modele, mais elle voyage avec le descripteur : elle sort si le
// modele echoue, et la coquille n'a pas a la reconstruire.
it("avec un modèle, la réponse du corpus attend dans le descripteur", () => {
  const result = interpret("ask nantes développeur", AVEC_MODELE),
    descripteur = effectOf(result, "ask");

  assert.deepEqual(texts(result), ["ask nantes développeur"], "rien ne s'affiche encore");
  assert.ok(
    (descripteur?.lexical ?? []).some((entry) => entry.t.includes("Nantes")),
    "la réponse lexicale est en réserve",
  );
});

// Le recouvrement de mots ne trouve rien des que la question est tournee autrement. C'est
// le cas ou un modele sert le plus : il doit etre consulte, pas court-circuite.
it("sans trouvaille lexicale, le modèle est quand même consulté", () => {
  const descripteur = effectOf(interpret("ask zzzzz", AVEC_MODELE), "ask");

  assert.deepEqual(descripteur?.candidates, ["whoami", "stack", "m-kereis"]);
  assert.ok(
    (descripteur?.lexical ?? []).some((entry) => entry.t.includes("rien ne répond")),
    "le refus reste en réserve, si le modèle ne trouve pas non plus",
  );
});

it("sans modèle, ask sans réponse le dit et ne propose aucun candidat", () => {
  const result = interpret("ask zzzzz", CONTEXT);

  assert.ok(texts(result).some((t) => t.includes("rien ne répond")));
  assert.equal(effectOf(result, "ask"), undefined);
});

it("ask sans question rappelle comment l'employer", () => {
  assert.ok(texts(interpret("ask", CONTEXT)).some((t) => t.startsWith("ask —")));
});

// Les deux modes partagent une branche. Sans ce test, corriger le texte de l'un
// emporterait le mode de l'autre en silence.
it("shutdown et reboot rendent chacun son mode", () => {
  assert.equal(effectOf(interpret("shutdown", CONTEXT), "power")?.mode, "shutdown");
  assert.equal(effectOf(interpret("reboot", CONTEXT), "power")?.mode, "reboot");
});

it("matrix réveille Néo et effraie la mascotte", () => {
  const result = interpret("/matrix", CONTEXT);

  assert.match(result.lines[1]?.t ?? "", /Néo/u);
  assert.equal(effectOf(result, "emote")?.expression, "scared");
});

// Un easter egg annoncé sans son slash est refusé quand on le recopie. L'aide est le
// premier endroit où l'on cherche : elle ne doit pas envoyer dans le mur.
it("l'aide n'annonce jamais un easter egg sans son slash", () => {
  const result = interpret("help", CONTEXT),
    // La bulle de la mascotte est un texte d'aide de plus : elle nomme une commande.
    body = [...resultTexts(result), effectOf(result, "say")?.text ?? ""].join(" ");

  for (const egg of ["cowsay", "joke", "matrix", "propose", "slime"]) {
    assert.ok(body.includes(`/${egg}`), `help doit écrire /${egg}`);
    assert.doesNotMatch(body, new RegExp(`(?<!/)\\b${egg}\\b`, "u"), `${egg} sans slash`);
  }
});

it("l'aide de slime porte le slash qu'elle exige", () => {
  for (const command of ["/slime", "/slime nawak", "/slime activity"]) {
    for (const text of texts(interpret(command, CONTEXT)).slice(1)) {
      assert.match(text, /^\/slime /u, `« ${text} » doit commencer par /slime`);
    }
  }
});

it("l'aide de propose porte le slash qu'elle exige", () => {
  assert.match(texts(interpret("/propose", CONTEXT))[1] ?? "", /^\/propose \[-y\] <idée>/u);
});

// Le test de section passait avant presque toutes les branches, sans regarder le verbe :
// n'importe quel mot suivi d'un identifiant y menait.
it("seuls cd, bd et open naviguent vers leur argument", () => {
  for (const verb of ["bd", "cd", "open"]) {
    assert.equal(effectOf(interpret(`${verb} stack`, CONTEXT), "navigate")?.id, "stack", verb);
  }

  for (const other of ["xyzzy stack", "/sudo stack", "share stack", "clear stack"]) {
    assert.equal(effectOf(interpret(other, CONTEXT), "navigate"), undefined, other);
  }
});

it("un nom de section ou de fiche seul navigue toujours", () => {
  assert.equal(effectOf(interpret("stack", CONTEXT), "navigate")?.id, "stack");
  assert.equal(effectOf(interpret("m-kereis", CONTEXT), "navigate")?.id, "m-kereis");
});

it("un easter egg suivi d'un nom de section garde son texte", () => {
  assert.match(texts(interpret("/sudo stack", CONTEXT))[1] ?? "", /sudoers/u);
});

it("clear suivi d'un nom de section vide quand même le journal", () => {
  assert.ok(kinds(interpret("clear stack", CONTEXT)).includes("clear"));
});

// Huit thèmes, donc moins de dix : la commande les liste plutôt que de renvoyer à Tab.
it("theme sans nom liste les thèmes", () => {
  const result = interpret("theme", CONTEXT);

  assert.match(texts(result)[1] ?? "", /^theme <nom> — dark · light · noctis$/u);
  assert.equal(effectOf(result, "theme"), undefined);
});

it("theme applique le thème nommé", () => {
  assert.equal(effectOf(interpret("theme noctis", CONTEXT), "theme")?.name, "noctis");
});

it("un thème inconnu le dit et rappelle la liste", () => {
  const result = interpret("theme xyzzy", CONTEXT);

  assert.equal(effectOf(result, "theme"), undefined);
  assert.match(texts(result)[1] ?? "", /thème inconnu : xyzzy/u);
  assert.ok(texts(result).some((text) => text.includes("theme <nom>")));
});

// « ai » et « ask » n'ont pas encore de partie pure. Les annoncer promet un résultat
// qui ne vient pas : leur code reste, leur annonce part.
it("l'aide n'annonce plus les commandes sans résultat", () => {
  const shown = texts(interpret("help", CONTEXT)).slice(1).join(" ");

  assert.doesNotMatch(shown, /\bask\b/u);
  assert.doesNotMatch(shown, /\bai\b/u);
});

// Il n'y a pas de PDF à servir. La commande ouvre la version texte, qui porte le parcours
// complet, et le dit : une navigation muette se lit comme une commande cassée.
it("cv annonce ce qu'il fait au lieu de se taire", () => {
  const result = interpret("cv", CONTEXT);

  assert.ok(kinds(result).includes("cv"));
  assert.match(texts(result)[1] ?? "", /version texte/u);
});

// « cd » est une commande, et l'aide l'annonce. Répondre « commande introuvable » à
// « cd » nu envoie chercher une faute là où il manque seulement un argument.
it("les verbes qui naviguent expliquent ce qu'ils attendent", () => {
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

it("une section inconnue le dit, et rappelle les sections", () => {
  const result = interpret("cd xyzzy", CONTEXT);

  assert.match(texts(result)[1] ?? "", /section inconnue : xyzzy/u);
  assert.ok(texts(result).some((text) => text.includes("whoami")));
});

it("une cible de partage inconnue rappelle les cibles", () => {
  const result = interpret("share xyzzy", { ...CONTEXT, shareTargets: ["linkedin"] });

  assert.match(texts(result)[1] ?? "", /cible inconnue : xyzzy/u);
  assert.ok(texts(result).some((text) => text.includes("share <cible>")));
});

// À dix valeurs, la ligne déborde du volet : la complétion les montre mieux, et l'aide
// apprend la touche plutôt que de recopier une liste illisible.
const many = (count: number) =>
  Array.from({ length: count }, (_, index) => ({ id: `s-${index}`, label: `s-${index}` }));

it("à partir de dix valeurs, l'aide renvoie à la tabulation", () => {
  const listed = interpret("cd", { ...CONTEXT, details: [], sections: many(9) }),
    deferred = interpret("cd", { ...CONTEXT, details: [], sections: many(10) });

  assert.match(texts(listed)[1] ?? "", /s-0 · s-1/u);
  assert.match(texts(deferred)[1] ?? "", /Tab propose les 10 valeurs/u);
});

// « expression » descend d'un niveau : il devient une sous-commande de slime, symétrique de
// « activity ». L'ancien alias « /expression » ne répond plus.
it("slime expression joue l'expression nommée", () => {
  assert.equal(
    effectOf(interpret("/slime expression happy", CONTEXT), "emote")?.expression,
    "happy",
  );
});

it("slime expression sans expression connue liste les expressions", () => {
  for (const command of ["/slime expression", "/slime expression xyzzy"]) {
    const result = interpret(command, CONTEXT);

    assert.equal(effectOf(result, "emote"), undefined, command);
    assert.ok(
      texts(result).some((text) => text.includes("/slime expression <nom>")),
      command,
    );
  }
});

it("expression n'est plus une commande à lui seul", () => {
  assert.match(
    texts(interpret("/expression happy", CONTEXT))[1] ?? "",
    /commande introuvable : expression/u,
  );
});

it("reboot ne dit plus qu'il éteint", () => {
  assert.match(texts(interpret("reboot", CONTEXT))[1] ?? "", /Redémarrage/u);
  assert.match(texts(interpret("shutdown", CONTEXT))[1] ?? "", /Extinction/u);
});

// « jump » était un second nom pour « drop » : la feuille de saut n'a jamais été jouée
// par une commande.
it("slime jump n'est plus un second nom pour drop", () => {
  const result = interpret("/slime jump", CONTEXT);

  assert.equal(effectOf(result, "drop"), undefined);
  assert.ok(texts(result).some((text) => text.includes("/slime drop")));
});

it("matrix n'émet plus que son expression", () => {
  assert.deepEqual(kinds(interpret("/matrix", CONTEXT)), ["track", "track", "emote"]);
});

// Le journal ne doit pas annoncer un geste que la coquille avale. La mascotte est absente
// pendant son explosion et pendant son voyage en train.
it("le slime absent refuse la commande au lieu de mentir", () => {
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
it("lister l'usage de slime le signale comme tel", () => {
  for (const command of ["/slime", "/slime bogus", "/slime expression", "/slime activity"]) {
    assert.ok(effectOf(interpret(command, CONTEXT), "usage"), command);
  }

  assert.equal(effectOf(interpret("/slime kill", CONTEXT), "usage"), undefined);
  assert.equal(effectOf(interpret("/slime evolve", CONTEXT), "usage"), undefined);
  assert.equal(effectOf(interpret("/coffee", CONTEXT), "usage"), undefined);
});

// La chaine des formes. La coquille pose l'effet, l'interpreteur ne connait ni la forme
// courante ni la suivante : il ne dit que « change de forme ».
it("slime evolve demande le changement de forme", () => {
  const result = interpret("/slime evolve", CONTEXT);

  assert.ok(effectOf(result, "evolve"), "l'effet manque");
  assert.match(texts(result)[1] ?? "", /change de forme/u);
});

// Endormie n'est ni absente ni occupee : la mascotte est la, et elle le reste. Le refus
// nomme la cause et la sortie, comme les autres refus du mode hors ligne.
it("sans réseau, la mascotte dort et la commande est refusée", () => {
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
it("pendant un changement de forme, la commande est refusée sans mentir", () => {
  const busy = { ...CONTEXT, mascot: "busy" } as const;

  for (const command of ["/slime evolve", "/slime kill", "/slime expression happy"]) {
    const result = interpret(command, busy);

    assert.match(texts(result)[1] ?? "", /change de forme/u, command);
    assert.ok(effectOf(result, "usage"), command);
    assert.equal(effectOf(result, "evolve"), undefined, command);
    assert.equal(effectOf(result, "blowUp"), undefined, command);
  }
});
