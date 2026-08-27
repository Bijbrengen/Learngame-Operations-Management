(() => {
  "use strict";

  const POLL_INTERVAL_MS = 1200;
  const PUBLISH_DEBOUNCE_MS = 750;
  const COMMAND_RETRY_MS = 1500;
  const COMMAND_STORAGE_PREFIX = "learngame.om.multiplayerCommand.v1:";
  const INSTANCE_STORAGE_KEY = "learngame.om.runtimeInstance.v1";

  function documentUuid() {
    if (typeof globalThis.crypto?.randomUUID === "function") {
      return globalThis.crypto.randomUUID();
    }
    const bytes = new Uint8Array(16);
    if (typeof globalThis.crypto?.getRandomValues === "function") {
      globalThis.crypto.getRandomValues(bytes);
    } else {
      for (let index = 0; index < bytes.length; index += 1) {
        bytes[index] = Math.floor(Math.random() * 256);
      }
    }
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = [...bytes].map(value => value.toString(16).padStart(2, "0"));
    return [
      hex.slice(0, 4).join(""),
      hex.slice(4, 6).join(""),
      hex.slice(6, 8).join(""),
      hex.slice(8, 10).join(""),
      hex.slice(10).join("")
    ].join("-");
  }

  function runtimeInstanceId() {
    // sessionStorage is copied by window.open/duplicate-tab. Reusing a value
    // from it would therefore let two documents present the same controller
    // lease. The in-memory id is always new for this document; storage is only
    // a diagnostic mirror used by support tooling and regression probes.
    const created = `instance-${documentUuid()}`;
    try {
      sessionStorage.setItem(INSTANCE_STORAGE_KEY, created);
    } catch {}
    return created;
  }

  const state = {
    session: null,
    sessionId: null,
    revision: -1,
    snapshotRevision: -1,
    membershipRevision: -1,
    isController: false,
    controllerMemberId: null,
    membershipFingerprint: "",
    pollTimer: null,
    publishTimer: null,
    publishDeadline: 0,
    resyncTimer: null,
    commandRetryTimer: null,
    pollPromise: null,
    startPromise: null,
    publishPromise: null,
    publishDirty: false,
    resyncGeneration: 0,
    resyncedGeneration: 0,
    generation: 0,
    unsubscribe: null,
    restoring: false,
    locallyAppliedCommandIds: new Set(),
    commandResultsToAcknowledge: new Map(),
    ownPendingCommandIds: new Set(),
    pendingCommandRequests: new Map(),
    commandPostPromises: new Map(),
    instanceId: runtimeInstanceId()
  };

  function apiBase() {
    return String(
      window.LeerpretAuth?.getSession?.().apiBase
      || window.LEARNGAME_OM_CONFIG?.apiBase
      || ""
    ).replace(/\/+$/, "");
  }

  function authHeaders() {
    let token = null;
    try {
      token = localStorage.getItem("leerpret.sessionToken");
    } catch {}
    return {
      "Content-Type": "application/json",
      "X-Leerpret-Game-Instance": state.instanceId,
      ...(token ? { "X-Leerpret-Session": token } : {})
    };
  }

  async function request(path, options = {}) {
    const response = await fetch(`${apiBase()}${path}`, {
      cache: "no-store",
      credentials: "include",
      ...options,
      headers: { ...authHeaders(), ...(options.headers || {}) }
    });
    if (!response.ok) {
      let detail = `Gedeelde spelstatus kon niet worden bijgewerkt (${response.status}).`;
      let code = null;
      try {
        const payload = await response.json();
        if (typeof payload?.detail === "string") detail = payload.detail;
        else if (typeof payload?.detail?.message === "string") detail = payload.detail.message;
        else if (typeof payload?.message === "string") detail = payload.message;
        code = payload?.detail?.code || payload?.code || null;
      } catch {}
      const error = new Error(detail);
      error.status = response.status;
      error.code = code;
      throw error;
    }
    return response.json();
  }

  function runtimePath(suffix = "") {
    if (!state.sessionId) throw new Error("Er is geen actieve gedeelde gamesessie.");
    return `/v1/game-sessions/${encodeURIComponent(state.sessionId)}/runtime${suffix}`;
  }

  function currentParticipationIsActive(session = state.session) {
    const participation = session?.participation_status || "active";
    return session?.status === "running" && participation === "active";
  }

  function clearTimers() {
    clearInterval(state.pollTimer);
    clearTimeout(state.publishTimer);
    clearTimeout(state.resyncTimer);
    clearTimeout(state.commandRetryTimer);
    state.pollTimer = null;
    state.publishTimer = null;
    state.publishDeadline = 0;
    state.resyncTimer = null;
    state.commandRetryTimer = null;
  }

  function detachEngine() {
    state.unsubscribe?.();
    state.unsubscribe = null;
  }

  function stop({ keepGameVisible = false } = {}) {
    discardPendingCommands(state.sessionId);
    state.generation += 1;
    clearTimers();
    detachEngine();
    state.pollPromise = null;
    state.startPromise = null;
    state.publishPromise = null;
    state.publishDirty = false;
    state.resyncGeneration = 0;
    state.resyncedGeneration = 0;
    state.revision = -1;
    state.snapshotRevision = -1;
    state.membershipRevision = -1;
    state.isController = false;
    state.controllerMemberId = null;
    state.membershipFingerprint = "";
    state.session = null;
    state.sessionId = null;
    state.locallyAppliedCommandIds.clear();
    state.commandResultsToAcknowledge.clear();
    state.ownPendingCommandIds.clear();
    state.pendingCommandRequests.clear();
    state.commandPostPromises.clear();
    if (!keepGameVisible) window.LEARNGameOMSimulator?.stopSharedGame?.();
  }

  function commandStorageKey(commandId) {
    return `${COMMAND_STORAGE_PREFIX}${encodeURIComponent(commandId)}`;
  }

  function persistPendingCommand(entry) {
    state.pendingCommandRequests.set(entry.command_id, entry);
    state.ownPendingCommandIds.add(entry.command_id);
    try {
      localStorage.setItem(commandStorageKey(entry.command_id), JSON.stringify(entry));
      return true;
    } catch (error) {
      window.dispatchEvent(new CustomEvent("learngame-multiplayer-command-storage-full", {
        detail: { command_id: entry.command_id, retainedInMemory: true, error }
      }));
      console.error("De gedeelde handeling kon niet duurzaam lokaal worden bewaard; deze tab blijft opnieuw proberen.", error);
      return false;
    }
  }

  function removePendingCommand(commandId) {
    state.pendingCommandRequests.delete(commandId);
    state.ownPendingCommandIds.delete(commandId);
    state.commandPostPromises.delete(commandId);
    try { localStorage.removeItem(commandStorageKey(commandId)); } catch {}
  }

  function loadPendingCommands(sessionId, memberId) {
    try {
      for (let index = 0; index < localStorage.length; index += 1) {
        const key = localStorage.key(index);
        if (!key?.startsWith(COMMAND_STORAGE_PREFIX)) continue;
        try {
          const entry = JSON.parse(localStorage.getItem(key) || "null");
          if (entry?.session_id === sessionId && entry?.member_id === memberId && entry?.command_id) {
            state.pendingCommandRequests.set(entry.command_id, entry);
            state.ownPendingCommandIds.add(entry.command_id);
          }
        } catch {}
      }
    } catch {}
  }

  function discardPendingCommands(sessionId) {
    if (!sessionId) return;
    const ids = [...state.pendingCommandRequests.values()]
      .filter(entry => entry.session_id === sessionId)
      .map(entry => entry.command_id);
    try {
      for (let index = localStorage.length - 1; index >= 0; index -= 1) {
        const key = localStorage.key(index);
        if (!key?.startsWith(COMMAND_STORAGE_PREFIX)) continue;
        try {
          const entry = JSON.parse(localStorage.getItem(key) || "null");
          if (entry?.session_id === sessionId && entry?.command_id) ids.push(entry.command_id);
        } catch {}
      }
    } catch {}
    [...new Set(ids)].forEach(removePendingCommand);
  }

  function membershipFingerprint(runtime, session = state.session) {
    if (Array.isArray(runtime?.human_role_ids)) {
      return JSON.stringify({
        current_member_id: session?.current_member_id || null,
        human_role_ids: [...runtime.human_role_ids]
      });
    }
    return JSON.stringify({
      current_member_id: session?.current_member_id || null,
      members: (session?.members || [])
        .filter(member => member?.present !== false)
        .map(member => [member.member_id, member.assigned_role_id])
        .sort((first, second) => String(first[0]).localeCompare(String(second[0])))
    });
  }

  function elapsedSinceSnapshot(runtime) {
    const serverTime = Date.parse(runtime?.server_time || "");
    const snapshotUpdatedAt = Date.parse(runtime?.snapshot_updated_at || "");
    if (!Number.isFinite(serverTime) || !Number.isFinite(snapshotUpdatedAt)) return 0;
    return Math.max(0, serverTime - snapshotUpdatedAt);
  }

  function attachEngine() {
    if (state.unsubscribe) return;
    const controller = window.LEARNGameOMSimulator?.getSharedGameController?.();
    if (!controller?.engine) return;
    state.unsubscribe = controller.engine.subscribe(event => {
      if (state.restoring || !state.isController || !event.snapshot) return;
      if (event.type === "tick" && event.detail?.synchronizationChanged !== true) return;
      schedulePublish(event.type === "tick" ? PUBLISH_DEBOUNCE_MS : 0);
    });
  }

  function restorePendingActionUi() {
    if (!state.ownPendingCommandIds.size) return;
    const controller = window.LEARNGameOMSimulator?.getSharedGameController?.();
    if (!controller || controller.remoteActionPending) return;
    // A document reload reconstructs the durable command outbox before the
    // deferred simulator exists. Mirror that recovered pending state into the
    // action panel after snapshot restoration, so a user cannot resubmit while
    // the idempotent command is still awaiting its authoritative result.
    const task = controller.engine?.playerTask?.();
    const matchingEntry = [...state.ownPendingCommandIds]
      .map(commandId => state.pendingCommandRequests.get(commandId))
      .find(entry => {
        const orderId = entry?.payload?.transfer?.orderId || entry?.payload?._telemetry?.order_id;
        const sourceRoleId = entry?.payload?.transfer?.sourceRoleId || entry?.role_id;
        return task
          && String(orderId || "") === String(task.order?.id || "")
          && String(sourceRoleId || "") === String(task.role?.id || "");
      });
    if (controller.restoreRemoteActionPending?.(matchingEntry?.payload)) return;
    controller.remoteActionPending = true;
    controller.render?.();
  }

  function sharedSnapshot() {
    return window.LEARNGameOMSimulator
      ?.getSharedGameController?.()
      ?.engine?.snapshot?.() || null;
  }

  function schedulePublish(delay = PUBLISH_DEBOUNCE_MS) {
    if (!state.isController || !state.sessionId) return;
    state.publishDirty = true;
    const normalizedDelay = Math.max(0, delay);
    const deadline = Date.now() + normalizedDelay;
    if (state.publishTimer && state.publishDeadline <= deadline) return;
    clearTimeout(state.publishTimer);
    state.publishDeadline = deadline;
    state.publishTimer = setTimeout(() => {
      state.publishTimer = null;
      state.publishDeadline = 0;
      void publishSnapshot();
    }, normalizedDelay);
  }

  function scheduleConflictResync() {
    // Een 409 kan binnenkomen terwijl een andere runtime-GET nog loopt. Een
    // gewone poll-deduplicatie zou de force-restore dan laten verdwijnen. De
    // generaties houden het conflict open totdat een later gestarte, verse GET
    // de server-snapshot daadwerkelijk heeft teruggezet.
    if (state.resyncTimer || !state.sessionId) return;
    state.resyncTimer = setTimeout(() => {
      state.resyncTimer = null;
      if (state.pollPromise) {
        const activePoll = state.pollPromise;
        void activePoll.finally(() => {
          if (state.resyncGeneration > state.resyncedGeneration) {
            scheduleConflictResync();
          }
        });
        return;
      }
      void poll();
    }, 0);
  }

  function resyncAfterConflict() {
    state.locallyAppliedCommandIds.clear();
    state.commandResultsToAcknowledge.clear();
    state.resyncGeneration += 1;
    scheduleConflictResync();
  }

  async function publishSnapshot() {
    if (!state.isController || !state.sessionId) return null;
    if (state.publishPromise) return state.publishPromise;
    const snapshot = sharedSnapshot();
    if (!snapshot) return null;
    state.publishDirty = false;
    const generation = state.generation;
    const sessionId = state.sessionId;
    const baseRevision = state.revision;
    const commandResults = [...state.commandResultsToAcknowledge.values()];
    const resolvedCommandIds = commandResults.map(result => result.command_id);
    const operation = request(runtimePath(), {
      method: "PUT",
      body: JSON.stringify({
        base_revision: baseRevision,
        snapshot,
        applied_command_ids: [],
        command_results: commandResults
      })
    }).then(runtime => {
      if (generation !== state.generation || sessionId !== state.sessionId) return null;
      state.revision = Number(runtime.revision);
      state.snapshotRevision = Math.max(
        state.snapshotRevision,
        Number(runtime.snapshot_revision ?? runtime.revision ?? -1)
      );
      resolvedCommandIds.forEach(commandId => {
        state.locallyAppliedCommandIds.delete(commandId);
        state.commandResultsToAcknowledge.delete(commandId);
      });
      confirmOwnCommands(runtime);
      return runtime;
    }).catch(async error => {
      if (generation !== state.generation || sessionId !== state.sessionId) return null;
      if (error.status === 409 && (!error.code || error.code === "revision_conflict")) {
        resyncAfterConflict();
        return null;
      }
      console.warn("Gedeelde spelstatus publiceren mislukt; er volgt automatisch een nieuwe poging.", error);
      state.publishDirty = true;
      schedulePublish(1000);
      return null;
    }).finally(() => {
      if (state.publishPromise === operation) state.publishPromise = null;
      if (state.commandResultsToAcknowledge.size) schedulePublish(0);
      else if (state.publishDirty) schedulePublish(PUBLISH_DEBOUNCE_MS);
    });
    state.publishPromise = operation;
    return operation;
  }

  async function applyPendingCommands(commands = []) {
    if (!state.isController || !commands.length) return;
    let changed = false;
    for (const command of commands) {
      const commandId = String(command?.command_id || "");
      if (!commandId || state.locallyAppliedCommandIds.has(commandId)) continue;
      const result = window.LEARNGameOMSimulator?.applySharedCommand?.(command);
      state.locallyAppliedCommandIds.add(commandId);
      state.commandResultsToAcknowledge.set(commandId, {
        command_id: commandId,
        status: result?.ok === false ? "rejected" : "applied",
        error_code: result?.ok === false ? commandErrorCode(result) : null
      });
      changed = true;
    }
    if (changed) await publishSnapshot();
  }

  function commandErrorCode(result) {
    const text = Array.isArray(result?.errors) ? result.errors.join(" ").toLowerCase() : "";
    if (text.includes("geen handeling") || text.includes("niet meer") || text.includes("bestaat niet")) {
      return "invalid_state";
    }
    if (text.includes("rol") && (text.includes("onbekend") || text.includes("toegewezen"))) {
      return "role_not_authorized";
    }
    return "invalid_action";
  }

  function commandErrorMessage(errorCode) {
    return {
      invalid_state: "De spelsituatie is inmiddels gewijzigd; voer de actuele rolhandeling opnieuw uit.",
      invalid_action: "De rolhandeling is afgewezen; controleer het actuele formulier en probeer opnieuw.",
      role_not_authorized: "Deze handeling hoort niet bij jouw toegewezen rol.",
      command_conflict: "Deze handeling botst met een inmiddels verwerkte opdracht.",
      unsupported_command: "Deze versie van de game ondersteunt de handeling niet.",
      processing_failed: "De handeling kon niet veilig worden verwerkt; probeer het opnieuw."
    }[errorCode] || "De handeling past niet meer bij de actuele spelsituatie.";
  }

  function confirmOwnCommands(runtime) {
    const applied = new Set(runtime?.applied_command_ids || []);
    const results = new Map((runtime?.command_results || []).map(result => [
      String(result?.command_id || ""),
      result
    ]));
    const confirmed = [];
    for (const commandId of [...state.ownPendingCommandIds]) {
      const result = results.get(commandId);
      const entry = state.pendingCommandRequests.get(commandId);
      if (result?.status === "rejected") {
        dispatchOwnCommandEvent(entry, result);
        removePendingCommand(commandId);
        window.LEARNGameOMSimulator?.rejectSharedAction?.(
          commandId,
          [commandErrorMessage(result.error_code)]
        );
      } else if (applied.has(commandId) || result?.status === "applied") {
        dispatchOwnCommandEvent(entry, result || { status: "applied", error_code: null });
        removePendingCommand(commandId);
        confirmed.push(commandId);
      }
    }
    if (confirmed.length) window.LEARNGameOMSimulator?.confirmSharedAction?.(confirmed);
  }

  function dispatchOwnCommandEvent(entry, resolved) {
    if (!entry?.command_id || !entry?.member_id) return;
    window.dispatchEvent(new CustomEvent("learngame-multiplayer-command-applied", {
      detail: {
        command: {
          command_id: entry.command_id,
          member_id: entry.member_id,
          role_id: entry.role_id || entry.payload?._telemetry?.role_id || null,
          submitted_at: entry.created_at || entry.payload?._telemetry?.timestamp || null,
          payload: entry.payload
        },
        result: resolved?.status === "rejected"
          ? { ok: false, errors: [commandErrorMessage(resolved.error_code)] }
          : { ok: true, errors: [] }
      }
    }));
  }

  function applyRuntime(runtime, { forceRestore = false } = {}) {
    const nextRevision = Number(runtime?.revision ?? -1);
    const nextSnapshotRevision = Number(runtime?.snapshot_revision ?? nextRevision);
    const nextMembershipRevision = Number(runtime?.membership_revision ?? -1);
    const nextController = Boolean(runtime?.is_controller);
    const nextMembershipFingerprint = membershipFingerprint(runtime);
    const membershipChanged = (nextMembershipRevision >= 0 && nextMembershipRevision > state.membershipRevision)
      || nextMembershipFingerprint !== state.membershipFingerprint;
    const controllerChanged = nextController !== state.isController
      || runtime?.controller_member_id !== state.controllerMemberId;
    const hasSnapshot = Array.isArray(runtime?.snapshot?.orders);
    const shouldRestore = hasSnapshot && (
      forceRestore
      || nextSnapshotRevision > state.snapshotRevision
      || controllerChanged
      || membershipChanged
      || !sharedSnapshot()
    );
    state.controllerMemberId = runtime?.controller_member_id || null;
    state.isController = nextController;
    if (shouldRestore) {
      state.restoring = true;
      try {
        window.LEARNGameOMSimulator?.startSharedGame?.(state.session, {
          isController: nextController,
          snapshot: runtime.snapshot,
          humanRoleIds: runtime.human_role_ids,
          elapsedSinceSnapshotMs: elapsedSinceSnapshot(runtime)
        });
      } finally {
        state.restoring = false;
      }
    } else if (forceRestore || controllerChanged || membershipChanged || !sharedSnapshot()) {
      window.LEARNGameOMSimulator?.startSharedGame?.(state.session, {
        isController: nextController,
        snapshot: null,
        humanRoleIds: runtime.human_role_ids
      });
    }
    state.revision = Math.max(state.revision, nextRevision);
    state.snapshotRevision = Math.max(state.snapshotRevision, nextSnapshotRevision);
    state.membershipRevision = Math.max(state.membershipRevision, nextMembershipRevision);
    state.membershipFingerprint = nextMembershipFingerprint;
    confirmOwnCommands(runtime);
    attachEngine();
    window.LEARNGameOMSimulator?.setSharedActionSubmitter?.(submitPlayerAction);
    restorePendingActionUi();
    return runtime;
  }

  async function poll({ forceRestore = false } = {}) {
    if (!currentParticipationIsActive() || !state.sessionId) return null;
    if (state.pollPromise) {
      if (!forceRestore) return state.pollPromise;
      const activePoll = state.pollPromise;
      return activePoll.then(() => poll({ forceRestore: true }));
    }
    const generation = state.generation;
    const sessionId = state.sessionId;
    const path = runtimePath();
    const requestedResyncGeneration = state.resyncGeneration;
    const restoringConflict = requestedResyncGeneration > state.resyncedGeneration;
    const localEngineStarted = Boolean(
      window.LEARNGameOMSimulator?.getSharedGameController?.()?.engine?.started
    );
    // game-sessions.js can discover the running session before the deferred
    // simulator bundle has exposed startSharedGame. Keep restoration pending
    // until the local engine really started; a consumed network revision alone
    // is not evidence that the browser applied its authoritative snapshot.
    const shouldForceRestore = forceRestore || restoringConflict || !localEngineStarted;
    const operation = request(path)
      .then(async runtime => {
        if (generation !== state.generation || sessionId !== state.sessionId) return null;
        applyRuntime(runtime, { forceRestore: shouldForceRestore });
        if (restoringConflict) {
          state.resyncedGeneration = Math.max(
            state.resyncedGeneration,
            requestedResyncGeneration
          );
        }
        const conflictStillPending = state.resyncGeneration > state.resyncedGeneration;
        if (state.isController && !conflictStillPending) {
          await applyPendingCommands(runtime.pending_commands || []);
          if (!Array.isArray(runtime?.snapshot?.orders)) schedulePublish(0);
        }
        window.dispatchEvent(new CustomEvent("learngame-multiplayer-runtime", {
          detail: { ...runtime, session: state.session }
        }));
        return runtime;
      })
      .catch(error => {
        if (generation !== state.generation || sessionId !== state.sessionId) return null;
        if (![401, 403, 404].includes(error.status)) {
          console.warn("Gedeelde spelstatus verversen mislukt; de vorige versie blijft zichtbaar.", error);
        }
        return null;
      })
      .finally(() => {
        if (state.pollPromise === operation) state.pollPromise = null;
        if (state.resyncGeneration > state.resyncedGeneration) scheduleConflictResync();
      });
    state.pollPromise = operation;
    return operation;
  }

  function commandFingerprint(sessionId, memberId, payload) {
    const stablePayload = {
      ...payload,
      ...(payload?._telemetry ? {
        _telemetry: { ...payload._telemetry, timestamp: undefined }
      } : {})
    };
    return JSON.stringify([sessionId, memberId, stablePayload]);
  }

  function scheduleCommandRetry(delay = COMMAND_RETRY_MS) {
    clearTimeout(state.commandRetryTimer);
    state.commandRetryTimer = setTimeout(() => {
      state.commandRetryTimer = null;
      void flushPendingCommands();
    }, Math.max(0, delay));
  }

  async function postPendingCommand(entry) {
    if (!entry || entry.session_id !== state.sessionId || !currentParticipationIsActive()) {
      return { ok: false, errors: ["Je bent geen actieve speler in deze gamesessie."] };
    }
    if (state.commandPostPromises.has(entry.command_id)) {
      return state.commandPostPromises.get(entry.command_id);
    }
    const generation = state.generation;
    const operation = (async () => {
      try {
        const runtime = await request(runtimePath("/commands"), {
          method: "POST",
          body: JSON.stringify({ command_id: entry.command_id, payload: entry.payload })
        });
        if (generation !== state.generation || entry.session_id !== state.sessionId) {
          return { ok: false, errors: ["De gamesessie is tijdens de handeling gewijzigd."] };
        }
        entry.needs_retry = false;
        entry.attempts = Number(entry.attempts || 0) + 1;
        entry.last_attempt_at = new Date().toISOString();
        persistPendingCommand(entry);
        confirmOwnCommands(runtime);
        const resolved = (runtime?.command_results || []).find(result => (
          result?.command_id === entry.command_id
        ));
        if (runtime?.command_status === "duplicate_rejected" || resolved?.status === "rejected") {
          removePendingCommand(entry.command_id);
          return { ok: false, errors: [commandErrorMessage(resolved?.error_code)] };
        }
        if (runtime?.command_status === "duplicate_applied") {
          removePendingCommand(entry.command_id);
          window.LEARNGameOMSimulator?.confirmSharedAction?.([entry.command_id]);
        }
        void poll();
        return {
          ok: true,
          queued: true,
          command_id: entry.command_id,
          message: runtime?.command_status === "duplicate_applied"
            ? "Deze handeling was al verwerkt."
            : runtime?.command_status === "duplicate_pending"
              ? "Deze handeling was al ontvangen en wordt verwerkt."
              : "Handeling ontvangen; alle spelers worden gesynchroniseerd."
        };
      } catch (error) {
        if (generation !== state.generation || entry.session_id !== state.sessionId) {
          return { ok: false, errors: ["De gamesessie is tijdens de handeling gewijzigd."] };
        }
        const definitive = [400, 401, 403, 404, 409, 422].includes(error.status);
        if (definitive) {
          removePendingCommand(entry.command_id);
          return { ok: false, errors: [error.message] };
        }
        entry.needs_retry = true;
        entry.attempts = Number(entry.attempts || 0) + 1;
        entry.last_error = String(error?.message || error);
        entry.last_attempt_at = new Date().toISOString();
        persistPendingCommand(entry);
        scheduleCommandRetry();
        return {
          ok: true,
          queued: true,
          retrying: true,
          command_id: entry.command_id,
          message: "Handeling lokaal bewaard; dezelfde opdracht wordt automatisch opnieuw aangeboden."
        };
      }
    })().finally(() => {
      if (state.commandPostPromises.get(entry.command_id) === operation) {
        state.commandPostPromises.delete(entry.command_id);
      }
    });
    state.commandPostPromises.set(entry.command_id, operation);
    return operation;
  }

  async function flushPendingCommands() {
    const pending = [...state.pendingCommandRequests.values()]
      .filter(entry => entry.session_id === state.sessionId && entry.needs_retry !== false);
    for (const entry of pending) await postPendingCommand(entry);
  }

  async function submitPlayerAction(payload, telemetry = {}) {
    if (!currentParticipationIsActive()) {
      return { ok: false, errors: ["Je bent geen actieve speler in deze gamesessie."] };
    }
    const memberId = String(state.session?.current_member_id || "member");
    const submittedAt = new Date().toISOString();
    const transfer = payload?.transfer && typeof payload.transfer === "object"
      ? payload.transfer
      : null;
    const commandPayload = {
      ...payload,
      _telemetry: {
        action_type: String(telemetry.action_type || "simulation_player_action"),
        learning_object_id: String(telemetry.learning_object_id || `lom.role.${telemetry.role_id || "unknown"}`),
        order_id: telemetry.order_id == null ? null : String(telemetry.order_id),
        product_id: telemetry.product_id == null ? null : String(telemetry.product_id),
        batch_id: transfer?.batchId == null ? null : String(transfer.batchId),
        quantity: transfer?.quantity == null ? null : Number(transfer.quantity),
        source_role_id: transfer?.sourceRoleId == null ? null : String(transfer.sourceRoleId),
        target_role_id: transfer?.targetRoleId == null ? null : String(transfer.targetRoleId),
        cargo_kind: transfer?.cargoKind == null ? null : String(transfer.cargoKind),
        atomic_transfer: transfer?.atomicTransfer == null ? null : Boolean(transfer.atomicTransfer),
        final_delivery: transfer?.finalDelivery == null ? null : Boolean(transfer.finalDelivery),
        timestamp: submittedAt
      }
    };
    const fingerprint = commandFingerprint(state.sessionId, memberId, commandPayload);
    let entry = [...state.pendingCommandRequests.values()].find(candidate => (
      candidate.session_id === state.sessionId
      && candidate.member_id === memberId
      && candidate.fingerprint === fingerprint
    ));
    if (!entry) {
      const randomId = crypto.randomUUID?.()
        || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
      const commandId = `${state.sessionId}:${memberId}:${randomId}`;
      entry = {
        command_id: commandId,
        session_id: state.sessionId,
        member_id: memberId,
        fingerprint,
        payload: commandPayload,
        role_id: telemetry.role_id == null ? null : String(telemetry.role_id),
        attempts: 0,
        needs_retry: true,
        created_at: submittedAt
      };
      persistPendingCommand(entry);
    }
    return postPendingCommand(entry);
  }

  async function handleSessionStarted(session) {
    if (!session?.session_id || !currentParticipationIsActive(session)) return;
    if (state.sessionId && state.sessionId !== session.session_id) stop();
    if (!state.sessionId) state.generation += 1;
    state.session = session;
    state.sessionId = session.session_id;
    loadPendingCommands(state.sessionId, String(session.current_member_id || "member"));
    if ([...state.pendingCommandRequests.values()].some(entry => entry.needs_retry !== false)) {
      scheduleCommandRetry(0);
    }
    if (!state.pollTimer) state.pollTimer = setInterval(() => void poll(), POLL_INTERVAL_MS);
    if (state.startPromise) return state.startPromise;
    const operation = poll({ forceRestore: state.revision < 0 }).finally(() => {
      if (state.startPromise === operation) state.startPromise = null;
    });
    state.startPromise = operation;
    return operation;
  }

  window.addEventListener("learngame-session-state", event => {
    const session = event.detail?.session || null;
    state.session = session;
    if (currentParticipationIsActive(session)) {
      void handleSessionStarted(session);
      return;
    }
    if (state.sessionId) stop();
    state.sessionId = session?.session_id || null;
  });

  window.addEventListener("online", () => {
    void poll({ forceRestore: true });
    void flushPendingCommands();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void poll({ forceRestore: true });
  });

  window.LOMMultiplayerRuntime = Object.freeze({
    handleSessionStarted,
    poll,
    publishSnapshot,
    submitPlayerAction,
    stop,
    getState: () => ({
      sessionId: state.sessionId,
      revision: state.revision,
      snapshotRevision: state.snapshotRevision,
      membershipRevision: state.membershipRevision,
      isController: state.isController,
      controllerMemberId: state.controllerMemberId,
      locallyAppliedCommandIds: [...state.locallyAppliedCommandIds],
      ownPendingCommandIds: [...state.ownPendingCommandIds]
    })
  });
})();
