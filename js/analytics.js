// !! IMPORTANT : si un vrai ID GA4 est configure un jour, remettre aussi dans vercel.json :
// script-src https://www.googletagmanager.com
// connect-src https://*.google-analytics.com https://*.analytics.google.com
/* ============================================================
   Google Analytics 4 — chargement dynamique
   Remplacez G-XXXXXXXXXX par votre identifiant de mesure GA4.
   Tant que l'ID n'est pas configure : AUCUN appel reseau vers Google.
   ============================================================ */
(function () {
  "use strict";
  var MEASUREMENT_ID = "G-XXXXXXXXXX";
  if (!/^G-[A-Z0-9]{6,}$/.test(MEASUREMENT_ID) || MEASUREMENT_ID.indexOf("XXX") !== -1) return;
  var s = document.createElement("script");
  s.async = true;
  s.src = "https://www.googletagmanager.com/gtag/js?id=" + MEASUREMENT_ID;
  document.head.appendChild(s);
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = window.gtag || gtag;
  gtag("js", new Date());
  gtag("config", MEASUREMENT_ID, { anonymize_ip: true });
})();