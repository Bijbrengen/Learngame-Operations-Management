const { test, expect } = require("@playwright/test");

const API_ORIGIN = "http://127.0.0.1:47111";
const API_BASE = `${API_ORIGIN}/api`;
const ALLOWED_OVERRIDE_ORIGIN = "http://localhost:47111";
const ALLOWED_OVERRIDE_BASE = `${ALLOWED_OVERRIDE_ORIGIN}/api`;
const PRIMARY_SESSION_ID = "session-multiplayer-regression";
const SECONDARY_SESSION_ID = "session-visible-lobby";
const PROBE_ACTION = "multiplayer_regression_probe";
const LEGACY_OUTBOX_KEY = "learngame.om.interactionOutbox.v1";
const OUTBOX_V2_PREFIX = "learngame.om.interactionOutbox.v2:";
const COMMAND_V1_PREFIX = "learngame.om.multiplayerCommand.v1:";
const RUNTIME_INSTANCE_KEY = "learngame.om.runtimeInstance.v1";
const CONTROLLER_LEASE_TTL_MS = 8_000;
const CONTROLLER_LEASE_RENEW_WINDOW_MS = 3_000;
const FULL_LO4_ROLES = Object.freeze([
  "customer",
  "logistics_manager",
  "raw_warehouse",
  "production_1",
  "production_2",
  "production_3",
  "finished_warehouse"
]);
const FULL_LO4_STATIONS = Object.freeze([
  "customer",
  "operations",
  "srm",
  "pd1",
  "pd2",
  "pd3",
  "ssf"
]);
const SUMMARY_KEYS = Object.freeze([
  "agent_count",
  "available_places",
  "capacity",
  "created_at",
  "created_by_current_player",
  "difficulty_level",
  "human_count",
  "join_mode",
  "member_count",
  "participation_status",
  "play_mode",
  "queue_count",
  "queue_position",
  "session_id",
  "session_type",
  "status",
  "updated_at"
]);

const SDK_LOADER_STUB = String.raw`
(() => {
  class TestInteractionObject {
    constructor({ client, personId, leerboxId, leerobjectId }) {
      this.client = client;
      this.personId = personId;
      this.leerboxId = leerboxId;
      this.leerobjectId = leerobjectId;
    }

    async interact(actionType, payload = {}) {
      const response = await this.client.request(this.client.apiBase + "/v1/interactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          person_id: this.personId,
          leerbox_id: this.leerboxId,
          leerobject_id: this.leerobjectId,
          action_type: actionType,
          event_id: payload.event_id,
          session_id: payload.session_id,
          game_session_id: payload.game_session_id,
          group_id: payload.group_id,
          timestamp: payload.timestamp,
          result: payload.result
        })
      });
      if (!response.ok) {
        throw new Error("Testtelemetrie geweigerd (" + response.status + ")");
      }
      return response.json();
    }
  }

  const components = {};
  window.LeerpretSDK = {
    components,
    Loader: {
      create({ base }) {
        return {
          base: String(base || "").replace(/\/+$/, ""),
          async load(names = []) {
            names.forEach(name => { components[name] ||= {}; });
            return components;
          }
        };
      }
    },
    create({ apiBase, fetch }) {
      const normalizedBase = String(apiBase || "").replace(/\/+$/, "");
      const client = {
        apiBase: normalizedBase,
        async bootstrap() { return client; },
        request(input, options = {}) {
          const url = /^https?:/i.test(String(input))
            ? String(input)
            : normalizedBase + (String(input).startsWith("/") ? input : "/" + input);
          return fetch(url, options);
        },
        async get(path) {
          if (String(path).startsWith("/leerbox-runtime/")) return { test_runtime: true };
          const response = await client.request(path);
          if (!response.ok) throw new Error("SDK GET geweigerd (" + response.status + ")");
          return response.json();
        }
      };
      return client;
    },
    SelfStartingLeerobject: TestInteractionObject,
    SuccesLeerobject: TestInteractionObject,
    WeerstandLeerobject: TestInteractionObject,
    OverigLeerobject: TestInteractionObject
  };
})();
`;

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function jsonResponse(status, body) {
  return {
    status,
    contentType: "application/json",
    body: JSON.stringify(body)
  };
}

class StatefulMultiplayerApi {
  constructor() {
    this.people = new Map([
      ["host", { memberId: "member-host", label: "Hanna Host" }],
      ["alice", { memberId: "member-alice", label: "Alice Agentovernemer" }],
      ["carol", { memberId: "member-carol", label: "Carol Wachtrij" }],
      ["dave", { memberId: "member-dave", label: "Dave Wachtrij" }],
      ["erin", { memberId: "member-erin-owner", label: "Erin Eigen Sessie" }]
    ]);
    this.clock = Date.parse("2026-08-21T08:00:00.000Z");
    this.primary = {
      contract_version: "1.0",
      session_id: PRIMARY_SESSION_ID,
      join_code: "MULTI1",
      session_type: "open",
      difficulty_level: "normal",
      game_config: this.gameConfig({
        play_mode: "digital",
        game_type: "lo4",
        money: true,
        pnl: true,
        opportunity_costs: true,
        production_processes: ["parallel"],
        logistics_organization: "product",
        product_type_count: 3,
        customer_order_mode: "free",
        enabled_roles: [...FULL_LO4_ROLES]
      }),
      origin: "managed",
      status: "running",
      game_master_member_id: "member-host",
      created_by_member_id: "member-host",
      controller_member_id: "member-host",
      required_role_ids: [...FULL_LO4_ROLES],
      members: [
        this.memberFor("host", "logistics_manager"),
        this.memberRecord("member-raw-warehouse", "raw_warehouse"),
        this.memberRecord("member-production-a", "production_1"),
        this.memberRecord("member-production-b", "production_2"),
        this.memberRecord("member-production-c", "production_3"),
        this.memberRecord("member-finished-goods", "finished_warehouse")
      ],
      virtual_agents: [{
        agent_id: "agent-customer-regression",
        role_id: "customer",
        activated_by_proposal_id: "proposal-regression-start"
      }],
      waiting: [],
      consensus: null,
      created_at: "2026-08-21T07:00:00.000Z",
      updated_at: "2026-08-21T08:00:00.000Z"
    };
    this.secondary = {
      contract_version: "1.0",
      session_id: SECONDARY_SESSION_ID,
      join_code: "SIDE01",
      session_type: "open",
      difficulty_level: "easy",
      game_config: this.gameConfig({
        play_mode: "physical",
        game_type: "lo1",
        production_processes: ["sequential"],
        logistics_organization: "functional",
        product_type_count: 1,
        enabled_roles: ["customer", "opr", "srm"]
      }),
      origin: "managed",
      status: "lobby",
      game_master_member_id: "member-side-owner",
      created_by_member_id: "member-side-owner",
      controller_member_id: "member-side-owner",
      required_role_ids: ["customer", "opr", "srm"],
      members: [this.memberRecord("member-side-owner", "customer")],
      virtual_agents: [],
      waiting: [],
      consensus: null,
      created_at: "2026-08-21T07:30:00.000Z",
      updated_at: "2026-08-21T08:00:00.000Z"
    };
    this.owned = {
      contract_version: "1.0",
      session_id: "session-owned-closed-regression",
      join_code: "OWN001",
      session_type: "closed",
      difficulty_level: "normal",
      game_config: this.gameConfig({ enabled_roles: ["customer", "opr"] }),
      origin: "managed",
      status: "running",
      game_master_member_id: null,
      created_by_member_id: "member-erin-owner",
      controller_member_id: null,
      required_role_ids: ["customer", "opr"],
      members: [],
      virtual_agents: [
        {
          agent_id: "agent-owned-customer",
          role_id: "customer",
          activated_by_proposal_id: "proposal-owned-rejoin"
        },
        {
          agent_id: "agent-owned-operations",
          role_id: "opr",
          activated_by_proposal_id: "proposal-owned-rejoin"
        }
      ],
      waiting: [],
      consensus: null,
      created_at: "2026-08-21T07:45:00.000Z",
      updated_at: "2026-08-21T08:00:00.000Z"
    };
    this.runtime = {
      revision: 0,
      snapshotRevision: 0,
      membershipRevision: 0,
      snapshot: {},
      snapshotUpdatedAt: null,
      controllerMemberId: "member-host",
      controllerInstanceId: null,
      controllerLeaseExpiresAt: null,
      pendingCommands: [],
      appliedCommandIds: new Set(),
      commandResults: new Map(),
      updatedAt: "2026-08-21T08:00:00.000Z"
    };
    this.ownedRuntime = {
      revision: 0,
      snapshotRevision: 0,
      snapshot: {},
      snapshotUpdatedAt: null,
      controllerInstanceId: null,
      controllerLeaseExpiresAt: null,
      updatedAt: "2026-08-21T08:00:00.000Z"
    };
    this.stats = {
      joinCalls: [],
      leaveCalls: [],
      promotions: [],
      finishCalls: 0,
      leaveRequestTokens: [],
      authLogoutCalls: [],
      lifecycleCalls: [],
      availabilityViews: [],
      runtimeGets: new Map(),
      runtimeGetsByInstance: new Map(),
      runtimePuts: 0,
      runtimePutsByKey: new Map(),
      runtimePutsByInstance: new Map(),
      runtimePutBodies: [],
      runtimeRequests: [],
      controllerLeaseClaims: [],
      casConflicts: [],
      commandPosts: [],
      commandAcknowledgements: new Map(),
      telemetryAttempts: [],
      logicalTelemetry: new Map(),
      evilApiRequests: [],
      unknownApiRequests: []
    };
    this.injectConcurrentRevisionBeforeFirstPut = true;
    this.injectConflictForNextCommandResult = false;
    this.commandResultBarrier = null;
    this.runtimeGetBarriers = new Map();
    // De echte centrale API-client probeert een 503 tweemaal opnieuw voordat
    // de duurzame product-outbox het verzoek bij een reload overneemt.
    this.telemetryProbeFailuresRemaining = 3;
    this.loseAcceptedResponseFor = new Map();
  }

  gameConfig(overrides = {}) {
    return {
      play_mode: "physical",
      game_type: "lo1",
      money: false,
      pnl: false,
      opening_balance_enabled: false,
      revenue_balance_enabled: false,
      production_planning_enabled: false,
      intermediate_stock: false,
      opportunity_costs: false,
      role_freedom: false,
      organization_model: "single_enterprise",
      funding_incentive: "balanced",
      multiple_colors: false,
      editable_color_layers: [],
      price_mode: "fixed",
      logistics_organization: "functional",
      production_processes: ["sequential"],
      product_type_count: 1,
      customer_order_mode: "required",
      has_supplier: false,
      currency_mode: "single",
      base_currency: "EUR",
      enabled_currencies: ["EUR"],
      exchange_rates: { EUR: 1 },
      enabled_roles: ["customer", "opr", "srm"],
      ...overrides
    };
  }

  nextTimestamp() {
    this.clock += 1_000;
    return new Date(this.clock).toISOString();
  }

  memberRecord(memberId, roleId) {
    return {
      member_id: memberId,
      present: true,
      assigned_role_id: roleId,
      match_percent: null,
      reliability: null,
      joined_at: "2026-08-21T07:00:00.000Z",
      last_seen_at: "2026-08-21T08:00:00.000Z"
    };
  }

  memberFor(key, roleId) {
    return this.memberRecord(this.person(key).memberId, roleId);
  }

  person(key) {
    const person = this.people.get(key);
    if (!person) throw new Error(`Onbekende testpersoon: ${key}`);
    return person;
  }

  typedError(status, code, message, context = null) {
    return {
      status,
      body: {
        detail: {
          code,
          message,
          ...(context ? { context: clone(context) } : {})
        }
      }
    };
  }

  touchRuntime() {
    this.runtime.updatedAt = this.nextTimestamp();
  }

  touchSession(session = this.primary) {
    session.updated_at = this.nextTimestamp();
  }

  bumpMembership() {
    this.runtime.membershipRevision += 1;
    if (this.primary.status === "running") this.runtime.revision += 1;
    this.touchRuntime();
    this.touchSession(this.primary);
  }

  armCommandResultBarrier() {
    let release;
    this.commandResultBarrier = {
      started: false,
      releasePromise: new Promise(resolve => { release = resolve; }),
      release
    };
    return this.commandResultBarrier;
  }

  armRuntimeGetBarrier(key) {
    let release;
    const barrier = {
      started: false,
      releasePromise: new Promise(resolve => { release = resolve; }),
      release
    };
    this.runtimeGetBarriers.set(key, barrier);
    return barrier;
  }

  loseNextAcceptedResponse(key) {
    this.loseAcceptedResponseFor.set(key, (this.loseAcceptedResponseFor.get(key) || 0) + 1);
  }

  activeMember(key) {
    const memberId = this.person(key).memberId;
    return this.primary.members.find(member => member.member_id === memberId) || null;
  }

  activeMemberIn(session, key) {
    const memberId = this.person(key).memberId;
    return session.members.find(member => member.member_id === memberId) || null;
  }

  waitingIndex(key) {
    return this.primary.waiting.indexOf(key);
  }

  participation(session, key) {
    if (this.activeMemberIn(session, key)) return ["active", null];
    const waitingIndex = session.waiting.indexOf(key);
    return waitingIndex >= 0 ? ["waiting", waitingIndex + 1] : ["none", null];
  }

  roleVacancies(session) {
    const occupied = new Set([
      ...session.members.filter(member => member.present).map(member => member.assigned_role_id),
      ...session.virtual_agents.map(agent => agent.role_id)
    ]);
    return session.required_role_ids.filter(roleId => !occupied.has(roleId));
  }

  joinMode(session, key) {
    const [participation] = this.participation(session, key);
    if (participation === "active") return "resume";
    if (participation === "waiting") return "waiting";
    if (!["lobby", "ready", "running"].includes(session.status)) return "closed";
    const isCreator = session.created_by_member_id === this.person(key).memberId;
    if (["closed", "semi_closed"].includes(session.session_type) && !isCreator) {
      return "code_required";
    }
    if (["lobby", "ready"].includes(session.status)) {
      return this.roleVacancies(session).length ? "join" : "full";
    }
    return session.virtual_agents.length ? "replace_agent" : "queue";
  }

  waitingMember(key, index) {
    return {
      member_id: this.person(key).memberId,
      match_percent: null,
      reliability: null,
      queued_at: new Date(this.clock + index * 1_000).toISOString(),
      last_seen_at: new Date(this.clock + index * 1_000).toISOString()
    };
  }

  sessionView(session, key) {
    const [participationStatus, queuePosition] = this.participation(session, key);
    return {
      contract_version: "1.0",
      session_id: session.session_id,
      join_code: session.join_code,
      session_type: session.session_type,
      difficulty_level: session.difficulty_level,
      game_config: clone(session.game_config),
      origin: session.origin,
      status: session.status,
      game_master_member_id: session.game_master_member_id,
      created_by_member_id: session.created_by_member_id,
      controller_member_id: session.controller_member_id,
      required_role_ids: [...session.required_role_ids],
      members: clone(session.members),
      waiting_members: session.waiting.map((waitingKey, index) => (
        this.waitingMember(waitingKey, index)
      )),
      role_vacancies: this.roleVacancies(session),
      consensus: session.consensus,
      virtual_agents: clone(session.virtual_agents),
      created_at: session.created_at,
      updated_at: session.updated_at,
      current_member_id: this.person(key).memberId,
      is_game_master: session.game_master_member_id === this.person(key).memberId,
      participation_status: participationStatus,
      queue_position: queuePosition,
      join_mode: this.joinMode(session, key),
      human_count: session.members.length,
      agent_count: session.virtual_agents.length,
      queue_count: session.waiting.length
    };
  }

  summary(session, key) {
    const [participationStatus, queuePosition] = this.participation(session, key);
    const humanCount = session.members.length;
    return {
      session_id: session.session_id,
      session_type: session.session_type,
      play_mode: session.game_config.play_mode,
      difficulty_level: session.difficulty_level,
      status: session.status,
      member_count: humanCount,
      human_count: humanCount,
      agent_count: session.virtual_agents.length,
      queue_count: session.waiting.length,
      capacity: session.required_role_ids.length,
      available_places: Math.max(0, session.required_role_ids.length - humanCount),
      participation_status: participationStatus,
      queue_position: queuePosition,
      join_mode: this.joinMode(session, key),
      created_by_current_player: session.created_by_member_id === this.person(key).memberId,
      created_at: session.created_at,
      updated_at: session.updated_at
    };
  }

  immediatelyJoinable(session) {
    if (["lobby", "ready"].includes(session.status)) return this.roleVacancies(session).length > 0;
    return session.status === "running" && session.virtual_agents.length > 0;
  }

  availability(key) {
    const sessions = [this.primary, this.secondary, this.owned];
    const discoverable = sessions.filter(session => (
      ["open", "semi_closed"].includes(session.session_type)
      && ["lobby", "ready", "running"].includes(session.status)
    ));
    const participating = sessions.filter(session => (
      ["lobby", "ready", "running"].includes(session.status)
      && this.participation(session, key)[0] !== "none"
    ));
    const open = sessions.filter(session => (
      session.session_type === "open" && this.immediatelyJoinable(session)
    ));
    const created = sessions.filter(session => (
      ["lobby", "ready", "running"].includes(session.status)
      && session.created_by_member_id === this.person(key).memberId
    ));
    const active = [...new Map([
      ...discoverable,
      ...created,
      ...participating
    ].map(session => [session.session_id, session])).values()];
    const view = {
      status: "ok",
      active_sessions: active.map(session => this.summary(session, key)),
      open_sessions: open.map(session => this.summary(session, key)),
      discoverable_sessions: discoverable.map(session => this.summary(session, key)),
      created_sessions: created.map(session => this.summary(session, key)),
      participating_sessions: participating.map(session => this.summary(session, key)),
      can_start_free_game: participating.length === 0 && open.length === 0,
      current_session: participating.length ? this.sessionView(participating[0], key) : null
    };
    this.stats.availabilityViews.push({ key, view: clone(view) });
    return view;
  }

  join(key, sessionId) {
    if (sessionId === this.owned.session_id && key === "erin") {
      if (!this.activeMemberIn(this.owned, key)) {
        this.stats.joinCalls.push(key);
        const agent = this.owned.virtual_agents.shift();
        const roleId = agent.role_id;
        this.owned.members.push(this.memberFor(key, roleId));
        this.owned.game_master_member_id = this.person(key).memberId;
        this.owned.controller_member_id = this.person(key).memberId;
        this.touchSession(this.owned);
      }
      return { status: 200, body: this.sessionView(this.owned, key) };
    }
    if (sessionId !== PRIMARY_SESSION_ID) {
      return this.typedError(404, "session_not_found", "Geen gamesessie gevonden voor deze code.");
    }
    if (this.activeMember(key)) {
      return { status: 200, body: this.sessionView(this.primary, key) };
    }
    if (this.waitingIndex(key) >= 0) {
      return { status: 200, body: this.sessionView(this.primary, key) };
    }

    this.stats.joinCalls.push(key);
    const agent = this.primary.virtual_agents.shift();
    if (agent) {
      this.primary.members.push(this.memberFor(key, agent.role_id));
      this.bumpMembership();
    } else {
      this.primary.waiting.push(key);
      this.touchSession(this.primary);
    }
    return { status: 200, body: this.sessionView(this.primary, key) };
  }

  leave(key) {
    const waitingIndex = this.waitingIndex(key);
    if (waitingIndex >= 0) {
      this.primary.waiting.splice(waitingIndex, 1);
      this.stats.leaveCalls.push({ key, kind: "waiting" });
      this.touchSession(this.primary);
      return {
        status: 200,
        body: {
          status: "left_queue",
          participation_status: "none",
          session: this.summary(this.primary, key)
        }
      };
    }

    const memberIndex = this.primary.members.findIndex(
      member => member.member_id === this.person(key).memberId
    );
    if (memberIndex < 0) {
      return {
        status: 200,
        body: {
          status: "not_participating",
          participation_status: "none",
          session: this.summary(this.primary, key)
        }
      };
    }
    const [departing] = this.primary.members.splice(memberIndex, 1);
    this.stats.leaveCalls.push({ key, kind: "active", roleId: departing.assigned_role_id });
    const promotedKey = this.primary.waiting.shift();
    if (promotedKey) {
      this.primary.members.push(this.memberFor(promotedKey, departing.assigned_role_id));
      this.stats.promotions.push({ promotedKey, roleId: departing.assigned_role_id });
    } else {
      this.primary.virtual_agents.push({
        agent_id: `agent-replacement-${departing.assigned_role_id}`,
        role_id: departing.assigned_role_id,
        activated_by_proposal_id: "leave-regression-replacement"
      });
    }
    this.bumpMembership();
    return {
      status: 200,
      body: {
        status: "left",
        participation_status: "none",
        session: this.summary(this.primary, key)
      }
    };
  }

  humanRoleIds() {
    const occupied = new Set(
      this.primary.members.filter(member => member.present).map(member => member.assigned_role_id)
    );
    return this.primary.required_role_ids.filter(roleId => occupied.has(roleId));
  }

  normalizedInstanceId(instanceId) {
    const normalized = String(instanceId || "").trim();
    return (
      normalized.length >= 8
      && normalized.length <= 120
      && /^[A-Za-z0-9._:-]+$/.test(normalized)
    ) ? normalized : null;
  }

  invalidInstance() {
    return this.typedError(
      422,
      "invalid_controller_instance",
      "De browserinstantie voor de gedeelde runtime is ongeldig."
    );
  }

  hasControllerLease(runtime, controllerMemberId, key, instanceId) {
    return Boolean(
      this.person(key).memberId === controllerMemberId
      && runtime.controllerInstanceId === instanceId
      && Date.parse(runtime.controllerLeaseExpiresAt || "") > this.clock
    );
  }

  claimControllerLease(runtime, controllerMemberId, key, instanceId, scope) {
    if (this.person(key).memberId !== controllerMemberId) return false;
    const expiresAt = Date.parse(runtime.controllerLeaseExpiresAt || "");
    const leaseActive = Boolean(
      runtime.controllerInstanceId
      && Number.isFinite(expiresAt)
      && expiresAt > this.clock
    );
    if (!leaseActive) {
      const previousInstanceId = runtime.controllerInstanceId;
      runtime.controllerInstanceId = instanceId;
      runtime.revision += 1;
      runtime.updatedAt = this.nextTimestamp();
      runtime.controllerLeaseExpiresAt = new Date(
        this.clock + CONTROLLER_LEASE_TTL_MS
      ).toISOString();
      this.stats.controllerLeaseClaims.push({
        scope,
        key,
        previousInstanceId,
        instanceId,
        revision: runtime.revision
      });
      return true;
    }
    if (
      runtime.controllerInstanceId === instanceId
      && expiresAt - this.clock <= CONTROLLER_LEASE_RENEW_WINDOW_MS
    ) {
      runtime.controllerLeaseExpiresAt = new Date(
        this.clock + CONTROLLER_LEASE_TTL_MS
      ).toISOString();
      return true;
    }
    return false;
  }

  forcePrimaryControllerLeaseExpiry() {
    this.runtime.controllerLeaseExpiresAt = new Date(this.clock - 1_000).toISOString();
  }

  runtimeContract(key, additions = {}, instanceId = this.runtime.controllerInstanceId) {
    const [participationStatus, queuePosition] = this.participation(this.primary, key);
    const isController = this.hasControllerLease(
      this.runtime,
      this.runtime.controllerMemberId,
      key,
      instanceId
    );
    const results = [...this.runtime.commandResults.values()].filter(result => (
      isController || result.member_id === this.person(key).memberId
    ));
    return {
      contract_version: "1.0",
      session_id: PRIMARY_SESSION_ID,
      status: this.primary.status,
      revision: this.runtime.revision,
      snapshot_revision: this.runtime.snapshotRevision,
      membership_revision: this.runtime.membershipRevision,
      snapshot: clone(this.runtime.snapshot),
      snapshot_updated_at: this.runtime.snapshotUpdatedAt,
      server_time: new Date(this.clock + 500).toISOString(),
      controller_member_id: this.runtime.controllerMemberId,
      controller_lease_expires_at: this.runtime.controllerLeaseExpiresAt,
      is_controller: isController,
      participation_status: participationStatus,
      queue_position: queuePosition,
      human_role_ids: this.humanRoleIds(),
      pending_commands: isController ? clone(this.runtime.pendingCommands) : [],
      applied_command_ids: [...this.runtime.appliedCommandIds],
      command_results: clone(results),
      telemetry_backlog_count: 0,
      updated_at: this.runtime.updatedAt,
      ...additions
    };
  }

  ownedRuntimeContract(
    key,
    additions = {},
    instanceId = this.ownedRuntime.controllerInstanceId
  ) {
    const isController = this.hasControllerLease(
      this.ownedRuntime,
      "member-erin-owner",
      key,
      instanceId
    );
    return {
      contract_version: "1.0",
      session_id: this.owned.session_id,
      status: "running",
      revision: this.ownedRuntime.revision,
      snapshot_revision: this.ownedRuntime.snapshotRevision,
      membership_revision: 1,
      snapshot: clone(this.ownedRuntime.snapshot),
      snapshot_updated_at: this.ownedRuntime.snapshotUpdatedAt,
      server_time: new Date(this.clock + 500).toISOString(),
      controller_member_id: "member-erin-owner",
      controller_lease_expires_at: this.ownedRuntime.controllerLeaseExpiresAt,
      is_controller: isController,
      participation_status: this.activeMemberIn(this.owned, key) ? "active" : "none",
      queue_position: null,
      human_role_ids: this.owned.members.map(member => member.assigned_role_id),
      pending_commands: [],
      applied_command_ids: [],
      command_results: [],
      telemetry_backlog_count: 0,
      updated_at: this.ownedRuntime.updatedAt,
      ...additions
    };
  }

  runtimeView(key, instanceId) {
    this.stats.runtimeGets.set(key, (this.stats.runtimeGets.get(key) || 0) + 1);
    if (instanceId) {
      this.stats.runtimeGetsByInstance.set(
        instanceId,
        (this.stats.runtimeGetsByInstance.get(instanceId) || 0) + 1
      );
    }
    if (!this.activeMember(key)) {
      return this.typedError(
        403,
        this.waitingIndex(key) >= 0 ? "active_membership_required" : "membership_required",
        this.waitingIndex(key) >= 0
          ? "Je staat in de wachtrij en kunt nog geen gamecommando uitvoeren."
          : "Je neemt niet deel aan deze gamesessie."
      );
    }
    const normalizedInstanceId = this.normalizedInstanceId(instanceId);
    if (!normalizedInstanceId) return this.invalidInstance();
    this.claimControllerLease(
      this.runtime,
      this.runtime.controllerMemberId,
      key,
      normalizedInstanceId,
      "primary"
    );
    return {
      status: 200,
      body: this.runtimeContract(key, {}, normalizedInstanceId)
    };
  }

  async putRuntime(key, body, instanceId) {
    this.stats.runtimePuts += 1;
    this.stats.runtimePutsByKey.set(key, (this.stats.runtimePutsByKey.get(key) || 0) + 1);
    if (instanceId) {
      this.stats.runtimePutsByInstance.set(
        instanceId,
        (this.stats.runtimePutsByInstance.get(instanceId) || 0) + 1
      );
    }
    this.stats.runtimePutBodies.push(clone(body));
    if (!this.activeMember(key)) {
      return this.typedError(403, "membership_required", "Je neemt niet deel aan deze gamesessie.");
    }
    const normalizedInstanceId = this.normalizedInstanceId(instanceId);
    if (!normalizedInstanceId) return this.invalidInstance();
    if (!this.hasControllerLease(
      this.runtime,
      this.runtime.controllerMemberId,
      key,
      normalizedInstanceId
    )) {
      return this.typedError(
        403,
        "controller_lease_required",
        "Alleen de actieve controllerbrowser mag de gedeelde snapshot bijwerken."
      );
    }
    if (this.injectConcurrentRevisionBeforeFirstPut) {
      this.injectConcurrentRevisionBeforeFirstPut = false;
      this.runtime.revision += 1;
      this.touchRuntime();
    }
    if (
      this.injectConflictForNextCommandResult
      && Array.isArray(body.command_results)
      && body.command_results.length > 0
    ) {
      this.injectConflictForNextCommandResult = false;
      this.runtime.revision += 1;
      this.touchRuntime();
    }
    if (Number(body.base_revision) !== this.runtime.revision) {
      const context = {
        expected_revision: this.runtime.revision,
        received_revision: Number(body.base_revision)
      };
      this.stats.casConflicts.push(context);
      return this.typedError(
        409,
        "revision_conflict",
        `Verouderde runtime-revisie: verwacht ${context.expected_revision}, ontvangen ${context.received_revision}.`,
        context
      );
    }
    if (!Array.isArray(body.snapshot?.orders)) {
      return this.typedError(422, "invalid_runtime_snapshot", "Een volledige snapshot is vereist.");
    }
    const appliedIds = Array.isArray(body.applied_command_ids) ? body.applied_command_ids : [];
    const commandResults = Array.isArray(body.command_results) ? body.command_results : [];
    const resultIds = commandResults.map(result => String(result.command_id));
    const overlap = appliedIds.filter(commandId => resultIds.includes(commandId));
    if (overlap.length) {
      return this.typedError(
        422,
        "runtime_command_result_overlap",
        "Gebruik per command-id applied_command_ids of command_results, niet beide.",
        { command_ids: overlap }
      );
    }
    if (commandResults.some(result => (
      Object.keys(result).sort().join(",") !== "command_id,error_code,status"
      || !["applied", "rejected"].includes(result.status)
      || (result.status === "applied" && result.error_code !== null)
      || (result.status === "rejected" && !result.error_code)
    ))) {
      return this.typedError(422, "invalid_command_result", "Ongeldig command_result-contract.");
    }
    const requestedResults = [
      ...appliedIds.map(commandId => ({ command_id: commandId, status: "applied", error_code: null })),
      ...commandResults
    ];
    const pendingIds = new Set(this.runtime.pendingCommands.map(command => command.command_id));
    const unknownIds = requestedResults
      .map(result => result.command_id)
      .filter(commandId => (
        !pendingIds.has(commandId)
        && !this.runtime.appliedCommandIds.has(commandId)
        && !this.runtime.commandResults.has(commandId)
      ));
    if (unknownIds.length) {
      return this.typedError(
        422,
        "invalid_command_ack",
        "De snapshot verwijst naar onbekende command-id's.",
        { unknown_command_ids: unknownIds }
      );
    }
    if (commandResults.length && this.commandResultBarrier) {
      const barrier = this.commandResultBarrier;
      this.commandResultBarrier = null;
      barrier.started = true;
      await barrier.releasePromise;
    }

    const pendingById = new Map(
      this.runtime.pendingCommands.map(command => [command.command_id, command])
    );
    for (const result of requestedResults) {
      if (this.runtime.commandResults.has(result.command_id)) continue;
      const pending = pendingById.get(result.command_id);
      if (!pending) continue;
      const stored = {
        command_id: result.command_id,
        member_id: pending.member_id,
        status: result.status,
        error_code: result.status === "applied" ? null : result.error_code,
        resolved_at: this.nextTimestamp()
      };
      this.runtime.commandResults.set(result.command_id, stored);
      if (stored.status === "applied") this.runtime.appliedCommandIds.add(result.command_id);
      this.stats.commandAcknowledgements.set(result.command_id, stored.status);
    }
    const resolvedIds = new Set(requestedResults.map(result => result.command_id));
    this.runtime.pendingCommands = this.runtime.pendingCommands.filter(
      command => !resolvedIds.has(command.command_id)
    );
    this.runtime.snapshot = clone(body.snapshot);
    this.runtime.snapshotRevision += 1;
    this.runtime.revision += 1;
    this.touchRuntime();
    this.runtime.snapshotUpdatedAt = this.runtime.updatedAt;
    return {
      status: 200,
      body: this.runtimeContract(
        key,
        { update_status: "updated" },
        normalizedInstanceId
      )
    };
  }

  postCommand(key, body, instanceId, origin) {
    const commandId = String(body?.command_id || "");
    if (!this.activeMember(key)) {
      return this.typedError(403, "active_membership_required", "Alleen actieve spelers mogen handelen.");
    }
    const normalizedInstanceId = this.normalizedInstanceId(instanceId);
    if (!normalizedInstanceId) return this.invalidInstance();
    this.claimControllerLease(
      this.runtime,
      this.runtime.controllerMemberId,
      key,
      normalizedInstanceId,
      "primary"
    );
    if (!commandId) {
      return this.typedError(422, "invalid_command_id", "command_id ontbreekt.");
    }

    let commandStatus;
    const previousResult = this.runtime.commandResults.get(commandId);
    if (this.runtime.pendingCommands.some(command => command.command_id === commandId)) {
      commandStatus = "duplicate_pending";
    } else if (previousResult?.status === "rejected") {
      commandStatus = "duplicate_rejected";
    } else if (previousResult || this.runtime.appliedCommandIds.has(commandId)) {
      commandStatus = "duplicate_applied";
    } else {
      commandStatus = "accepted";
      this.runtime.pendingCommands.push({
        command_id: commandId,
        member_id: this.person(key).memberId,
        role_id: this.activeMember(key).assigned_role_id,
        payload: clone(body.payload || {}),
        submitted_at: this.nextTimestamp()
      });
      this.runtime.revision += 1;
      this.touchRuntime();
    }
    let responseLost = false;
    if (commandStatus === "accepted" && (this.loseAcceptedResponseFor.get(key) || 0) > 0) {
      this.loseAcceptedResponseFor.set(key, this.loseAcceptedResponseFor.get(key) - 1);
      responseLost = true;
    }
    this.stats.commandPosts.push({
      key,
      commandId,
      commandStatus,
      responseLost,
      origin,
      payload: clone(body.payload || {})
    });
    return {
      status: 200,
      body: this.runtimeContract(
        key,
        { command_status: commandStatus },
        normalizedInstanceId
      ),
      responseLost
    };
  }

  telemetry(key, body, origin) {
    const failed = body.action_type === PROBE_ACTION
      && this.telemetryProbeFailuresRemaining > 0;
    if (failed) this.telemetryProbeFailuresRemaining -= 1;
    const attempt = { ...clone(body), key, origin, failed };
    this.stats.telemetryAttempts.push(attempt);
    if (!failed && body.event_id && !this.stats.logicalTelemetry.has(body.event_id)) {
      this.stats.logicalTelemetry.set(body.event_id, clone(body));
    }
    return failed
      ? this.typedError(503, "temporary_interaction_failure", "Eenmalige regressiestoring.")
      : { status: 202, body: { accepted: true, event_id: body.event_id } };
  }

  async route(key, route) {
    const request = route.request();
    const url = new URL(request.url());
    if (url.pathname.endsWith("/runtime-config.js")) {
      await route.fulfill({
        status: 200,
        contentType: "application/javascript",
        body: `window.LEARNGAME_OM_CONFIG = Object.freeze({
          apiBase: ${JSON.stringify(API_BASE)},
          configuredApiBase: ${JSON.stringify(API_BASE)},
          appUrl: window.location.origin + "/",
          allowedApiOrigins: [${JSON.stringify(ALLOWED_OVERRIDE_ORIGIN)}]
        });`
      });
      return;
    }
    if (url.hostname === "evil.invalid") {
      this.stats.evilApiRequests.push({ key, method: request.method(), url: url.href });
      await route.abort("blockedbyclient");
      return;
    }
    if (![API_ORIGIN, ALLOWED_OVERRIDE_ORIGIN].includes(url.origin)) {
      await route.continue();
      return;
    }

    const path = url.pathname.replace(/^\/api/, "");
    const runtimeInstanceId = request.headers()["x-leerpret-game-instance"] || null;
    if (/\/v1\/game-sessions\/[^/]+\/runtime(?:\/commands)?$/.test(path)) {
      this.stats.runtimeRequests.push({
        key,
        method: request.method(),
        path,
        instanceId: runtimeInstanceId,
        origin: url.origin
      });
    }
    if (path.startsWith("/sdk/")) {
      // De regressiebackend mockt alleen mutable sessie-API's. SDK-code en de
      // dependencygraaf komen uit dezelfde lokale Engine als de productruntime.
      await route.continue();
      return;
    }
    if (path === "/leerbox-runtime/learngame-operations-management") {
      await route.fulfill(jsonResponse(200, { test_runtime: true }));
      return;
    }
    if (path === "/ui/leerpret-theme.css") {
      await route.fulfill({ status: 200, contentType: "text/css", body: ":root{}" });
      return;
    }
    if (path === "/auth/leerbox/session") {
      await route.fulfill(jsonResponse(200, {
        authenticated: true,
        token: `token-${key}`,
        user: { id: this.person(key).memberId, label: this.person(key).label },
        roles: ["learner"]
      }));
      return;
    }
    if (path === "/auth/google/config" && request.method() === "GET") {
      await route.fulfill(jsonResponse(200, { enabled: false, client_id: null }));
      return;
    }
    if (path === "/auth/leerbox/logout" && request.method() === "POST") {
      this.stats.lifecycleCalls.push({ key, type: "auth_logout" });
      this.stats.authLogoutCalls.push({
        key,
        token: request.headers()["x-leerpret-session"] || null
      });
      await route.fulfill(jsonResponse(200, { status: "logged_out" }));
      return;
    }
    if (path === "/v1/player/behavior-profile") {
      await route.fulfill(jsonResponse(200, { exists: true, profile: {} }));
      return;
    }
    if (path === "/v1/game-sessions/availability" && request.method() === "GET") {
      await route.fulfill(jsonResponse(200, this.availability(key)));
      return;
    }
    if (path === "/v1/game-sessions/join" && request.method() === "POST") {
      const result = this.join(key, request.postDataJSON()?.session_id);
      await route.fulfill(jsonResponse(result.status, result.body));
      return;
    }
    if (
      path === `/v1/game-sessions/${PRIMARY_SESSION_ID}/leave`
      && request.method() === "POST"
    ) {
      this.stats.lifecycleCalls.push({ key, type: "leave" });
      this.stats.leaveRequestTokens.push({
        key,
        token: request.headers()["x-leerpret-session"] || null
      });
      const result = this.leave(key);
      await route.fulfill(jsonResponse(result.status, result.body));
      return;
    }
    if (path === `/v1/game-sessions/${PRIMARY_SESSION_ID}/finish`) {
      this.stats.finishCalls += 1;
      this.primary.status = "finished";
      await route.fulfill(jsonResponse(200, this.sessionView(this.primary, key)));
      return;
    }
    if (
      path === `/v1/game-sessions/${this.owned.session_id}/runtime`
      && request.method() === "GET"
    ) {
      const normalizedInstanceId = this.normalizedInstanceId(runtimeInstanceId);
      if (!normalizedInstanceId) {
        const error = this.invalidInstance();
        await route.fulfill(jsonResponse(error.status, error.body));
        return;
      }
      this.claimControllerLease(
        this.ownedRuntime,
        "member-erin-owner",
        key,
        normalizedInstanceId,
        "owned"
      );
      await route.fulfill(jsonResponse(
        200,
        this.ownedRuntimeContract(key, {}, normalizedInstanceId)
      ));
      return;
    }
    if (
      path === `/v1/game-sessions/${this.owned.session_id}/runtime`
      && request.method() === "PUT"
    ) {
      const body = request.postDataJSON();
      const normalizedInstanceId = this.normalizedInstanceId(runtimeInstanceId);
      if (!normalizedInstanceId) {
        const error = this.invalidInstance();
        await route.fulfill(jsonResponse(error.status, error.body));
        return;
      }
      if (!this.hasControllerLease(
        this.ownedRuntime,
        "member-erin-owner",
        key,
        normalizedInstanceId
      )) {
        const error = this.typedError(
          403,
          "controller_lease_required",
          "Alleen de actieve controllerbrowser mag de gedeelde snapshot bijwerken."
        );
        await route.fulfill(jsonResponse(error.status, error.body));
        return;
      }
      if (Number(body.base_revision) !== this.ownedRuntime.revision) {
        const error = this.typedError(
          409,
          "revision_conflict",
          "Verouderde runtime-revisie voor eigen sessie.",
          {
            expected_revision: this.ownedRuntime.revision,
            received_revision: Number(body.base_revision)
          }
        );
        await route.fulfill(jsonResponse(error.status, error.body));
        return;
      }
      this.ownedRuntime.snapshot = clone(body.snapshot);
      this.ownedRuntime.snapshotRevision += 1;
      this.ownedRuntime.revision += 1;
      this.ownedRuntime.updatedAt = this.nextTimestamp();
      this.ownedRuntime.snapshotUpdatedAt = this.ownedRuntime.updatedAt;
      await route.fulfill(jsonResponse(200, this.ownedRuntimeContract(
        key,
        { update_status: "updated" },
        normalizedInstanceId
      )));
      return;
    }
    if (
      path === `/v1/game-sessions/${PRIMARY_SESSION_ID}/runtime`
      && request.method() === "GET"
    ) {
      const result = this.runtimeView(key, runtimeInstanceId);
      const frozenBody = clone(result.body);
      const barrier = this.runtimeGetBarriers.get(key);
      if (barrier) {
        this.runtimeGetBarriers.delete(key);
        barrier.started = true;
        await barrier.releasePromise;
      }
      await route.fulfill(jsonResponse(result.status, frozenBody));
      return;
    }
    if (
      path === `/v1/game-sessions/${PRIMARY_SESSION_ID}/runtime`
      && request.method() === "PUT"
    ) {
      const result = await this.putRuntime(key, request.postDataJSON(), runtimeInstanceId);
      await route.fulfill(jsonResponse(result.status, result.body));
      return;
    }
    if (
      path === `/v1/game-sessions/${PRIMARY_SESSION_ID}/runtime/commands`
      && request.method() === "POST"
    ) {
      const result = this.postCommand(
        key,
        request.postDataJSON(),
        runtimeInstanceId,
        url.origin
      );
      if (result.responseLost) {
        await route.abort("failed");
      } else {
        await route.fulfill(jsonResponse(result.status, result.body));
      }
      return;
    }
    if (path === "/v1/interactions" && request.method() === "POST") {
      const result = this.telemetry(key, request.postDataJSON(), url.origin);
      await route.fulfill(jsonResponse(result.status, result.body));
      return;
    }
    if (path === "/engine/evaluate" && request.method() === "POST") {
      const body = request.postDataJSON();
      const result = this.telemetry(key, body?.STATEMENT?.ACTION?.data || {}, url.origin);
      await route.fulfill(jsonResponse(result.status, result.body));
      return;
    }

    this.stats.unknownApiRequests.push({ key, method: request.method(), path });
    const error = this.typedError(404, "mock_route_missing", `Onverwachte mockroute: ${path}`);
    await route.fulfill(jsonResponse(error.status, error.body));
  }
}

async function openPerson(browser, backend, key, {
  apiQuery = API_BASE,
  seedCorruptLegacyOutbox = false
} = {}) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    serviceWorkers: "block",
    reducedMotion: "reduce"
  });
  await context.addInitScript(({ personKey, corruptLegacyOutbox }) => {
    window.__outboxCorruptEvents = [];
    window.__intervalRegistrations = [];
    window.addEventListener("learngame-om-telemetry-outbox-corrupt", event => {
      window.__outboxCorruptEvents.push({
        storageKey: event.detail?.storageKey,
        message: String(event.detail?.error?.message || event.detail?.error || "")
      });
    });
    const nativeSetInterval = window.setInterval.bind(window);
    window.setInterval = (callback, delay, ...args) => {
      window.__intervalRegistrations.push(Number(delay));
      return nativeSetInterval(callback, delay, ...args);
    };
    localStorage.setItem("leerpret.sessionToken", `token-${personKey}`);
    localStorage.setItem("learngame.om.tutorialCompleted", "true");
    localStorage.setItem("learngame.om.personId.v1", `fallback-${personKey}`);
    sessionStorage.setItem("learngame.om.appView", "player");
    if (
      corruptLegacyOutbox
      && sessionStorage.getItem("lom.regression.corrupt-outbox-seeded") !== "true"
    ) {
      localStorage.setItem("learngame.om.interactionOutbox.v1", "{corrupt-json");
      sessionStorage.setItem("lom.regression.corrupt-outbox-seeded", "true");
    }
  }, { personKey: key, corruptLegacyOutbox: seedCorruptLegacyOutbox });
  await context.route("**/*", route => backend.route(key, route));
  const page = await context.newPage();
  const diagnostics = [];
  page.on("pageerror", error => diagnostics.push(`pageerror: ${error.message}`));
  page.on("console", message => {
    if (["error", "warning"].includes(message.type())) {
      diagnostics.push(`${message.type()}: ${message.text()}`);
    }
  });
  await page.goto(`./?api=${encodeURIComponent(apiQuery)}`);
  await waitForApplication(page, backend, diagnostics);
  return { key, context, page, diagnostics };
}

async function openPersonPopup(opener, backend) {
  await opener.page.evaluate(() => {
    sessionStorage.setItem("lom.regression.popup-storage-copy", "copied-from-opener");
  });
  const popupPromise = opener.page.waitForEvent("popup");
  await opener.page.evaluate(() => {
    window.open(window.location.href, "_blank");
  });
  const page = await popupPromise;
  const diagnostics = [];
  page.on("pageerror", error => diagnostics.push(`pageerror: ${error.message}`));
  page.on("console", message => {
    if (["error", "warning"].includes(message.type())) {
      diagnostics.push(`${message.type()}: ${message.text()}`);
    }
  });
  await waitForApplication(page, backend, diagnostics);
  return { key: opener.key, context: opener.context, page, diagnostics };
}

async function waitForApplication(page, backend, diagnostics = []) {
  try {
    await page.waitForFunction(() => (
      window.LEARNGameOMSimulator
      && window.LEARNGameOMReady === true
      && window.LOMMultiplayerRuntime
      && window.LeerpretAuth?.getSession?.().authenticated
    ));
  } catch (error) {
    throw new Error([
      error.message,
      ...diagnostics,
      `unknown API: ${JSON.stringify(backend.stats.unknownApiRequests)}`
    ].join("\n"));
  }
  await page.locator("body.auth-authenticated").waitFor({ state: "attached" });
  await expect(page.locator("#characterCreationGate")).toBeHidden();
  await expect(page.locator("#playerSessionPanel")).toBeAttached();
}

async function waitForActiveRuntime(page, { controller }) {
  await expect.poll(
    () => page.evaluate(() => window.LOMMultiplayerRuntime.getState()),
    { timeout: 12_000 }
  ).toMatchObject({
    sessionId: PRIMARY_SESSION_ID,
    isController: controller,
    controllerMemberId: "member-host"
  });
  await page.waitForFunction(() => (
    window.LEARNGameOMSimulator.getSharedGameController()?.engine?.started
  ));
}

async function sharedProjection(page) {
  return page.evaluate(() => {
    const snapshot = window.LEARNGameOMSimulator
      .getSharedGameController()
      .engine
      .snapshot();
    return {
      orderCounter: snapshot.orderCounter,
      humanRoleIds: [...snapshot.humanRoleIds].sort(),
      orders: snapshot.orders.map(order => ({
        id: order.id,
        productId: order.productId,
        quantity: order.quantity,
        status: order.status,
        stepIndex: order.stepIndex,
        history: order.history.map(item => ({
          roleId: item.roleId,
          type: item.type,
          label: item.label
        }))
      })),
      roleRuntime: Object.fromEntries(Object.entries(snapshot.roleRuntime).map(([roleId, runtime]) => [
        roleId,
        {
          state: runtime.state,
          activeOrderId: runtime.activeOrderId,
          completesAt: runtime.completesAt == null ? null : "scheduled"
        }
      ]))
    };
  });
}

async function rawCommand(page, commandId, payload = {}) {
  return page.evaluate(async ({ sessionId, id, commandPayload, instanceStorageKey }) => {
    const apiBase = window.LeerpretAuth.getSession().apiBase;
    const instanceId = sessionStorage.getItem(instanceStorageKey);
    const response = await fetch(
      `${apiBase}/v1/game-sessions/${sessionId}/runtime/commands`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Leerpret-Game-Instance": instanceId
        },
        body: JSON.stringify({ command_id: id, payload: commandPayload })
      }
    );
    return { status: response.status, body: await response.json() };
  }, {
    sessionId: PRIMARY_SESSION_ID,
    id: commandId,
    commandPayload: payload,
    instanceStorageKey: RUNTIME_INSTANCE_KEY
  });
}

async function runtimeInstanceId(page) {
  return page.evaluate(storageKey => sessionStorage.getItem(storageKey), RUNTIME_INSTANCE_KEY);
}

async function rawRuntimePut(page, instanceId, body) {
  return page.evaluate(async ({ sessionId, controllerInstanceId, update }) => {
    const apiBase = window.LeerpretAuth.getSession().apiBase;
    const response = await fetch(
      `${apiBase}/v1/game-sessions/${sessionId}/runtime`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-Leerpret-Game-Instance": controllerInstanceId
        },
        body: JSON.stringify(update)
      }
    );
    return { status: response.status, body: await response.json() };
  }, {
    sessionId: PRIMARY_SESSION_ID,
    controllerInstanceId: instanceId,
    update: body
  });
}

function commandStorageKey(commandId) {
  return `${COMMAND_V1_PREFIX}${encodeURIComponent(commandId)}`;
}

test.describe("LOM multiplayer met echte, geïsoleerde browsers", () => {
  test("de sessie, wachtrij, controller en telemetrie blijven atomair en convergent", async ({ browser }) => {
    test.setTimeout(180_000);
    const backend = new StatefulMultiplayerApi();
    const clients = [];

    try {
      const host = await openPerson(browser, backend, "host");
      clients.push(host);
      await waitForActiveRuntime(host.page, { controller: true });
      const originalHostInstanceId = await runtimeInstanceId(host.page);
      expect(originalHostInstanceId).toMatch(/^instance-[A-Za-z0-9._:-]+$/);
      expect(backend.runtime.controllerInstanceId).toBe(originalHostInstanceId);
      await expect.poll(() => backend.stats.casConflicts.length, { timeout: 12_000 }).toBeGreaterThanOrEqual(1);
      expect(backend.stats.casConflicts[0]).toEqual({
        expected_revision: 2,
        received_revision: 1
      });
      expect(backend.stats.runtimePuts).toBeGreaterThanOrEqual(2);
      await expect.poll(
        () => Array.isArray(backend.runtime.snapshot?.orders),
        { timeout: 12_000 }
      ).toBe(true);
      expect(backend.runtimeContract("host")).toMatchObject({
        contract_version: "1.0",
        status: "running",
        participation_status: "active",
        queue_position: null,
        is_controller: true,
        snapshot_revision: 1,
        membership_revision: 0,
        snapshot_updated_at: expect.any(String),
        server_time: expect.any(String),
        controller_lease_expires_at: expect.any(String),
        human_role_ids: FULL_LO4_ROLES.filter(roleId => roleId !== "customer"),
        pending_commands: [],
        applied_command_ids: [],
        command_results: [],
        telemetry_backlog_count: 0
      });
      expect(backend.runtime.snapshot.orders).toHaveLength(0);
      expect(backend.runtime.snapshot.capturedAt).toEqual(expect.any(Number));
      expect(Date.parse(backend.runtimeContract("host").server_time)).toBeGreaterThanOrEqual(
        Date.parse(backend.runtimeContract("host").snapshot_updated_at)
      );
      expect(Date.parse(backend.runtimeContract("host").controller_lease_expires_at)).toBeGreaterThan(
        Date.parse(backend.runtimeContract("host").server_time)
      );
      const initialSnapshotRevision = backend.runtime.snapshotRevision;
      await host.page.evaluate(async () => {
        const engine = window.LEARNGameOMSimulator.getSharedGameController().engine;
        engine.nextOrderAt = Number.MAX_SAFE_INTEGER;
        engine.pendingPeakOrderAt = null;
        await window.LOMMultiplayerRuntime.publishSnapshot();
      });
      await expect.poll(() => backend.runtime.snapshot.nextOrderAt).toBe(Number.MAX_SAFE_INTEGER);
      expect(backend.runtime.snapshotRevision).toBe(initialSnapshotRevision + 1);

      await expect.poll(() => host.page.evaluate(() => (
        window.__intervalRegistrations.filter(delay => delay === 1200).length
      ))).toBe(1);
      await host.page.evaluate(() => {
        const session = window.LOMGameSessions.getCurrentSession();
        window.dispatchEvent(new CustomEvent("learngame-session-started", { detail: { session } }));
        window.dispatchEvent(new CustomEvent("learngame-session-started", { detail: { session } }));
      });
      await host.page.waitForTimeout(100);
      expect(await host.page.evaluate(() => (
        window.__intervalRegistrations.filter(delay => delay === 1200).length
      ))).toBe(1);

      const roleNormalization = await host.page.evaluate(() => {
        const allAliases = Object.keys(window.LOMRuntimeRoles.ROLE_TO_STATION);
        const analysis = window.LOMRuntimeRoles.analyze(allAliases);
        return {
          aliases: allAliases,
          roleIds: analysis.role_ids,
          stations: analysis.role_ids.map(window.LOMRuntimeRoles.stationId),
          collisions: analysis.collisions,
          unknown: analysis.unknown_role_ids
        };
      });
      expect(roleNormalization.aliases.length).toBeGreaterThan(FULL_LO4_ROLES.length);
      expect(roleNormalization.roleIds).toEqual(FULL_LO4_ROLES);
      expect(roleNormalization.stations).toEqual(FULL_LO4_STATIONS);
      expect(new Set(roleNormalization.stations).size).toBe(7);
      expect(roleNormalization.collisions.length).toBeGreaterThan(10);
      expect(roleNormalization.unknown).toEqual([]);

      const alice = await openPerson(browser, backend, "alice", {
        apiQuery: ALLOWED_OVERRIDE_BASE,
        seedCorruptLegacyOutbox: true
      });
      const carol = await openPerson(browser, backend, "carol");
      const dave = await openPerson(browser, backend, "dave", {
        apiQuery: "https://evil.invalid/api"
      });
      const erin = await openPerson(browser, backend, "erin");
      clients.push(alice, carol, dave, erin);

      const initialAvailability = backend.availability("alice");
      expect(Object.keys(initialAvailability).sort()).toEqual([
        "active_sessions",
        "can_start_free_game",
        "created_sessions",
        "current_session",
        "discoverable_sessions",
        "open_sessions",
        "participating_sessions",
        "status"
      ]);
      expect(initialAvailability.status).toBe("ok");
      expect(initialAvailability.active_sessions.map(session => session.session_id)).toEqual([
        PRIMARY_SESSION_ID,
        SECONDARY_SESSION_ID
      ]);
      expect(new Set(initialAvailability.active_sessions.map(session => session.session_id)).size).toBe(2);
      initialAvailability.active_sessions.forEach(summary => {
        expect(Object.keys(summary).sort()).toEqual(SUMMARY_KEYS);
      });
      expect(initialAvailability.active_sessions[0]).toMatchObject({
        member_count: 6,
        human_count: 6,
        agent_count: 1,
        queue_count: 0,
        capacity: 7,
        available_places: 1,
        participation_status: "none",
        queue_position: null,
        join_mode: "replace_agent",
        created_by_current_player: false
      });
      expect(initialAvailability.open_sessions.map(session => session.session_id)).toEqual([
        PRIMARY_SESSION_ID,
        SECONDARY_SESSION_ID
      ]);
      expect(initialAvailability.created_sessions).toEqual([]);
      expect(initialAvailability.participating_sessions).toEqual([]);
      expect(initialAvailability.current_session).toBeNull();

      const erinAvailability = backend.availability("erin");
      expect(erinAvailability.active_sessions).toHaveLength(3);
      expect(erinAvailability.created_sessions).toEqual([
        expect.objectContaining({
          session_id: backend.owned.session_id,
          session_type: "closed",
          created_by_current_player: true,
          join_mode: "replace_agent"
        })
      ]);
      await expect(
        erin.page.locator(`[data-join-session="${backend.owned.session_id}"]`)
      ).toContainText("Agentrol overnemen");
      await expect(erin.page.locator("#playerSessionContent .active-game-card")).toHaveCount(3);
      await erin.page.locator(`[data-join-session="${backend.owned.session_id}"]`).click();
      await expect(erin.page.locator("#playerSessionBadge")).toHaveText("Gestart");
      expect(backend.activeMemberIn(backend.owned, "erin")?.assigned_role_id).toBe("customer");
      expect(backend.stats.joinCalls.filter(key => key === "erin")).toHaveLength(1);

      // De API levert expres een dubbele primary summary; de speler ziet toch
      // precies alle twee actieve sessies en kan de gestarte sessie aanklikken.
      const aliceCards = alice.page.locator("#playerSessionContent .active-game-card");
      await expect(aliceCards).toHaveCount(2);
      await expect(
        alice.page.locator(`[data-join-session="${PRIMARY_SESSION_ID}"]`)
      ).toContainText("Agentrol overnemen");
      await expect(
        alice.page.locator(`[data-join-session="${SECONDARY_SESSION_ID}"]`)
      ).toContainText("Deelnemen");

      expect(backend.availability("host").created_sessions).toHaveLength(1);
      expect(backend.availability("host").participating_sessions).toHaveLength(1);
      expect(backend.availability("host").active_sessions).toHaveLength(2);
      await expect.poll(() => alice.page.evaluate(() => ({
        authBase: window.LeerpretAuth.getSession().apiBase,
        configBase: window.LEARNGAME_OM_CONFIG.apiBase,
        sdkBase: window.LEARNGameOMSDK?.client?.apiBase || null,
        configFrozen: Object.isFrozen(window.LEARNGAME_OM_CONFIG)
      }))).toEqual({
        authBase: ALLOWED_OVERRIDE_BASE,
        configBase: ALLOWED_OVERRIDE_BASE,
        sdkBase: ALLOWED_OVERRIDE_BASE,
        configFrozen: true
      });
      expect(await dave.page.evaluate(() => ({
        authBase: window.LeerpretAuth.getSession().apiBase,
        configBase: window.LEARNGAME_OM_CONFIG.apiBase,
        search: location.search
      }))).toEqual({ authBase: API_BASE, configBase: API_BASE, search: "" });
      expect(backend.stats.evilApiRequests).toEqual([]);
      await expect.poll(() => alice.page.evaluate(() => window.__outboxCorruptEvents.length)).toBe(1);
      expect(await alice.page.evaluate(() => window.__outboxCorruptEvents[0])).toMatchObject({
        storageKey: LEGACY_OUTBOX_KEY,
        message: expect.any(String)
      });
      expect(await alice.page.evaluate(key => localStorage.getItem(key), LEGACY_OUTBOX_KEY)).toBeNull();

      const membershipBeforeTakeover = backend.runtime.membershipRevision;
      const snapshotBeforeTakeover = backend.runtime.snapshotRevision;
      await alice.page.locator(`[data-join-session="${PRIMARY_SESSION_ID}"]`).click();
      await expect(alice.page.locator("#topSessionStatusButton")).toContainText("Klant");
      expect(backend.primary.virtual_agents).toHaveLength(0);
      expect(backend.activeMember("alice")?.assigned_role_id).toBe("customer");
      expect(backend.runtime.membershipRevision).toBe(membershipBeforeTakeover + 1);
      expect(backend.runtime.snapshotRevision).toBe(snapshotBeforeTakeover);
      expect(backend.runtimeContract("host").human_role_ids).toEqual(FULL_LO4_ROLES);
      expect(backend.runtimeContract("alice").pending_commands).toEqual([]);
      await waitForActiveRuntime(alice.page, { controller: false });
      const invalidOverrideCommand = await rawCommand(alice.page, "", {});
      expect(invalidOverrideCommand).toMatchObject({
        status: 422,
        body: { detail: { code: "invalid_command_id" } }
      });
      expect(backend.stats.runtimeRequests.findLast(request => (
        request.key === "alice" && request.path.endsWith("/runtime/commands")
      ))).toMatchObject({
        instanceId: await runtimeInstanceId(alice.page),
        origin: ALLOWED_OVERRIDE_ORIGIN
      });

      const aliceAvailability = backend.availability("alice");
      expect(aliceAvailability.current_session).toMatchObject({
        participation_status: "active",
        queue_position: null,
        join_mode: "resume",
        human_count: 7,
        agent_count: 0,
        queue_count: 0
      });
      expect(aliceAvailability.active_sessions[0]).toMatchObject({
        participation_status: "active",
        join_mode: "resume",
        human_count: 7,
        agent_count: 0,
        available_places: 0
      });
      expect(aliceAvailability.open_sessions.map(session => session.session_id)).toEqual([
        SECONDARY_SESSION_ID
      ]);

      // Zodra beide menselijke rollen bezet zijn, komen volgende personen in
      // één gedeelde FIFO-wachtrij. Het contractwoord is `waiting`.
      await expect(
        carol.page.locator(`[data-join-session="${PRIMARY_SESSION_ID}"]`)
      ).toContainText("Aansluiten in wachtrij", { timeout: 10_000 });
      const membershipBeforeQueue = backend.runtime.membershipRevision;
      const snapshotBeforeQueue = backend.runtime.snapshotRevision;
      await carol.page.locator(`[data-join-session="${PRIMARY_SESSION_ID}"]`).click();
      await expect(carol.page.locator(".player-queued-session")).toContainText("plek 1");
      await expect(carol.page.locator("#playerSessionBadge")).toHaveText("Wachtrij 1");

      await expect(
        dave.page.locator(`[data-join-session="${PRIMARY_SESSION_ID}"]`)
      ).toContainText("Aansluiten in wachtrij", { timeout: 10_000 });
      await dave.page.locator(`[data-join-session="${PRIMARY_SESSION_ID}"]`).click();
      await expect(dave.page.locator(".player-queued-session")).toContainText("plek 2");
      expect(backend.runtime.membershipRevision).toBe(membershipBeforeQueue);
      expect(backend.runtime.snapshotRevision).toBe(snapshotBeforeQueue);
      expect(backend.availability("carol").current_session).toMatchObject({
        participation_status: "waiting",
        queue_position: 1,
        join_mode: "waiting"
      });
      expect(backend.availability("dave").current_session).toMatchObject({
        participation_status: "waiting",
        queue_position: 2,
        join_mode: "waiting"
      });
      expect(backend.availability("carol").active_sessions[0]).toMatchObject({
        join_mode: "waiting",
        participation_status: "waiting",
        queue_count: 2,
        available_places: 0
      });
      expect(backend.primary.waiting).toEqual(["carol", "dave"]);

      // De eerste probe faalt één keer. Herladen onderbreekt de timer, waarna
      // dezelfde persistente outboxregel met exact hetzelfde id opnieuw gaat.
      await alice.page.evaluate(actionType => {
        window.LEARNGameOMSimulator.clearInteractionBuffer();
        window.LEARNGameOMSimulator.dispatchInteraction({
          actionType,
          learningObjectID: "lom.multiplayer.regression",
          result: "retry_required"
        });
      }, PROBE_ACTION);
      const firstAliceEvent = await alice.page.evaluate(() => {
        const event = window.LEARNGameOMSimulator.getInteractionBuffer().at(-1);
        return { eventID: event.eventID, personID: event.personID };
      });
      await expect.poll(() => backend.stats.telemetryAttempts.filter(
        attempt => attempt.event_id === firstAliceEvent.eventID
      ).length).toBe(3);
      expect(backend.stats.telemetryAttempts.find(
        attempt => attempt.event_id === firstAliceEvent.eventID
      )?.failed).toBe(true);
      expect(backend.stats.telemetryAttempts.find(
        attempt => attempt.event_id === firstAliceEvent.eventID
      )?.origin).toBe(ALLOWED_OVERRIDE_ORIGIN);
      expect(firstAliceEvent.personID).toBe("member-alice");
      await expect.poll(() => alice.page.evaluate(({ prefix, eventId }) => {
        const item = JSON.parse(localStorage.getItem(`${prefix}${eventId}`) || "null");
        return item?.attempts || 0;
      }, { prefix: OUTBOX_V2_PREFIX, eventId: firstAliceEvent.eventID })).toBe(1);
      const failedOutboxItem = await alice.page.evaluate(({ key, prefix, eventId }) => {
        const itemKey = `${prefix}${eventId}`;
        return {
          legacy: localStorage.getItem(key),
          itemKey,
          item: JSON.parse(localStorage.getItem(itemKey) || "null")
        };
      }, { key: LEGACY_OUTBOX_KEY, prefix: OUTBOX_V2_PREFIX, eventId: firstAliceEvent.eventID });
      expect(failedOutboxItem.legacy).toBeNull();
      expect(failedOutboxItem.itemKey).toBe(`${OUTBOX_V2_PREFIX}${firstAliceEvent.eventID}`);
      expect(failedOutboxItem.item).toMatchObject({
        id: firstAliceEvent.eventID,
        attempts: 1,
        record: {
          eventID: firstAliceEvent.eventID,
          personID: "member-alice",
          actionType: PROBE_ACTION
        }
      });

      await alice.page.reload();
      await waitForApplication(alice.page, backend, alice.diagnostics);
      await expect(alice.page.locator("#topSessionControls")).toBeVisible();
      await expect(alice.page.locator("#playerSessionContent .active-game-card")).toHaveCount(2);
      expect(backend.primary.members.filter(
        member => member.member_id === "member-alice"
      )).toHaveLength(1);
      expect(backend.stats.joinCalls.filter(key => key === "alice")).toHaveLength(1);

      await expect.poll(() => backend.stats.telemetryAttempts.filter(
        attempt => attempt.event_id === firstAliceEvent.eventID
      ).length, { timeout: 10_000 }).toBe(4);
      const aliceRetryAttempts = backend.stats.telemetryAttempts.filter(
        attempt => attempt.event_id === firstAliceEvent.eventID
      );
      expect(new Set(aliceRetryAttempts.map(attempt => attempt.person_id))).toEqual(
        new Set([firstAliceEvent.personID])
      );
      expect(aliceRetryAttempts.map(attempt => attempt.failed)).toEqual([true, true, true, false]);
      expect(backend.stats.logicalTelemetry.get(firstAliceEvent.eventID)).toMatchObject({
        event_id: firstAliceEvent.eventID,
        person_id: "member-alice"
      });
      expect(await alice.page.evaluate(
        key => localStorage.getItem(key),
        `${OUTBOX_V2_PREFIX}${firstAliceEvent.eventID}`
      )).toBeNull();
      expect(await alice.page.evaluate(key => localStorage.getItem(key), LEGACY_OUTBOX_KEY)).toBeNull();

      await alice.page.evaluate(actionType => {
        window.LEARNGameOMSimulator.dispatchInteraction({
          actionType,
          learningObjectID: "lom.multiplayer.regression",
          result: "after_refresh"
        });
      }, PROBE_ACTION);
      const secondAliceEvent = await alice.page.evaluate(() => {
        const event = window.LEARNGameOMSimulator.getInteractionBuffer().at(-1);
        return { eventID: event.eventID, personID: event.personID };
      });
      expect(secondAliceEvent.personID).toBe(firstAliceEvent.personID);
      expect(secondAliceEvent.eventID).not.toBe(firstAliceEvent.eventID);
      await expect.poll(() => backend.stats.telemetryAttempts.some(
        attempt => attempt.event_id === secondAliceEvent.eventID && !attempt.failed
      )).toBe(true);

      const otherPersonEvents = [];
      for (const client of [host, carol, dave]) {
        const event = await client.page.evaluate(actionType => {
          window.LEARNGameOMSimulator.dispatchInteraction({
            actionType,
            learningObjectID: "lom.multiplayer.regression",
            result: "person_identity"
          });
          const latest = window.LEARNGameOMSimulator.getInteractionBuffer().at(-1);
          return { eventID: latest.eventID, personID: latest.personID };
        }, PROBE_ACTION);
        otherPersonEvents.push(event);
      }
      const allIdentityEvents = [firstAliceEvent, secondAliceEvent, ...otherPersonEvents];
      expect(new Set(allIdentityEvents.map(event => event.eventID)).size).toBe(allIdentityEvents.length);
      expect(new Set([
        firstAliceEvent.personID,
        ...otherPersonEvents.map(event => event.personID)
      ]).size).toBe(4);

      // Beide bezette rollen zijn echt menselijk. Een klantorder blijft daarom
      // AWAITING_PLAYER en krijgt geen lokale agent-completionstijd.
      await host.page.evaluate(() => window.LOMMultiplayerRuntime.poll({ forceRestore: true }));
      await expect.poll(async () => {
        return host.page.evaluate(() => {
          const engine = window.LEARNGameOMSimulator.getSharedGameController().engine;
          return [...engine.humanRoleIds].sort();
        });
      }, { timeout: 10_000 }).toEqual([...FULL_LO4_STATIONS].sort());
      expect(backend.runtime.snapshot.orders).toHaveLength(0);
      const createdOrder = await host.page.evaluate(() => {
        const engine = window.LEARNGameOMSimulator.getSharedGameController().engine;
        const order = engine.generateOrder();
        engine.updateRole("customer", Date.now());
        const runtime = engine.roleRuntime.customer;
        return {
          id: order.id,
          state: runtime.state,
          completesAt: runtime.completesAt,
          humanRoleIds: [...engine.humanRoleIds].sort()
        };
      });
      expect(createdOrder).toMatchObject({
        state: "AWAITING_PLAYER",
        completesAt: null,
        humanRoleIds: [...FULL_LO4_STATIONS].sort()
      });
      await expect.poll(() => backend.runtime.snapshot?.orders?.some(
        order => order.id === createdOrder.id
      ), { timeout: 10_000 }).toBe(true);

      // Alice is de niet-controller en krijgt het echte klantenformulier. Een
      // synchrone dubbelklik mag maar één command posten. De knop blijft daarna
      // geblokkeerd totdat precies haar command_id in applied_command_ids staat.
      await alice.page.evaluate(() => window.LOMMultiplayerRuntime.poll({ forceRestore: true }));
      const customerSubmit = alice.page.locator(".sim-customer-order-submit");
      await expect(customerSubmit).toBeVisible();
      await expect(customerSubmit).toBeEnabled();

      const productChoices = alice.page.locator(
        '.sim-customer-order-form input[name="product_id"]'
      );
      const selectedChoice = await productChoices.count() > 1
        ? productChoices.nth(1)
        : productChoices.first();
      await selectedChoice.check({ force: true });
      const selectedProductId = await selectedChoice.inputValue();
      await alice.page.locator('.sim-customer-order-form input[name="quantity"]').fill("4");
      const dueInput = alice.page.locator('.sim-customer-order-form input[name="due_minutes"]');
      await dueInput.fill("37");
      await dueInput.focus();
      await alice.page.evaluate(() => {
        const controller = window.LEARNGameOMSimulator.getSharedGameController();
        controller.signatureStrokes = [[{ x: 11, y: 12 }, { x: 31, y: 34 }]];
        controller.signed = true;
      });
      const unchangedSnapshotRevision = backend.runtime.snapshotRevision;
      const aliceGetsBefore = backend.stats.runtimeGets.get("alice") || 0;
      await alice.page.evaluate(async () => {
        await window.LOMMultiplayerRuntime.poll();
        await window.LOMMultiplayerRuntime.poll();
      });
      expect((backend.stats.runtimeGets.get("alice") || 0) - aliceGetsBefore).toBeGreaterThanOrEqual(2);
      expect(backend.runtime.snapshotRevision).toBe(unchangedSnapshotRevision);
      expect(await alice.page.evaluate(() => {
        const form = document.querySelector(".sim-customer-order-form");
        const controller = window.LEARNGameOMSimulator.getSharedGameController();
        return {
          focusedName: document.activeElement?.getAttribute("name"),
          productId: form?.querySelector('[name="product_id"]:checked')?.value,
          quantity: form?.querySelector('[name="quantity"]')?.value,
          dueMinutes: form?.querySelector('[name="due_minutes"]')?.value,
          signed: controller.signed,
          signatureStrokes: controller.signatureStrokes
        };
      })).toEqual({
        focusedName: "due_minutes",
        productId: selectedProductId,
        quantity: "4",
        dueMinutes: "37",
        signed: true,
        signatureStrokes: [[{ x: 11, y: 12 }, { x: 31, y: 34 }]]
      });

      const casConflictCountBeforeCommand = backend.stats.casConflicts.length;
      backend.injectConflictForNextCommandResult = true;
      const commandResultBarrier = backend.armCommandResultBarrier();
      backend.loseNextAcceptedResponse("alice");
      const alicePostsBefore = backend.stats.commandPosts.filter(
        command => command.key === "alice"
      ).length;
      await customerSubmit.evaluate(button => {
        button.click();
        button.click();
      });
      await expect.poll(() => backend.stats.commandPosts.filter(
        command => command.key === "alice"
      ).length).toBe(alicePostsBefore + 1);
      const acceptedPost = backend.stats.commandPosts.findLast(command => command.key === "alice");
      const commandId = acceptedPost.commandId;
      expect(acceptedPost).toMatchObject({
        commandStatus: "accepted",
        responseLost: true
      });
      expect(commandId).toContain(`${PRIMARY_SESSION_ID}:member-alice:`);
      await expect(customerSubmit).toBeDisabled();
      expect(backend.runtime.pendingCommands.filter(
        command => command.command_id === commandId
      )).toHaveLength(1);
      expect(Object.keys(backend.runtime.pendingCommands[0]).sort()).toEqual([
        "command_id",
        "member_id",
        "payload",
        "role_id",
        "submitted_at"
      ]);
      expect(backend.runtimeContract("host").pending_commands).toHaveLength(1);
      expect(backend.runtimeContract("alice").pending_commands).toEqual([]);
      await expect.poll(async () => alice.page.evaluate(storageKey => {
        const raw = localStorage.getItem(storageKey);
        return raw ? JSON.parse(raw) : null;
      }, commandStorageKey(commandId)), { timeout: 5_000 }).toMatchObject({
        command_id: commandId,
        session_id: PRIMARY_SESSION_ID,
        member_id: "member-alice"
      });

      await alice.page.reload();
      await waitForApplication(alice.page, backend, alice.diagnostics);
      await expect(alice.page.locator("#topSessionControls")).toBeVisible();
      await expect.poll(() => backend.stats.commandPosts.filter(
        command => command.commandId === commandId
      ).length, { timeout: 10_000 }).toBeGreaterThanOrEqual(2);
      const retryPosts = backend.stats.commandPosts.filter(command => command.commandId === commandId);
      expect(retryPosts[0].commandStatus).toBe("accepted");
      expect(retryPosts.slice(1).every(post => post.commandStatus === "duplicate_pending")).toBe(true);
      expect(new Set(retryPosts.map(post => post.commandId))).toEqual(new Set([commandId]));
      expect(await alice.page.evaluate(storageKey => {
        const stored = JSON.parse(localStorage.getItem(storageKey) || "null");
        return stored && {
          command_id: stored.command_id,
          member_id: stored.member_id,
          needs_retry: stored.needs_retry
        };
      }, commandStorageKey(commandId))).toEqual({
        command_id: commandId,
        member_id: "member-alice",
        needs_retry: false
      });

      // De eerste command-PUT botst echt op een intussen verhoogde revisie. De
      // tweede PUT bereiken bewijst dat applyPendingCommands niet deadlockt.
      await expect.poll(
        () => backend.stats.casConflicts.length,
        { timeout: 15_000 }
      ).toBe(casConflictCountBeforeCommand + 1);
      await expect.poll(() => commandResultBarrier.started, { timeout: 15_000 }).toBe(true);
      expect(await alice.page.evaluate(() => {
        const button = document.querySelector(".sim-customer-order-submit");
        return button === null || button.disabled;
      })).toBe(true);
      expect(await alice.page.evaluate(() => (
        window.LOMMultiplayerRuntime.getState().ownPendingCommandIds.length
      ))).toBe(1);
      expect(backend.stats.telemetryAttempts.filter(
        attempt => attempt.event_id === commandId
      )).toEqual([]);
      expect(backend.stats.logicalTelemetry.has(commandId)).toBe(false);

      const pendingDuplicate = await rawCommand(alice.page, commandId, { customerOrder: {} });
      expect(pendingDuplicate.status).toBe(200);
      expect(pendingDuplicate.body).toMatchObject({
        contract_version: "1.0",
        command_status: "duplicate_pending",
        queue_position: null
      });
      expect(backend.runtime.pendingCommands.filter(
        command => command.command_id === commandId
      )).toHaveLength(1);

      const snapshotBeforeCommandCas = backend.runtime.snapshotRevision;
      commandResultBarrier.release();

      await expect.poll(
        () => backend.stats.commandAcknowledgements.get(commandId),
        { timeout: 12_000 }
      ).toBe("applied");
      expect(backend.runtime.snapshotRevision).toBe(snapshotBeforeCommandCas + 1);
      expect(backend.runtime.pendingCommands).toHaveLength(0);
      const appliedResult = backend.runtime.commandResults.get(commandId);
      expect(Object.keys(appliedResult).sort()).toEqual([
        "command_id",
        "error_code",
        "member_id",
        "resolved_at",
        "status"
      ]);
      expect(appliedResult).toMatchObject({
        command_id: commandId,
        member_id: "member-alice",
        status: "applied",
        error_code: null,
        resolved_at: expect.any(String)
      });
      expect(Number.isNaN(Date.parse(appliedResult.resolved_at))).toBe(false);
      expect(backend.runtime.appliedCommandIds.has(commandId)).toBe(true);
      const resultPut = backend.stats.runtimePutBodies.findLast(body => (
        body.command_results?.some(result => result.command_id === commandId)
      ));
      expect(resultPut.applied_command_ids).toEqual([]);
      expect(resultPut.command_results).toEqual([{
        command_id: commandId,
        status: "applied",
        error_code: null
      }]);
      expect(resultPut.applied_command_ids.some(id => (
        resultPut.command_results.some(result => result.command_id === id)
      ))).toBe(false);
      await expect.poll(
        () => alice.page.evaluate(() => window.LOMMultiplayerRuntime.getState().ownPendingCommandIds),
        { timeout: 12_000 }
      ).toEqual([]);
      expect(await alice.page.evaluate(
        storageKey => localStorage.getItem(storageKey),
        commandStorageKey(commandId)
      )).toBeNull();
      await expect(alice.page.locator(".sim-customer-order-submit")).toHaveCount(0);
      const appliedDuplicate = await rawCommand(alice.page, commandId, { customerOrder: {} });
      expect(appliedDuplicate.status).toBe(200);
      expect(appliedDuplicate.body).toMatchObject({
        contract_version: "1.0",
        status: "running",
        queue_position: null,
        command_status: "duplicate_applied"
      });
      // Dezelfde klantrol schrijft later ook een legitieme overdracht in de
      // historie. Tel daarom de door dit command veroorzaakte plaatsing, niet
      // alle lifecycle-events van de klant; zo blijft de exactly-once-check
      // onafhankelijk van de willekeurige overdrachtsvertraging (0,8-3,0 s).
      await expect.poll(() => backend.runtime.snapshot.orders.find(
        order => order.id === createdOrder.id
      )?.history.filter(item => (
        item.roleId === "customer"
        && item.type === "completed"
        && item.label === "Klantorder geplaatst"
      )).length).toBe(1);
      await expect.poll(
        () => host.page.evaluate(() => window.LOMMultiplayerRuntime.getState().locallyAppliedCommandIds),
        { timeout: 10_000 }
      ).toEqual([]);
      await expect.poll(() => backend.stats.telemetryAttempts.some(attempt => (
        attempt.event_id === commandId
        && attempt.person_id === "member-alice"
        && attempt.action_type === "simulation_customer_order_completed"
        && !attempt.failed
      )), { timeout: 10_000 }).toBe(true);
      expect(backend.stats.telemetryAttempts.filter(
        attempt => attempt.event_id === commandId
      ).every(attempt => attempt.person_id === "member-alice")).toBe(true);
      expect(backend.stats.logicalTelemetry.get(commandId)).toMatchObject({
        event_id: commandId,
        person_id: "member-alice",
        action_type: "simulation_customer_order_completed"
      });

      // Na de klantoverdracht wacht Operations eveneens op de echte host: geen
      // agenttimer. Daarna projecteren controller en peer dezelfde shared state.
      await expect.poll(() => backend.runtime.snapshot?.roleRuntime?.operations?.state, {
        timeout: 15_000
      }).toBe("AWAITING_PLAYER");
      expect(backend.runtime.snapshot.roleRuntime.operations.completesAt).toBeNull();

      const rejectedCommandId = `${PRIMARY_SESSION_ID}:member-host:rejected-regression`;
      const rejectedAccepted = await rawCommand(host.page, rejectedCommandId, {});
      expect(rejectedAccepted).toMatchObject({
        status: 200,
        body: {
          command_status: "accepted",
          pending_commands: [expect.objectContaining({
            command_id: rejectedCommandId,
            member_id: "member-host",
            role_id: "logistics_manager"
          })]
        }
      });
      await expect.poll(() => backend.runtime.commandResults.get(rejectedCommandId), {
        timeout: 12_000
      }).toMatchObject({
        command_id: rejectedCommandId,
        member_id: "member-host",
        status: "rejected",
        error_code: "invalid_action",
        resolved_at: expect.any(String)
      });
      expect(backend.runtime.appliedCommandIds.has(rejectedCommandId)).toBe(false);
      expect(backend.runtime.pendingCommands.some(
        command => command.command_id === rejectedCommandId
      )).toBe(false);
      const rejectedDuplicate = await rawCommand(host.page, rejectedCommandId, {});
      expect(rejectedDuplicate).toMatchObject({
        status: 200,
        body: { command_status: "duplicate_rejected" }
      });
      expect(backend.runtimeContract("alice").command_results.map(
        result => result.command_id
      )).toEqual([commandId]);

      await alice.page.evaluate(() => window.LOMMultiplayerRuntime.poll({ forceRestore: true }));
      await expect.poll(async () => {
        const [hostProjection, aliceProjection] = await Promise.all([
          sharedProjection(host.page),
          sharedProjection(alice.page)
        ]);
        return JSON.stringify(hostProjection) === JSON.stringify(aliceProjection);
      }, { timeout: 12_000 }).toBe(true);
      const convergedBeforeLeave = await sharedProjection(host.page);
      expect(convergedBeforeLeave.orders.map(order => order.id)).toEqual([createdOrder.id]);
      expect(convergedBeforeLeave.roleRuntime.operations).toMatchObject({
        state: "AWAITING_PLAYER",
        completesAt: null
      });

      // Een individuele stop gebruikt de gewrapte leave-respons, sluit de
      // sessie niet en promoveert atomair de eerste wachtende speler. Een vóór
      // leave begonnen runtime-GET komt expres pas ná leave terug; die oude
      // response mag de UI, sessie-id of revisie niet opnieuw activeren.
      await alice.page.evaluate(async () => window.LOMMultiplayerRuntime.poll());
      const staleRuntimeBarrier = backend.armRuntimeGetBarrier("alice");
      await alice.page.evaluate(() => {
        window.__staleRuntimePollSettled = false;
        void window.LOMMultiplayerRuntime.poll({ forceRestore: true })
          .finally(() => { window.__staleRuntimePollSettled = true; });
      });
      await expect.poll(() => staleRuntimeBarrier.started, { timeout: 10_000 }).toBe(true);
      const membershipBeforeLeave = backend.runtime.membershipRevision;
      const snapshotBeforeLeave = backend.runtime.snapshotRevision;
      await alice.page.evaluate(() => window.LeerpretAuth.logout());
      expect(backend.runtime.membershipRevision).toBe(membershipBeforeLeave + 1);
      expect(backend.runtime.snapshotRevision).toBe(snapshotBeforeLeave);
      expect(backend.stats.leaveRequestTokens.findLast(call => call.key === "alice")).toEqual({
        key: "alice",
        token: null
      });
      expect(backend.stats.authLogoutCalls.findLast(call => call.key === "alice")).toEqual({
        key: "alice",
        token: "token-alice"
      });
      expect(backend.stats.lifecycleCalls.filter(call => call.key === "alice").slice(-2)).toEqual([
        { key: "alice", type: "leave" },
        { key: "alice", type: "auth_logout" }
      ]);
      expect(await alice.page.evaluate(() => localStorage.getItem("leerpret.sessionToken"))).toBeNull();
      staleRuntimeBarrier.release();
      await expect.poll(() => alice.page.evaluate(() => window.__staleRuntimePollSettled), {
        timeout: 10_000
      }).toBe(true);
      expect(await alice.page.evaluate(() => window.LOMMultiplayerRuntime.getState())).toMatchObject({
        sessionId: null,
        revision: -1,
        ownPendingCommandIds: []
      });
      expect(await alice.page.evaluate(() => (
        window.LEARNGameOMSimulator.getSharedGameController()?.engine?.started
      ))).toBe(false);
      const runtimeCallsAfterLogout = {
        gets: backend.stats.runtimeGets.get("alice") || 0,
        puts: backend.stats.runtimePutsByKey.get("alice") || 0
      };
      await alice.page.waitForTimeout(1_600);
      expect({
        gets: backend.stats.runtimeGets.get("alice") || 0,
        puts: backend.stats.runtimePutsByKey.get("alice") || 0
      }).toEqual(runtimeCallsAfterLogout);
      expect(backend.primary.status).toBe("running");
      expect(backend.stats.finishCalls).toBe(0);
      expect(backend.stats.promotions).toEqual([{ promotedKey: "carol", roleId: "customer" }]);
      expect(backend.primary.members.map(member => member.member_id).sort()).toEqual([
        "member-carol",
        "member-finished-goods",
        "member-host",
        "member-production-a",
        "member-production-b",
        "member-production-c",
        "member-raw-warehouse"
      ]);
      expect(backend.primary.waiting).toEqual(["dave"]);
      expect(backend.runtimeContract("host").human_role_ids).toEqual(FULL_LO4_ROLES);

      await expect(carol.page.locator("#topSessionStatusButton"), { timeout: 10_000 })
        .toContainText("Klant");
      await waitForActiveRuntime(carol.page, { controller: false });
      await expect(dave.page.locator(".player-queued-session"), { timeout: 10_000 })
        .toContainText("plek 1");
      await expect(dave.page.locator("#playerSessionBadge")).toHaveText("Wachtrij 1");

      const carolAfterPromotion = await carol.page.evaluate(actionType => {
        window.LEARNGameOMSimulator.dispatchInteraction({
          actionType,
          learningObjectID: "lom.multiplayer.regression",
          result: "promoted"
        });
        const latest = window.LEARNGameOMSimulator.getInteractionBuffer().at(-1);
        return { eventID: latest.eventID, personID: latest.personID };
      }, PROBE_ACTION);
      expect(carolAfterPromotion.personID).toBe(otherPersonEvents[1].personID);
      expect(carolAfterPromotion.eventID).not.toBe(otherPersonEvents[1].eventID);

      await carol.page.evaluate(() => window.LOMMultiplayerRuntime.poll({ forceRestore: true }));
      await expect.poll(async () => {
        const [hostProjection, carolProjection] = await Promise.all([
          sharedProjection(host.page),
          sharedProjection(carol.page)
        ]);
        return JSON.stringify(hostProjection) === JSON.stringify(carolProjection);
      }, { timeout: 12_000 }).toBe(true);
      expect((await sharedProjection(carol.page)).orders.map(order => order.id)).toEqual([
        createdOrder.id
      ]);
      expect(backend.runtime.appliedCommandIds.size).toBe(1);
      expect(backend.runtime.commandResults.size).toBe(2);
      expect(backend.stats.logicalTelemetry.has(commandId)).toBe(true);

      // Een tweede geïsoleerde browser met exact dezelfde login krijgt niet
      // tevens de controllerlease. Alleen de oorspronkelijke browser publiceert.
      const hostFollower = await openPerson(browser, backend, "host");
      clients.push(hostFollower);
      const followerInstanceId = await runtimeInstanceId(hostFollower.page);
      expect(followerInstanceId).toMatch(/^instance-[A-Za-z0-9._:-]+$/);
      expect(followerInstanceId).not.toBe(originalHostInstanceId);
      await waitForActiveRuntime(hostFollower.page, { controller: false });
      await host.page.evaluate(() => window.LOMMultiplayerRuntime.poll({ forceRestore: true }));
      expect(await Promise.all([
        host.page.evaluate(() => window.LOMMultiplayerRuntime.getState().isController),
        hostFollower.page.evaluate(() => window.LOMMultiplayerRuntime.getState().isController)
      ])).toEqual([true, false]);
      expect(backend.runtimeContract("host", {}, originalHostInstanceId).is_controller).toBe(true);
      expect(backend.runtimeContract("host", {}, followerInstanceId).is_controller).toBe(false);

      const leaderPutsBeforeProof = backend.stats.runtimePutsByInstance.get(
        originalHostInstanceId
      ) || 0;
      const followerPutsBeforeProof = backend.stats.runtimePutsByInstance.get(
        followerInstanceId
      ) || 0;
      await Promise.all([
        host.page.evaluate(() => window.LOMMultiplayerRuntime.publishSnapshot()),
        hostFollower.page.evaluate(() => window.LOMMultiplayerRuntime.publishSnapshot())
      ]);
      await expect.poll(() => (
        backend.stats.runtimePutsByInstance.get(originalHostInstanceId) || 0
      )).toBeGreaterThan(leaderPutsBeforeProof);
      expect(backend.stats.runtimePutsByInstance.get(followerInstanceId) || 0)
        .toBe(followerPutsBeforeProof);

      // Na lokaal stoppen en het gecontroleerd laten verlopen van de lease
      // neemt de tweede browser zonder dubbele publisher de controllerrol over.
      await host.page.evaluate(() => window.LOMMultiplayerRuntime.stop({ keepGameVisible: true }));
      backend.forcePrimaryControllerLeaseExpiry();
      const revisionBeforeLeaseFailover = backend.runtime.revision;
      await hostFollower.page.evaluate(() => (
        window.LOMMultiplayerRuntime.poll({ forceRestore: true })
      ));
      await waitForActiveRuntime(hostFollower.page, { controller: true });
      expect(backend.runtime.controllerInstanceId).toBe(followerInstanceId);
      expect(backend.runtime.revision).toBeGreaterThan(revisionBeforeLeaseFailover);
      expect(backend.runtimeContract("host", {}, originalHostInstanceId)).toMatchObject({
        is_controller: false,
        pending_commands: []
      });
      expect(backend.runtimeContract("host", {}, followerInstanceId)).toMatchObject({
        is_controller: true,
        controller_lease_expires_at: expect.any(String)
      });

      const followerPutsBeforeTakeover = backend.stats.runtimePutsByInstance.get(
        followerInstanceId
      ) || 0;
      await hostFollower.page.evaluate(() => window.LOMMultiplayerRuntime.publishSnapshot());
      await expect.poll(() => (
        backend.stats.runtimePutsByInstance.get(followerInstanceId) || 0
      )).toBeGreaterThan(followerPutsBeforeTakeover);

      const oldInstancePutsBeforeRejection = backend.stats.runtimePutsByInstance.get(
        originalHostInstanceId
      ) || 0;
      const rejectedOldInstancePut = await rawRuntimePut(host.page, originalHostInstanceId, {
        base_revision: backend.runtime.revision,
        snapshot: clone(backend.runtime.snapshot),
        applied_command_ids: [],
        command_results: []
      });
      expect(rejectedOldInstancePut).toMatchObject({
        status: 403,
        body: {
          detail: {
            code: "controller_lease_required"
          }
        }
      });
      expect(backend.stats.runtimePutsByInstance.get(originalHostInstanceId) || 0)
        .toBe(oldInstancePutsBeforeRejection + 1);
      expect(backend.stats.controllerLeaseClaims.filter(
        claim => claim.scope === "primary"
      ).at(-1)).toMatchObject({
        key: "host",
        previousInstanceId: originalHostInstanceId,
        instanceId: followerInstanceId
      });
      expect(backend.stats.runtimeRequests.length).toBeGreaterThan(0);
      expect(backend.stats.runtimeRequests.every(request => (
        backend.normalizedInstanceId(request.instanceId) === request.instanceId
      ))).toBe(true);
      expect(backend.stats.evilApiRequests).toEqual([]);
      expect(backend.stats.unknownApiRequests).toEqual([]);
    } finally {
      await Promise.all(clients.map(client => client.context.close().catch(() => {})));
    }
  });

  test("een digitale Operations-batch blijft na responseverlies en reload exactly-once", async ({ browser }) => {
    test.setTimeout(120_000);
    const backend = new StatefulMultiplayerApi();
    const clients = [];

    // De host houdt de controllerlease, terwijl Alice de menselijke
    // Operations-rol van de agent overneemt. Zo loopt de sleepactie via het
    // echte follower -> command POST -> controller -> CAS-resultaatpad.
    backend.primary.members.find(
      member => member.member_id === backend.person("host").memberId
    ).assigned_role_id = "customer";
    backend.primary.virtual_agents[0].role_id = "logistics_manager";

    try {
      const host = await openPerson(browser, backend, "host");
      clients.push(host);
      await waitForActiveRuntime(host.page, { controller: true });
      await expect.poll(() => Array.isArray(backend.runtime.snapshot?.orders), {
        timeout: 12_000
      }).toBe(true);
      await expect.poll(() => backend.injectConcurrentRevisionBeforeFirstPut).toBe(false);
      await host.page.evaluate(async () => {
        const engine = window.LEARNGameOMSimulator.getSharedGameController().engine;
        engine.nextOrderAt = Number.MAX_SAFE_INTEGER;
        engine.pendingPeakOrderAt = null;
        engine.orders.clear();
        Object.values(engine.roleRuntime).forEach(runtime => {
          runtime.queue = [];
          runtime.activeOrderId = null;
          runtime.state = "IDLE";
          runtime.completesAt = null;
          runtime.transfersAt = null;
          runtime.incident = null;
          runtime.hesitation = false;
        });
        await window.LOMMultiplayerRuntime.publishSnapshot();
      });
      await expect.poll(() => backend.runtime.snapshot?.orders?.length, {
        timeout: 12_000
      }).toBe(0);

      const alice = await openPerson(browser, backend, "alice");
      clients.push(alice);
      await expect(
        alice.page.locator(`[data-join-session="${PRIMARY_SESSION_ID}"]`)
      ).toContainText("Agentrol overnemen");
      await alice.page.locator(`[data-join-session="${PRIMARY_SESSION_ID}"]`).click();
      await expect.poll(
        () => backend.activeMember("alice")?.assigned_role_id,
        { timeout: 10_000 }
      ).toBe("logistics_manager");
      await waitForActiveRuntime(alice.page, { controller: false });
      await host.page.evaluate(() => window.LOMMultiplayerRuntime.poll({ forceRestore: true }));
      await expect.poll(() => host.page.evaluate(() => (
        [...window.LEARNGameOMSimulator
          .getSharedGameController()
          .engine
          .humanRoleIds]
          .sort()
      )), { timeout: 10_000 }).toEqual([...FULL_LO4_STATIONS].sort());

      const prepared = await host.page.evaluate(async () => {
        const controller = window.LEARNGameOMSimulator.getSharedGameController();
        const engine = controller.engine;
        engine.nextOrderAt = Number.MAX_SAFE_INTEGER;
        engine.pendingPeakOrderAt = null;
        engine.config.incidentChance = 0;
        engine.config.transferDelayMinMs = 100;
        engine.config.transferDelayMaxMs = 100;

        const regression = { enqueues: [], transfers: [] };
        const originalEnqueue = engine.enqueue.bind(engine);
        engine.enqueue = (roleId, orderId) => {
          regression.enqueues.push({ roleId, orderId });
          return originalEnqueue(roleId, orderId);
        };
        regression.unsubscribe = engine.subscribe(event => {
          if (event.type === "order-transferred") {
            regression.transfers.push(event.detail?.transfer || null);
          }
        });
        window.__operationsBatchRegression = regression;

        const created = engine.generateOrder();
        engine.updateRole("customer", Date.now());
        const customerTask = engine.playerTask("customer");
        if (customerTask?.order?.id !== created.id) {
          throw new Error(`Verwachte ${created.id} als klanttaak, kreeg ${customerTask?.order?.id || "geen"}.`);
        }
        const productId = Object.keys(engine.products).sort().at(-1);
        const result = engine.completePlayerAction({
          customerOrder: { productId, quantity: 3, dueMinutes: 45 }
        }, "customer");
        if (!result.ok) throw new Error(result.errors.join(" | "));
        engine.transferOrder("customer", created.id, Date.now());
        engine.updateRole("operations", Date.now());
        controller.render();
        await window.LOMMultiplayerRuntime.publishSnapshot();

        const task = engine.playerTask("operations");
        return {
          orderId: created.id,
          productId,
          state: engine.roleRuntime.operations.state,
          transfer: engine.batchTransferDescriptor(task.order, "operations")
        };
      });
      expect(prepared).toMatchObject({
        state: "AWAITING_PLAYER",
        transfer: {
          batchId: prepared.orderId,
          orderId: prepared.orderId,
          productId: prepared.productId,
          quantity: 3,
          sourceRoleId: "operations",
          targetRoleId: "srm",
          routeIndex: 1,
          productionRoute: "parallel",
          cargoKind: "order_information",
          atomicTransfer: true,
          finalDelivery: false
        }
      });
      await expect.poll(() => backend.runtime.snapshot?.roleRuntime?.operations, {
        timeout: 12_000
      }).toMatchObject({
        state: "AWAITING_PLAYER",
        activeOrderId: prepared.orderId,
        completesAt: null
      });

      await alice.page.evaluate(() => window.LOMMultiplayerRuntime.poll({ forceRestore: true }));
      await expect.poll(() => alice.page.evaluate(() => {
        const task = window.LEARNGameOMSimulator.getSharedGameController().engine.playerTask();
        return task && {
          roleId: task.role.id,
          orderId: task.order.id,
          quantity: task.order.quantity
        };
      }), { timeout: 12_000 }).toEqual({
        roleId: "operations",
        orderId: prepared.orderId,
        quantity: 3
      });

      await alice.page.evaluate(() => {
        const controller = window.LEARNGameOMSimulator.getSharedGameController();
        controller.signatureStrokes = [[
          { x: 8, y: 18 },
          { x: 34, y: 42 },
          { x: 67, y: 16 },
          { x: 102, y: 48 }
        ]];
        controller.signed = true;
        controller.render();
      });
      const transferMap = alice.page.locator(".sim-isometric-transfer-map");
      const cargo = transferMap.locator(`.iso-cargo-tower[data-cargo-id="${prepared.orderId}"]`);
      const destination = transferMap.locator('[data-department-id="srm"][data-accepts-drag-kind="cargo"]');
      await expect(transferMap).toBeVisible();
      const transferDiagnostic = await alice.page.evaluate(() => {
        const controller = window.LEARNGameOMSimulator.getSharedGameController();
        const task = controller.engine.playerTask();
        return {
          taskOrderId: task?.order?.id || null,
          taskRoleId: task?.role?.id || null,
          activeOrderId: controller.engine.roleRuntime.operations.activeOrderId,
          productId: task?.order?.productId || null,
          towerSequence: task?.product?.towerSequence || null,
          descriptor: controller.batchTransferDescriptor(task)
        };
      });
      expect(await cargo.count(), JSON.stringify(transferDiagnostic)).toBe(1);
      await expect(cargo).toHaveClass(/is-draggable/);
      await expect(cargo).toHaveAttribute("data-cargo-quantity", "3");
      await expect(cargo.locator(".iso-cargo-tower-instance")).toHaveCount(3);
      await expect(destination).toHaveAttribute("data-department-id", "srm");

      const resultBarrier = backend.armCommandResultBarrier();
      backend.loseNextAcceptedResponse("alice");
      const snapshotRevisionBeforeCommand = backend.runtime.snapshotRevision;
      const postsBeforeCommand = backend.stats.commandPosts.length;
      await transferMap.scrollIntoViewIfNeeded();
      const cargoBox = await cargo.boundingBox();
      const destinationBox = await destination.boundingBox();
      expect(cargoBox).not.toBeNull();
      expect(destinationBox).not.toBeNull();
      await alice.page.mouse.move(
        cargoBox.x + cargoBox.width / 2,
        cargoBox.y + cargoBox.height / 2
      );
      await alice.page.mouse.down();
      await alice.page.mouse.move(
        destinationBox.x + destinationBox.width / 2,
        destinationBox.y + destinationBox.height / 2,
        { steps: 12 }
      );
      await expect(destination).toHaveClass(/is-drag-over/);
      await alice.page.mouse.up();

      await expect.poll(() => backend.stats.commandPosts.length).toBeGreaterThan(postsBeforeCommand);
      const acceptedPost = backend.stats.commandPosts.findLast(post => (
        post.key === "alice"
        && post.payload?.transfer?.orderId === prepared.orderId
      ));
      expect(acceptedPost).toMatchObject({
        key: "alice",
        commandStatus: "accepted",
        responseLost: true,
        payload: {
          completedQuantity: 3,
          transferred: true,
          transfer: prepared.transfer,
          _telemetry: {
            action_type: "simulation_role_action_submitted",
            order_id: prepared.orderId,
            product_id: prepared.productId,
            timestamp: expect.any(String)
          }
        }
      });
      const commandId = acceptedPost.commandId;
      expect(backend.runtime.pendingCommands.filter(
        command => command.command_id === commandId
      )).toHaveLength(1);
      expect(backend.runtime.pendingCommands[0].role_id).toBe("logistics_manager");
      expect(backend.runtime.pendingCommands[0].payload.transfer).toEqual(prepared.transfer);
      await expect(alice.page.locator("[data-sim-transfer-pending]")).toBeVisible();
      await expect.poll(async () => alice.page.evaluate(storageKey => {
        const stored = JSON.parse(localStorage.getItem(storageKey) || "null");
        return stored && {
          commandId: stored.command_id,
          needsRetry: stored.needs_retry,
          transfer: stored.payload?.transfer
        };
      }, commandStorageKey(commandId)), { timeout: 5_000 }).toEqual({
        commandId,
        needsRetry: true,
        transfer: prepared.transfer
      });

      await expect.poll(() => resultBarrier.started, { timeout: 15_000 }).toBe(true);
      expect(backend.runtime.snapshotRevision).toBe(snapshotRevisionBeforeCommand);
      expect(backend.stats.telemetryAttempts.filter(
        attempt => attempt.event_id === commandId
      )).toEqual([]);

      // De server heeft de opdracht al geaccepteerd, maar Alice heeft geen
      // response ontvangen. Na herladen herstelt de duurzame command-outbox
      // daarom dezelfde visuele pending batch en post exact hetzelfde id.
      await alice.page.reload();
      await waitForApplication(alice.page, backend, alice.diagnostics);
      await waitForActiveRuntime(alice.page, { controller: false });
      await expect(alice.page.locator("[data-sim-transfer-pending]")).toBeVisible();
      expect(await alice.page.evaluate(() => {
        const controller = window.LEARNGameOMSimulator.getSharedGameController();
        return {
          remoteActionPending: controller.remoteActionPending,
          transferred: controller.transferred,
          taskOrderId: controller.engine.playerTask()?.order?.id || null
        };
      })).toEqual({
        remoteActionPending: true,
        transferred: true,
        taskOrderId: prepared.orderId
      });
      await expect.poll(() => backend.stats.commandPosts.filter(
        post => post.commandId === commandId
      ).length, { timeout: 10_000 }).toBeGreaterThanOrEqual(2);
      const retriedPosts = backend.stats.commandPosts.filter(post => post.commandId === commandId);
      expect(retriedPosts.filter(post => post.commandStatus === "accepted")).toHaveLength(1);
      expect(retriedPosts.slice(1).every(
        post => post.commandStatus === "duplicate_pending"
      )).toBe(true);
      expect(new Set(retriedPosts.map(post => JSON.stringify(post.payload)))).toEqual(
        new Set([JSON.stringify(acceptedPost.payload)])
      );

      const commandResultPuts = backend.stats.runtimePutBodies.filter(body => (
        body.command_results?.some(result => result.command_id === commandId)
      ));
      expect(commandResultPuts).toHaveLength(1);
      expect(commandResultPuts[0]).toMatchObject({
        base_revision: expect.any(Number),
        snapshot: {
          orders: [expect.objectContaining({ id: prepared.orderId, quantity: 3 })]
        },
        applied_command_ids: [],
        command_results: [{
          command_id: commandId,
          status: "applied",
          error_code: null
        }]
      });

      resultBarrier.release();
      await expect.poll(
        () => backend.stats.commandAcknowledgements.get(commandId),
        { timeout: 12_000 }
      ).toBe("applied");
      await expect.poll(
        () => alice.page.evaluate(() => window.LOMMultiplayerRuntime.getState().ownPendingCommandIds),
        { timeout: 12_000 }
      ).toEqual([]);
      expect(await alice.page.evaluate(
        storageKey => localStorage.getItem(storageKey),
        commandStorageKey(commandId)
      )).toBeNull();
      expect(backend.runtime.commandResults.get(commandId)).toMatchObject({
        command_id: commandId,
        member_id: "member-alice",
        status: "applied",
        error_code: null
      });
      expect(backend.runtime.appliedCommandIds.has(commandId)).toBe(true);

      await expect.poll(() => backend.runtime.snapshot?.orders
        ?.find(order => order.id === prepared.orderId)
        ?.history
        ?.filter(item => item.roleId === "operations" && item.type === "transferred")
        .length, { timeout: 12_000 }).toBe(1);
      const finalOrder = backend.runtime.snapshot.orders.find(
        order => order.id === prepared.orderId
      );
      expect(finalOrder.currentRoleId).toBe("srm");
      expect(finalOrder.history.filter(
        item => item.roleId === "operations" && item.type === "player_handling"
      )).toHaveLength(1);
      expect(finalOrder.history.filter(
        item => item.roleId === "operations" && item.type === "transferred"
      )).toEqual([expect.objectContaining(prepared.transfer)]);

      await expect.poll(() => host.page.evaluate(orderId => {
        const regression = window.__operationsBatchRegression;
        return {
          targetEnqueues: regression.enqueues.filter(
            item => item.roleId === "srm" && item.orderId === orderId
          ),
          transferEvents: regression.transfers.filter(
            transfer => transfer?.sourceRoleId === "operations" && transfer?.orderId === orderId
          )
        };
      }, prepared.orderId), { timeout: 12_000 }).toEqual({
        targetEnqueues: [{ roleId: "srm", orderId: prepared.orderId }],
        transferEvents: [prepared.transfer]
      });

      await expect.poll(() => backend.stats.telemetryAttempts.filter(
        attempt => attempt.event_id === commandId && !attempt.failed
      ).length, { timeout: 10_000 }).toBe(1);
      expect(backend.stats.logicalTelemetry.get(commandId)).toMatchObject({
        event_id: commandId,
        person_id: "member-alice",
        action_type: "simulation_role_action_completed"
      });
      await expect.poll(() => alice.page.evaluate(id => (
        window.LEARNGameOMSimulator.getInteractionBuffer().filter(
          event => event.eventID === id
        ).length
      ), commandId), { timeout: 10_000 }).toBe(1);
      expect(await alice.page.evaluate(id => {
        const event = window.LEARNGameOMSimulator.getInteractionBuffer().find(
          candidate => candidate.eventID === id
        );
        return {
          personID: event.personID,
          actionType: event.actionType,
          commandId: event.commandId,
          batchId: event.batchId,
          completedQuantity: event.completedQuantity,
          sourceRoleId: event.sourceRoleId,
          targetRoleId: event.targetRoleId,
          cargoKind: event.cargoKind,
          atomicTransfer: event.atomicTransfer,
          finalDelivery: event.finalDelivery
        };
      }, commandId)).toEqual({
        personID: "member-alice",
        actionType: "simulation_role_action_completed",
        commandId,
        batchId: prepared.orderId,
        completedQuantity: 3,
        sourceRoleId: "operations",
        targetRoleId: "srm",
        cargoKind: "order_information",
        atomicTransfer: true,
        finalDelivery: false
      });
      expect(backend.stats.evilApiRequests).toEqual([]);
      expect(backend.stats.unknownApiRequests).toEqual([]);
    } finally {
      await Promise.all(clients.map(client => client.context.close().catch(() => {})));
    }
  });

  test("window.open deelt de login maar nooit de controller-instance", async ({ browser }) => {
    test.setTimeout(45_000);
    const backend = new StatefulMultiplayerApi();
    const host = await openPerson(browser, backend, "host");

    try {
      await waitForActiveRuntime(host.page, { controller: true });
      const leaderInstanceId = await runtimeInstanceId(host.page);
      const follower = await openPersonPopup(host, backend);
      const followerInstanceId = await runtimeInstanceId(follower.page);

      // De popup heeft aantoonbaar de opener-storage geërfd. De runtime heeft
      // de gekopieerde instance desondanks vervangen door een document-UUID.
      expect(await follower.page.evaluate(() => (
        sessionStorage.getItem("lom.regression.popup-storage-copy")
      ))).toBe("copied-from-opener");
      const documentInstancePattern = new RegExp(
        "^instance-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$",
        "i"
      );
      expect(leaderInstanceId).toMatch(documentInstancePattern);
      expect(followerInstanceId).toMatch(documentInstancePattern);
      expect(followerInstanceId).not.toBe(leaderInstanceId);

      await expect.poll(
        () => follower.page.evaluate(() => window.LOMMultiplayerRuntime.getState()),
        { timeout: 12_000 }
      ).toMatchObject({
        sessionId: PRIMARY_SESSION_ID,
        isController: false,
        controllerMemberId: "member-host"
      });
      expect(await Promise.all([
        host.page.evaluate(() => window.LOMMultiplayerRuntime.getState().isController),
        follower.page.evaluate(() => window.LOMMultiplayerRuntime.getState().isController)
      ])).toEqual([true, false]);
      expect(backend.runtimeContract("host", {}, leaderInstanceId).is_controller).toBe(true);
      expect(backend.runtimeContract("host", {}, followerInstanceId).is_controller).toBe(false);

      const leaderPutsBefore = backend.stats.runtimePutsByInstance.get(leaderInstanceId) || 0;
      const followerPutsBefore = backend.stats.runtimePutsByInstance.get(followerInstanceId) || 0;
      await Promise.all([
        host.page.evaluate(() => window.LOMMultiplayerRuntime.publishSnapshot()),
        follower.page.evaluate(() => window.LOMMultiplayerRuntime.publishSnapshot())
      ]);
      await expect.poll(() => (
        backend.stats.runtimePutsByInstance.get(leaderInstanceId) || 0
      )).toBeGreaterThan(leaderPutsBefore);
      expect(backend.stats.runtimePutsByInstance.get(followerInstanceId) || 0)
        .toBe(followerPutsBefore);

      // Sluiten geeft de lease niet vroegtijdig vrij: vóór expiry blijft de
      // popup follower. Na expiry claimt exact dat document de controllerrol.
      await host.page.close();
      await follower.page.evaluate(() => window.LOMMultiplayerRuntime.poll({ forceRestore: true }));
      expect(await follower.page.evaluate(() => (
        window.LOMMultiplayerRuntime.getState().isController
      ))).toBe(false);
      expect(backend.runtime.controllerInstanceId).toBe(leaderInstanceId);

      backend.forcePrimaryControllerLeaseExpiry();
      await follower.page.evaluate(() => window.LOMMultiplayerRuntime.poll({ forceRestore: true }));
      await expect.poll(
        () => follower.page.evaluate(() => window.LOMMultiplayerRuntime.getState()),
        { timeout: 12_000 }
      ).toMatchObject({
        sessionId: PRIMARY_SESSION_ID,
        isController: true,
        controllerMemberId: "member-host"
      });
      expect(backend.runtime.controllerInstanceId).toBe(followerInstanceId);
      expect(backend.runtimeContract("host", {}, leaderInstanceId).is_controller).toBe(false);
      expect(backend.runtimeContract("host", {}, followerInstanceId).is_controller).toBe(true);

      const followerPutsBeforeTakeover = backend.stats.runtimePutsByInstance.get(
        followerInstanceId
      ) || 0;
      await follower.page.evaluate(() => window.LOMMultiplayerRuntime.publishSnapshot());
      await expect.poll(() => (
        backend.stats.runtimePutsByInstance.get(followerInstanceId) || 0
      )).toBeGreaterThan(followerPutsBeforeTakeover);
      expect(backend.stats.controllerLeaseClaims.filter(
        claim => claim.scope === "primary"
      ).at(-1)).toMatchObject({
        key: "host",
        previousInstanceId: leaderInstanceId,
        instanceId: followerInstanceId
      });
      expect(backend.stats.evilApiRequests).toEqual([]);
      expect(backend.stats.unknownApiRequests).toEqual([]);
    } finally {
      await host.context.close().catch(() => {});
    }
  });
});
