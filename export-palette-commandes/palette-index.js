/* palette de commandes — index de recherche.
   Données pures : aucune logique. Remplacez ce fichier (ou appelez
   palette.setIndex(...)) pour brancher l'index réel du site.

   Forme d'une entrée :
   {
     kind   : clé de regroupement — doit exister dans les `groups` du moteur
     label  : ce qui s'affiche et ce qui est complété par Tab
     cmd    : commande écho jouée dans le volet d'exécution
     desc   : ligne grise de droite
     keys   : mots-clés supplémentaires (sans accents de préférence)
     title  : titre de la sortie
     out    : [{k, v, kc, c}] — clé, valeur, couleur de clé, couleur de valeur
     themeId / swatch / swatchBg : entrée de thème (pastille + rendu à la main)
   }
   kind "action" et les entrées avec themeId ne s'exécutent pas : elles
   ferment la palette et appellent onAction / onTheme. */
(function (global) {
  "use strict";

  const KV = (k, v, kc, c) => ({ k: k, v: v, kc: kc || "var(--fg2)", c: c || "var(--fg)" });

  const IDX = [
    { kind: "section", label: "whoami", cmd: "bd whoami --verbose", desc: "identité — qui parle ici", keys: "benjamin david profil identite nantes",
      title: "système", out: [KV("poste", "Développeur IA / Full Stack"), KV("entreprise", "Kereis · via fruggr"), KV("depuis", "mai 2026"), KV("base", "Nantes, France"), KV("langues", "français, anglais technique"), KV("contact", "benjamin.david1@hotmail.fr", "var(--fg2)", "var(--acc)")] },
    { kind: "section", label: "parcours", cmd: "bd log --graph --since=2018", desc: "6 expériences depuis 2018", keys: "experiences timeline carriere log git emploi",
      title: "git log", out: [KV("HEAD", "kereis/urbanisme", "var(--fg2)", "var(--acc)"), KV("2026", "MCP + SDD en production"), KV("2024", "accessibilité PSH/PMR"), KV("2023", "RUN & observabilité"), KV("2021", "lead technique"), KV("2018", "réseau & support")] },
    { kind: "section", label: "stack", cmd: "bd stack --tree --depth=2", desc: "43 briques, 5 domaines", keys: "technologies outils front back devops qualite",
      title: "resolve", out: [KV("frontend", "depuis 2020 · Transway, SNCF, Kereis"), KV("backend", "depuis 2020 · LDC, Transway, fruggr"), KV("ia", "depuis 2024 · fruggr, Kereis", "var(--fg2)", "var(--acc)"), KV("devops", "depuis 2018 · FPEE, RUN fruggr"), KV("qualité", "depuis 2021 · toutes les missions"), KV("—", "43 briques résolues · 0 dépendance décorative", "var(--fg2)", "var(--ok)")] },
    { kind: "section", label: "impact", cmd: "bd audit --a11y --eco", desc: "numérique responsable", keys: "accessibilite rgaa eco conception sobriete ecologie audit",
      title: "budget de cette page", out: [KV("vidéos", "0", "var(--fg2)", "var(--ok)"), KV("images", "0", "var(--fg2)", "var(--ok)"), KV("cookies", "0", "var(--fg2)", "var(--ok)"), KV("polices", "1 famille"), KV("mesure", "Umami auto-hébergé, sans cookie"), KV("mouvement", "réduit si demandé")] },
    { kind: "section", label: "formation", cmd: "bd learn --history --tail", desc: "2016 → aujourd'hui", keys: "diplome bts cda bac sti2d veille certifications etudes",
      title: "changelog", out: [KV("en cours", "MCP, agents, évaluation", "var(--fg2)", "var(--acc)"), KV("2021", "TP CDA"), KV("2020", "BTS SIO SISR"), KV("2018", "Bac STI2D"), KV("méthode", "lire, tester, casser, recommencer")] },
    { kind: "section", label: "contact", cmd: "curl -s portfolio.brezinben.dpdns.org/contact | jq", desc: "ouvert aux missions", keys: "mail email linkedin github telephone joindre embauche",
      title: "http", out: [KV("200", "OK", "var(--ok)", "var(--ok)"), KV("email", "benjamin.david1@hotmail.fr", "var(--fg2)", "var(--acc)"), KV("linkedin", "in/benjamin--david"), KV("github", "brezinben"), KV("ville", "Nantes"), KV("délai", "réponse sous 48 h")] },

    { kind: "mission", label: "kereis", cmd: "bd show mission/kereis", desc: "mai 2026 → · MCP, SpecKit, SDD", keys: "urbanisme agents speckit specification mcp assurance en cours",
      title: "mission", out: [KV("statut", "en cours", "var(--fg2)", "var(--acc)"), KV("rôle", "développeur IA / full stack"), KV("client", "Kereis"), KV("via", "fruggr"), KV("pile", "MCP, SpecKit, agents"), KV("apport", "revue de spec en ~20 min contre une journée")] },
    { kind: "mission", label: "assist'engare", cmd: "bd show mission/assist-engare", desc: "2024 → 2026 · SNCF Gares & Connexions", keys: "sncf gares connexions psh pmr handicap accessibilite train quai",
      title: "mission", out: [KV("statut", "livré", "var(--fg2)", "var(--ok)"), KV("rôle", "développeur full stack"), KV("client", "SNCF Gares & Connexions"), KV("produit", "Assist'enGare"), KV("public", "voyageurs PSH / PMR"), KV("enjeu", "accessibilité réelle")] },
    { kind: "mission", label: "run fruggr", cmd: "bd show mission/run-fruggr", desc: "2023 → 2024 · supervision", keys: "monitoring support maintenance securite ci cd digital4better",
      title: "mission", out: [KV("statut", "livré", "var(--fg2)", "var(--ok)"), KV("rôle", "full stack / IA"), KV("périmètre", "RUN, support, sécurité"), KV("outils", "monitoring, CI/CD"), KV("cadre", "numérique responsable")] },
    { kind: "mission", label: "transway", cmd: "bd show mission/transway", desc: "2021 → 2023 · mobilité douce", keys: "velo marche bus tram co2 points lead technique",
      title: "mission", out: [KV("statut", "livré", "var(--fg2)", "var(--ok)"), KV("rôle", "full stack → tech lead"), KV("domaine", "mobilité douce"), KV("mesure", "points & CO2 évité"), KV("durée", "2 ans")] },

    { kind: "commande", label: "help", cmd: "help", desc: "la liste des commandes", keys: "aide commandes man", title: "help", out: [KV("navigation", "ls · cd <section> · clear"), KV("contenu", "cv · share · email · propose"), KV("réglages", "theme · options"), KV("le reste", "joke · cowsay · wtf · matrix"), KV("clavier", "/ cible la saisie · Tab complète")] },
    { kind: "commande", label: "cv", cmd: "cv", desc: "version imprimable du parcours", keys: "resume pdf imprimer print curriculum", title: "cv", out: [KV("format", "A4, deux pages"), KV("contenu", "identité, parcours, stack, formation"), KV("sortie", "impression ou PDF"), KV("raccourci", "⌘P / Ctrl+P")] },
    { kind: "commande", label: "share", cmd: "share", desc: "partager ce portfolio", keys: "partage linkedin lien copier diffuser", title: "share", out: [KV("linkedin", "partage du lien"), KV("profil", "in/benjamin--david"), KV("github", "brezinben"), KV("mail", "envoi par e-mail"), KV("link", "copier le lien")] },
    { kind: "commande", label: "propose", cmd: "propose ", desc: "suggérer un ajout au site", keys: "idee suggestion retour feedback", title: "propose", out: [KV("envoyé", "votre texte, et rien d'autre"), KV("non envoyé", "IP, cookies, identifiants, pages visitées"), KV("outil", "Umami auto-hébergé"), KV("consentement", "explicite, en deux temps")] },
    { kind: "commande", label: "ask", cmd: "ask ", desc: "poser une question sur le profil", keys: "question ia recherche libre chat", title: "ask", out: [KV("moteur", "réponses écrites à la main"), KV("repli", "modèle local du navigateur si présent"), KV("portée", "parcours, stack, missions, impact")] },
    { kind: "commande", label: "theme", cmd: "theme ", desc: "8 thèmes, transition en cercle", keys: "couleurs dark light noctis azureus uva bordo lux hibernus", title: "theme", out: [KV("sombres", "dark · noctis · azureus · uva · bordo"), KV("clairs", "light · lux · hibernus"), KV("transition", "cercle depuis le point cliqué")] },
    { kind: "commande", label: "matrix", cmd: "matrix", desc: "réveille-toi, Néo", keys: "pluie verte glitch neo easter egg", title: "matrix", out: [KV("durée", "3,2 s"), KV("effet", "pluie de caractères + glitch"), KV("mascotte", "terrorisée", "var(--fg2)", "var(--warn)")] },
    { kind: "commande", label: "joke", cmd: "joke", desc: "une blague de développeur", keys: "humour blague rire", title: "joke", out: [KV("stdout", "Un développeur part avec 12 tickets. Il en ferme 3. Il en ouvre 7.")] },
    { kind: "commande", label: "cowsay", cmd: "cowsay ", desc: "la vache, conforme à l'original", keys: "vache ascii art bulle cowthink", title: "cowsay", out: [KV("têtes", "-b borg · -d mort · -g cupide · -p paranoïaque"), KV("aussi", "-s défoncé · -t fatigué · -w méfiant · -y jeune"), KV("variante", "cowthink pour la bulle de pensée")] },
    { kind: "commande", label: "shutdown", cmd: "shutdown", desc: "extinction CRT puis reboot", keys: "eteindre reboot redemarrer crt", title: "shutdown", out: [KV("séquence", "extinction CRT, puis boot complet"), KV("durée", "≈ 3 s"), KV("réversible", "oui", "var(--fg2)", "var(--ok)")] },
    { kind: "commande", label: "benjamin", cmd: "benjamin", desc: "alias brezinben", keys: "brezinben pseudo easter egg", title: "whois", out: [KV("pseudo", "brezinben"), KV("origine", "un vieux pseudo qui a survécu à tout"), KV("statut", "toujours en production", "var(--fg2)", "var(--ok)")] },

    { kind: "stack", label: "Serveurs MCP", cmd: "bd stack --show mcp", desc: "Kereis, 2026", keys: "model context protocol agents outils garde fous ia",
      title: "resolve", out: [KV("où", "Kereis, 2026"), KV("quoi", "exposition des outils internes aux agents : tools, resources, prompts"), KV("pourquoi", "des garde-fous d'accès plutôt qu'un accès total")] },
    { kind: "stack", label: "SpecKit", cmd: "bd stack --show speckit", desc: "Kereis, 2026", keys: "spec it plan tasks sdd specification ia",
      title: "resolve", out: [KV("où", "Kereis, 2026"), KV("quoi", "spec-it, plan, tasks"), KV("pourquoi", "la spécification devient l'artefact de référence, le code en découle")] },
    { kind: "stack", label: "Vue.js", cmd: "bd stack --show vue", desc: "Transway, SNCF, Kereis", keys: "vue composition api pinia front framework",
      title: "resolve", out: [KV("où", "Transway, SNCF, Kereis"), KV("quoi", "framework principal sur la majorité des interfaces livrées"), KV("pourquoi", "Composition API, stores, routage")] },
    { kind: "stack", label: "NestJS", cmd: "bd stack --show nestjs", desc: "Transway, Kereis", keys: "nest node typeorm backend modulaire injection",
      title: "resolve", out: [KV("où", "Transway, Kereis"), KV("quoi", "architecture modulaire, injection de dépendances, TypeORM"), KV("pourquoi", "un back typé de bout en bout")] },
    { kind: "stack", label: "Laravel", cmd: "bd stack --show laravel", desc: "LDC Services, fruggr", keys: "php eloquent api back office queue",
      title: "resolve", out: [KV("où", "LDC Services, fruggr"), KV("quoi", "API et back-offices : Eloquent, files de traitement, authentification")] },
    { kind: "stack", label: "RGAA", cmd: "bd stack --show rgaa", desc: "Assist'enGare", keys: "accessibilite referentiel handicap wcag a11y",
      title: "resolve", out: [KV("où", "Assist'enGare"), KV("quoi", "référentiel d'accessibilité appliqué à un service dont les usagers dépendent réellement")] },
    { kind: "stack", label: "Éco-conception", cmd: "bd stack --show eco", desc: "fruggr, digital4better", keys: "ecoconception impact environnement empreinte sobriete",
      title: "resolve", out: [KV("où", "fruggr, digital4better"), KV("quoi", "mesure de l'impact des applications"), KV("pourquoi", "des arbitrages assumés entre fonctionnalité et empreinte")] },
    { kind: "stack", label: "Docker", cmd: "bd stack --show docker", desc: "depuis 2020", keys: "conteneur compose ci environnement devops",
      title: "resolve", out: [KV("où", "depuis 2020"), KV("quoi", "environnements reproductibles en local comme en CI"), KV("pourquoi", "Compose pour les dépendances")] },
    { kind: "stack", label: "Cypress", cmd: "bd stack --show cypress", desc: "Transway, SNCF", keys: "tests e2e bout en bout qualite",
      title: "resolve", out: [KV("où", "Transway, SNCF"), KV("quoi", "tests de bout en bout sur les parcours critiques — réservation, authentification")] },

    { kind: "action", label: "envoyer un e-mail", cmd: "send-mail benjamin.david1@hotmail.fr", desc: "réponse sous 48 h", keys: "mail contact ecrire recruter",
      href: "mailto:benjamin.david1@hotmail.fr", title: "mailto", out: [KV("à", "benjamin.david1@hotmail.fr", "var(--fg2)", "var(--acc)"), KV("délai", "réponse sous 48 h")] },
    { kind: "action", label: "ouvrir LinkedIn", cmd: "open linkedin", desc: "in/benjamin--david", keys: "reseau social profil linkedin",
      href: "https://www.linkedin.com/in/benjamin--david", target: "_blank", title: "open", out: [KV("url", "linkedin.com/in/benjamin--david", "var(--fg2)", "var(--acc)")] },
    { kind: "action", label: "copier le lien", cmd: "copy link", desc: "portfolio.brezinben.dpdns.org", keys: "partager url presse papier clipboard",
      copy: "https://portfolio.brezinben.dpdns.org/", title: "clipboard", out: [KV("copié", "https://portfolio.brezinben.dpdns.org/", "var(--fg2)", "var(--ok)")] },
    { kind: "action", label: "version texte", cmd: "open /texte", desc: "repli sans script", keys: "texte accessible brut lecteur ecran",
      href: "/texte", title: "open", out: [KV("url", "portfolio.brezinben.dpdns.org/texte")] },
    { kind: "action", label: "imprimer le CV", cmd: "cv --print", desc: "mise en page A4 formelle", keys: "print imprimer pdf cv partage",
      href: "/cv", title: "print", out: [KV("format", "A4, deux pages")] }
  ];

  const THEMES = [
    { id: "dark", label: "ambre nuit", bg: "#1c1d2b", acc: "#F5B83B", keys: "sombre defaut ambre" },
    { id: "light", label: "ambre jour", bg: "#f3ecec", acc: "#e6a000", keys: "clair jour ambre" },
    { id: "noctis", label: "noctis", bg: "#04252a", acc: "#49e9a6", keys: "sombre vert menthe" },
    { id: "azureus", label: "azureus", bg: "#061f2c", acc: "#49ace9", keys: "sombre bleu" },
    { id: "uva", label: "uva", bg: "#191634", acc: "#a29bfe", keys: "sombre violet" },
    { id: "bordo", label: "bordo", bg: "#23151d", acc: "#e0728c", keys: "sombre rose vin" },
    { id: "lux", label: "lux", bg: "#f2ecdd", acc: "#0c6d7a", keys: "clair creme sarcelle" },
    { id: "hibernus", label: "hibernus", bg: "#eaf1f3", acc: "#00707f", keys: "clair froid sarcelle" }
  ];

  const SUCCES = [
    { label: "visite guidée", famille: "exploration", hint: "toutes les sections vues", got: true },
    { label: "les huit ambiances", famille: "exploration", hint: "les huit thèmes essayés", got: false },
    { label: "hors des sentiers", famille: "exploration", hint: "la page 404", got: true },
    { label: "première commande", famille: "terminal", hint: "une commande tapée, pas cliquée", got: true },
    { label: "les deux premières lettres", famille: "terminal", hint: "Tab complète une commande", got: true },
    { label: "la vache parle", famille: "easter eggs", hint: "/cowsay", got: false },
    { label: "réveille-toi", famille: "easter eggs", hint: "/matrix", got: true },
    { label: "je suis une théière", famille: "easter eggs", hint: "/coffee", got: false },
    { label: "métamorphose", famille: "mascotte", hint: "/slime evolve", got: false },
    { label: "haut haut bas bas", famille: "secrets", hint: "konami", got: false },
    { label: "cliché de développeur", famille: "secrets", hint: "shift ×5", got: true },
    { label: "extinction des feux", famille: "secrets", hint: "shutdown", got: false }
  ];

  THEMES.forEach((t) => IDX.push({
    kind: "theme", label: t.label, cmd: "theme " + t.id, desc: t.id, keys: "theme couleurs " + t.keys,
    themeId: t.id, swatch: t.acc, swatchBg: t.bg, title: "theme",
    out: [KV("identifiant", t.id), KV("fond", t.bg), KV("accent", t.acc, "var(--fg2)", "var(--acc)")]
  }));

  SUCCES.forEach((s) => IDX.push({
    kind: "succes", label: s.label, cmd: 'bd achievements --grep "' + s.label + '"',
    desc: s.famille + " · " + (s.got ? "débloqué" : "verrouillé"),
    keys: "succes trophee achievement " + s.famille + " " + s.hint, title: "achievements",
    out: [KV("famille", s.famille), KV("condition", s.hint), KV("état", s.got ? "débloqué" : "verrouillé", "var(--fg2)", s.got ? "var(--ok)" : "var(--warn)"), KV("progression", "6 / 32 sur cet appareil")]
  }));

  global.paletteIndex = { items: IDX, themes: THEMES, succes: SUCCES, KV: KV };
})(window);
