(() => {
  "use strict";

  const ROLE_LABELS = {
    customer1: "Klant 1",
    customer2: "Klant 2",
    customer3: "Klant 3",
    customer4: "Klant 4",
    opr: "Operations Manager",
    srm: "Magazijn Grondstoffen",
    pd1: "Productie Afdeling 1",
    pd2: "Productie Afdeling 2",
    pd3: "Productie Afdeling 3",
    mfp: "Magazijn Gereed Product"
  };
  const TYPE_LABELS = {
    closed: "Gesloten",
    open: "Open",
    semi_closed: "Semi-gesloten"
  };
  const state = {
    authenticated: false,
    apiBase: "",
    availability: null,
    session: null,
    busy: false,
    mutationVersion: 0,
    pollTimer: null,
    startedSessionId: null
  };

  const elements = () => ({
    playerPanel: document.getElementById("playerSessionPanel"),
    playerUtilityActions: document.querySelector(".player-utility-actions"),
    playerTitle: document.getElementById("playerSessionTitle"),
    playerContent: document.getElementById("playerSessionContent"),
    playerBadge: document.getElementById("playerSessionBadge"),
    managerContent: document.getElementById("managerSessionContent"),
    managerBadge: document.getElementById("managerSessionBadge"),
    createForm: document.getElementById("gameSessionCreateForm"),
    sessionType: document.getElementById("gameSessionType"),
    dialog: document.getElementById("gameConsensusDialog"),
    dialogSummary: document.getElementById("gameConsensusSummary"),
    waitButton: document.getElementById("gameConsensusWaitButton"),
    startButton: document.getElementById("gameConsensusStartButton")
  });

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  async function request(path, options = {}) {
    const response = await fetch(`${state.apiBase}${path}`, {
      cache: "no-store",
      credentials: "include",
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      ...options
    });
    if (!response.ok) {
      const fallback = `De gamesessie kon niet worden bijgewerkt (${response.status}).`;
      let message = fallback;
      try {
        const raw = await response.text();
        const payload = raw ? JSON.parse(raw) : null;
        if (typeof payload?.detail === "string") {
          message = payload.detail;
        } else if (Array.isArray(payload?.detail)) {
          message = payload.detail.map(item => item?.msg).filter(Boolean).join(" · ") || fallback;
        } else if (raw && !raw.trim().startsWith("<")) {
          message = raw;
        }
      } catch {
        // Keep the status-bearing fallback.
      }
      throw new Error(message);
    }
    return response.json();
  }

  function roleLabel(roleId) {
    return ROLE_LABELS[roleId] || roleId || "Geen actieve rol";
  }

  function memberCards(session) {
    const cards = session.members.map(member => `
      <li>
        <span class="session-member-token">${escapeHtml(roleLabel(member.assigned_role_id).slice(0, 2).toUpperCase())}</span>
        <span>
          <strong>${escapeHtml(roleLabel(member.assigned_role_id))}</strong>
          <small>${member.member_id === session.game_master_member_id ? "Game Master · " : ""}speler aanwezig</small>
        </span>
      </li>
    `);
    (session.virtual_agents || []).forEach(agent => {
      cards.push(`
        <li class="is-agent">
          <span class="session-member-token">AI</span>
          <span><strong>${escapeHtml(roleLabel(agent.role_id))}</strong><small>virtuele agent</small></span>
        </li>
      `);
    });
    return cards.join("");
  }

  function gameMasterRoleMarkup(session) {
    if (!session.is_game_master || session.status === "running") return "";
    const currentMember = session.members.find(
      member => member.member_id === session.current_member_id
    );
    const occupiedRoles = new Map(
      session.members.map(member => [member.assigned_role_id, member.member_id])
    );
    const options = session.required_role_ids.map(roleId => {
      const isCurrent = roleId === currentMember?.assigned_role_id;
      const isOccupiedByOther = occupiedRoles.has(roleId)
        && occupiedRoles.get(roleId) !== session.current_member_id;
      const suffix = isCurrent ? " (jouw huidige rol)" : isOccupiedByOther ? " (rolruil)" : "";
      return `<option value="${escapeHtml(roleId)}"${isCurrent ? " selected" : ""}>${escapeHtml(roleLabel(roleId) + suffix)}</option>`;
    }).join("");
    return `
      <div class="game-master-role-form">
        <label>
          <span>Jouw spelersrol</span>
          <select name="role_id" data-game-master-role-select>${options}</select>
        </label>
        <small>De keuze wordt direct opgeslagen. Kies je een bezette rol, dan krijgt die speler automatisch jouw huidige rol.</small>
      </div>
    `;
  }

  function sessionMarkup(session, context) {
    const vacancies = session.role_vacancies || [];
    const running = session.status === "running";
    if (context === "player" && running) {
      const currentMember = session.members.find(
        member => member.member_id === session.current_member_id
      );
      const assignedRole = roleLabel(currentMember?.assigned_role_id);
      return `
        <div class="player-running-session">
          <span class="session-member-token">${escapeHtml(assignedRole.slice(0, 2).toUpperCase())}</span>
          <span>
            <strong>${escapeHtml(assignedRole)}</strong>
            <small>Gamesessie gestart${session.virtual_agents?.length ? ` · ${session.virtual_agents.length} virtuele agents actief` : ""}</small>
          </span>
        </div>
      `;
    }
    const canRequest = !running && (!session.consensus || session.consensus.status !== "open");
    return `
      <div class="active-game-session">
        <div class="game-code-block">
          <span>Gamecode</span>
          <strong>${escapeHtml(session.join_code)}</strong>
          <button type="button" data-copy-game-code="${escapeHtml(session.join_code)}">Kopieer code</button>
        </div>
        <div class="session-facts">
          <span>${escapeHtml(TYPE_LABELS[session.session_type])}</span>
          <span>${session.members.length}/${session.required_role_ids.length} spelers</span>
          <span>${session.is_game_master ? "Jij bent Game Master" : "Game Master aanwezig"}</span>
        </div>
        ${gameMasterRoleMarkup(session)}
        <ul class="session-member-list">${memberCards(session)}</ul>
        ${vacancies.length ? `
          <div class="session-vacancies">
            <strong>Nog niet bezet</strong>
            <p>${vacancies.map(roleLabel).map(escapeHtml).join(" · ")}</p>
          </div>
        ` : ""}
        ${running ? `
          <p class="session-running-message">De gamesessie is gestart${session.virtual_agents?.length ? ` met ${session.virtual_agents.length} virtuele agents` : ""}.</p>
        ` : canRequest ? `
          <button class="primary-button" type="button" data-request-game-start>
            ${vacancies.length ? "Verzoek om nu te starten" : "Game starten"}
          </button>
        ` : `
          <p class="session-vote-progress">Startverzoek loopt: ${session.consensus.approved_member_ids.length}/${session.consensus.required_member_ids.length} akkoord.</p>
        `}
        ${context === "manager" && session.is_game_master ? `
          <button class="session-finish-button" type="button" data-finish-game-session>Sessie sluiten</button>
        ` : ""}
        ${context === "manager" ? "<small>Nieuwe sessies kunnen uitsluitend vanuit deze beheerpagina worden aangemaakt.</small>" : ""}
      </div>
    `;
  }

  function availableMarkup(availability) {
    const games = availability?.discoverable_sessions || availability?.open_sessions || [];
    return `
      <form class="game-code-join-form" data-game-code-join>
        <label>
          <span>Gamecode</span>
          <input name="join_code" minlength="6" maxlength="10" autocomplete="off" placeholder="Bijv. A1B2C3" required>
        </label>
        <button class="primary-button" type="submit">Deelnemen</button>
      </form>
      ${games.length ? `
        <div class="open-game-list">
          <strong>Open games met plek</strong>
          ${games.map(game => game.session_type === "open" ? `
            <button type="button" data-join-session="${escapeHtml(game.session_id)}">
              <span>${escapeHtml(TYPE_LABELS[game.session_type])} sessie</span>
              <strong>${game.member_count}/${game.capacity} spelers</strong>
              <small>${game.available_places} plaatsen vrij</small>
            </button>
          ` : `
            <div class="discoverable-game">
              <span>${escapeHtml(TYPE_LABELS[game.session_type])} sessie</span>
              <strong>${game.member_count}/${game.capacity} spelers</strong>
              <small>Gebruik de gedeelde gamecode om deel te nemen.</small>
            </div>
          `).join("")}
        </div>
      ` : `
        <p class="no-open-games">Er is nu geen open game met een vrije plek.</p>
      `}
      ${availability?.can_start_free_game ? `
        <button class="free-game-button" type="button" data-start-free-game>
          <strong>Vrije game starten</strong>
          <span>Je wordt automatisch Game Master van de nieuwe sessie.</span>
        </button>
      ` : ""}
    `;
  }

  function renderConsensus() {
    const els = elements();
    const consensus = state.session?.consensus;
    const memberId = state.session?.current_member_id;
    const mustVote = consensus?.status === "open"
      && consensus.required_member_ids.includes(memberId)
      && !consensus.approved_member_ids.includes(memberId);
    els.dialog.hidden = !mustVote;
    if (!mustVote) return;
    els.dialogSummary.textContent = `${state.session.role_vacancies.length} ontbrekende rollen worden alleen na ieders akkoord door agents ingevuld.`;
  }

  function placePlayerSessionPanel(running) {
    const els = elements();
    if (!els.playerPanel || !els.playerUtilityActions) return;
    if (running) {
      const characterButton = els.playerUtilityActions.querySelector("[data-character-edit]");
      els.playerPanel.classList.add("is-utility-session");
      els.playerUtilityActions.insertBefore(els.playerPanel, characterButton);
      return;
    }
    els.playerPanel.classList.remove("is-utility-session");
    els.playerUtilityActions.after(els.playerPanel);
  }

  function render() {
    const els = elements();
    if (!state.authenticated) return;
    if (state.session) {
      placePlayerSessionPanel(state.session.status === "running");
      els.playerTitle.textContent = state.session.status === "running"
        ? "Jouw actieve gamesessie"
        : "Lobby van jouw gamesessie";
      els.playerBadge.textContent = state.session.status === "running" ? "Gestart" : "In lobby";
      els.managerBadge.textContent = state.session.is_game_master ? "Game Master" : "Deelnemer";
      els.playerContent.innerHTML = sessionMarkup(state.session, "player");
      els.managerContent.innerHTML = sessionMarkup(state.session, "manager");
      if (state.session.status === "running" && state.startedSessionId !== state.session.session_id) {
        state.startedSessionId = state.session.session_id;
        window.dispatchEvent(new CustomEvent("learngame-session-started", {
          detail: { session: state.session }
        }));
      }
    } else {
      placePlayerSessionPanel(false);
      els.playerTitle.textContent = "Neem deel aan een gamesessie";
      els.playerBadge.textContent = "Geen sessie";
      els.managerBadge.textContent = "Geen sessie";
      els.playerContent.innerHTML = availableMarkup(state.availability);
      els.managerContent.innerHTML = `
        <form id="gameSessionCreateForm" class="game-session-create-form">
          <label>
            <span>Toegang</span>
            <select id="gameSessionType">
              <option value="closed">Gesloten · alleen met gamecode</option>
              <option value="open">Open · zichtbaar en direct deelnemen</option>
              <option value="semi_closed">Semi-gesloten · zichtbaar, code vereist</option>
            </select>
          </label>
          <button class="primary-button" type="submit">Sessie aanmaken</button>
        </form>
        <p class="manager-create-note">Alleen hier, in Beheer, kan een reguliere gamesessie worden aangemaakt.</p>
      `;
    }
    renderConsensus();
    window.dispatchEvent(new CustomEvent("learngame-session-state", {
      detail: {
        session: state.session,
        running: state.session?.status === "running"
      }
    }));
  }

  async function refresh() {
    if (!state.authenticated || state.busy) return;
    const refreshVersion = state.mutationVersion;
    try {
      const availability = await request("/v1/game-sessions/availability");
      if (refreshVersion !== state.mutationVersion) return;
      state.availability = availability;
      state.session = availability.current_session;
      render();
    } catch (error) {
      if (!state.session) {
        elements().playerContent.innerHTML = `<p class="session-error">${escapeHtml(error.message)}</p>`;
      } else {
        console.warn("Gamesessie verversen mislukt:", error);
      }
    }
  }

  async function mutate(path, body) {
    if (state.busy) return;
    state.busy = true;
    state.mutationVersion += 1;
    try {
      state.session = await request(path, {
        method: "POST",
        body: body === undefined ? undefined : JSON.stringify(body)
      });
      if (state.session.status === "finished") {
        state.session = null;
      }
      render();
      try {
        await refreshAfterMutation();
      } catch (refreshError) {
        // De mutatie is al bevestigd door de server. Houd dat resultaat
        // zichtbaar en meld een mislukte naverfrissing niet als mislukte actie.
        console.warn("Gamesessie is bijgewerkt, maar verversen mislukte:", refreshError);
      }
    } catch (error) {
      window.alert(error.message);
    } finally {
      state.busy = false;
    }
  }

  async function refreshAfterMutation() {
    state.availability = await request("/v1/game-sessions/availability");
    state.session = state.availability.current_session;
    render();
  }

  function wire() {
    document.addEventListener("submit", event => {
      if (event.target.matches("#gameSessionCreateForm")) {
        event.preventDefault();
        const type = event.target.querySelector("#gameSessionType")?.value || "closed";
        mutate("/v1/game-sessions", { session_type: type });
      }
      if (event.target.matches("[data-game-code-join]")) {
        event.preventDefault();
        const code = new FormData(event.target).get("join_code");
        mutate("/v1/game-sessions/join", { join_code: String(code || "").toUpperCase() });
      }
    });
    document.addEventListener("change", event => {
      if (!event.target.matches("[data-game-master-role-select]") || !state.session) return;
      mutate(
        `/v1/game-sessions/${encodeURIComponent(state.session.session_id)}/game-master-role`,
        { role_id: String(event.target.value || "") }
      );
    });
    document.addEventListener("click", event => {
      const target = event.target.closest("button");
      if (!target) return;
      if (target.dataset.joinSession) {
        mutate("/v1/game-sessions/join", { session_id: target.dataset.joinSession });
      } else if (target.hasAttribute("data-start-free-game")) {
        mutate("/v1/game-sessions/free");
      } else if (target.hasAttribute("data-request-game-start") && state.session) {
        mutate(`/v1/game-sessions/${encodeURIComponent(state.session.session_id)}/start-requests`);
      } else if (target.hasAttribute("data-finish-game-session") && state.session) {
        if (window.confirm("Wil je deze gamesessie sluiten?")) {
          mutate(`/v1/game-sessions/${encodeURIComponent(state.session.session_id)}/finish`);
        }
      } else if (target.dataset.copyGameCode) {
        navigator.clipboard?.writeText(target.dataset.copyGameCode);
        target.textContent = "Gekopieerd";
      }
    });
    elements().waitButton?.addEventListener("click", () => {
      if (state.session) mutate(`/v1/game-sessions/${encodeURIComponent(state.session.session_id)}/consensus`, { decision: "wait" });
    });
    elements().startButton?.addEventListener("click", () => {
      if (state.session) mutate(`/v1/game-sessions/${encodeURIComponent(state.session.session_id)}/consensus`, { decision: "start_with_agents" });
    });
    window.addEventListener("leerpret-auth-changed", event => {
      state.authenticated = Boolean(event.detail?.authenticated);
      state.apiBase = event.detail?.apiBase || "";
      if (!state.authenticated) return;
      refresh();
      clearInterval(state.pollTimer);
      state.pollTimer = setInterval(refresh, 3000);
    });
  }

  wire();
})();
