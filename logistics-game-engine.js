(() => {
  "use strict";

  const ROLE_STATES = Object.freeze({
    IDLE: "IDLE",
    PROCESSING: "PROCESSING",
    WAITING_FOR_NEXT: "WAITING_FOR_NEXT",
    AWAITING_PLAYER: "AWAITING_PLAYER"
  });

  const ROLE_DEFINITIONS = Object.freeze({
    customer: {
      id: "customer",
      token: "K",
      department: "KLANT",
      title: "KLANT / ORDERPLAATSER",
      form: {
        code: "101",
        name: "Klantorderformulier",
        tasks: ["Controleer product en aantal", "Bevestig de gewenste levertijd", "Plaats de order"],
        actionLabel: "Plaats order",
        transferLabel: "Stuur naar Operations"
      },
      processingSeconds: [3, 6]
    },
    operations: {
      id: "operations",
      token: "OPR",
      department: "OPERATIONS",
      title: "OPERATIONS MANAGER",
      form: {
        code: "201",
        name: "Ordervrijgaveformulier",
        tasks: ["Controleer de klantorder", "Registreer de order", "Geef productie en materiaal vrij"],
        actionLabel: "Order vrijgeven",
        transferLabel: "Stuur naar Magazijn Grondstoffen"
      },
      processingSeconds: [5, 10]
    },
    srm: {
      id: "srm",
      token: "SRM",
      department: "MAGAZIJN GRONDSTOFFEN",
      title: "SUPPLY & RAW MATERIALS",
      form: {
        code: "501",
        name: "Materiaaluitgifteformulier",
        tasks: ["Verzamel alle benodigde onderdelen", "Controleer aantallen en kleuren", "Geef materiaal uit"],
        actionLabel: "Materiaal uitgeven",
        transferLabel: "Breng naar Productie-afdeling 1",
        requiresParts: true
      },
      processingSeconds: [7, 13]
    },
    pd1: {
      id: "pd1",
      token: "PD1",
      department: "PRODUCTIE-AFDELING 1",
      title: "MANAGER 1",
      form: {
        code: "601",
        name: "Productieorderformulier",
        tasks: ["Controleer de grondplaat", "Bouw de eerste torenlaag", "Controleer de subassembly"],
        actionLabel: "Bouwstap 1 uitvoeren",
        transferLabel: "Breng Subassembly 1 naar Productie-afdeling 2",
        requiresParts: true
      },
      processingSeconds: [8, 15]
    },
    pd2: {
      id: "pd2",
      token: "PD2",
      department: "PRODUCTIE-AFDELING 2",
      title: "MANAGER 2",
      form: {
        code: "701",
        name: "Productieorderformulier",
        tasks: ["Controleer Subassembly 1", "Bouw de tweede torenlaag", "Voer kwaliteitscontrole uit"],
        actionLabel: "Bouwstap 2 uitvoeren",
        transferLabel: "Breng Subassembly 2 naar Productie-afdeling 3",
        requiresParts: true
      },
      processingSeconds: [8, 16]
    },
    pd3: {
      id: "pd3",
      token: "PD3",
      department: "PRODUCTIE-AFDELING 3",
      title: "MANAGER 3",
      form: {
        code: "801",
        name: "Productieorderformulier",
        tasks: ["Controleer Subassembly 2", "Bouw de bovenste torenlaag", "Meld het product gereed"],
        actionLabel: "Bouwstap 3 uitvoeren",
        transferLabel: "Breng gereed product naar SSF",
        requiresParts: true
      },
      processingSeconds: [8, 15]
    },
    ssf: {
      id: "ssf",
      token: "SSF",
      department: "MAGAZIJN GEREED PRODUCT",
      title: "STORAGE & SHIPPING FINISHED",
      form: {
        code: "1001",
        name: "Ontvangst- en uitleverformulier",
        tasks: ["Controleer het gereed product", "Boek de voorraadmutatie", "Lever de klantorder uit"],
        actionLabel: "Order uitleveren",
        transferLabel: "Lever aan de klant"
      },
      processingSeconds: [5, 10]
    }
  });

  const ROLE_FLOW = Object.freeze([
    "customer",
    "operations",
    "srm",
    "pd1",
    "pd2",
    "pd3",
    "ssf"
  ]);

  const PRODUCT_DEFINITIONS = Object.freeze({
    A: {
      id: "A",
      name: "Toren A",
      price: 49,
      colors: ["yellow", "red", "white"],
      towerSequence: ["yellow_8", "yellow_8", "red_8", "white_4"],
      stages: {
        pd1: { base_green: 1, yellow_8: 2 },
        pd2: { red_8: 1 },
        pd3: { white_4: 1 }
      }
    },
    B: {
      id: "B",
      name: "Toren B",
      price: 58,
      colors: ["blue", "yellow", "green"],
      towerSequence: ["blue_8", "blue_8", "yellow_4", "green_4"],
      stages: {
        pd1: { base_green: 1, blue_8: 2 },
        pd2: { yellow_4: 1 },
        pd3: { green_4: 1 }
      }
    },
    C: {
      id: "C",
      name: "Toren C",
      price: 76,
      colors: ["white", "blue", "red"],
      towerSequence: ["white_8", "white_8", "blue_4", "red_4"],
      stages: {
        pd1: { base_green: 1, white_8: 2 },
        pd2: { blue_4: 1 },
        pd3: { red_4: 1 }
      }
    }
  });

  const PART_DEFINITIONS = Object.freeze({
    base_green: { id: "base_green", label: "Plaat groen", color: "green", size: "6×6" },
    yellow_8: { id: "yellow_8", label: "Steen geel", color: "yellow", size: "2×4" },
    yellow_4: { id: "yellow_4", label: "Steen geel", color: "yellow", size: "2×2" },
    blue_8: { id: "blue_8", label: "Steen blauw", color: "blue", size: "2×4" },
    blue_4: { id: "blue_4", label: "Steen blauw", color: "blue", size: "2×2" },
    red_8: { id: "red_8", label: "Steen rood", color: "red", size: "2×4" },
    red_4: { id: "red_4", label: "Steen rood", color: "red", size: "2×2" },
    white_8: { id: "white_8", label: "Steen wit", color: "white", size: "2×4" },
    white_4: { id: "white_4", label: "Steen wit", color: "white", size: "2×2" },
    green_4: { id: "green_4", label: "Steen groen", color: "green", size: "2×2" }
  });

  const DEFAULT_CONFIG = Object.freeze({
    tickMs: 250,
    initialOrderDelayMs: 2500,
    orderIntervalMinMs: 30000,
    orderIntervalMaxMs: 90000,
    transferDelayMinMs: 1200,
    transferDelayMaxMs: 3500,
    incidentChance: 0.12,
    peakFlowChance: 0.08,
    dueTimeMinMs: 240000,
    dueTimeMaxMs: 480000,
    maxOrdersInSystem: 12,
    feedLimit: 120,
    processingTimeScale: 1000
  });

  function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function clamp(value, minimum, maximum) {
    return Math.max(minimum, Math.min(maximum, value));
  }

  class GameLoop {
    constructor(update, tickMs = DEFAULT_CONFIG.tickMs, timers = {}) {
      this.update = update;
      this.tickMs = tickMs;
      this.setInterval = timers.setInterval || window.setInterval.bind(window);
      this.clearInterval = timers.clearInterval || window.clearInterval.bind(window);
      this.timer = null;
    }

    start() {
      if (this.timer !== null) return;
      this.timer = this.setInterval(() => this.update(), this.tickMs);
    }

    stop() {
      if (this.timer === null) return;
      this.clearInterval(this.timer);
      this.timer = null;
    }

    get running() {
      return this.timer !== null;
    }
  }

  class LogisticsGameEngine {
    constructor(options = {}) {
      this.config = { ...DEFAULT_CONFIG, ...(options.config || {}) };
      this.roles = deepClone(options.roles || ROLE_DEFINITIONS);
      this.products = deepClone(options.products || PRODUCT_DEFINITIONS);
      this.parts = deepClone(options.parts || PART_DEFINITIONS);
      this.random = typeof options.random === "function" ? options.random : Math.random;
      this.now = typeof options.now === "function" ? options.now : Date.now;
      this.listeners = new Set();
      this.loop = new GameLoop(
        () => this.update(this.now()),
        this.config.tickMs,
        options.timers || {}
      );
      this.reset();
    }

    reset() {
      this.loop?.stop();
      this.started = false;
      this.humanRoleId = null;
      this.startedAt = null;
      this.nextOrderAt = null;
      this.pendingPeakOrderAt = null;
      this.orderCounter = 0;
      this.orders = new Map();
      this.feed = [];
      this.roleRuntime = Object.fromEntries(
        ROLE_FLOW.map(roleId => [roleId, {
          roleId,
          state: ROLE_STATES.IDLE,
          queue: [],
          activeOrderId: null,
          stateSince: null,
          completesAt: null,
          transfersAt: null,
          incident: null
        }])
      );
      this.emit("reset");
    }

    subscribe(listener) {
      if (typeof listener !== "function") return () => {};
      this.listeners.add(listener);
      return () => this.listeners.delete(listener);
    }

    emit(type, detail = {}) {
      const event = { type, detail, snapshot: this.snapshot() };
      this.listeners.forEach(listener => listener(event));
    }

    randomBetween(minimum, maximum) {
      return minimum + this.random() * Math.max(0, maximum - minimum);
    }

    start({ humanRoleId = null } = {}) {
      if (humanRoleId && !this.roles[humanRoleId]) {
        throw new Error(`Onbekende spelersrol: ${humanRoleId}`);
      }
      if (this.started) this.stop();
      this.reset();
      const now = this.now();
      this.started = true;
      this.startedAt = now;
      this.humanRoleId = humanRoleId;
      this.nextOrderAt = now + this.config.initialOrderDelayMs;
      this.addFeed(
        "system",
        humanRoleId
          ? `${this.roles[humanRoleId].title} wordt door de speler uitgevoerd; de overige zes rollen zijn gesimuleerd.`
          : "Kies een menselijke rol om de logistieke simulatie te starten.",
        null,
        now
      );
      this.loop.start();
      this.emit("started", { humanRoleId });
      return this.snapshot();
    }

    stop() {
      this.loop.stop();
      this.started = false;
      this.emit("stopped");
    }

    setHumanRole(roleId) {
      if (!this.roles[roleId]) throw new Error(`Onbekende spelersrol: ${roleId}`);
      const alreadyBusy = Object.values(this.roleRuntime)
        .some(runtime => runtime.state !== ROLE_STATES.IDLE || runtime.queue.length);
      if (alreadyBusy) throw new Error("De spelersrol kan alleen worden gekozen voordat de orderstroom actief is.");
      this.humanRoleId = roleId;
      this.addFeed("system", `${this.roles[roleId].title} is toegewezen aan de speler.`);
      this.emit("human-role-changed", { humanRoleId: roleId });
    }

    scheduleNextOrder(now) {
      this.nextOrderAt = now + this.randomBetween(
        this.config.orderIntervalMinMs,
        this.config.orderIntervalMaxMs
      );
    }

    activeOrderCount() {
      return [...this.orders.values()].filter(order => order.status !== "DELIVERED").length;
    }

    generateOrder({ peak = false } = {}) {
      if (!this.started || !this.humanRoleId) return null;
      if (this.activeOrderCount() >= this.config.maxOrdersInSystem) return null;
      const now = this.now();
      const products = Object.values(this.products);
      const product = products[Math.floor(this.random() * products.length)] || products[0];
      const quantity = 1 + Math.floor(this.random() * 3);
      const customerNumber = 1 + Math.floor(this.random() * 4);
      const id = `ORD-${String(++this.orderCounter).padStart(3, "0")}`;
      const order = {
        id,
        customer: `Klant ${customerNumber}`,
        productId: product.id,
        productName: product.name,
        quantity,
        createdAt: now,
        dueAt: now + this.randomBetween(this.config.dueTimeMinMs, this.config.dueTimeMaxMs),
        routeIndex: 0,
        currentRoleId: ROLE_FLOW[0],
        status: "ACTIVE",
        qualityRetries: 0,
        history: []
      };
      this.orders.set(id, order);
      this.enqueue(ROLE_FLOW[0], id);
      this.addFeed("order", `${order.customer} heeft ${id} geplaatst: ${quantity}× ${product.name}.`, id, now);
      if (peak) this.addFeed("incident", `Peak Flow: ${id} kwam kort na de vorige order binnen.`, id, now);
      this.emit("order-created", { order: deepClone(order), peak });
      return deepClone(order);
    }

    enqueue(roleId, orderId) {
      const runtime = this.roleRuntime[roleId];
      if (!runtime || !this.orders.has(orderId)) return;
      runtime.queue.push(orderId);
    }

    update(now = this.now()) {
      if (!this.started || !this.humanRoleId) return;
      this.updateOrderGenerator(now);
      ROLE_FLOW.forEach(roleId => this.updateRole(roleId, now));
      this.emit("tick", { now });
    }

    updateOrderGenerator(now) {
      if (this.pendingPeakOrderAt && now >= this.pendingPeakOrderAt) {
        this.pendingPeakOrderAt = null;
        this.generateOrder({ peak: true });
      }
      if (this.nextOrderAt === null || now < this.nextOrderAt) return;
      this.generateOrder();
      if (this.random() < this.config.peakFlowChance) {
        this.pendingPeakOrderAt = now + this.randomBetween(1500, 4000);
        this.addFeed("incident", "Peak Flow gedetecteerd: een extra klantorder volgt direct.");
      }
      this.scheduleNextOrder(now);
    }

    updateRole(roleId, now) {
      const runtime = this.roleRuntime[roleId];
      if (runtime.state === ROLE_STATES.IDLE && runtime.queue.length) {
        this.beginRoleWork(roleId, runtime.queue.shift(), now);
      }
      if (runtime.state === ROLE_STATES.PROCESSING && now >= runtime.completesAt) {
        runtime.state = ROLE_STATES.WAITING_FOR_NEXT;
        runtime.stateSince = now;
        runtime.transfersAt = now + this.randomBetween(
          this.config.transferDelayMinMs,
          this.config.transferDelayMaxMs
        );
        const order = this.orders.get(runtime.activeOrderId);
        this.addFeed("state", `${this.roles[roleId].token} heeft ${order.id} verwerkt en bereidt de overdracht voor.`, order.id, now);
      }
      if (runtime.state === ROLE_STATES.WAITING_FOR_NEXT && now >= runtime.transfersAt) {
        this.transferOrder(roleId, runtime.activeOrderId, now);
      }
    }

    beginRoleWork(roleId, orderId, now) {
      const runtime = this.roleRuntime[roleId];
      const order = this.orders.get(orderId);
      if (!order) return;
      runtime.activeOrderId = orderId;
      runtime.stateSince = now;
      runtime.incident = null;
      order.currentRoleId = roleId;
      order.routeIndex = ROLE_FLOW.indexOf(roleId);
      if (roleId === this.humanRoleId) {
        runtime.state = ROLE_STATES.AWAITING_PLAYER;
        runtime.completesAt = null;
        this.addFeed("player", `${this.roles[roleId].token} wacht op jouw handeling voor ${order.id}.`, order.id, now);
        this.emit("player-action-required", { roleId, order: deepClone(order) });
        return;
      }
      const duration = this.processingDuration(roleId, order);
      const incident = this.rollIncident(roleId, order);
      runtime.state = ROLE_STATES.PROCESSING;
      runtime.incident = incident;
      runtime.completesAt = now + duration + (incident?.delayMs || 0);
      this.addFeed("state", `${this.roles[roleId].token} verwerkt ${order.id}.`, order.id, now);
      if (incident) this.recordIncident(incident, order, roleId, now);
    }

    processingDuration(roleId, order) {
      const [minimum, maximum] = this.roles[roleId].processingSeconds;
      const seconds = this.randomBetween(minimum, maximum) + Math.max(0, order.quantity - 1) * 1.5;
      return seconds * this.config.processingTimeScale;
    }

    rollIncident(roleId, order) {
      if (this.random() >= clamp(this.config.incidentChance, 0, 1)) return null;
      if (roleId === "srm") {
        return {
          id: "raw_material_delay",
          label: "Grondstoffenvertraging",
          message: "SRM heeft extra tijd nodig voor de materiaaluitgifte.",
          delayMs: 20000
        };
      }
      if (roleId === "pd2") {
        order.qualityRetries += 1;
        return {
          id: "quality_error",
          label: "Kwaliteitsfout",
          message: "PD2 ontdekte een fout in Subassembly 1; herstelwerk is gestart.",
          delayMs: 20000
        };
      }
      return {
        id: "logistics_delay",
        label: "Logistieke vertraging",
        message: `${this.roles[roleId].token} ondervindt een onverwachte vertraging.`,
        delayMs: 10000
      };
    }

    recordIncident(incident, order, roleId, now) {
      order.history.push({
        at: now,
        roleId,
        type: "incident",
        label: incident.label
      });
      this.addFeed("incident", `${incident.label}: ${incident.message}`, order.id, now);
      this.emit("incident", { incident: deepClone(incident), order: deepClone(order), roleId });
    }

    transferOrder(roleId, orderId, now) {
      const runtime = this.roleRuntime[roleId];
      const order = this.orders.get(orderId);
      if (!order) {
        this.releaseRole(runtime, now);
        return;
      }
      order.history.push({
        at: now,
        roleId,
        type: "completed",
        label: this.roles[roleId].form.actionLabel
      });
      const currentIndex = ROLE_FLOW.indexOf(roleId);
      const nextRoleId = ROLE_FLOW[currentIndex + 1] || null;
      if (!nextRoleId) {
        order.status = "DELIVERED";
        order.currentRoleId = null;
        order.deliveredAt = now;
        this.addFeed(
          "success",
          `${order.id} is door SSF aan ${order.customer} uitgeleverd${now > order.dueAt ? " (te laat)" : ""}.`,
          order.id,
          now
        );
        this.emit("order-delivered", { order: deepClone(order) });
      } else {
        order.currentRoleId = nextRoleId;
        order.routeIndex = currentIndex + 1;
        this.enqueue(nextRoleId, order.id);
        this.addFeed(
          "transfer",
          `${this.roles[roleId].token} draagt ${order.id} over aan ${this.roles[nextRoleId].token}.`,
          order.id,
          now
        );
      }
      this.releaseRole(runtime, now);
    }

    releaseRole(runtime, now) {
      runtime.state = ROLE_STATES.IDLE;
      runtime.stateSince = now;
      runtime.activeOrderId = null;
      runtime.completesAt = null;
      runtime.transfersAt = null;
      runtime.incident = null;
    }

    requiredParts(order, roleId) {
      const product = this.products[order.productId];
      if (!product) return {};
      if (roleId === "srm") {
        const allParts = {};
        Object.values(product.stages).forEach(recipe => {
          Object.entries(recipe).forEach(([partId, amount]) => {
            allParts[partId] = (allParts[partId] || 0) + amount * order.quantity;
          });
        });
        return allParts;
      }
      const recipe = product.stages[roleId] || {};
      return Object.fromEntries(
        Object.entries(recipe).map(([partId, amount]) => [partId, amount * order.quantity])
      );
    }

    playerTask() {
      if (!this.humanRoleId) return null;
      const runtime = this.roleRuntime[this.humanRoleId];
      if (runtime.state !== ROLE_STATES.AWAITING_PLAYER || !runtime.activeOrderId) return null;
      const order = this.orders.get(runtime.activeOrderId);
      if (!order) return null;
      return {
        role: deepClone(this.roles[this.humanRoleId]),
        order: deepClone(order),
        product: deepClone(this.products[order.productId]),
        requiredParts: this.requiredParts(order, this.humanRoleId)
      };
    }

    completePlayerAction(payload = {}) {
      const task = this.playerTask();
      if (!task) return { ok: false, errors: ["Er staat geen handeling voor jouw rol klaar."] };
      const errors = [];
      const selectedParts = payload.parts && typeof payload.parts === "object" ? payload.parts : {};
      Object.entries(task.requiredParts).forEach(([partId, required]) => {
        const selected = Number(selectedParts[partId] || 0);
        if (selected < required) {
          errors.push(`${this.parts[partId]?.label || partId}: ${selected}/${required}`);
        }
      });
      if (!payload.transferred) errors.push("Bevestig de logistieke overdracht.");
      if (!payload.signed) errors.push("Parafeer het formulier.");
      if (errors.length) {
        this.emit("player-action-rejected", { errors });
        return { ok: false, errors };
      }

      const now = this.now();
      const runtime = this.roleRuntime[this.humanRoleId];
      const order = this.orders.get(runtime.activeOrderId);
      const incident = this.rollIncident(this.humanRoleId, order);
      this.addFeed(
        "player",
        `Speler ${this.roles[this.humanRoleId].token} heeft ${this.roles[this.humanRoleId].form.actionLabel.toLowerCase()} voor ${order.id}.`,
        order.id,
        now
      );
      if (incident) {
        runtime.state = ROLE_STATES.PROCESSING;
        runtime.stateSince = now;
        runtime.incident = incident;
        runtime.completesAt = now + incident.delayMs;
        this.recordIncident(incident, order, this.humanRoleId, now);
      } else {
        runtime.state = ROLE_STATES.WAITING_FOR_NEXT;
        runtime.stateSince = now;
        runtime.transfersAt = now + this.randomBetween(
          this.config.transferDelayMinMs,
          this.config.transferDelayMaxMs
        );
      }
      this.emit("player-action-completed", { order: deepClone(order), roleId: this.humanRoleId });
      return { ok: true, errors: [] };
    }

    addFeed(kind, message, orderId = null, at = this.now()) {
      this.feed.unshift({
        id: `${at}-${this.feed.length + 1}`,
        at,
        kind,
        orderId,
        message
      });
      if (this.feed.length > this.config.feedLimit) this.feed.length = this.config.feedLimit;
    }

    snapshot() {
      return {
        started: Boolean(this.started),
        startedAt: this.startedAt,
        humanRoleId: this.humanRoleId,
        nextOrderAt: this.nextOrderAt,
        roles: deepClone(this.roles),
        products: deepClone(this.products),
        parts: deepClone(this.parts),
        roleFlow: [...ROLE_FLOW],
        roleRuntime: deepClone(this.roleRuntime),
        orders: deepClone([...this.orders.values()]),
        feed: deepClone(this.feed),
        playerTask: this.playerTask ? this.playerTask() : null,
        config: { ...this.config }
      };
    }
  }

  window.LogisticsGameEngine = Object.freeze({
    LogisticsGameEngine,
    GameLoop,
    ROLE_STATES,
    ROLE_DEFINITIONS,
    ROLE_FLOW,
    PRODUCT_DEFINITIONS,
    PART_DEFINITIONS,
    DEFAULT_CONFIG
  });
})();
