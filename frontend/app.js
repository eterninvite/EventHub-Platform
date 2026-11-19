// EventHub — Platformă de management al evenimentelor (Monedă: MDL)

const STORAGE_KEY = "eventhub_platform_state_v3";
const SEAT_ROWS = ["A", "B", "C", "D"];
const SEAT_COLS = [1, 2, 3, 4, 5, 6];

const STATE_LABELS = {
  DRAFT: "Draft",
  PUBLISHED: "Publicat",
  ONGOING: "În desfășurare",
  COMPLETED: "Încheiat",
  CANCELLED: "Anulat"
};

function createDefaultState() {
  return {
    activeEventId: "ev-1",
    events: [
      {
        id: "ev-1",
        code: "CONF-2026",
        title: "Moldova Tech Summit 2026",
        type: "conferinta",
        typeLabel: "Conferință",
        city: "Chișinău",
        date: "2026-10-15",
        hall: "Palatul Republicii",
        capacity: 350,
        basePrice: 450,
        catering: true,
        livestream: true,
        equipment: "Scenă principală, microfoane, proiector 4K, ecusoane speakeri.",
        state: "PUBLISHED",
        reservedSeats: ["A1", "A2", "B3"],
        seatHistory: [
          { action: "REZERVARE", seat: "A1", time: "10:05" },
          { action: "REZERVARE", seat: "A2", time: "10:06" },
          { action: "REZERVARE", seat: "B3", time: "10:12" }
        ],
        agenda: [
          {
            id: "tr-1",
            name: "Sesiuni Dimineață",
            sessions: [
              { id: "s-1", name: "Keynote Deschidere", minutes: 45 },
              { id: "s-2", name: "Arhitectură Software Modernă", minutes: 50 }
            ]
          },
          {
            id: "tr-2",
            name: "Sesiuni După-Amiază",
            sessions: [
              { id: "s-3", name: "Workshop Sisteme Distribuite", minutes: 60 },
              { id: "s-4", name: "Networking & Q&A", minutes: 30 }
            ]
          }
        ]
      },
      {
        id: "ev-2",
        code: "JAZZ-2026",
        title: "Chișinău Jazz & Lights Fest",
        type: "concert",
        typeLabel: "Concert",
        city: "Chișinău",
        date: "2026-11-08",
        hall: "Arena Chișinău",
        capacity: 1200,
        basePrice: 350,
        catering: false,
        livestream: true,
        equipment: "Sistem sonorizare, lumini scenă, brățări acces, pază.",
        state: "DRAFT",
        reservedSeats: ["A4"],
        seatHistory: [{ action: "REZERVARE", seat: "A4", time: "09:40" }],
        agenda: [
          {
            id: "tr-3",
            name: "Main Stage",
            sessions: [
              { id: "s-5", name: "Opening Quartet", minutes: 50 },
              { id: "s-6", name: "Headliner Live Set", minutes: 90 }
            ]
          }
        ]
      }
    ],
    tickets: [
      {
        id: "tk-1",
        eventId: "ev-1",
        eventTitle: "Moldova Tech Summit 2026",
        eventCode: "CONF-2026",
        guest: "Elena Moraru",
        tier: "vip",
        ticketLabel: "Bilet VIP (Rândul 1 + Lounge)",
        badgeLabel: "Ecuson metalic auriu + șnur personalizat",
        strategyLabel: "Early Bird (-25%)",
        addons: ["Acces Backstage", "Cină Networking"],
        totalPrice: 907.5,
        legacyReceipt: "SYNC_OK[CONF-2026;Elena Moraru|BANI=90750]"
      }
    ],
    subscribers: [
      { id: "sub-1", channel: "Email", target: "maria.rusu@eventhub.md" },
      { id: "sub-2", channel: "SMS", target: "+373 69 000 111" },
      { id: "sub-3", channel: "Push App", target: "@alex_md" }
    ],
    notificationLogs: []
  };
}

let state = loadState();
let backendAvailable = false;

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && Array.isArray(parsed.events) && parsed.events.length > 0) {
        return parsed;
      }
    }
  } catch (_) {}
  return createDefaultState();
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (_) {}
}

function getActiveEvent() {
  return state.events.find((e) => e.id === state.activeEventId) || state.events[0];
}

function nowTime() {
  return new Date().toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function formatMdl(amount) {
  const num = Number(amount || 0);
  return `${num.toLocaleString("ro-RO", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} MDL`;
}

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ===================== SINCRONIZARE SILENȚIOASĂ CU SERVERUL =====================
async function detectBackend() {
  if (window.location.protocol === "file:") {
    backendAvailable = false;
    return;
  }
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1500);
    const res = await fetch("/api/health", { signal: controller.signal });
    clearTimeout(timer);
    if (res.ok) {
      const data = await res.json();
      backendAvailable = Boolean(data && data.status === "ok");
    }
  } catch (_) {
    backendAvailable = false;
  }
}

async function syncOperation(operationKey, payload) {
  if (!backendAvailable) return;
  try {
    await fetch("/api/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pattern: operationKey, input: payload })
    });
  } catch (_) {
    backendAvailable = false;
  }
}

function showToast(message) {
  const container = document.getElementById("toastContainer");
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = message;
  container.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

// ===================== NAVIGARE =====================
const VIEW_META = {
  events: ["Dashboard Evenimente", "Planifică, publică și administrează toate evenimentele dintr-un singur loc."],
  tickets: ["Bilete & Tarife", "Emite bilete și ecusoane cu tarife flexibile, extraopțiuni și sincronizare externă."],
  seating: ["Hartă Locuri", "Administrează rezervările pe harta sălii cu posibilitate de anulare rapidă."],
  agenda: ["Agendă & Program", "Organizează programul pe secțiuni și urmărește durata totală a evenimentului."],
  notifications: ["Notificări Participanți", "Trimite anunțuri și actualizări live pe Email, SMS și Push App."]
};

function switchView(viewId) {
  document.querySelectorAll(".nav-btn").forEach((b) => {
    b.classList.toggle("active", b.dataset.view === viewId);
  });
  document.querySelectorAll(".view").forEach((v) => {
    v.classList.toggle("active", v.id === `view-${viewId}`);
  });
  const [title, sub] = VIEW_META[viewId] || VIEW_META.events;
  document.getElementById("pageTitle").textContent = title;
  document.getElementById("pageSubtitle").textContent = sub;
}

// ===================== RENDER GLOBAL & KPIs =====================
function renderAll() {
  renderGlobalPicker();
  renderKPIs();
  renderEventsList();
  renderTicketPreview();
  renderTicketsList();
  renderSeatMap();
  renderAgenda();
  renderNotifications();
}

function renderGlobalPicker() {
  const select = document.getElementById("globalEventSelect");
  select.innerHTML = "";
  state.events.forEach((ev) => {
    const opt = document.createElement("option");
    opt.value = ev.id;
    opt.textContent = `${ev.title} (${ev.city})`;
    if (ev.id === state.activeEventId) opt.selected = true;
    select.appendChild(opt);
  });
}

function renderKPIs() {
  const totalRevenue = state.tickets.reduce((sum, t) => sum + Number(t.totalPrice || 0), 0);
  const totalSeats = state.events.reduce((sum, e) => sum + (e.reservedSeats ? e.reservedSeats.length : 0), 0);

  document.getElementById("kpiEvents").textContent = state.events.length;
  document.getElementById("kpiTickets").textContent = state.tickets.length;
  document.getElementById("kpiRevenue").textContent = formatMdl(totalRevenue);
  document.getElementById("kpiSeats").textContent = totalSeats;
  document.getElementById("navEventsCount").textContent = state.events.length;
  document.getElementById("navTicketsCount").textContent = state.tickets.length;
}

// ===================== 1. EVENIMENTE =====================
function getEventDefaults(type) {
  if (type === "concert") {
    return {
      label: "Concert",
      equipment: "Sistem sonorizare, lumini scenă, brățări acces, pază."
    };
  }
  if (type === "workshop") {
    return {
      label: "Workshop",
      equipment: "Sală 30 locuri, mese de lucru, prize, materiale tipărite."
    };
  }
  return {
    label: "Conferință",
    equipment: "Scenă principală, microfoane, proiector 4K, ecusoane speakeri."
  };
}

document.getElementById("createEventForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const title = document.getElementById("evTitle").value.trim();
  const type = document.getElementById("evType").value;
  const city = document.getElementById("evCity").value.trim() || "Chișinău";
  const date = document.getElementById("evDate").value || "2026-10-15";
  const hall = document.getElementById("evHall").value.trim() || "Palatul Republicii";
  const capacity = parseInt(document.getElementById("evCapacity").value, 10) || 150;
  const basePrice = parseFloat(document.getElementById("evBasePrice").value) || 350;
  const catering = document.getElementById("evCatering").checked;
  const livestream = document.getElementById("evLivestream").checked;

  const defaults = getEventDefaults(type);
  const newEv = {
    id: "ev-" + Date.now(),
    code: type.slice(0, 4).toUpperCase() + "-" + String(Date.now()).slice(-3),
    title,
    type,
    typeLabel: defaults.label,
    city,
    date,
    hall,
    capacity,
    basePrice,
    catering,
    livestream,
    equipment: defaults.equipment,
    state: "DRAFT",
    reservedSeats: [],
    seatHistory: [],
    agenda: [
      {
        id: "tr-" + Date.now(),
        name: "Sesiuni Principale",
        sessions: [{ id: "s-" + Date.now(), name: "Deschidere & Keynote", minutes: 45 }]
      }
    ]
  };

  state.events.unshift(newEv);
  state.activeEventId = newEv.id;
  saveState();

  const extras = [catering ? "catering" : "", livestream ? "livestream" : ""].filter(Boolean).join(",");
  syncOperation("factory-method", `${type}:${title}`);
  syncOperation("builder", `${title} | ${hall} | ${capacity} | ${extras}`);

  document.getElementById("evTitle").value = "";
  renderAll();
  showToast(`Evenimentul „${title}” a fost creat.`);
});

function renderEventsList() {
  const container = document.getElementById("eventsList");
  const query = document.getElementById("eventSearchInput").value.trim().toLowerCase();
  const statusFilter = document.getElementById("eventStatusFilter").value;

  const filtered = state.events.filter((ev) => {
    if (statusFilter !== "ALL" && ev.state !== statusFilter) return false;
    if (!query) return true;
    return `${ev.title} ${ev.city} ${ev.typeLabel} ${ev.hall}`.toLowerCase().includes(query);
  });

  if (filtered.length === 0) {
    container.innerHTML = '<div class="empty-msg">Niciun eveniment găsit pentru criteriile selectate.</div>';
    return;
  }

  container.innerHTML = "";
  filtered.forEach((ev) => {
    const card = document.createElement("div");
    card.className = `event-card${ev.id === state.activeEventId ? " is-active" : ""}`;
    const extrasText = [
      ev.catering ? "Catering inclus" : null,
      ev.livestream ? "Livestream HD" : null
    ]
      .filter(Boolean)
      .join(" • ");

    card.innerHTML = `
      <div class="event-card-top">
        <div>
          <h4 class="event-title">${escapeHtml(ev.title)}</h4>
          <div class="event-meta">
            <span>${escapeHtml(ev.typeLabel)}</span>
            <span class="meta-sep">•</span>
            <span>${escapeHtml(ev.city)}, ${escapeHtml(ev.hall)}</span>
            <span class="meta-sep">•</span>
            <span>${escapeHtml(ev.date)}</span>
            <span class="meta-sep">•</span>
            <span>${Number(ev.capacity)} locuri</span>
            <span class="meta-sep">•</span>
            <span><strong>${formatMdl(ev.basePrice)}</strong></span>
            ${extrasText ? `<span class="meta-sep">•</span><span>${extrasText}</span>` : ""}
          </div>
        </div>
        <span class="state-badge state-${ev.state}">${STATE_LABELS[ev.state] || ev.state}</span>
      </div>
      <div class="event-equipment"><strong>Logistică configurată:</strong> ${escapeHtml(ev.equipment)}</div>
      <div class="event-actions">
        <button class="btn btn-xs btn-outline" data-action="select" data-id="${ev.id}">
          ${ev.id === state.activeEventId ? "Selectat" : "Selectează"}
        </button>
        ${
          ev.state === "DRAFT"
            ? `<button class="btn btn-xs btn-accent" data-action="publish" data-id="${ev.id}">Publică complet</button>`
            : ""
        }
        <button class="btn btn-xs btn-primary" data-action="advance" data-id="${ev.id}">Trece la etapa următoare</button>
        <button class="btn btn-xs btn-danger-soft" data-action="cancel" data-id="${ev.id}">Anulează</button>
        <button class="btn btn-xs btn-outline" data-action="clone" data-id="${ev.id}">Duplică ediție</button>
      </div>
    `;
    container.appendChild(card);
  });
}

document.getElementById("eventsList").addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;
  const action = btn.dataset.action;
  const ev = state.events.find((item) => item.id === btn.dataset.id);
  if (!ev) return;

  if (action === "select") {
    state.activeEventId = ev.id;
    saveState();
    renderAll();
    showToast(`Eveniment activ: ${ev.title}`);
    return;
  }

  if (action === "publish") {
    ev.state = "PUBLISHED";
    saveState();
    syncOperation("facade", `${ev.title} | ${ev.hall}`);
    renderAll();
    showToast(`Evenimentul „${ev.title}” a fost publicat (sală rezervată, bilete active, invitații trimise).`);
    return;
  }

  if (action === "advance") {
    const transitions = {
      DRAFT: "PUBLISHED",
      PUBLISHED: "ONGOING",
      ONGOING: "COMPLETED"
    };
    const next = transitions[ev.state];
    if (next) {
      ev.state = next;
      saveState();
      syncOperation("state", "next");
      renderAll();
      showToast(`Status actualizat: ${STATE_LABELS[next]}.`);
    } else {
      showToast(`Evenimentul se află deja în starea finală (${STATE_LABELS[ev.state]}).`);
    }
    return;
  }

  if (action === "cancel") {
    if (ev.state === "DRAFT" || ev.state === "PUBLISHED") {
      ev.state = "CANCELLED";
      saveState();
      syncOperation("state", "cancel");
      renderAll();
      showToast(`Evenimentul „${ev.title}” a fost anulat.`);
    } else {
      showToast(`Un eveniment cu statusul „${STATE_LABELS[ev.state]}” nu poate fi anulat.`);
    }
    return;
  }

  if (action === "clone") {
    document.getElementById("cloneSourceId").value = ev.id;
    document.getElementById("cloneModalTitle").textContent = `Duplică ediție: ${ev.title}`;
    document.getElementById("cloneModal").classList.remove("hidden");
  }
});

document.getElementById("eventSearchInput").addEventListener("input", renderEventsList);
document.getElementById("eventStatusFilter").addEventListener("change", renderEventsList);

// Clone Modal
function closeCloneModal() {
  document.getElementById("cloneModal").classList.add("hidden");
}
document.getElementById("closeCloneModal").addEventListener("click", closeCloneModal);
document.getElementById("cancelCloneBtn").addEventListener("click", closeCloneModal);
document.getElementById("cloneModal").addEventListener("click", (e) => {
  if (e.target.id === "cloneModal") closeCloneModal();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeCloneModal();
});

document.getElementById("cloneEventForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const sourceId = document.getElementById("cloneSourceId").value;
  const newCity = document.getElementById("cloneCity").value.trim() || "Bălți";
  const newDate = document.getElementById("cloneDate").value || "2026-11-20";
  const original = state.events.find((ev) => ev.id === sourceId);
  if (!original) return;

  const cloned = JSON.parse(JSON.stringify(original));
  cloned.id = "ev-" + Date.now();
  cloned.city = newCity;
  cloned.date = newDate;
  cloned.state = "DRAFT";
  cloned.reservedSeats = [];
  cloned.seatHistory = [];

  state.events.unshift(cloned);
  state.activeEventId = cloned.id;
  saveState();
  closeCloneModal();

  syncOperation("prototype", `${newCity} | ${newDate}`);
  renderAll();
  showToast(`Ediție nouă creată pentru ${newCity} (${newDate}).`);
});

// ===================== 2. BILETE & TARIFE =====================
function computeTicketQuote() {
  const ev = getActiveEvent();
  const base = ev ? Number(ev.basePrice) : 450;
  const strategyKey = document.getElementById("tkStrategy").value;
  const strategies = {
    earlybird: { label: "Early Bird (-25%)", mult: 0.75 },
    student: { label: "Student (-40%)", mult: 0.6 },
    grup: { label: "Grup 5+ (-20%)", mult: 0.8 },
    vip: { label: "Tarif VIP (+50%)", mult: 1.5 }
  };
  const st = strategies[strategyKey] || strategies.earlybird;
  const strategyPrice = Math.round(base * st.mult * 100) / 100;

  const addons = [];
  let addonSum = 0;
  if (document.getElementById("addonBackstage").checked) {
    addons.push("Acces Backstage");
    addonSum += 350;
  }
  if (document.getElementById("addonDinner").checked) {
    addons.push("Cină Networking");
    addonSum += 220;
  }
  if (document.getElementById("addonKit").checked) {
    addons.push("Materiale Workshop");
    addonSum += 120;
  }

  return {
    base,
    strategyKey,
    strategyLabel: st.label,
    strategyPrice,
    addons,
    addonSum,
    total: strategyPrice + addonSum
  };
}

function renderTicketPreview() {
  const q = computeTicketQuote();
  const extraText = q.addons.length ? ` + ${q.addons.join(", ")} (+${formatMdl(q.addonSum)})` : " (fără extraopțiuni)";
  document.getElementById("ticketPriceBreakdown").textContent =
    `Bază ${formatMdl(q.base)} → ${q.strategyLabel}: ${formatMdl(q.strategyPrice)}${extraText}`;
  document.getElementById("ticketTotalPreview").textContent = formatMdl(q.total);
}

["tkStrategy", "addonBackstage", "addonDinner", "addonKit"].forEach((id) => {
  document.getElementById(id).addEventListener("change", renderTicketPreview);
});

document.getElementById("issueTicketForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const ev = getActiveEvent();
  if (!ev) return;

  const guest = document.getElementById("tkGuest").value.trim();
  const tier = document.getElementById("tkTier").value;
  const q = computeTicketQuote();

  const isVip = tier === "vip";
  const ticketObj = {
    id: "tk-" + Date.now(),
    eventId: ev.id,
    eventTitle: ev.title,
    eventCode: ev.code,
    guest,
    tier,
    ticketLabel: isVip ? "Bilet VIP (Rândul 1 + Lounge)" : "Bilet Standard (Acces General)",
    badgeLabel: isVip ? "Ecuson metalic auriu + șnur personalizat" : "Ecuson carton reciclat + QR code",
    strategyLabel: q.strategyLabel,
    addons: q.addons,
    totalPrice: q.total,
    legacyReceipt: null
  };

  state.tickets.unshift(ticketObj);
  saveState();

  syncOperation("abstract-factory", `${tier}:${guest}`);
  syncOperation("strategy", `${q.strategyKey}:${q.base}`);
  const addonTokens = [
    document.getElementById("addonBackstage").checked ? "backstage" : "",
    document.getElementById("addonDinner").checked ? "dinner" : "",
    document.getElementById("addonKit").checked ? "kit" : ""
  ]
    .filter(Boolean)
    .join(", ");
  syncOperation("decorator", addonTokens || "none");

  document.getElementById("tkGuest").value = "";
  renderAll();
  showToast(`Bilet emis pentru ${guest} — ${formatMdl(q.total)}.`);
});

function renderTicketsList() {
  const container = document.getElementById("ticketsList");
  if (state.tickets.length === 0) {
    container.innerHTML = '<div class="empty-msg">Nu există bilete emise momentan.</div>';
    return;
  }

  container.innerHTML = "";
  state.tickets.forEach((tk) => {
    const item = document.createElement("div");
    item.className = "ticket-item";
    item.innerHTML = `
      <div class="ticket-item-top">
        <strong>${escapeHtml(tk.guest)} — ${escapeHtml(tk.eventTitle)}</strong>
        <span class="badge-total">${formatMdl(tk.totalPrice)}</span>
      </div>
      <div class="ticket-details">
        <div><strong>Pachet:</strong> ${escapeHtml(tk.ticketLabel)} • ${escapeHtml(tk.badgeLabel)}</div>
        <div><strong>Tarif:</strong> ${escapeHtml(tk.strategyLabel)} • <strong>Extraopțiuni:</strong> ${
          tk.addons.length ? escapeHtml(tk.addons.join(", ")) : "Niciuna"
        }</div>
      </div>
      ${
        tk.legacyReceipt
          ? `<div class="legacy-receipt">Sincronizat extern: ${escapeHtml(tk.legacyReceipt)}</div>`
          : `<button class="btn btn-xs btn-outline" data-sync-ticket="${tk.id}">Sincronizează cu sistemul extern</button>`
      }
    `;
    container.appendChild(item);
  });
}

document.getElementById("ticketsList").addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-sync-ticket]");
  if (!btn) return;
  const tk = state.tickets.find((t) => t.id === btn.dataset.syncTicket);
  if (!tk) return;

  const bani = Math.round(tk.totalPrice * 100);
  const receipt = `SYNC_OK[${tk.eventCode.toUpperCase()};${tk.guest}|BANI=${bani}]`;
  tk.legacyReceipt = receipt;
  saveState();

  syncOperation("adapter", `${tk.guest} | ${tk.eventCode} | ${tk.totalPrice}`);
  renderTicketsList();
  showToast("Biletul a fost sincronizat cu sistemul extern.");
});

// ===================== 3. HARTĂ LOCURI =====================
function renderSeatMap() {
  const ev = getActiveEvent();
  const mapEl = document.getElementById("seatMap");
  const histEl = document.getElementById("seatHistoryList");
  if (!ev) return;

  mapEl.innerHTML = "";
  SEAT_ROWS.forEach((row) => {
    SEAT_COLS.forEach((col) => {
      const code = `${row}${col}`;
      const isTaken = ev.reservedSeats.includes(code);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `seat-btn${isTaken ? " taken" : ""}`;
      btn.textContent = code;
      btn.disabled = isTaken;
      btn.addEventListener("click", () => reserveSeat(code));
      mapEl.appendChild(btn);
    });
  });

  if (!ev.seatHistory || ev.seatHistory.length === 0) {
    histEl.innerHTML = '<div class="empty-msg">Nicio rezervare înregistrată pentru acest eveniment.</div>';
  } else {
    histEl.innerHTML = "";
    [...ev.seatHistory].reverse().forEach((entry) => {
      const isUndo = entry.action === "ANULARE";
      const div = document.createElement("div");
      div.className = `history-item${isUndo ? " undo-item" : ""}`;
      div.innerHTML = `
        <span class="history-time">${entry.time}</span>
        <strong>${isUndo ? "Anulare" : "Rezervare"}</strong> — ${
          isUndo
            ? `Locul ${entry.seat} a fost eliberat.`
            : `Locul ${entry.seat} a fost rezervat.`
        }
      `;
      histEl.appendChild(div);
    });
  }
}

function reserveSeat(seatCode) {
  const ev = getActiveEvent();
  if (!ev || ev.reservedSeats.includes(seatCode)) return;

  ev.reservedSeats.push(seatCode);
  ev.seatHistory.push({ action: "REZERVARE", seat: seatCode, time: nowTime() });
  saveState();

  syncOperation("command", seatCode);
  renderAll();
  showToast(`Locul ${seatCode} a fost rezervat.`);
}

document.getElementById("undoSeatBtn").addEventListener("click", () => {
  const ev = getActiveEvent();
  if (!ev || ev.reservedSeats.length === 0) {
    showToast("Nu există rezervări de anulat.");
    return;
  }
  const lastSeat = ev.reservedSeats.pop();
  ev.seatHistory.push({ action: "ANULARE", seat: lastSeat, time: nowTime() });
  saveState();

  syncOperation("command", `${lastSeat}, undo`);
  renderAll();
  showToast(`Rezervarea pentru locul ${lastSeat} a fost anulată.`);
});

document.getElementById("clearSeatsBtn").addEventListener("click", () => {
  const ev = getActiveEvent();
  if (!ev) return;
  ev.reservedSeats = [];
  ev.seatHistory = [];
  saveState();
  renderAll();
  showToast("Toate locurile din sală au fost eliberate.");
});

// ===================== 4. AGENDĂ & PROGRAM =====================
function renderAgenda() {
  const ev = getActiveEvent();
  if (!ev) return;

  const trackSelect = document.getElementById("agTrackSelect");
  trackSelect.innerHTML = "";
  ev.agenda.forEach((tr) => {
    const opt = document.createElement("option");
    opt.value = tr.id;
    opt.textContent = tr.name;
    trackSelect.appendChild(opt);
  });

  const treeEl = document.getElementById("agendaTree");
  treeEl.innerHTML = "";

  let grandTotal = 0;
  ev.agenda.forEach((tr) => {
    const trackMinutes = tr.sessions.reduce((s, item) => s + Number(item.minutes), 0);
    grandTotal += trackMinutes;

    const box = document.createElement("div");
    box.className = "track-box";
    box.innerHTML = `
      <div class="track-header">
        <span>${escapeHtml(tr.name)}</span>
        <span>${trackMinutes} min</span>
      </div>
      <ul class="track-sessions">
        ${
          tr.sessions.length
            ? tr.sessions
                .map((s) => `<li><span>${escapeHtml(s.name)}</span><strong>${Number(s.minutes)} min</strong></li>`)
                .join("")
            : '<li style="color:#64748b">Nicio sesiune programată în această secțiune.</li>'
        }
      </ul>
    `;
    treeEl.appendChild(box);
  });

  document.getElementById("agendaTotalBadge").textContent = `Durată totală: ${grandTotal} min`;
}

document.getElementById("addSessionForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const ev = getActiveEvent();
  if (!ev) return;

  const trackId = document.getElementById("agTrackSelect").value;
  const name = document.getElementById("agSessionName").value.trim();
  const minutes = parseInt(document.getElementById("agSessionMinutes").value, 10) || 45;

  const track = ev.agenda.find((t) => t.id === trackId) || ev.agenda[0];
  if (!track) return;

  track.sessions.push({ id: "s-" + Date.now(), name, minutes });
  saveState();

  syncOperation("composite", `${name}:${minutes}`);
  document.getElementById("agSessionName").value = "";
  renderAgenda();
  showToast(`Sesiunea „${name}” (${minutes} min) a fost adăugată.`);
});

document.getElementById("addTrackForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const ev = getActiveEvent();
  if (!ev) return;
  const trackName = document.getElementById("agNewTrackName").value.trim();
  if (!trackName) return;

  ev.agenda.push({ id: "tr-" + Date.now(), name: trackName, sessions: [] });
  saveState();
  document.getElementById("agNewTrackName").value = "";
  renderAgenda();
  showToast(`Secțiunea „${trackName}” a fost adăugată.`);
});

// ===================== 5. NOTIFICĂRI =====================
function renderNotifications() {
  const subsEl = document.getElementById("subscribersList");
  subsEl.innerHTML = "";
  state.subscribers.forEach((sub) => {
    const chip = document.createElement("span");
    chip.className = "sub-chip";
    chip.innerHTML = `<strong>${escapeHtml(sub.channel)}:</strong> ${escapeHtml(sub.target)} <button type="button" data-remove-sub="${sub.id}" title="Elimină">×</button>`;
    subsEl.appendChild(chip);
  });

  const logEl = document.getElementById("notificationLog");
  if (state.notificationLogs.length === 0) {
    logEl.innerHTML = '<div class="empty-msg">Nicio notificare trimisă încă.</div>';
  } else {
    logEl.innerHTML = "";
    state.notificationLogs.forEach((entry) => {
      const div = document.createElement("div");
      div.className = "history-item";
      div.innerHTML = `
        <span class="history-time">${escapeHtml(entry.time)} • ${escapeHtml(entry.eventTitle)}</span>
        <strong>Anunț:</strong> ${escapeHtml(entry.message)}
        <div style="margin-top:6px;color:#475569;">${entry.deliveries.map((d) => `<div>• ${escapeHtml(d)}</div>`).join("")}</div>
      `;
      logEl.appendChild(div);
    });
  }
}

document.getElementById("subscribersList").addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-remove-sub]");
  if (!btn) return;
  state.subscribers = state.subscribers.filter((s) => s.id !== btn.dataset.removeSub);
  saveState();
  renderNotifications();
});

document.getElementById("addSubscriberForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const channel = document.getElementById("subChannel").value;
  const target = document.getElementById("subTarget").value.trim();
  if (!target) return;
  state.subscribers.push({ id: "sub-" + Date.now(), channel, target });
  saveState();
  document.getElementById("subTarget").value = "";
  renderNotifications();
  showToast(`Destinatar adăugat (${channel}: ${target}).`);
});

document.getElementById("sendNotificationForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const ev = getActiveEvent();
  const message = document.getElementById("notifMessage").value.trim();
  if (!message) return;

  const deliveries = state.subscribers.map((s) => `${s.channel} (${s.target}): trimis`);
  state.notificationLogs.unshift({
    id: "n-" + Date.now(),
    time: nowTime(),
    eventTitle: ev ? ev.title : "EventHub",
    message,
    deliveries
  });
  saveState();

  syncOperation("observer", message);
  renderNotifications();
  showToast(`Notificare trimisă către ${state.subscribers.length} destinatari.`);
});

// ===================== GLOBAL EVENT LISTENERS =====================
document.querySelectorAll(".nav-btn").forEach((btn) => {
  btn.addEventListener("click", () => switchView(btn.dataset.view));
});

document.getElementById("globalEventSelect").addEventListener("change", (e) => {
  state.activeEventId = e.target.value;
  saveState();
  renderAll();
});

// Init
renderAll();
detectBackend();
