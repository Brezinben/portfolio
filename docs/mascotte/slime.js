/* Mascotte slime — machine à états et déclencheurs.
   Attend un élément .slime dans le document et le dossier sprites/ à côté.
   Aucune dépendance. */

(function () {
  "use strict";

  // état : [fichier, frames, durée en s, bouclée ?]
  var S = {
    idle: ["slime-idle.png", 12, 1.44, 1],
    wink: ["slime-wink.png", 12, 1.68, 0],
    jump: ["slime-jump.png", 16, 1.28, 0],
    type: ["slime-type.png", 12, 0.72, 1],
    load: ["slime-load.png", 16, 1.6, 1],
    sleep: ["slime-sleep.png", 16, 3.2, 1],
    morph: ["slime-morph.png", 16, 2.4, 0],
    crown: ["slime-crown.png", 16, 1.44, 0],
    king: ["slime-idle-crown.png", 12, 1.44, 1],
  };

  var el = document.querySelector(".slime");
  if (!el) return;

  var SIZE = 128; // px par frame à l'affichage
  var BASE_PATH = "sprites/";
  var couronne = localStorage.getItem("slimeCrown") === "1";
  var repos = couronne ? "king" : "idle"; // état de repos courant
  var courant = null;
  var calme = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function play(nom) {
    var s = S[nom];
    if (!s) return;
    if (!calme && !s[3]) return; // pas de passe rapide en motion réduite
    var n = s[1];
    courant = nom;
    el.style.animation = "none";
    void el.offsetWidth; // reset, sinon la même animation ne rejoue pas
    el.style.backgroundImage = 'url("' + BASE_PATH + s[0] + '")';
    el.style.backgroundSize = n * SIZE + "px " + SIZE + "px";
    el.style.animation =
      "slime-" + n + " " + s[2] + "s steps(" + n + ") " + (s[3] ? "infinite" : "1");
    if (!s[3]) el.addEventListener("animationend", retour, { once: true });
  }

  function retour() {
    play(repos);
  }

  // --- déclencheurs ---------------------------------------------------------

  var clics = 0;
  el.addEventListener("click", function () {
    clics += 1;
    if (clics === 26 && !couronne) {
      // la couronne du terminal
      couronne = true;
      localStorage.setItem("slimeCrown", "1");
      repos = "king";
      play("crown");
    } else {
      play("wink");
    }
  });

  var veille;
  function reveil() {
    clearTimeout(veille);
    if (courant === "sleep") play(repos);
    veille = setTimeout(function () {
      play("sleep");
    }, 10000);
  }
  ["mousemove", "keydown", "scroll", "touchstart"].forEach(function (e) {
    addEventListener(e, reveil, { passive: true });
  });

  // 4 % de chance toutes les 5 s, uniquement au repos
  setInterval(function () {
    if (courant !== repos) return;
    if (Math.random() < 0.04) play(Math.random() < 0.5 ? "wink" : "jump");
  }, 5000);

  // à brancher sur le terminal :
  //   input dans le prompt   -> slime.play("type"), puis slime.play(null) 400 ms après
  //   commande en attente    -> slime.play("load")
  //   sortie affichée        -> slime.play("jump")
  //   changement de thème    -> slime.play("morph")
  window.slime = {
    play: function (nom) {
      play(nom || repos);
    },
    repos: function (nom) {
      repos = nom;
      play(nom);
    },
    etat: function () {
      return courant;
    },
  };

  play(repos);
  reveil();
})();
