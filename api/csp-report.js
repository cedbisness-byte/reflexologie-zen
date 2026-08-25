/* ============================================================
   Récepteur de violations CSP — durci + alerte e-mail automatique
   - Validation stricte (type MIME, taille, forme du JSON)
   - Champs tronqués : impossible de polluer les logs
   - Alerte e-mail throttlée (max 1 / 10 min / instance) via
     FormSubmit — la 1ère alerte demande une activation par clic.
   ============================================================ */
var ALERT_EMAIL = "moninaestevez@hotmail.com";
var MIN_GAP_MS = 10 * 60 * 1000;
var lastAlertAt = 0;

function clip(v, n) {
  v = String(v == null ? "" : v);
  return v.length > n ? v.slice(0, n) : v;
}

module.exports = async function (req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "POST uniquement" });
    return;
  }

  var ct = String(req.headers["content-type"] || "");
  if (!/(application\/json|application\/csp-report|application\/reports\+json)/i.test(ct)) {
    res.status(415).json({ error: "Type de contenu non supporte" });
    return;
  }

  var raw = "";
  try { raw = JSON.stringify(req.body || ""); } catch (e) { raw = ""; }
  if (!raw || raw.length > 8192) {
    res.status(413).json({ error: "Charge trop volumineuse" });
    return;
  }

  var body = req.body;
  var report = null;
  if (body && typeof body === "object" && !Array.isArray(body) &&
      body["csp-report"] && typeof body["csp-report"] === "object") {
    report = body["csp-report"];
  } else if (Array.isArray(body) && body[0] && typeof body[0] === "object" && body[0].type) {
    report = body[0];
  }
  if (!report) {
    res.status(400).json({ error: "Format invalide" });
    return;
  }

  var entry = {
    time: new Date().toISOString(),
    ip: clip(((req.headers["x-forwarded-for"] || "").split(",")[0] || "").trim(), 64),
    ua: clip(req.headers["user-agent"], 200),
    directive: clip(report["violated-directive"] || report.directive || "", 120),
    blocked: clip(report["blocked-uri"] || report.url || "", 300),
    document: clip(report["document-uri"] || report.destination || "", 300)
  };
  console.log("[CSP-VIOLATION] " + JSON.stringify(entry));

  var now = Date.now();
  if (now - lastAlertAt > MIN_GAP_MS) {
    lastAlertAt = now;
    try {
      var r = await fetch("https://formsubmit.co/ajax/" + ALERT_EMAIL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          _subject: "[SECURITE] Violation CSP bloquee sur le site",
          message:
            "Une tentative a ete bloquee par la politique de securite.\n\n" +
            "Directive : " + entry.directive + "\n" +
            "Contenu bloque : " + entry.blocked + "\n" +
            "Page : " + entry.document + "\n" +
            "IP source : " + entry.ip + "\n" +
            "Navigateur : " + entry.ua + "\n" +
            "Heure : " + entry.time
        })
      });
      console.log("[CSP-ALERT] email statut: " + r.status);
    } catch (e) {
      console.log("[CSP-ALERT] echec envoi: " + (e && e.message));
    }
  } else {
    console.log("[CSP-ALERT] throttle actif");
  }

  res.status(204).end();
};
