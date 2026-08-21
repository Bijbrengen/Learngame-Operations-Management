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

  const PARALLEL_PRODUCTION_ROLES = Object.freeze(["pd1", "pd2", "pd3"]);
  const MAX_RETAINED_DELIVERED_ORDERS = 250;

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
    base_green: { id: "base_green", label: "Grondplaat groen", color: "green", size: "6×6", width: 6, depth: 6, blokId: "element.ground-plate.6x6.green", blokFile: "elements/element_grondplaat_6x6_groen.blok" },
    yellow_8: { id: "yellow_8", label: "Steen geel", color: "yellow", size: "2×4", width: 4, depth: 2, blokId: "element.brick.2x4.yellow", blokFile: "elements/element_blok_2x4_geel.blok" },
    yellow_4: { id: "yellow_4", label: "Steen geel", color: "yellow", size: "2×2", width: 2, depth: 2, blokId: "element.brick.2x2.yellow", blokFile: "elements/element_blok_2x2_geel.blok" },
    blue_8: { id: "blue_8", label: "Steen blauw", color: "blue", size: "2×4", width: 4, depth: 2, blokId: "element.brick.2x4.blue", blokFile: "elements/element_blok_2x4_blauw.blok" },
    blue_4: { id: "blue_4", label: "Steen blauw", color: "blue", size: "2×2", width: 2, depth: 2, blokId: "element.brick.2x2.blue", blokFile: "elements/element_blok_2x2_blauw.blok" },
    red_8: { id: "red_8", label: "Steen rood", color: "red", size: "2×4", width: 4, depth: 2, blokId: "element.brick.2x4", blokFile: "elements/element_blok_2x4.blok" },
    red_4: { id: "red_4", label: "Steen rood", color: "red", size: "2×2", width: 2, depth: 2, blokId: "element.brick.2x2", blokFile: "elements/element_blok_2x2.blok" },
    white_8: { id: "white_8", label: "Steen wit", color: "white", size: "2×4", width: 4, depth: 2, blokId: "element.brick.2x4.white", blokFile: "elements/element_blok_2x4_wit.blok" },
    white_4: { id: "white_4", label: "Steen wit", color: "white", size: "2×2", width: 2, depth: 2, blokId: "element.brick.2x2.white", blokFile: "elements/element_blok_2x2_wit.blok" },
    green_4: { id: "green_4", label: "Steen groen", color: "green", size: "2×2", width: 2, depth: 2, blokId: "element.brick.2x2.green", blokFile: "elements/element_blok_2x2_groen.blok" }
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
    processingTimeScale: 1000,
    behaviorCycleMs: 720000
  });

  const DIFFICULTY_PRESETS = Object.freeze({
    easy: Object.freeze({
      id: "easy",
      label: "Makkelijk",
      initialOrderDelayMs: 5000,
      orderIntervalMinMs: 5000,
      orderIntervalMaxMs: 7000,
      transferDelayMinMs: 900,
      transferDelayMaxMs: 1500,
      incidentChance: 0.02,
      peakFlowChance: 0.02,
      maxOrdersInSystem: 5,
      reactionJitter: [0.9, 1.1]
    }),
    normal: Object.freeze({
      id: "normal",
      label: "Gemiddeld",
      initialOrderDelayMs: 2500,
      orderIntervalMinMs: 2500,
      orderIntervalMaxMs: 4500,
      transferDelayMinMs: 800,
      transferDelayMaxMs: 3000,
      incidentChance: 0.12,
      peakFlowChance: 0.1,
      maxOrdersInSystem: 10,
      reactionJitter: [0.65, 1.4]
    }),
    hard: Object.freeze({
      id: "hard",
      label: "Moeilijk",
      initialOrderDelayMs: 250,
      orderIntervalMinMs: 250,
      orderIntervalMaxMs: 900,
      transferDelayMinMs: 150,
      transferDelayMaxMs: 5000,
      incidentChance: 0.35,
      peakFlowChance: 0.42,
      maxOrdersInSystem: 18,
      reactionJitter: [0.2, 2.6]
    })
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
      this.behaviorPatterns = options.behaviorPatterns || null;
      this.customerOrderMode = options.customerOrderMode === "free" ? "free" : "required";
      this.gameType = String(options.gameType || "lo4");
      this.intermediateStock = Boolean(options.intermediateStock);
      this.enabledRoles = Array.isArray(options.enabledRoles) ? [...new Set(options.enabledRoles)] : null;
      this.organizationModel = ["independent_enterprises", "school_learning_path"].includes(
        options.organizationModel
      ) ? options.organizationModel : "single_enterprise";
      this.fundingIncentive = ["quality", "balanced", "financing"].includes(
        options.fundingIncentive
      ) ? options.fundingIncentive : "balanced";
      this.playMode = options.playMode === "digital" ? "digital" : "physical";
      this.productionProcesses = this.normalizeProductionProcesses(options.productionProcesses);
      this.difficultyLevel = "normal";
      this.difficulty = DIFFICULTY_PRESETS.normal;
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
      this.humanRoleIds = new Set();
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
          incident: null,
          hesitation: false,
          agentBehavior: null
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

    setBehaviorPatterns(patterns) {
      const valid = patterns?.schemaVersion === "entrepreneurship-human-agent-patterns-v1";
      this.behaviorPatterns = valid ? patterns : null;
      return Boolean(this.behaviorPatterns);
    }

    setDifficulty(level) {
      const preset = DIFFICULTY_PRESETS[level] || DIFFICULTY_PRESETS.normal;
      this.difficultyLevel = preset.id;
      this.difficulty = preset;
      Object.assign(this.config, {
        initialOrderDelayMs: preset.initialOrderDelayMs,
        orderIntervalMinMs: preset.orderIntervalMinMs,
        orderIntervalMaxMs: preset.orderIntervalMaxMs,
        transferDelayMinMs: preset.transferDelayMinMs,
        transferDelayMaxMs: preset.transferDelayMaxMs,
        incidentChance: preset.incidentChance,
        peakFlowChance: preset.peakFlowChance,
        maxOrdersInSystem: preset.maxOrdersInSystem
      });
      return this.difficultyLevel;
    }

    setCustomerOrderMode(mode) {
      this.customerOrderMode = mode === "free" ? "free" : "required";
      return this.customerOrderMode;
    }

    setOrganizationModel(model) {
      this.organizationModel = ["independent_enterprises", "school_learning_path"].includes(model)
        ? model
        : "single_enterprise";
      return this.organizationModel;
    }

    setFundingIncentive(incentive) {
      this.fundingIncentive = ["quality", "balanced", "financing"].includes(incentive)
        ? incentive
        : "balanced";
      return this.fundingIncentive;
    }

    setPlayMode(mode) {
      this.playMode = mode === "digital" ? "digital" : "physical";
      return this.playMode;
    }

    normalizeProductionProcesses(processes) {
      const normalized = Array.from(new Set(
        (Array.isArray(processes) ? processes : [])
          .filter(process => process === "parallel" || process === "sequential")
      ));
      return normalized.length ? normalized : ["sequential"];
    }

    setProductionProcesses(processes) {
      this.productionProcesses = this.normalizeProductionProcesses(processes);
      return [...this.productionProcesses];
    }

    productionRouteForNextOrder() {
      if (this.productionProcesses.length === 2) {
        return this.orderCounter % 2 === 0 ? "parallel" : "sequential";
      }
      return this.productionProcesses[0];
    }

    productionRoleForProduct(productId) {
      const productIds = Object.keys(this.products);
      const index = Math.max(0, productIds.indexOf(productId));
      return PARALLEL_PRODUCTION_ROLES[index % PARALLEL_PRODUCTION_ROLES.length];
    }

    assignOrderRoleFlow(order) {
      const productionRoute = order.productionRoute || this.productionRouteForNextOrder();
      const productionRoleId = productionRoute === "parallel"
        ? this.productionRoleForProduct(order.productId)
        : null;
      order.productionRoute = productionRoute;
      order.productionDepartment = productionRoleId;
      order.roleFlow = productionRoute === "parallel"
        ? ["customer", "operations", "srm", productionRoleId, "ssf"]
        : [...ROLE_FLOW];
      return order.roleFlow;
    }

    pickWeightedProfile(profiles) {
      if (!Array.isArray(profiles) || !profiles.length) return null;
      const totalWeight = profiles.reduce(
        (sum, profile) => sum + Math.max(0, Number(profile.weight) || 0),
        0
      );
      if (totalWeight <= 0) return profiles[0];
      let cursor = this.random() * totalWeight;
      for (const profile of profiles) {
        cursor -= Math.max(0, Number(profile.weight) || 0);
        if (cursor <= 0) return profile;
      }
      return profiles[profiles.length - 1];
    }

    assignAgentBehaviors() {
      const mapping = this.behaviorPatterns?.roleMapping || {};
      const families = this.behaviorPatterns?.roleFamilies || {};
      ROLE_FLOW.forEach(roleId => {
        const familyId = mapping[roleId];
        const family = families[familyId];
        const profile = this.pickWeightedProfile(family?.profiles);
        this.roleRuntime[roleId].agentBehavior = profile ? {
          familyId,
          profileId: profile.id,
          label: profile.label,
          processingMultiplier: Number(profile.processingMultiplier) || 1,
          transferMultiplier: Number(profile.transferMultiplier) || 1,
          hesitationChance: clamp(Number(profile.hesitationChance) || 0, 0, 1),
          hesitationMultiplier: Array.isArray(profile.hesitationMultiplier)
            ? profile.hesitationMultiplier.map(Number)
            : [1, 1],
          burstChance: clamp(Number(profile.burstChance) || 0, 0, 1)
        } : null;
      });
    }

    start({
      humanRoleId = null,
      humanRoleIds = humanRoleId ? [humanRoleId] : [],
      customerOrderMode = this.customerOrderMode,
      gameType = this.gameType,
      organizationModel = this.organizationModel,
      fundingIncentive = this.fundingIncentive,
      playMode = this.playMode,
      productionProcesses = this.productionProcesses,
      intermediateStock = this.intermediateStock,
      enabledRoles = this.enabledRoles
    } = {}) {
      if (humanRoleId && !this.roles[humanRoleId]) {
        throw new Error(`Onbekende spelersrol: ${humanRoleId}`);
      }
      const normalizedHumanRoleIds = [...new Set(humanRoleIds || [])];
      normalizedHumanRoleIds.forEach(roleId => {
        if (!this.roles[roleId]) throw new Error(`Onbekende spelersrol: ${roleId}`);
      });
      if (humanRoleId && !normalizedHumanRoleIds.includes(humanRoleId)) {
        normalizedHumanRoleIds.push(humanRoleId);
      }
      if (this.started) this.stop();
      this.setCustomerOrderMode(customerOrderMode);
      this.gameType = String(gameType || "lo4");
      this.intermediateStock = Boolean(intermediateStock);
      this.enabledRoles = Array.isArray(enabledRoles) ? [...new Set(enabledRoles)] : null;
      this.setOrganizationModel(organizationModel);
      this.setFundingIncentive(fundingIncentive);
      this.setPlayMode(playMode);
      this.setProductionProcesses(productionProcesses);
      this.reset();
      const now = this.now();
      this.started = true;
      this.startedAt = now;
      this.humanRoleId = humanRoleId;
      this.humanRoleIds = new Set(normalizedHumanRoleIds);
      this.assignAgentBehaviors();
      this.nextOrderAt = now + this.config.initialOrderDelayMs;
      this.addFeed(
        "system",
        humanRoleId
          ? `${normalizedHumanRoleIds.length} rol${normalizedHumanRoleIds.length === 1 ? "" : "len"} wordt door spelers uitgevoerd; alleen onbezet gebleven rollen worden gesimuleerd. Moeilijkheid: ${this.difficulty.label}.${this.behaviorPatterns ? " Agenttempo is gebaseerd op geaggregeerde Entrepreneurship-spelpatronen." : ""}`
          : "Kies een menselijke rol om de logistieke simulatie te starten.",
        null,
        now
      );
      this.loop.start();
      this.emit("started", { humanRoleId, humanRoleIds: normalizedHumanRoleIds });
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
      this.humanRoleIds = new Set([roleId]);
      this.addFeed("system", `${this.roles[roleId].title} is toegewezen aan de speler.`);
      this.emit("human-role-changed", { humanRoleId: roleId });
    }

    setHumanRoles(roleIds = [], { emit = true } = {}) {
      const next = new Set((roleIds || []).filter(roleId => this.roles[roleId]));
      if (this.humanRoleId) next.add(this.humanRoleId);
      const previous = this.humanRoleIds || new Set();
      const changed = previous.size !== next.size
        || [...previous].some(roleId => !next.has(roleId));
      const now = this.now();
      this.humanRoleIds = next;
      ROLE_FLOW.forEach(roleId => {
        const runtime = this.roleRuntime[roleId];
        if (!runtime?.activeOrderId) return;
        if (next.has(roleId) && !previous.has(roleId) && runtime.state === ROLE_STATES.PROCESSING) {
          runtime.state = ROLE_STATES.AWAITING_PLAYER;
          runtime.completesAt = null;
          runtime.incident = null;
          runtime.stateSince = now;
          this.addFeed("player", `${this.roles[roleId].token} is door een speler overgenomen.`, runtime.activeOrderId, now);
        } else if (!next.has(roleId) && previous.has(roleId) && runtime.state === ROLE_STATES.AWAITING_PLAYER) {
          const order = this.orders.get(runtime.activeOrderId);
          const timing = this.processingTiming(roleId, order);
          runtime.state = ROLE_STATES.PROCESSING;
          runtime.stateSince = now;
          runtime.completesAt = now + timing.durationMs;
          this.addFeed("state", `${this.roles[roleId].token} is tijdelijk door een agent overgenomen.`, runtime.activeOrderId, now);
        }
      });
      if (emit && changed) this.emit("human-roles-changed", { humanRoleIds: [...next] });
      return [...next];
    }

    scheduleNextOrder(now) {
      const customerBehavior = this.roleRuntime.customer?.agentBehavior;
      const phaseIntensity = this.activityIntensity("trader", now);
      const paceMultiplier = customerBehavior?.processingMultiplier || 1;
      const interval = this.randomBetween(
        this.config.orderIntervalMinMs,
        this.config.orderIntervalMaxMs
      );
      this.nextOrderAt = now + interval * paceMultiplier / phaseIntensity;
    }

    activityIntensity(familyId, now = this.now()) {
      const phases = this.behaviorPatterns?.roleFamilies?.[familyId]?.activityByPhase;
      if (!phases || !this.startedAt) return 1;
      const progress = clamp(
        (now - this.startedAt) / Math.max(1, this.config.behaviorCycleMs),
        0,
        0.999
      );
      const phaseKey = progress < 1 / 3 ? "early" : progress < 2 / 3 ? "middle" : "late";
      return clamp((Number(phases[phaseKey]) || 1 / 3) / (1 / 3), 0.7, 1.35);
    }

    activeOrderCount() {
      return [...this.orders.values()].filter(order => order.status !== "DELIVERED").length;
    }

    generateOrder({ peak = false } = {}) {
      if (!this.started || !this.humanRoleIds.size) return null;
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
        productionRoute: this.productionRouteForNextOrder(),
        productionDepartment: null,
        roleFlow: [],
        status: this.humanRoleIds.has("customer") ? "DRAFT" : "ACTIVE",
        qualityRetries: 0,
        history: []
      };
      this.assignOrderRoleFlow(order);
      this.orders.set(id, order);
      this.enqueue(order.roleFlow[0], id);
      this.addFeed(
        "order",
        this.humanRoleIds.has("customer")
          ? `${order.customer} kan ${id} nu als torenbestelling plaatsen.`
          : `${order.customer} heeft ${id} geplaatst: ${quantity}× ${product.name}.`,
        id,
        now
      );
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
      if (!this.started || !this.humanRoleIds.size) return;
      const before = this.synchronizationSignature();
      this.updateOrderGenerator(now);
      ROLE_FLOW.forEach(roleId => this.updateRole(roleId, now));
      this.emit("tick", {
        now,
        synchronizationChanged: this.synchronizationSignature() !== before
      });
    }

    synchronizationSignature() {
      return JSON.stringify({
        nextOrderAt: this.nextOrderAt,
        pendingPeakOrderAt: this.pendingPeakOrderAt,
        orderCounter: this.orderCounter,
        roles: ROLE_FLOW.map(roleId => {
          const runtime = this.roleRuntime[roleId];
          return [
            roleId,
            runtime?.state,
            runtime?.activeOrderId,
            runtime?.completesAt,
            runtime?.transfersAt,
            runtime?.queue || [],
            runtime?.incident?.id || null
          ];
        }),
        orders: [...this.orders.values()].map(order => [
          order.id,
          order.status,
          order.currentRoleId,
          order.routeIndex,
          order.history?.length || 0,
          order.qualityRetries || 0,
          order.deliveredAt || null
        ])
      });
    }

    updateOrderGenerator(now) {
      if (this.pendingPeakOrderAt && now >= this.pendingPeakOrderAt) {
        this.pendingPeakOrderAt = null;
        this.generateOrder({ peak: true });
      }
      if (this.nextOrderAt === null || now < this.nextOrderAt) return;
      this.generateOrder();
      const customerBurstChance = this.roleRuntime.customer?.agentBehavior?.burstChance;
      const peakFlowChance = customerBurstChance === undefined
        ? this.config.peakFlowChance
        : (this.config.peakFlowChance + customerBurstChance) / 2;
      if (this.random() < clamp(peakFlowChance, 0, 1)) {
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
        ) * (runtime.agentBehavior?.transferMultiplier || 1);
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
      order.routeIndex = order.roleFlow.indexOf(roleId);
      if (this.humanRoleIds.has(roleId)) {
        runtime.state = ROLE_STATES.AWAITING_PLAYER;
        runtime.completesAt = null;
        this.addFeed("player", `${this.roles[roleId].token} wacht op jouw handeling voor ${order.id}.`, order.id, now);
        this.emit("player-action-required", { roleId, order: deepClone(order) });
        return;
      }
      const timing = this.processingTiming(roleId, order);
      const incident = this.rollIncident(roleId, order);
      runtime.state = ROLE_STATES.PROCESSING;
      runtime.incident = incident;
      runtime.hesitation = timing.hesitation;
      runtime.completesAt = now + timing.durationMs + (incident?.delayMs || 0);
      this.addFeed(
        "state",
        `${this.roles[roleId].token} verwerkt ${order.id}.${timing.hesitation ? ` Agentprofiel ${runtime.agentBehavior.label} neemt extra controletijd.` : ""}`,
        order.id,
        now
      );
      if (incident) this.recordIncident(incident, order, roleId, now);
    }

    processingDuration(roleId, order) {
      return this.processingTiming(roleId, order).durationMs;
    }

    processingTiming(roleId, order) {
      const [minimum, maximum] = this.roles[roleId].processingSeconds;
      const seconds = this.randomBetween(minimum, maximum) + Math.max(0, order.quantity - 1) * 1.5;
      const behavior = this.roleRuntime[roleId]?.agentBehavior;
      const [reactionMinimum, reactionMaximum] = this.difficulty.reactionJitter;
      let multiplier = (behavior?.processingMultiplier || 1)
        * this.randomBetween(reactionMinimum, reactionMaximum);
      let hesitation = false;
      if (behavior && this.random() < behavior.hesitationChance) {
        const [hesitationMin, hesitationMax] = behavior.hesitationMultiplier;
        multiplier *= this.randomBetween(
          Number(hesitationMin) || 1,
          Number(hesitationMax) || Number(hesitationMin) || 1
        );
        hesitation = true;
      }
      return {
        durationMs: seconds * this.config.processingTimeScale * multiplier,
        hesitation
      };
    }

    rollIncident(roleId, order) {
      if (this.random() >= clamp(this.config.incidentChance, 0, 1)) return null;
      if (this.difficultyLevel === "hard" && !this.humanRoleIds.has(roleId)) {
        const noiseRoll = this.random();
        if (noiseRoll < 0.34) {
          return {
            id: "data_typo",
            label: "Typefout in overdracht",
            message: `${this.roles[roleId].token} moet inconsistente ordergegevens opnieuw controleren.`,
            delayMs: 8000
          };
        }
        if (noiseRoll < 0.68) {
          return {
            id: "wrong_delivery",
            label: "Verkeerde levering",
            message: `${this.roles[roleId].token} onderschepte een levering voor de verkeerde order.`,
            delayMs: 15000
          };
        }
      }
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
        label: incident.label,
        delayMs: Number(incident.delayMs || 0)
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
      const currentIndex = order.roleFlow.indexOf(roleId);
      const nextRoleId = order.roleFlow[currentIndex + 1] || null;
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
        const delivered = [...this.orders.values()]
          .filter(item => item.status === "DELIVERED")
          .sort((first, second) => Number(first.deliveredAt || 0) - Number(second.deliveredAt || 0));
        delivered.slice(0, Math.max(0, delivered.length - MAX_RETAINED_DELIVERED_ORDERS))
          .forEach(item => this.orders.delete(item.id));
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
      runtime.hesitation = false;
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
      if (
        order.productionRoute === "parallel"
        && roleId === order.productionDepartment
      ) {
        return Object.values(product.stages).reduce((allParts, recipe) => {
          Object.entries(recipe).forEach(([partId, amount]) => {
            allParts[partId] = (allParts[partId] || 0) + amount * order.quantity;
          });
          return allParts;
        }, {});
      }
      const recipe = product.stages[roleId] || {};
      return Object.fromEntries(
        Object.entries(recipe).map(([partId, amount]) => [partId, amount * order.quantity])
      );
    }

    playerTask(roleId = this.humanRoleId) {
      if (!roleId || !this.humanRoleIds.has(roleId)) return null;
      const runtime = this.roleRuntime[roleId];
      if (runtime.state !== ROLE_STATES.AWAITING_PLAYER || !runtime.activeOrderId) return null;
      const order = this.orders.get(runtime.activeOrderId);
      if (!order) return null;
      const role = deepClone(this.roles[roleId]);
      if (
        order.productionRoute === "parallel"
        && PARALLEL_PRODUCTION_ROLES.includes(roleId)
      ) {
        const departmentLabel = String.fromCharCode(
          65 + PARALLEL_PRODUCTION_ROLES.indexOf(roleId)
        );
        role.department = `PRODUCTIEAFDELING ${departmentLabel}`;
        role.title = `MANAGER PRODUCTIE ${departmentLabel}`;
        role.form.tasks = [
          "Controleer de complete productorder",
          "Bouw alle drie torenlagen",
          "Meld het complete product gereed"
        ];
        role.form.actionLabel = "Complete toren bouwen";
        role.form.transferLabel = "Breng gereed product naar SSF";
      } else if (order.productionRoute === "parallel" && roleId === "srm") {
        role.form.transferLabel = `Breng complete materiaalset naar ${order.productionDepartment.toUpperCase()}`;
      }
      return {
        role,
        order: deepClone(order),
        product: deepClone(this.products[order.productId]),
        requiredParts: this.requiredParts(order, roleId),
        playMode: this.playMode,
        customerOrderMode: this.customerOrderMode,
        organizationModel: this.organizationModel,
        fundingIncentive: this.fundingIncentive,
        availableProducts: roleId === "customer"
          ? deepClone(Object.values(this.products))
          : []
      };
    }

    completePlayerAction(payload = {}, roleId = this.humanRoleId) {
      const task = this.playerTask(roleId);
      if (!task) return { ok: false, errors: ["Er staat geen handeling voor jouw rol klaar."] };
      if (task.role.id === "customer") return this.completeCustomerOrder(task, payload);
      const errors = [];
      const selectedParts = payload.parts && typeof payload.parts === "object" ? payload.parts : {};
      Object.entries(task.requiredParts).forEach(([partId, required]) => {
        const selected = Number(selectedParts[partId] || 0);
        if (selected < required) {
          errors.push(`${this.parts[partId]?.label || partId}: ${selected}/${required}`);
        }
      });
      if (
        ["pd1", "pd2", "pd3"].includes(task.role.id)
        && Number(payload.completedQuantity || 0) < Number(task.order.quantity || 1)
      ) {
        errors.push(`Bouw eerst alle ${task.order.quantity} torens van deze order.`);
      }
      if (!payload.transferred) {
        errors.push(
          this.playMode === "digital"
            ? "Voer de virtuele logistieke overdracht uit."
            : "Bevestig de fysieke logistieke overdracht op het formulier."
        );
      }
      const signatureHasInk = Array.isArray(payload.signature)
        ? payload.signature.some(stroke => Array.isArray(stroke) && stroke.length >= 2)
        : String(payload.signature || "").trim().length >= 2;
      if (!payload.signed || !signatureHasInk) {
        errors.push("Zet één paraaf voor de volledige order.");
      }
      if (errors.length) {
        this.emit("player-action-rejected", { errors });
        return { ok: false, errors };
      }

      const now = this.now();
      const runtime = this.roleRuntime[roleId];
      const order = this.orders.get(runtime.activeOrderId);
      const handlingTimeMs = Math.max(0, now - Number(runtime.stateSince || now));
      order.history.push({
        at: now,
        roleId,
        type: "player_handling",
        label: this.playMode === "digital" ? "Digitale handeling" : "Fysieke handling",
        handlingTimeMs,
        playMode: this.playMode,
        completedQuantity: Number(payload.completedQuantity || task.order.quantity || 1),
        orderSignature: true
      });
      const incident = this.rollIncident(roleId, order);
      this.addFeed(
        "player",
        `Speler ${this.roles[roleId].token} heeft ${this.roles[roleId].form.actionLabel.toLowerCase()} voor ${order.id}.`,
        order.id,
        now
      );
      if (incident) {
        runtime.state = ROLE_STATES.PROCESSING;
        runtime.stateSince = now;
        runtime.incident = incident;
        runtime.completesAt = now + incident.delayMs;
        this.recordIncident(incident, order, roleId, now);
      } else {
        runtime.state = ROLE_STATES.WAITING_FOR_NEXT;
        runtime.stateSince = now;
        runtime.transfersAt = now + this.randomBetween(
          this.config.transferDelayMinMs,
          this.config.transferDelayMaxMs
        );
      }
      this.emit("player-action-completed", {
        order: deepClone(order),
        roleId,
        playMode: this.playMode,
        handlingTimeMs
      });
      return { ok: true, errors: [] };
    }

    completeCustomerOrder(task, payload = {}) {
      const choice = payload.customerOrder && typeof payload.customerOrder === "object"
        ? payload.customerOrder
        : {};
      const order = this.orders.get(task.order.id);
      if (!order) return { ok: false, errors: ["De klantorder bestaat niet meer."] };
      const errors = [];

      if (this.customerOrderMode === "free") {
        const product = this.products[String(choice.productId || "")];
        const quantity = Math.floor(Number(choice.quantity));
        const dueMinutes = Number(choice.dueMinutes);
        if (!product) errors.push("Kies een geldige toren.");
        if (!Number.isFinite(quantity) || quantity < 1 || quantity > 12) {
          errors.push("Kies een aantal van 1 tot en met 12.");
        }
        if (!Number.isFinite(dueMinutes) || dueMinutes < 2 || dueMinutes > 120) {
          errors.push("Kies een levertijd van 2 tot en met 120 minuten.");
        }
        if (errors.length) {
          this.emit("player-action-rejected", { errors });
          return { ok: false, errors };
        }
        order.productId = product.id;
        order.productName = product.name;
        order.quantity = quantity;
        order.dueAt = this.now() + dueMinutes * 60 * 1000;
        this.assignOrderRoleFlow(order);
      }

      const now = this.now();
      const runtime = this.roleRuntime.customer;
      order.status = "ACTIVE";
      order.history.push({
        at: now,
        roleId: "customer",
        type: "completed",
        label: "Klantorder geplaatst"
      });
      this.addFeed(
        "player",
        `Klant heeft ${order.id} geplaatst: ${order.quantity}× ${order.productName}.`,
        order.id,
        now
      );
      runtime.state = ROLE_STATES.WAITING_FOR_NEXT;
      runtime.stateSince = now;
      runtime.transfersAt = now + this.randomBetween(
        this.config.transferDelayMinMs,
        this.config.transferDelayMaxMs
      );
      this.emit("player-action-completed", { order: deepClone(order), roleId: "customer" });
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
        capturedAt: this.now(),
        started: Boolean(this.started),
        startedAt: this.startedAt,
        nextOrderAt: this.nextOrderAt,
        pendingPeakOrderAt: this.pendingPeakOrderAt,
        orderCounter: this.orderCounter,
        humanRoleId: this.humanRoleId,
        humanRoleIds: [...this.humanRoleIds],
        gameType: this.gameType,
        playMode: this.playMode,
        customerOrderMode: this.customerOrderMode,
        organizationModel: this.organizationModel,
        productionProcesses: [...this.productionProcesses],
        intermediateStock: this.intermediateStock,
        enabledRoles: this.enabledRoles ? [...this.enabledRoles] : null,
        nextOrderAt: this.nextOrderAt,
        roles: deepClone(this.roles),
        products: deepClone(this.products),
        parts: deepClone(this.parts),
        roleFlow: [...ROLE_FLOW],
        roleRuntime: deepClone(this.roleRuntime),
        orders: deepClone([...this.orders.values()]),
        feed: deepClone(this.feed),
        playerTask: this.playerTask ? this.playerTask() : null,
        config: { ...this.config },
        difficulty: {
          id: this.difficulty.id,
          label: this.difficulty.label,
          reactionJitter: [...this.difficulty.reactionJitter]
        },
        behaviorSource: this.behaviorPatterns ? {
          schemaVersion: this.behaviorPatterns.schemaVersion,
          sourceSummary: deepClone(this.behaviorPatterns.sourceSummary)
        } : null
      };
    }

    restoreSnapshot(snapshot, {
      humanRoleId = this.humanRoleId,
      humanRoleIds = snapshot?.humanRoleIds || [],
      runLoop = false,
      elapsedSinceSnapshotMs = 0
    } = {}) {
      if (!snapshot || typeof snapshot !== "object" || !Array.isArray(snapshot.orders)) {
        throw new Error("Ongeldige gedeelde spelstatus.");
      }
      this.loop.stop();
      const capturedAt = Number(snapshot.capturedAt);
      const elapsed = Math.max(0, Number(elapsedSinceSnapshotMs) || 0);
      const timelineShift = Number.isFinite(capturedAt)
        ? this.now() - capturedAt - elapsed
        : 0;
      const shiftTime = value => Number.isFinite(Number(value))
        ? Number(value) + timelineShift
        : value;
      this.started = Boolean(snapshot.started);
      this.startedAt = snapshot.startedAt == null ? null : shiftTime(snapshot.startedAt);
      this.nextOrderAt = snapshot.nextOrderAt == null ? null : shiftTime(snapshot.nextOrderAt);
      this.pendingPeakOrderAt = snapshot.pendingPeakOrderAt == null
        ? null
        : shiftTime(snapshot.pendingPeakOrderAt);
      this.orderCounter = Number(snapshot.orderCounter || snapshot.orders.length || 0);
      this.gameType = String(snapshot.gameType || this.gameType);
      this.playMode = snapshot.playMode === "digital" ? "digital" : "physical";
      this.customerOrderMode = snapshot.customerOrderMode === "free" ? "free" : "required";
      this.organizationModel = snapshot.organizationModel || this.organizationModel;
      this.productionProcesses = this.normalizeProductionProcesses(snapshot.productionProcesses);
      this.intermediateStock = Boolean(snapshot.intermediateStock);
      this.enabledRoles = Array.isArray(snapshot.enabledRoles) ? [...snapshot.enabledRoles] : null;
      this.roles = deepClone(snapshot.roles || this.roles);
      this.products = deepClone(snapshot.products || this.products);
      this.parts = deepClone(snapshot.parts || this.parts);
      this.roleRuntime = deepClone(snapshot.roleRuntime || this.roleRuntime);
      this.orders = new Map(snapshot.orders.map(order => [order.id, deepClone(order)]));
      this.feed = deepClone(snapshot.feed || []);
      Object.values(this.roleRuntime).forEach(runtime => {
        if (runtime?.stateSince != null) runtime.stateSince = shiftTime(runtime.stateSince);
        if (runtime?.completesAt != null) runtime.completesAt = shiftTime(runtime.completesAt);
        if (runtime?.transfersAt != null) runtime.transfersAt = shiftTime(runtime.transfersAt);
        if (runtime?.incident?.startedAt != null) {
          runtime.incident.startedAt = shiftTime(runtime.incident.startedAt);
        }
      });
      this.orders.forEach(order => {
        ["createdAt", "dueAt", "deliveredAt"].forEach(key => {
          if (order[key] != null) order[key] = shiftTime(order[key]);
        });
        (order.history || []).forEach(item => {
          if (item?.at != null) item.at = shiftTime(item.at);
        });
      });
      this.feed.forEach(item => {
        if (item?.at != null) item.at = shiftTime(item.at);
      });
      this.config = { ...this.config, ...(snapshot.config || {}) };
      this.setDifficulty(snapshot.difficulty?.id || this.difficultyLevel);
      this.humanRoleId = humanRoleId && this.roles[humanRoleId] ? humanRoleId : null;
      this.humanRoleIds = new Set(
        (snapshot.humanRoleIds || []).filter(roleId => this.roles[roleId])
      );
      this.setHumanRoles(humanRoleIds, { emit: false });
      if (runLoop && this.started) this.loop.start();
      this.emit("snapshot-restored", { humanRoleId: this.humanRoleId, humanRoleIds: [...this.humanRoleIds] });
      return this.snapshot();
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
    DEFAULT_CONFIG,
    DIFFICULTY_PRESETS
  });
})();
