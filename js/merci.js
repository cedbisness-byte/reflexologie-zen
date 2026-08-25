/* ============================================================
   Page de remerciement — personnalisation selon le canal utilisé
   (WhatsApp / SMS / e-mail) via sessionStorage "reflexioDemande"
   Sécurité : liste blanche stricte des liens autorisés.
   ============================================================ */
(function () {
  "use strict";

  var data = null;
  var raw = null;
  try { raw = sessionStorage.getItem("reflexioDemande"); } catch (e) {}
  if (raw) {
    try {
      var parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") data = parsed;
    } catch (e) { /* JSON invalide : ignoré */ }
  }

  var action = document.getElementById("merci-action");
  var label = document.getElementById("merci-action-label");
  var hint = document.getElementById("merci-action-hint");

  var CANAUX = {
    whatsapp: {
      btn: "Envoyer ma demande sur WhatsApp",
      hint: "Votre message est déjà rédigé : il ne reste qu'à l'envoyer depuis WhatsApp.",
      track: "whatsapp",
      test: /^https:\/\/wa\.me\/33763252204\b/i
    },
    sms: {
      btn: "Envoyer ma demande par SMS",
      hint: "Votre message est déjà rédigé : il ne reste qu'à l'envoyer depuis votre application SMS.",
      track: "sms",
      test: /^sms:\+33763252204\b/i
    },
    mail: {
      btn: "Envoyer ma demande par e-mail",
      hint: "Votre message est déjà rédigé : il ne reste qu'à cliquer sur « Envoyer » dans votre messagerie.",
      track: "email",
      test: /^mailto:moninaestevez@hotmail\.com\b/i
    }
  };

  function lienAutorise(kind, href) {
    if (!href || typeof href !== "string" || href.length > 2000) return false;
    var canal = CANAUX[kind];
    return !!(canal && canal.test.test(href));
  }

  var canal = data ? CANAUX[data.kind] : null;

  if (data && canal && lienAutorise(data.kind, data.href) && action && label && hint) {
    action.setAttribute("rel", "noopener");
    action.href = data.href;
    label.textContent = canal.btn;
    hint.textContent = canal.hint;
    document.getElementById("merci-etape").style.display = "";
  } else if (action) {
    /* Accès direct à la page sans demande en cours : on masque la carte d'action */
    var card = document.getElementById("merci-carte");
    if (card) card.style.display = "none";
  }

  try { sessionStorage.removeItem("reflexioDemande"); } catch (e) {}

  /* Suivi GA4 de la conversion "demande envoyée" */
  if (typeof window.gtag === "function") {
    window.gtag("event", "generate_lead", { method: canal ? canal.track : "inconnu" });
  }
})();
