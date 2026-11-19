// EventHub — Platformă completă de management al evenimentelor
// Integrează toate cele 12 Design Patterns (fără Singleton) cu Backend Java (/api/run) + fallback client-side.

const STORAGE_KEY = "eventhub_platform_state_v2";
const SEAT_ROWS = ["A", "B", "C", "D"];
const SEAT_COLS = [1, 2, 3, 4, 5, 6];

// ===================== DOCUMENTAȚIE 12 DESIGN PATTERNS =====================
const PATTERN_DOCS = [
  {
    id: "factory-method",
    name: "Factory Method",
    category: "Creational",
    moduleView: "events",
    whereUsed: "Creare Eveniment → Selectarea tipului (Conferință, Concert, Workshop)",
    purpose: "Instanțiază tipul corect de eveniment și pregătirea logistică specifică fără blocuri if/else cuplate în codul client.",
    whenToUse: "Când adaugi frecvent tipuri noi de evenimente cu logici diferite de configurare.",
    whenToAvoid: "Când ai un singur tip fix de obiect care nu va fi extins.",
    code: `// DESIGN PATTERN: Factory Method (Creational)
abstract class EventCreator {
    protected abstract EventItem createEvent(String title);
    public String organize(String title) {
        return createEvent(title).prepareDetails();
    }
}`
  },
  {
    id: "abstract-factory",
    name: "Abstract Factory",
    category: "Creational",
    moduleView: "tickets",
    whereUsed: "Bilete & Tarife → Generare Kit VIP vs. Standard (Bilet + Ecuson)",
    purpose: "Produce familii de obiecte compatibile (bilet + ecuson) pentru fiecare nivel de acces.",
    whenToUse: "Când mai multe obiecte create împreună trebuie să aparțină aceluiași pachet.",
    whenToAvoid: "Când ai nevoie de un singur produs independent.",
    code: `// DESIGN PATTERN: Abstract Factory (Creational)
public interface EventKitFactory {
    Ticket createTicket(String guestName);
    Badge createBadge(String guestName);
}`
  },
  {
    id: "builder",
    name: "Builder",
    category: "Creational",
    moduleView: "events",
    whereUsed: "Creare Eveniment → Configurare sală, capacitate, catering, livestream",
    purpose: "Construiește pas cu pas obiecte complexe cu mulți parametri opționali, evitând constructorii telescopici.",
    whenToUse: "Când un eveniment are multe opțiuni opționale și vrei cod fluent și imutabil.",
    whenToAvoid: "Pentru obiecte simple cu 2-3 câmpuri obligatorii.",
    code: `// DESIGN PATTERN: Builder (Creational)
EventPlan plan = new EventBuilder(name)
    .hall(hall).capacity(capacity)
    .withCatering(true).withLivestream(true)
    .build();`
  },
  {
    id: "prototype",
    name: "Prototype",
    category: "Creational",
    moduleView: "events",
    whereUsed: "Catalog Evenimente → Butonul „Clonează ediție”",
    purpose: "Clonează un eveniment existent (inclusiv agenda) pentru un alt oraș și o altă dată, păstrând șablonul original intact.",
    whenToUse: "Când duplici frecvent șabloane preconfigurate de evenimente.",
    whenToAvoid: "Când obiectele au referințe circulare greu de clonat în profunzime.",
    code: `// DESIGN PATTERN: Prototype (Creational)
public EventTemplate clone() {
    return new EventTemplate(title, city, date, new ArrayList<>(defaultSessions));
}`
  },
  {
    id: "adapter",
    name: "Adapter",
    category: "Structural",
    moduleView: "tickets",
    whereUsed: "Bilete Emise → Butonul „Sincronizează Legacy”",
    purpose: "Traduce interfața modernă EventHub (RON) în formatul vechi al sistemului extern (CSV + bani/cenți).",
    whenToUse: "Când integrezi API-uri externe sau sisteme legacy pe care nu le poți modifica.",
    whenToAvoid: "Când controlezi ambele părți și poți alinia direct interfețele.",
    code: `// DESIGN PATTERN: Adapter (Structural)
class LegacyBookingAdapter implements ModernTicketGateway {
    public String issueTicket(String guest, String code, double ron) {
        return legacy.bookOldFormat(code + ";" + guest, (int) Math.round(ron * 100));
    }
}`
  },
  {
    id: "decorator",
    name: "Decorator",
    category: "Structural",
    moduleView: "tickets",
    whereUsed: "Bilete & Tarife → Extraopțiuni (Backstage, Cină, Materiale Workshop)",
    purpose: "Împachetează dinamic un bilet de bază cu extraopțiuni la runtime, fără explozie de subclase.",
    whenToUse: "Când utilizatorul poate combina liber mai multe opțiuni suplimentare.",
    whenToAvoid: "Când ai doar 1-2 opțiuni fixe banale.",
    code: `// DESIGN PATTERN: Decorator (Structural)
EventTicket ticket = new BackstageDecorator(new NetworkingDinnerDecorator(new BaseTicket()));`
  },
  {
    id: "facade",
    name: "Facade",
    category: "Structural",
    moduleView: "events",
    whereUsed: "Catalog Evenimente → Butonul „Publicare Completă” pe evenimente DRAFT",
    purpose: "Ascunde coordonarea a 3 subsisteme (Sală + Bilete + Notificări) în spatele unui singur apel publishEvent().",
    whenToUse: "Când vrei un flux simplu pentru UI peste mai multe servicii interne.",
    whenToAvoid: "Nu transforma fațada într-un God Object cu toată logica aplicației.",
    code: `// DESIGN PATTERN: Facade (Structural)
public List<String> publishEvent(String eventName, String hall) {
    venue.reserveHall(hall);
    ticketing.openSales(eventName);
    notifications.announce(eventName);
}`
  },
  {
    id: "composite",
    name: "Composite",
    category: "Structural",
    moduleView: "agenda",
    whereUsed: "Agendă & Track-uri → Sesiuni individuale și Track-uri compuse",
    purpose: "Tratează uniform sesiunile simple și track-urile compuse printr-o singură interfață, calculând durata recursiv.",
    whenToUse: "Când datele formează o ierarhie arborescentă (Zi → Track → Sesiune).",
    whenToAvoid: "Când structura este o listă plată fără ierarhie.",
    code: `// DESIGN PATTERN: Composite (Structural)
public int getDurationMinutes() {
    return children.stream().mapToInt(AgendaComponent::getDurationMinutes).sum();
}`
  },
  {
    id: "strategy",
    name: "Strategy",
    category: "Behavioral",
    moduleView: "tickets",
    whereUsed: "Bilete & Tarife → Selector Strategie Tarifare (Early Bird, Student, Grup, VIP)",
    purpose: "Încapsulează fiecare regulă de calcul al prețului într-o clasă separată, interschimbabilă la runtime.",
    whenToUse: "Când ai mai multe variante de algoritmi de tarifare sau reduceri.",
    whenToAvoid: "Când ai o singură formulă fixă care nu se schimbă.",
    code: `// DESIGN PATTERN: Strategy (Behavioral)
public interface PricingStrategy {
    double calculate(double basePrice);
}`
  },
  {
    id: "observer",
    name: "Observer",
    category: "Behavioral",
    moduleView: "notifications",
    whereUsed: "Notificări → Trimitere anunțuri către abonați (Email, SMS, Push)",
    purpose: "Notifică automat toți abonații înregistrați când organizatorul publică o modificare, fără cuplare directă.",
    whenToUse: "Când o schimbare trebuie să declanșeze notificări către un număr dinamic de canale.",
    whenToAvoid: "Când lanțurile de notificări pot crea bucle greu de depanat.",
    code: `// DESIGN PATTERN: Observer (Behavioral)
public void publishChange(String msg) {
    for (EventSubscriber s : subscribers) s.notifyUpdate(msg);
}`
  },
  {
    id: "command",
    name: "Command",
    category: "Behavioral",
    moduleView: "seating",
    whereUsed: "Hartă Locuri → Click pe loc pentru rezervare + „Undo Ultima Rezervare”",
    purpose: "Încapsulează fiecare rezervare de loc într-un obiect cu execute() și undo(), oferind istoric și anulare instant.",
    whenToUse: "Când ai nevoie de Undo/Redo, istoric de acțiuni sau cozi de comenzi.",
    whenToAvoid: "Pentru operații simple care nu necesită anulare sau audit.",
    code: `// DESIGN PATTERN: Command (Behavioral)
public interface SeatCommand {
    String execute();
    String undo();
}`
  },
  {
    id: "state",
    name: "State",
    category: "Behavioral",
    moduleView: "events",
    whereUsed: "Catalog Evenimente → Tranziții DRAFT → PUBLISHED → ONGOING → COMPLETED / CANCELLED",
    purpose: "Fiecare stare definește clar ce tranziții sunt permise (ex: un eveniment ONGOING nu poate fi anulat direct).",
    whenToUse: "Când comportamentul unui eveniment depinde de starea lui curentă.",
    whenToAvoid: "Când ai doar 2 stări banale fără reguli de tranziție.",
    code: `// DESIGN PATTERN: State (Behavioral)
public interface EventLifecycleState {
    String next(EventContext ctx);
    String cancel(EventContext ctx);
}`
  }
];

// ===================== DEFAULT SEED DATA =====================
function createDefaultState() {
  return {
    activeEventId: "ev-1",
    events: [
      {
        id: "ev-1",
        code: "CONF-2026",
        title: "Java & Cloud Summit 2026",
        type: "conferinta",
        typeLabel: "Conferință",
        city: "București",
        date: "2026-10-15",
        hall: "Aula Magna",
        capacity: 350,
        basePrice: 200,
        catering: true,
        livestream: true,
        equipment: "Scenă principală, microfoane, proiector 4K, ecusoane speakeri.",
        state: "PUBLISHED",
        reservedSeats: ["A1", "A2", "B3"],
        seatHistory: [
          { action: "EXEC", seat: "A1", time: "10:05" },
          { action: "EXEC", seat: "A2", time: "10:06" },
          { action: "EXEC", seat: "B3", time: "10:12" }
        ],
        agenda: [
          {
            id: "tr-1",
            name: "Sesiuni Dimineață",
            sessions: [
              { id: "s-1", name: "Keynote Deschidere", minutes: 45 },
              { id: "s-2", name: "Arhitectură Java Modernă", minutes: 50 }
            ]
          },
          {
            id: "tr-2",
            name: "Sesiuni După-Amiază",
            sessions: [
              { id: "s-3", name: "Workshop Microservicii", minutes: 60 },
              { id: "s-4", name: "Networking & Q&A", minutes: 30 }
            ]
          }
        ]
      },
      {
        id: "ev-2",
        code: "JAZZ-2026",
        title: "Summer Jazz & Lights Fest",
        type: "concert",
        typeLabel: "Concert",
        city: "Cluj-Napoca",
        date: "2026-11-08",
        hall: "Sala Polivalentă",
        capacity: 1200,
        basePrice: 150,
        catering: false,
        livestream: true,
        equipment: "Sistem sonorizare, lumini scenă, brățări acces, pază.",
        state: "DRAFT",
        reservedSeats: ["A4"],
        seatHistory: [{ action: "EXEC", seat: "A4", time: "09:40" }],
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
        eventTitle: "Java & Cloud Summit 2026",
        eventCode: "CONF-2026",
        guest: "Elena Radu",
        tier: "vip",
        ticketLabel: "Bilet VIP (Rândul 1 + Lounge)",
        badgeLabel: "Ecuson metalic auriu + șnur personalizat",
        strategyLabel: "Early Bird (-25%)",
        addons: ["Acces Backstage", "Cină Networking"],
        totalPrice: 425,
        legacyReceipt: "LEGACY_OK[CONF-2026;Elena Radu|BANI=42500]"
      }
    ],
    subscribers: [
      { id: "sub-1", channel: "Email", target: "maria.ionescu@eventhub.ro" },
      { id: "sub-2", channel: "SMS", target: "+40 722 000 111" },
      { id: "sub-3", channel: "Push App", target: "@alex_dev" }
    ],
    notificationLogs: [],
    activityLogs: []
  };
}

let state = loadState();
let javaBackendAvailable = false;
let activePatternFilter = "all";
let patternSearch = "";

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

// ===================== BACKEND JAVA + CLIENT FALLBACK =====================
async function checkBackendHealth() {
  const pill = document.getElementById("backendStatus");
  if (window.location.protocol === "file:") {
    setBackendMode(false, pill);
    return;
  }
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1800);
    const res = await fetch("/api/health", { signal: controller.signal });
    clearTimeout(timer);
    if (res.ok) {
      const data = await res.json();
      setBackendMode(Boolean(data && data.status === "ok"), pill);
      return;
    }
  } catch (_) {}
  setBackendMode(false, pill);
}

function setBackendMode(isLive, pill) {
  javaBackendAvailable = isLive;
  if (isLive) {
    pill.className = "status-pill status-live";
    pill.innerHTML = '<span class="dot"></span> Backend Java Live';
  } else {
    pill.className = "status-pill status-fallback";
    pill.innerHTML = '<span class="dot"></span> Mod Static (Fallback JS)';
  }
}

async function runPatternEngine(patternId, input, fallbackLogs) {
  let logs = fallbackLogs;
  let mode = "Fallback JS";

  if (javaBackendAvailable) {
    try {
      const res = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pattern: patternId, input })
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.logs) && data.logs.length > 0) {
          logs = data.logs;
          mode = "Java Backend";
        }
      }
    } catch (_) {
      setBackendMode(false, document.getElementById("backendStatus"));
    }
  }

  const doc = PATTERN_DOCS.find((p) => p.id === patternId);
  state.activityLogs.unshift({
    id: "log-" + Date.now() + Math.random(),
    patternName: doc ? doc.name : patternId,
    category: doc ? doc.category : "Pattern",
    mode,
    time: nowTime(),
    logs
  });
  if (state.activityLogs.length > 40) state.activityLogs.pop();
  saveState();
  renderActivityDrawer();
  return logs;
}

function showToast(message) {
  const container = document.getElementById("toastContainer");
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = message;
  container.appendChild(el);
  setTimeout(() => el.remove(), 3400);
}

// ===================== NAVIGATION =====================
const VIEW_META = {
  events: ["Dashboard Evenimente", "Creează, clonează, publică și gestionează ciclul de viață al evenimentelor."],
  tickets: ["Bilete, Pachete & Tarife", "Emite bilete personalizate cu tarife dinamice, extraopțiuni și sincronizare legacy."],
  seating: ["Hartă Interactivă Locuri", "Rezervă locuri în sală cu suport instant de anulare (Undo) prin Command."],
  agenda: ["Agendă & Track-uri", "Organizează ierarhic sesiunile evenimentului cu calcul recursiv al duratei."],
  notifications: ["Notificări Participanți", "Trimite actualizări live către toți abonații pe Email, SMS și Push."],
  patterns: ["Arhitectură — 12 Design Patterns", "Toate cele 12 pattern-uri integrate în EventHub, fără Singleton."]
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
  renderPatternsCatalog();
  renderActivityDrawer();
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
  document.getElementById("kpiRevenue").textContent = `${totalRevenue.toFixed(0)} RON`;
  document.getElementById("kpiSeats").textContent = totalSeats;
  document.getElementById("navEventsCount").textContent = state.events.length;
  document.getElementById("navTicketsCount").textContent = state.tickets.length;
  document.getElementById("logCountBadge").textContent = state.activityLogs.length;
}

// ===================== 1. EVENIMENTE (Factory Method, Builder, Prototype, State, Facade) =====================
function getFactoryEquipment(type) {
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
  const city = document.getElementById("evCity").value.trim() || "București";
  const date = document.getElementById("evDate").value || "2026-10-15";
  const hall = document.getElementById("evHall").value.trim() || "Sala Mare";
  const capacity = parseInt(document.getElementById("evCapacity").value, 10) || 150;
  const basePrice = parseFloat(document.getElementById("evBasePrice").value) || 150;
  const catering = document.getElementById("evCatering").checked;
  const livestream = document.getElementById("evLivestream").checked;

  const factoryInfo = getFactoryEquipment(type);
  const newEv = {
    id: "ev-" + Date.now(),
    code: type.slice(0, 4).toUpperCase() + "-" + String(Date.now()).slice(-3),
    title,
    type,
    typeLabel: factoryInfo.label,
    city,
    date,
    hall,
    capacity,
    basePrice,
    catering,
    livestream,
    equipment: factoryInfo.equipment,
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
  await runPatternEngine("factory-method", `${type}:${title}`, [
    `[Factory Method] Creat eveniment '${title}' de tip ${factoryInfo.label}.`,
    `[Factory Method] Logistică: ${factoryInfo.equipment}`
  ]);
  await runPatternEngine("builder", `${title} | ${hall} | ${capacity} | ${extras}`, [
    `[Builder] Construit EventPlan '${title}' @ ${hall} (${capacity} locuri, Catering: ${catering ? "Da" : "Nu"}, Livestream: ${livestream ? "Da" : "Nu"}).`
  ]);

  document.getElementById("evTitle").value = "";
  renderAll();
  showToast(`Eveniment creat prin Factory Method + Builder: ${title}`);
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
    container.innerHTML = '<div class="empty-msg">Niciun eveniment găsit pentru filtrul curent.</div>';
    return;
  }

  container.innerHTML = "";
  filtered.forEach((ev) => {
    const card = document.createElement("div");
    card.className = `event-card${ev.id === state.activeEventId ? " is-active" : ""}`;
    card.innerHTML = `
      <div class="event-card-top">
        <div>
          <h4 class="event-title">${ev.title}</h4>
          <div class="event-meta">
            <span>🏷️ ${ev.typeLabel}</span>
            <span>📍 ${ev.city} • ${ev.hall}</span>
            <span>📅 ${ev.date}</span>
            <span>👥 ${ev.capacity} locuri</span>
            <span>💳 ${ev.basePrice} RON</span>
            ${ev.catering ? "<span>🍽️ Catering</span>" : ""}
            ${ev.livestream ? "<span>📡 Livestream</span>" : ""}
          </div>
        </div>
        <span class="state-badge state-${ev.state}">${ev.state}</span>
      </div>
      <div class="event-equipment"><strong>Pregătire (Factory Method):</strong> ${ev.equipment}</div>
      <div class="event-actions">
        <button class="btn btn-xs btn-outline" data-action="select" data-id="${ev.id}">
          ${ev.id === state.activeEventId ? "✓ Activ" : "Selectează"}
        </button>
        ${
          ev.state === "DRAFT"
            ? `<button class="btn btn-xs btn-success" data-action="facade-publish" data-id="${ev.id}">🚀 Publicare Completă (Facade)</button>`
            : ""
        }
        <button class="btn btn-xs btn-primary" data-action="state-next" data-id="${ev.id}">▶ Avansează Stare (State)</button>
        <button class="btn btn-xs btn-danger-soft" data-action="state-cancel" data-id="${ev.id}">✕ Anulează (State)</button>
        <button class="btn btn-xs btn-outline" data-action="clone" data-id="${ev.id}">📋 Clonează (Prototype)</button>
      </div>
    `;
    container.appendChild(card);
  });
}

document.getElementById("eventsList").addEventListener("click", async (e) => {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;
  const action = btn.dataset.action;
  const ev = state.events.find((item) => item.id === btn.dataset.id);
  if (!ev) return;

  if (action === "select") {
    state.activeEventId = ev.id;
    saveState();
    renderAll();
    showToast(`Eveniment activ schimbat: ${ev.title}`);
    return;
  }

  if (action === "facade-publish") {
    ev.state = "PUBLISHED";
    saveState();
    await runPatternEngine("facade", `${ev.title} | ${ev.hall}`, [
      `[Facade] EventPublishFacade.publishEvent('${ev.title}', '${ev.hall}')`,
      `  1. Sala '${ev.hall}' a fost rezervată.`,
      `  2. Vânzarea biletelor pentru '${ev.title}' este activă.`,
      `  3. Notificările de lansare au fost trimise.`
    ]);
    renderAll();
    showToast(`Facade: '${ev.title}' publicat complet (sală + bilete + notificări)!`);
    return;
  }

  if (action === "state-next") {
    const transitions = {
      DRAFT: "PUBLISHED",
      PUBLISHED: "ONGOING",
      ONGOING: "COMPLETED"
    };
    const next = transitions[ev.state];
    const msg = next
      ? `Tranziție ${ev.state} -> ${next}`
      : `Acțiune respinsă: evenimentul este în starea finală ${ev.state}.`;
    if (next) ev.state = next;
    saveState();
    await runPatternEngine("state", "next", [`[State] ${ev.title}: ${msg}`]);
    renderAll();
    showToast(`State: ${msg}`);
    return;
  }

  if (action === "state-cancel") {
    let msg = "";
    if (ev.state === "DRAFT" || ev.state === "PUBLISHED") {
      msg = `Tranziție ${ev.state} -> CANCELLED`;
      ev.state = "CANCELLED";
    } else {
      msg = `Acțiune respinsă: un eveniment ${ev.state} nu poate fi anulat direct.`;
    }
    saveState();
    await runPatternEngine("state", "cancel", [`[State] ${ev.title}: ${msg}`]);
    renderAll();
    showToast(`State: ${msg}`);
    return;
  }

  if (action === "clone") {
    document.getElementById("cloneSourceId").value = ev.id;
    document.getElementById("cloneModalTitle").textContent = `Clonează: ${ev.title}`;
    document.getElementById("cloneModal").classList.remove("hidden");
  }
});

document.getElementById("eventSearchInput").addEventListener("input", renderEventsList);
document.getElementById("eventStatusFilter").addEventListener("change", renderEventsList);

// Clone Modal (Prototype)
function closeCloneModal() {
  document.getElementById("cloneModal").classList.add("hidden");
}
document.getElementById("closeCloneModal").addEventListener("click", closeCloneModal);
document.getElementById("cancelCloneBtn").addEventListener("click", closeCloneModal);

document.getElementById("cloneEventForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const sourceId = document.getElementById("cloneSourceId").value;
  const newCity = document.getElementById("cloneCity").value.trim() || "Cluj-Napoca";
  const newDate = document.getElementById("cloneDate").value || "2026-11-20";
  const original = state.events.find((ev) => ev.id === sourceId);
  if (!original) return;

  // Deep copy via Prototype
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

  await runPatternEngine("prototype", `${newCity} | ${newDate}`, [
    `[Prototype] Șablon original păstrat intact: ${original.title} @ ${original.city}.`,
    `[Prototype] Clonă creată: ${cloned.title} @ ${newCity} (${newDate}) cu ${cloned.agenda.length} track-uri copiate.`
  ]);

  renderAll();
  showToast(`Prototype: Ediție clonată pentru ${newCity} (${newDate})!`);
});

// ===================== 2. BILETE & TARIFE (Abstract Factory, Strategy, Decorator, Adapter) =====================
function computeTicketQuote() {
  const ev = getActiveEvent();
  const base = ev ? Number(ev.basePrice) : 200;
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
    addonSum += 180;
  }
  if (document.getElementById("addonDinner").checked) {
    addons.push("Cină Networking");
    addonSum += 95;
  }
  if (document.getElementById("addonKit").checked) {
    addons.push("Materiale Workshop");
    addonSum += 55;
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
  const extraText = q.addons.length ? ` + ${q.addons.join(", ")} (+${q.addonSum} RON)` : " (fără extraopțiuni)";
  document.getElementById("ticketPriceBreakdown").textContent =
    `Bază ${q.base} RON → ${q.strategyLabel}: ${q.strategyPrice} RON${extraText}`;
  document.getElementById("ticketTotalPreview").textContent = `${q.total.toFixed(2)} RON`;
}

["tkStrategy", "addonBackstage", "addonDinner", "addonKit"].forEach((id) => {
  document.getElementById(id).addEventListener("change", renderTicketPreview);
});

document.getElementById("issueTicketForm").addEventListener("submit", async (e) => {
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

  await runPatternEngine("abstract-factory", `${tier}:${guest}`, [
    `[Abstract Factory] Kit ${isVip ? "VIP" : "Standard"} generat pentru ${guest}: ${ticketObj.ticketLabel} + ${ticketObj.badgeLabel}.`
  ]);
  await runPatternEngine("strategy", `${q.strategyKey}:${q.base}`, [
    `[Strategy] Preț bază ${q.base} RON -> ${q.strategyLabel} = ${q.strategyPrice} RON.`
  ]);
  const addonTokens = [
    document.getElementById("addonBackstage").checked ? "backstage" : "",
    document.getElementById("addonDinner").checked ? "dinner" : "",
    document.getElementById("addonKit").checked ? "kit" : ""
  ].filter(Boolean).join(", ");
  await runPatternEngine("decorator", addonTokens || "none", [
    `[Decorator] Extraopțiuni aplicate: ${q.addons.length ? q.addons.join(" + ") : "Niciuna"} | Total: ${q.total.toFixed(2)} RON.`
  ]);

  document.getElementById("tkGuest").value = "";
  renderAll();
  showToast(`Bilet emis pentru ${guest} (${q.total.toFixed(2)} RON)`);
});

function renderTicketsList() {
  const container = document.getElementById("ticketsList");
  if (state.tickets.length === 0) {
    container.innerHTML = '<div class="empty-msg">Nu există bilete emise încă.</div>';
    return;
  }

  container.innerHTML = "";
  state.tickets.forEach((tk) => {
    const item = document.createElement("div");
    item.className = "ticket-item";
    item.innerHTML = `
      <div class="ticket-item-top">
        <strong>${tk.guest} — ${tk.eventTitle}</strong>
        <span class="badge-total">${Number(tk.totalPrice).toFixed(2)} RON</span>
      </div>
      <div class="ticket-details">
        <div>🎟️ <strong>Kit:</strong> ${tk.ticketLabel} • 🪪 ${tk.badgeLabel}</div>
        <div>💰 <strong>Strategie:</strong> ${tk.strategyLabel} • <strong>Extra:</strong> ${
          tk.addons.length ? tk.addons.join(", ") : "Fără extraopțiuni"
        }</div>
      </div>
      ${
        tk.legacyReceipt
          ? `<div class="legacy-receipt">✓ Sincronizat Adapter: ${tk.legacyReceipt}</div>`
          : `<button class="btn btn-xs btn-outline" data-sync-ticket="${tk.id}">🔌 Sincronizează Sistem Extern (Adapter)</button>`
      }
    `;
    container.appendChild(item);
  });
}

document.getElementById("ticketsList").addEventListener("click", async (e) => {
  const btn = e.target.closest("button[data-sync-ticket]");
  if (!btn) return;
  const tk = state.tickets.find((t) => t.id === btn.dataset.syncTicket);
  if (!tk) return;

  const cents = Math.round(tk.totalPrice * 100);
  const receipt = `LEGACY_OK[${tk.eventCode.toUpperCase()};${tk.guest}|BANI=${cents}]`;
  tk.legacyReceipt = receipt;
  saveState();

  await runPatternEngine("adapter", `${tk.guest} | ${tk.eventCode} | ${tk.totalPrice}`, [
    `[Adapter] Tradus bilet '${tk.guest}' (${tk.totalPrice} RON) în CSV + ${cents} bani.`,
    `[Adapter] Răspuns sistem extern -> ${receipt}`
  ]);

  renderTicketsList();
  showToast(`Adapter: Bilet sincronizat cu sistemul extern!`);
});

// ===================== 3. HARTĂ LOCURI (Command + Undo) =====================
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
    histEl.innerHTML = '<div class="empty-msg">Nicio comandă de rezervare executată încă pentru acest eveniment.</div>';
  } else {
    histEl.innerHTML = "";
    [...ev.seatHistory].reverse().forEach((entry) => {
      const div = document.createElement("div");
      div.className = `history-item${entry.action === "UNDO" ? " undo-item" : ""}`;
      div.innerHTML = `
        <span class="history-time">${entry.time} • Command</span>
        <strong>[${entry.action}]</strong> ${
          entry.action === "UNDO"
            ? `Locul ${entry.seat} a fost eliberat prin undo().`
            : `Locul ${entry.seat} a fost rezervat prin execute().`
        }
      `;
      histEl.appendChild(div);
    });
  }
}

async function reserveSeat(seatCode) {
  const ev = getActiveEvent();
  if (!ev || ev.reservedSeats.includes(seatCode)) return;

  ev.reservedSeats.push(seatCode);
  ev.seatHistory.push({ action: "EXEC", seat: seatCode, time: nowTime() });
  saveState();

  await runPatternEngine("command", seatCode, [
    `[Command] [EXEC] Locul ${seatCode} a fost REZERVAT pentru '${ev.title}'. Locuri ocupate: [${ev.reservedSeats.join(", ")}]`
  ]);
  renderAll();
  showToast(`Command: Locul ${seatCode} rezervat!`);
}

document.getElementById("undoSeatBtn").addEventListener("click", async () => {
  const ev = getActiveEvent();
  if (!ev || ev.reservedSeats.length === 0) {
    showToast("Nu există rezervări de anulat (stiva Command este goală).");
    return;
  }
  const lastSeat = ev.reservedSeats.pop();
  ev.seatHistory.push({ action: "UNDO", seat: lastSeat, time: nowTime() });
  saveState();

  await runPatternEngine("command", `${lastSeat}, undo`, [
    `[Command] [UNDO] Locul ${lastSeat} a fost ELIBERAT. Locuri rămase: [${ev.reservedSeats.join(", ")}]`
  ]);
  renderAll();
  showToast(`Command Undo: Locul ${lastSeat} a fost eliberat!`);
});

document.getElementById("clearSeatsBtn").addEventListener("click", () => {
  const ev = getActiveEvent();
  if (!ev) return;
  ev.reservedSeats = [];
  ev.seatHistory = [];
  saveState();
  renderAll();
  showToast("Toate locurile din sală au fost resetate.");
});

// ===================== 4. AGENDĂ & TRACK-URI (Composite) =====================
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
        <span>📁 Track: ${tr.name}</span>
        <span>${trackMinutes} min</span>
      </div>
      <ul class="track-sessions">
        ${
          tr.sessions.length
            ? tr.sessions
                .map(
                  (s) =>
                    `<li><span>📄 ${s.name}</span><strong>${s.minutes} min</strong></li>`
                )
                .join("")
            : '<li style="color:#64748b">Nicio sesiune în acest track.</li>'
        }
      </ul>
    `;
    treeEl.appendChild(box);
  });

  document.getElementById("agendaTotalBadge").textContent = `Total: ${grandTotal} min`;
}

document.getElementById("addSessionForm").addEventListener("submit", async (e) => {
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

  await runPatternEngine("composite", `${name}:${minutes}`, [
    `[Composite] Adăugat SessionLeaf '${name}' (${minutes} min) în track '${track.name}'.`,
    `[Composite] Durata totală a agendei a fost recalculată recursiv.`
  ]);

  document.getElementById("agSessionName").value = "";
  renderAgenda();
  showToast(`Composite: Sesiune '${name}' (${minutes} min) adăugată!`);
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
  showToast(`Composite: Track nou '${trackName}' creat!`);
});

// ===================== 5. NOTIFICĂRI (Observer) =====================
function renderNotifications() {
  const subsEl = document.getElementById("subscribersList");
  subsEl.innerHTML = "";
  state.subscribers.forEach((sub) => {
    const chip = document.createElement("span");
    chip.className = "sub-chip";
    chip.innerHTML = `<strong>${sub.channel}:</strong> ${sub.target} <button type="button" data-remove-sub="${sub.id}" title="Dezabonează">×</button>`;
    subsEl.appendChild(chip);
  });

  const logEl = document.getElementById("notificationLog");
  if (state.notificationLogs.length === 0) {
    logEl.innerHTML = '<div class="empty-msg">Nicio notificare trimisă încă. Publică un anunț pentru a testa Observer.</div>';
  } else {
    logEl.innerHTML = "";
    state.notificationLogs.forEach((entry) => {
      const div = document.createElement("div");
      div.className = "history-item";
      div.innerHTML = `
        <span class="history-time">${entry.time} • ${entry.eventTitle}</span>
        <strong>Mesaj:</strong> ${entry.message}
        <div style="margin-top:5px;color:#475569;">${entry.deliveries.map((d) => `<div>→ ${d}</div>`).join("")}</div>
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
  showToast(`Observer: Abonat nou adăugat (${channel}: ${target})`);
});

document.getElementById("sendNotificationForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const ev = getActiveEvent();
  const message = document.getElementById("notifMessage").value.trim();
  if (!message) return;

  const deliveries = state.subscribers.map((s) => `[${s.channel} -> ${s.target}] ${message}`);
  state.notificationLogs.unshift({
    id: "n-" + Date.now(),
    time: nowTime(),
    eventTitle: ev ? ev.title : "EventHub",
    message,
    deliveries
  });
  saveState();

  await runPatternEngine("observer", message, [
    `[Observer] Publicare mesaj către ${state.subscribers.length} abonați: "${message}"`,
    ...deliveries.map((d) => `  -> ${d}`)
  ]);

  renderNotifications();
  showToast(`Observer: Notificare livrată către ${state.subscribers.length} abonați!`);
});

// ===================== 6. CATALOG 12 DESIGN PATTERNS =====================
function renderPatternsCatalog() {
  const grid = document.getElementById("patternsCatalogGrid");
  const q = patternSearch.trim().toLowerCase();

  const filtered = PATTERN_DOCS.filter((p) => {
    if (activePatternFilter !== "all" && p.category !== activePatternFilter) return false;
    if (!q) return true;
    return `${p.name} ${p.category} ${p.whereUsed} ${p.purpose}`.toLowerCase().includes(q);
  });

  if (filtered.length === 0) {
    grid.innerHTML = '<div class="empty-msg">Niciun pattern găsit.</div>';
    return;
  }

  grid.innerHTML = "";
  filtered.forEach((p) => {
    const card = document.createElement("div");
    card.className = "pattern-doc-card";
    card.innerHTML = `
      <div class="pattern-doc-top">
        <h4>${p.name}</h4>
        <span class="p-pill cat-${p.category}">${p.category}</span>
      </div>
      <div class="pattern-where">Integrat în: ${p.whereUsed}</div>
      <p style="margin:0;font-size:0.83rem;color:#334155;">${p.purpose}</p>
      <div class="pattern-pros-cons">
        <div class="pros-box"><strong>Când să îl folosești:</strong><br/>${p.whenToUse}</div>
        <div class="cons-box"><strong>Când să îl eviți:</strong><br/>${p.whenToAvoid}</div>
      </div>
      <pre class="code-snippet"><code>${p.code}</code></pre>
      <div>
        <button class="btn btn-xs btn-outline" data-jump-view="${p.moduleView}">Testează în aplicație →</button>
      </div>
    `;
    grid.appendChild(card);
  });
}

document.getElementById("patternsCatalogGrid").addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-jump-view]");
  if (!btn) return;
  switchView(btn.dataset.jumpView);
});

document.querySelectorAll("#view-patterns .filter-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll("#view-patterns .filter-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    activePatternFilter = btn.dataset.cat;
    renderPatternsCatalog();
  });
});

document.getElementById("patternSearchInput").addEventListener("input", (e) => {
  patternSearch = e.target.value;
  renderPatternsCatalog();
});

// ===================== LIVE PATTERN ACTIVITY DRAWER =====================
function renderActivityDrawer() {
  const list = document.getElementById("activityLogList");
  document.getElementById("logCountBadge").textContent = state.activityLogs.length;

  if (state.activityLogs.length === 0) {
    list.innerHTML = '<div class="empty-msg" style="color:#94a3b8;">Execută orice acțiune în aplicație (creează eveniment, emite bilet, rezervă loc) pentru a vedea live ce Design Pattern rulează.</div>';
    return;
  }

  list.innerHTML = "";
  state.activityLogs.forEach((entry) => {
    const item = document.createElement("div");
    item.className = "activity-entry";
    item.innerHTML = `
      <div class="activity-entry-head">
        <strong>${entry.patternName} <span class="p-pill cat-${entry.category}">${entry.category}</span></strong>
        <small style="color:#94a3b8;">${entry.time} • ${entry.mode}</small>
      </div>
      <pre>${entry.logs.join("\n")}</pre>
    `;
    list.appendChild(item);
  });
}

const logDrawer = document.getElementById("logDrawer");
document.getElementById("toggleLogBtn").addEventListener("click", () => {
  logDrawer.classList.toggle("open");
});
document.getElementById("closeLogBtn").addEventListener("click", () => {
  logDrawer.classList.remove("open");
});
document.getElementById("clearActivityLogBtn").addEventListener("click", () => {
  state.activityLogs = [];
  saveState();
  renderActivityDrawer();
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
checkBackendHealth();
