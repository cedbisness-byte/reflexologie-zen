/* ============================================================
   Reflexio Zen — Système de réservation 100% client-side
   Calendrier mensuel + créneaux + formulaire + sessionStorage
   ============================================================ */
(function () {
  "use strict";

  var LS_KEY = "reflexio-zen-rdv-v1";
  var WEEKDAY_SLOTS = ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00", "17:00", "18:00"];
  var SATURDAY_SLOTS = ["09:00", "10:00", "11:00", "12:00"];
  var NAME_MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

  /* ---- WhatsApp : remplacer par le vrai numéro (format international sans + ni espace) ---- */
  var WA_NUMBER = "33763252204";
  function waLink(text) {
    return "https://wa.me/" + WA_NUMBER + "?text=" + encodeURIComponent(text);
  }
  var lastWaLink = null;

  var now = new Date();
  var viewMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  var selectedDay = null;
  var selectedSlot = null;

  var el = {
    calGrid: document.getElementById("cal-grid"),
    monthLabel: document.getElementById("month-label"),
    prev: document.getElementById("prev-month"),
    next: document.getElementById("next-month"),
    stepCal: document.getElementById("step-cal"),
    stepSlots: document.getElementById("step-slots"),
    stepForm: document.getElementById("step-form"),
    stepConfirm: document.getElementById("step-confirm"),
    slots: document.getElementById("slots"),
    slotsDate: document.getElementById("slots-date"),
    backCal: document.getElementById("back-cal"),
    backSlots: document.getElementById("back-slots"),
    form: document.getElementById("rdv-form"),
    recapDate: document.getElementById("recap-date"),
    recapSlot: document.getElementById("recap-slot"),
    cDate: document.getElementById("c-date"),
    cDetails: document.getElementById("c-details"),
    myRdvList: document.getElementById("my-rdv-list"),
    toast: document.querySelector(".toast")
  };

  /* ---------- Persistance ---------- */
  function getBookings() {
    try { return JSON.parse(sessionStorage.getItem(LS_KEY)) || []; }
    catch (e) { return []; }
  }
  function saveBookings(list) {
    try { sessionStorage.setItem(LS_KEY, JSON.stringify(list)); } catch (e) {}
  }
  function seedDemo() {
    var list = getBookings();
    if (list.length) return;
    var base = new Date();
    list.push(makeSeed(base, 1, "09:00", "Marie Dupont", "marie@exemple.fr", "0612345678", "Séance découverte"));
    list.push(makeSeed(base, 2, "14:00", "Julien Morel", "julien@exemple.fr", "0698765432", "Réflexologie plantaire — 60 €"));
    list.push(makeSeed(base, 3, "17:00", "Sophie Roux", "sophie@exemple.fr", "0611223344", "Formule détente & relaxation — 85 €"));
    list.push(makeSeed(base, 7, "10:00", "Nadia Benali", "nadia@exemple.fr", "0655667788", "Carnet de 5 séances"));
    list.push(makeSeed(base, 9, "16:00", "Antoine Lemaire", "antoine@exemple.fr", "0644556677", "Réflexologie plantaire — 60 €"));
    saveBookings(list);
  }
  function makeSeed(base, addDays, slot, name, email, phone, type) {
    var d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + addDays);
    while (d.getDay() === 0) d.setDate(d.getDate() + 1);
    return { date: fmtKey(d), slot: slot, name: name, email: email, phone: phone, type: type, seed: true };
  }
  function fmtKey(d) { return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function parseKey(k) { var p = k.split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); }

  /* ---------- Aides ---------- */
  function fmtDateFR(key) {
    var d = parseKey(key);
    return d.getDate() + " " + NAME_MONTHS[d.getMonth()] + " " + d.getFullYear();
  }
  function fmtSlot(s) {
    var p = s.split(":");
    return p[0] + "h" + p[1];
  }
  function sameDay(d, key) {
    return fmtKey(d) === key;
  }
  function isToday(key) {
    return sameDay(new Date(), key);
  }
  function daySlots(key) {
    var d = parseKey(key);
    var dow = d.getDay();
    if (dow === 0) return [];
    return dow === 6 ? SATURDAY_SLOTS.slice() : WEEKDAY_SLOTS.slice();
  }
  function slotsTaken(key) {
    return getBookings().filter(function (b) { return b.date === key; }).map(function (b) { return b.slot; });
  }
  function isDayFull(key) {
    var taken = slotsTaken(key);
    return daySlots(key).length > 0 && taken.length >= daySlots(key).length;
  }

  /* ---------- Calendrier ---------- */
  function renderCal() {
    var y = viewMonth.getFullYear(), m = viewMonth.getMonth();
    el.monthLabel.textContent = NAME_MONTHS[m] + " " + y;

    var cells = "";
    var first = new Date(y, m, 1);
    var offset = (first.getDay() + 6) % 7;
    var daysInMonth = new Date(y, m + 1, 0).getDate();
    var today = new Date();

    for (var i = 0; i < offset; i++) cells += '<span class="day dim"></span>';

    for (var d = 1; d <= daysInMonth; d++) {
      var key = y + "-" + String(m + 1).padStart(2, "0") + "-" + String(d).padStart(2, "0");
      var day = new Date(y, m, d);
      var dow = day.getDay();
      var past = day < new Date(today.getFullYear(), today.getMonth(), today.getDate());
      var isSunday = dow === 0;
      var full = isDayFull(key);
      var cls = ["day"];
      if (past || isSunday) cls.push("dim");
      if (isSunday) cls.push("off");
      if (!past && !isSunday && full) cls.push("busy");
      if (selectedDay === key) cls.push("sel");
      if (isToday(key)) cls.push("today");
      if (past || isSunday) {
        cells += '<span class="' + cls.join(" ") + '">' + d + "</span>";
      } else {
        cells += '<button class="' + cls.join(" ") + '" data-key="' + key + '">' + d + "</button>";
      }
    }
    el.calGrid.innerHTML = cells;
  }

  /* ---------- Créneaux ---------- */
  function renderSlots(key) {
    var slots = daySlots(key);
    var taken = slotsTaken(key);
    selectedSlot = null;
    el.slotsDate.textContent = fmtDateFR(key);
    if (!slots.length) {
      el.slots.innerHTML = '<p class="u-slot-empty">Aucun créneau ce jour-là.</p>';
      return;
    }
    var html = "";
    slots.forEach(function (s) {
      var off = taken.indexOf(s) !== -1;
      html += '<button class="slot' + (off ? "" : "") + '" data-slot="' + s + '"' + (off ? " disabled" : "") + ">" +
        fmtSlot(s) + (s >= "14:00" ? '<span class="suffix">après-midi</span>' : '<span class="suffix">matin</span>') + "</button>";
    });
    el.slots.innerHTML = html;
    el.slots.querySelectorAll(".slot").forEach(function (btn) {
      btn.addEventListener("click", function () {
        el.slots.querySelectorAll(".slot.sel").forEach(function (b) { b.classList.remove("sel"); });
        btn.classList.add("sel");
        selectedSlot = btn.dataset.slot;
        document.querySelector("#step-slots h3") && showStep("form");
      });
    });
  }

  /* ---------- Navigation entre étapes ---------- */
  function showStep(name) {
    el.stepCal.style.display = name === "cal" ? "" : "none";
    el.stepSlots.style.display = name === "slots" ? "" : "none";
    el.stepForm.style.display = name === "form" ? "" : "none";
    el.stepConfirm.style.display = name === "confirm" ? "" : "none";
    if (name === "form" && selectedDay && selectedSlot) {
      el.recapDate.textContent = fmtDateFR(selectedDay);
      el.recapSlot.textContent = fmtSlot(selectedSlot) + " — durée 60 min";
    }
    if (name !== "confirm") {
      var c = document.querySelector(".confirm");
      if (c) c.classList.remove("show");
    }
    window.scrollTo({ top: 180, behavior: "smooth" });
  }

  function resetSelection() {
    selectedDay = null;
    selectedSlot = null;
    el.form.reset();
    clearErrors();
    renderCal();
  }

  /* ---------- Mes rendez-vous ---------- */
  function renderMyRdv() {
    if (!el.myRdvList) return;
    var list = getBookings()
      .filter(function (b) { return parseKey(b.date) >= new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()); })
      .sort(function (a, b) { return a.date < b.date ? -1 : 1; });
    if (!list.length) {
      el.myRdvList.innerHTML = '<li class="empty-rdv">Vous n\'avez pas encore de rendez-vous à venir.</li>';
      return;
    }
    el.myRdvList.innerHTML = "";
    list.forEach(function (b) {
      var d = parseKey(b.date);
      var li = document.createElement("li");
      li.innerHTML =
        '<div class="d"><b>' + d.getDate() + "</b><span>" + NAME_MONTHS[d.getMonth()].slice(0, 3) + "</span></div>" +
        '<div class="info"><b>' + fmtSlot(b.slot) + " — " + escapeHtml(b.name) + "</b>" +
        "<span>" + escapeHtml(b.type) + " · " + fmtDateFR(b.date) + "</span></div>" +
        '<button class="cancel" data-key="' + b.date + '" data-slot="' + b.slot + '">Annuler</button>';
      li.querySelector(".cancel").addEventListener("click", function () { cancelRdv(b.date, b.slot); });
      el.myRdvList.appendChild(li);
    });
  }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /* ---------- Annulation ---------- */
  function cancelRdv(date, slot) {
    var list = getBookings().filter(function (b) { return !(b.date === date && b.slot === slot); });
    saveBookings(list);
    renderMyRdv();
    renderCal();
    toast("Rendez-vous du " + fmtDateFR(date) + " à " + fmtSlot(slot) + " annulé.", "ok");
  }

  /* ---------- Formulaire ---------- */
  function clearErrors() {
    el.form.querySelectorAll(".err").forEach(function (i) { i.classList.remove("err"); });
    el.form.querySelectorAll(".err-msg").forEach(function (s) { s.classList.remove("show"); });
  }
  function markErr(input) {
    input.classList.add("err");
    var msg = input.closest(".field").querySelector(".err-msg");
    if (msg) msg.classList.add("show");
  }
  function validEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v); }
  function validPhone(v) { return /^[+0-9][0-9 .\-()]{8,}$/.test(v); }

  if (el.form) {
  el.form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!selectedDay || !selectedSlot) { toast("Veuillez choisir un jour et un créneau.", "err"); return; }
    clearErrors();
    var ok = true;
    var prenom = document.getElementById("f-prenom").value.trim();
    var nom = document.getElementById("f-nom").value.trim();
    var email = document.getElementById("f-email").value.trim();
    var tel = document.getElementById("f-tel").value.trim();
    var type = document.getElementById("f-type").value;
    var msg = document.getElementById("f-msg").value.trim();

    if (prenom.length < 2) { markErr(document.getElementById("f-prenom")); ok = false; }
    if (nom.length < 2) { markErr(document.getElementById("f-nom")); ok = false; }
    if (!validEmail(email)) { markErr(document.getElementById("f-email")); ok = false; }
    if (!validPhone(tel)) { markErr(document.getElementById("f-tel")); ok = false; }
    if (!ok) { toast("Merci de corriger les champs signalés.", "err"); return; }

    var list = getBookings();
    if (list.some(function (b) { return b.date === selectedDay && b.slot === selectedSlot; })) {
      toast("Ce créneau vient d'être réservé. Veuillez en choisir un autre.", "err");
      showStep("slots");
      renderSlots(selectedDay);
      return;
    }

    list.push({ date: selectedDay, slot: selectedSlot, name: prenom + " " + nom, email: email, phone: tel, type: type, msg: msg });
    saveBookings(list);

    el.cDate.textContent = fmtDateFR(selectedDay) + " à " + fmtSlot(selectedSlot);
    el.cDetails.textContent = type + " — " + prenom + " " + nom;

    lastWaLink = waLink(
      "Bonjour Reflexio Zen,\n\n" +
      "Je souhaite réserver une séance :\n" +
      "• Jour : " + fmtDateFR(selectedDay) + "\n" +
      "• Créneau : " + fmtSlot(selectedSlot) + "\n" +
      "• Prestation : " + type + "\n\n" +
      "Mes coordonnées :\n" +
      "• " + prenom + " " + nom + "\n" +
      "• E-mail : " + email + "\n" +
      "• Téléphone : " + tel +
      (msg ? "\n\n" + msg : "") +
      "\n\nMerci de me confirmer la disponibilité. À très vite !"
    );

    var c = document.querySelector(".confirm");
    c.classList.add("show");
    showStep("confirm");
    renderMyRdv();
    renderCal();
    toast("WhatsApp ouvert : envoyez le message pour valider.", "ok");
    window.open(lastWaLink, "_blank");
  });
  }

  /* ---------- Bouton « Réouvrir WhatsApp » ---------- */
  var waRetry = document.getElementById("wa-retry");
  if (waRetry) {
    waRetry.addEventListener("click", function () {
      if (lastWaLink) window.open(lastWaLink, "_blank");
      else toast("Choisissez d'abord un créneau.", "err");
    });
  }

  /* ---------- Formulaire de contact → WhatsApp ---------- */
  var contactForm = document.getElementById("contact-form");
  if (contactForm) {
    contactForm.addEventListener("submit", function (e) {
      e.preventDefault();
      contactForm.querySelectorAll(".err").forEach(function (i) { i.classList.remove("err"); });
      contactForm.querySelectorAll(".err-msg").forEach(function (s) { s.classList.remove("show"); });
      function markErr(id) {
        var i = document.getElementById(id);
        i.classList.add("err");
        var msg = i.closest(".field").querySelector(".err-msg");
        if (msg) msg.classList.add("show");
      }
      var prenom = document.getElementById("c-prenom").value.trim();
      var nom = document.getElementById("c-nom").value.trim();
      var tel = document.getElementById("c-tel").value.trim();
      var sujet = document.getElementById("c-sujet").value;
      var msg = document.getElementById("c-msg").value.trim();
      var ok = true;
      if (prenom.length < 2) { markErr("c-prenom"); ok = false; }
      if (nom.length < 2) { markErr("c-nom"); ok = false; }
      if (!validPhone(tel)) { markErr("c-tel"); ok = false; }
      if (msg.length < 5) { markErr("c-msg"); ok = false; }
      if (!ok) { toast("Merci de corriger les champs signalés.", "err"); return; }
      var smsLink = "sms:+33763252204?body=" + encodeURIComponent(
        "Bonjour Monica,\n\n" +
        "Sujet : " + sujet + "\n\n" +
        msg + "\n\n" +
        "Coordonnées : " + prenom + " " + nom + " · " + tel + "\n\nMerci !"
      );
      try { sessionStorage.setItem("reflexioDemande", JSON.stringify({ kind: "sms", href: smsLink })); } catch (err) {}
      setTimeout(function () { window.location.href = "merci.html"; }, 600);
      toast("Application SMS ouverte : envoyez le message pour m'écrire.", "ok");
    });
  }

  /* ---------- Toast ---------- */
  var toastTimer = null;
  function toast(text, kind) {
    el.toast.textContent = text;
    el.toast.className = "toast show " + (kind || "");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.toast.classList.remove("show"); }, 4200);
  }

  /* ---------- Événements (présents uniquement sur la page RDV) ---------- */
  if (el.prev) el.prev.addEventListener("click", function () {
    viewMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1);
    renderCal();
  });
  if (el.next) el.next.addEventListener("click", function () {
    viewMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1);
    renderCal();
  });

  if (el.calGrid) el.calGrid.addEventListener("click", function (e) {
    var btn = e.target.closest("button.day[data-key]");
    if (!btn) return;
    selectedDay = btn.dataset.key;
    renderCal();
    renderSlots(selectedDay);
    showStep("slots");
  });

  if (el.backCal) el.backCal.addEventListener("click", function () { showStep("cal"); });
  if (el.backSlots) el.backSlots.addEventListener("click", function () { showStep("slots"); });

  /* ---------- Init ---------- */
  /* seedDemo desactive : les donnees sont volatiles par session, pas de fausses donnees */
  if (el.calGrid) renderCal();
  if (el.myRdvList) renderMyRdv();

  /* ---------- Réservation rapide : formule + canal (WhatsApp / SMS / e-mail) ---------- */
  try {
  var formuleSelect = document.getElementById("rdv-formule");
  var waSubmit = document.getElementById("wa-submit");
  var smsSubmit = document.getElementById("sms-submit");
  var mailSubmit = document.getElementById("mail-submit");
  var rdvHint = document.getElementById("rdv-hint");
  var MAIL_TO = "moninaestevez@hotmail.com";

  function rdvMsg() {
    if (formuleSelect && formuleSelect.value) {
      return "Bonjour Monica, je souhaite réserver " + formuleSelect.value + ".";
    }
    return "Bonjour Monica, je souhaite réserver une séance de réflexologie plantaire.";
  }
  function refreshRdvLinks() {
    var msg = rdvMsg();
    if (waSubmit) { waSubmit.href = "https://wa.me/33763252204?text=" + encodeURIComponent(msg); }
    if (smsSubmit) { smsSubmit.href = "sms:+33763252204?body=" + encodeURIComponent(msg); }
    if (mailSubmit) { mailSubmit.href = "mailto:" + MAIL_TO + "?subject=" + encodeURIComponent("Prise de rendez-vous") + "&body=" + encodeURIComponent(msg + "\n\nMerci de me confirmer la disponibilité. À très vite !"); }
    [waSubmit, smsSubmit, mailSubmit].forEach(function (a) {
      if (a) { a.style.opacity = ""; a.style.pointerEvents = ""; }
    });
    if (rdvHint) {
      rdvHint.textContent = formuleSelect && formuleSelect.value
        ? "Votre message est prêt : envoyez-le, je vous confirme le créneau rapidement."
        : "Les boutons sont prêts : envoyez votre demande. Vous pouvez aussi préciser une formule ci-dessus.";
    }
  }
  if (formuleSelect) {
    formuleSelect.addEventListener("change", refreshRdvLinks);
    /* Page de remerciement : on enregistre la demande puis on y redirige */
    function recordDemande(kind, a) {
      if (!a) return;
      a.addEventListener("click", function () {
        try { sessionStorage.setItem("reflexioDemande", JSON.stringify({ kind: kind, href: a.href })); } catch (e) {}
        if (kind !== "whatsapp") {
          setTimeout(function () { window.location.href = "merci.html"; }, 900);
        } else {
          setTimeout(function () { if (!document.hidden) window.location.href = "merci.html"; }, 1500);
        }
      });
    }
    recordDemande("whatsapp", waSubmit);
    recordDemande("sms", smsSubmit);
    recordDemande("mail", mailSubmit);
    refreshRdvLinks();
  }
  } catch (e) {}
  var purgeBtn = document.getElementById("purge-data");
  if (purgeBtn) {
    purgeBtn.addEventListener("click", function () {
      try { sessionStorage.removeItem(LS_KEY); } catch (e) {}
      try { sessionStorage.removeItem("reflexioDemande"); } catch (e) {}
      renderMyRdv();
      purgeBtn.textContent = "Donnees effacees";
      setTimeout(function () { purgeBtn.textContent = "Effacer mes donnees de ce navigateur"; }, 2500);
    });
  }
})();
