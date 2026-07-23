(() => {
  "use strict";

  const STORAGE_KEY = "learngame-om.behavior-profile.v1";
  const PROFILE_ENDPOINT = "/v1/player/behavior-profile";
  const AXES = ["Daadkracht", "Dynamiek", "Verbinding", "Structuur"];
  const ARCHETYPES = ["Initiator", "Inspirator", "Verbinder", "Analist"];
  const TRAIT_GROUPS = [
    [
      ["competitive_wants_to_win", "Competitief, wil winnen"],
      ["quick_fast", "Snel, vlug"],
      ["cooperative_collaborative", "Coöperatief, samenwerkend"],
      ["rational_well_thought_out", "Rationeel, weloverwogen"]
    ],
    [
      ["powerful_strong", "Krachtig, sterk"],
      ["narrative_storytelling", "Vertellend, verhalend"],
      ["patient_calm", "Geduldig, kalm"],
      ["argumentative_reasoning", "Argumenterend, redenerend"]
    ],
    [
      ["alert_very_attentive", "Alert, zeer oplettend"],
      ["relativizing_sees_relativity", "Relativerend, ziet betrekkelijkheid"],
      ["tactful_diplomatic", "Tactvol, diplomatiek"],
      ["investigative_analytical", "Onderzoekend, analytisch"]
    ],
    [
      ["competitive_wants_to_be_best", "Competitief, wil de beste zijn"],
      ["environmentally_aware_observant", "Omgevingsbewust, opmerkzaam"],
      ["quiet_calm", "Rustig, kalm"],
      ["methodical_systematic", "Methodisch, systematisch"]
    ],
    [
      ["ambitious_driven", "Ambitieus, gedreven"],
      ["enthusiastic_full_of_passion", "Enthousiast, vol passie"],
      ["caring_attentive", "Zorgzaam, attent"],
      ["analytical_dissecting", "Analytisch, ontledend"]
    ],
    [
      ["decisive_resolute", "Besluitvaardig, resoluut"],
      ["agile_dynamic", "Wendbaar, dynamisch"],
      ["cooperative_supportive", "Coöperatief, ondersteunend"],
      ["logical_clear", "Logisch, helder"]
    ],
    [
      ["initiating_self_starter", "Initiërend, zelfstarter"],
      ["easy_going_simple", "Gemakkelijk, ongecompliceerd"],
      ["empathetic_understanding", "Empathisch, begripvol"],
      ["systematic_orderly", "Systematisch, ordelijk"]
    ],
    [
      ["entrepreneurial_starts_new_things", "Ondernemend, start nieuwe dingen"],
      ["energetic_full_of_energy", "Energiek, vol energie"],
      ["harmonious_unified", "Harmonieus, eensgezind"],
      ["consistent_steadfast", "Consistent, standvastig"]
    ],
    [
      ["leading_guiding", "Leidend, sturend"],
      ["influential_persuasive", "Invloedrijk, overtuigend"],
      ["supportive_helpful", "Ondersteunend, behulpzaam"],
      ["thorough_meticulous", "Grondig, nauwgezet"]
    ],
    [
      ["goal_oriented_focused", "Doelgericht, gefocust"],
      ["socially_skilled_communicative", "Sociaal vaardig, communicatief"],
      ["modest_reserved", "Bescheiden, terughoudend"],
      ["substantial_serious", "Degelijk, serieus"]
    ]
  ];

  const freshAllocations = () => TRAIT_GROUPS.map(() => [0, 0, 0, 0]);
  const state = {
    phase: "identity",
    category: 0,
    player: { first_name: "", surname: "", gender: "", email: "" },
    allocations: { basic_style: freshAllocations(), response_style: freshAllocations() },
    submitting: false,
    submitError: "",
    apiBase: "",
    mounted: false
  };

  let mount = null;
  let gate = null;

  function scanKey() {
    return state.phase === "response" ? "response_style" : "basic_style";
  }

  function categoryTotal(scan = scanKey(), index = state.category) {
    return state.allocations[scan][index].reduce((sum, value) => sum + value, 0);
  }

  function completedCount(scan) {
    return state.allocations[scan].filter((_, index) => categoryTotal(scan, index) === 20).length;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function radarValues() {
    const scores = [0, 0, 0, 0];
    const scan = scanKey();
    const answered = state.allocations[scan].filter(values => values.some(value => value > 0));
    if (!answered.length) return scores;
    answered.forEach(values => {
      values.forEach((value, axis) => {
        scores[axis] += scan === "basic_style" ? 10 - value : value;
      });
    });
    return scores.map(score => Math.max(0, Math.min(100, score / (answered.length * 10) * 100)));
  }

  function radarMarkup() {
    const values = radarValues();
    const center = 110;
    const radius = 76;
    const point = (axis, fraction) => {
      const angle = (-90 + axis * 90) * Math.PI / 180;
      return `${center + Math.cos(angle) * radius * fraction},${center + Math.sin(angle) * radius * fraction}`;
    };
    const polygon = values.map((value, axis) => point(axis, value / 100)).join(" ");
    const leader = values.indexOf(Math.max(...values));
    return `
      <div class="behavior-radar-card">
        <div>
          <span class="behavior-kicker">Live archetype</span>
          <strong>${ARCHETYPES[leader]}</strong>
        </div>
        <svg class="behavior-radar" viewBox="0 0 220 220" role="img" aria-label="Live gedragsprofiel">
          <polygon class="radar-grid" points="${[0, 1, 2, 3].map(axis => point(axis, 1)).join(" ")}"></polygon>
          <polygon class="radar-grid radar-grid-inner" points="${[0, 1, 2, 3].map(axis => point(axis, .5)).join(" ")}"></polygon>
          ${[0, 1, 2, 3].map(axis => `<line x1="110" y1="110" x2="${point(axis, 1).replace(",", '" y2="')}"></line>`).join("")}
          <polygon class="radar-value" points="${polygon}"></polygon>
          ${AXES.map((label, axis) => {
            const [x, y] = point(axis, 1.23).split(",");
            return `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="middle">${label}</text>`;
          }).join("")}
        </svg>
        <p>Dit profiel is een voorlopige visualisatie en geen beoordeling.</p>
      </div>`;
  }

  function phaseHeader() {
    const active = state.phase === "identity" ? 1 : state.phase === "basic" ? 2 : 3;
    return `
      <header class="character-header">
        <div class="character-emblem" aria-hidden="true">OM</div>
        <div>
          <p class="behavior-kicker">Operations Simulation · Character Creation</p>
          <h1 id="characterCreationTitle">Stel je operationele avatar samen</h1>
        </div>
        <ol class="character-phases" aria-label="Voortgang">
          ${["Identiteit", "Basisstijl", "Drukproef"].map((label, index) => `
            <li class="${index + 1 === active ? "is-active" : ""} ${index + 1 < active ? "is-complete" : ""}">
              <span>${index + 1}</span>${label}
            </li>`).join("")}
        </ol>
      </header>`;
  }

  function identityMarkup() {
    return `
      <div class="character-stage identity-stage">
        <div class="character-copy">
          <span class="behavior-kicker">Fase 1 · Origin & Identity</span>
          <h2>Definieer je kernprofiel</h2>
          <p>Leg de basis van je avatar vast voordat je de operationele simulatie betreedt.</p>
          <div class="identity-avatar" aria-hidden="true"><span></span></div>
        </div>
        <form id="characterIdentityForm" class="identity-form">
          <label>Voornaam
            <input name="first_name" autocomplete="given-name" required value="${escapeHtml(state.player.first_name)}">
          </label>
          <label>Achternaam
            <input name="surname" autocomplete="family-name" required value="${escapeHtml(state.player.surname)}">
          </label>
          <label>Gender
            <select name="gender" required>
              <option value="">Kies…</option>
              ${[["M", "Man"], ["F", "Vrouw"], ["X", "Anders / non-binair"], ["N", "Zeg ik liever niet"]]
                .map(([value, label]) => `<option value="${value}" ${state.player.gender === value ? "selected" : ""}>${label}</option>`).join("")}
            </select>
          </label>
          <label>E-mail
            <input name="email" type="email" autocomplete="email" required value="${escapeHtml(state.player.email)}">
          </label>
          <button class="character-primary" type="submit">Start attribuutverdeling <span aria-hidden="true">→</span></button>
        </form>
      </div>`;
  }

  function categoryNodes(scan) {
    return `
      <nav class="attribute-nodes" aria-label="Gedragscategorieën">
        ${TRAIT_GROUPS.map((_, index) => {
          const complete = categoryTotal(scan, index) === 20;
          const accessible = index === 0 || categoryTotal(scan, index - 1) === 20 || complete;
          return `<button type="button"
                    data-category="${index}"
                    class="${index === state.category ? "is-active" : ""} ${complete ? "is-complete" : ""}"
                    ${accessible ? "" : "disabled"}
                    aria-label="Categorie ${index + 1}${complete ? ", voltooid" : ""}">
                    <span>${complete ? "✓" : index + 1}</span>
                  </button>`;
        }).join("")}
      </nav>`;
  }

  function scanMarkup() {
    const scan = scanKey();
    const values = state.allocations[scan][state.category];
    const total = categoryTotal();
    const remaining = 20 - total;
    const isBasic = scan === "basic_style";
    const title = isBasic ? "Baseline Attribute Allocation" : "Stress & Pressure Trial";
    const narrative = isBasic
      ? "Verdeel 20 punten. Geef de meeste punten aan wat het minst bij je past."
      : "De simulatie voert de druk op. Geef de meeste punten aan wat onder druk het best bij je past.";
    const allComplete = completedCount(scan) === 10;
    const canContinue = total === 20 && (state.category < 9 || allComplete);
    return `
      <div class="character-stage scan-stage">
        <section class="allocation-panel">
          <div class="scan-title-row">
            <div>
              <span class="behavior-kicker">${isBasic ? "Fase 2 · Basisstijl" : "Fase 3 · Drukproef"}</span>
              <h2>${title}</h2>
              <p>${narrative}</p>
            </div>
            <div class="scan-completion">${completedCount(scan)}/10 gereed</div>
          </div>
          ${categoryNodes(scan)}
          <div class="category-heading">
            <div>
              <span class="behavior-kicker">Attribuutnode ${state.category + 1} van 10</span>
              <h3>Welke verhouding past bij jou?</h3>
            </div>
            <div class="point-budget ${remaining === 0 ? "is-balanced" : ""}">
              <strong>${remaining}</strong>
              <span>punten over</span>
            </div>
          </div>
          <div class="trait-allocation-list">
            ${TRAIT_GROUPS[state.category].map(([slug, label], traitIndex) => `
              <div class="trait-allocation ${values[traitIndex] === 10 ? "is-capped" : ""}">
                <label for="trait-${traitIndex}">
                  <span>${escapeHtml(label)}</span>
                  <output>${values[traitIndex]}</output>
                </label>
                <div class="trait-controls">
                  <button type="button" data-step="${traitIndex}" data-delta="-1"
                          ${values[traitIndex] === 0 ? "disabled" : ""}
                          aria-label="Eén punt minder voor ${escapeHtml(label)}">−</button>
                  <input id="trait-${traitIndex}" type="range" min="0" max="10" step="1"
                         value="${values[traitIndex]}" data-trait="${traitIndex}"
                         aria-valuetext="${values[traitIndex]} punten voor ${escapeHtml(label)}">
                  <button type="button" data-step="${traitIndex}" data-delta="1"
                          ${values[traitIndex] === 10 || remaining === 0 ? "disabled" : ""}
                          aria-label="Eén punt meer voor ${escapeHtml(label)}">+</button>
                </div>
                <small>${escapeHtml(slug.replaceAll("_", " "))}</small>
              </div>`).join("")}
          </div>
          <p class="allocation-status ${canContinue ? "is-valid" : ""}" role="status">
            ${total === 20 && !allComplete && state.category === 9
              ? "Deze node klopt; voltooi ook de nog openstaande nodes."
              : canContinue
                ? "Punten zijn in balans. Deze node is voltooid."
                : `Verdeel nog ${remaining} ${remaining === 1 ? "punt" : "punten"}; ieder kenmerk heeft een maximum van 10.`}
          </p>
          <div class="character-actions">
            <button type="button" class="character-secondary" data-action="previous" ${state.category === 0 && isBasic ? "" : ""}>← Terug</button>
            <button type="button" class="character-primary" data-action="next" ${canContinue ? "" : "disabled"}>
              ${state.category < 9 ? "Volgende node" : isBasic ? "Start drukproef" : "Profiel voltooien"} <span aria-hidden="true">→</span>
            </button>
          </div>
        </section>
        <aside class="behavior-preview">
          ${radarMarkup()}
          <div class="scan-rule-card">
            <span class="behavior-kicker">Meetregel uit brondocument</span>
            <strong>${isBasic ? "Meeste punten = past het minst" : "Meeste punten = past het best onder druk"}</strong>
            <p>Elke node bevat exact 20 punten, met maximaal 10 per kenmerk.</p>
          </div>
        </aside>
      </div>`;
  }

  function submittingMarkup() {
    return `
      <div class="character-stage completion-stage">
        <div class="completion-sigil" aria-hidden="true">${state.submitting ? "…" : "!"}</div>
        <span class="behavior-kicker">Profiel gereed</span>
        <h2>${state.submitting ? "Gedragsprofiel wordt veilig opgeslagen" : "Opslaan is nog niet gelukt"}</h2>
        <p>${state.submitting
          ? "De Leerpret Engine ontvangt je twintig voltooide attribuutnodes."
          : escapeHtml(state.submitError || "Er ging iets mis bij het verzenden.")}</p>
        ${state.submitting ? '<div class="profile-loader" aria-label="Bezig"></div>' : '<button class="character-primary" type="button" data-action="retry">Opnieuw proberen</button>'}
      </div>`;
  }

  function render() {
    if (!mount) return;
    mount.innerHTML = `
      <div class="character-creation-shell">
        ${phaseHeader()}
        ${state.phase === "identity" ? identityMarkup() : state.phase === "submitting" ? submittingMarkup() : scanMarkup()}
      </div>`;
  }

  function setAllocation(traitIndex, requested) {
    const values = state.allocations[scanKey()][state.category];
    const current = values[traitIndex];
    const totalWithoutCurrent = values.reduce((sum, value, index) => index === traitIndex ? sum : sum + value, 0);
    values[traitIndex] = Math.max(0, Math.min(10, 20 - totalWithoutCurrent, Number(requested)));
    if (values[traitIndex] !== current) render();
  }

  function storeReceipt(receipt) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(receipt));
    } catch {
      // The server remains authoritative; private browsing may disable storage.
    }
  }

  function payload() {
    const categories = scan => TRAIT_GROUPS.map((traits, index) => ({
      category_index: index + 1,
      traits: Object.fromEntries(traits.map(([slug], traitIndex) => [slug, state.allocations[scan][index][traitIndex]])),
      total_allocated: categoryTotal(scan, index)
    }));
    return {
      player_info: { ...state.player },
      scans: {
        basic_style: { categories: categories("basic_style") },
        response_style: { categories: categories("response_style") }
      },
      metadata: {
        completion_timestamp: new Date().toISOString(),
        engine_target: "Leerpret Engine Archetype Matcher"
      }
    };
  }

  async function submitProfile() {
    state.phase = "submitting";
    state.submitting = true;
    state.submitError = "";
    const body = payload();
    render();
    try {
      const apiBase = (state.apiBase || window.LeerpretAuth?.getSession?.().apiBase || "").replace(/\/+$/, "");
      if (!apiBase) throw new Error("De Leerpret-service heeft geen API-adres doorgegeven.");
      const response = await fetch(`${apiBase}${PROFILE_ENDPOINT}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      if (!response.ok) {
        let detail = "";
        try {
          const problem = await response.json();
          detail = typeof problem.detail === "string" ? problem.detail : "";
        } catch {
          detail = "";
        }
        throw new Error(detail || `De service antwoordde met status ${response.status}.`);
      }
      const result = await response.json();
      storeReceipt(result);
      window.dispatchEvent(new CustomEvent("behavior-profile-completed", { detail: { payload: body, receipt: result } }));
      finish();
    } catch (error) {
      state.submitting = false;
      state.submitError = error.message || "Het profiel kon niet worden opgeslagen.";
      render();
    }
  }

  function finish() {
    document.body.classList.remove("character-creation-active");
    gate.hidden = true;
    gate.setAttribute("aria-hidden", "true");
    window.LEARNGameOMSimulator?.beginOnboardingTutorial?.();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goPrevious() {
    if (state.category > 0) {
      state.category -= 1;
    } else if (state.phase === "response") {
      state.phase = "basic";
      state.category = 9;
    } else {
      state.phase = "identity";
    }
    render();
  }

  function goNext() {
    if (categoryTotal() !== 20) return;
    if (state.category < 9) {
      state.category += 1;
      render();
      return;
    }
    if (state.phase === "basic") {
      state.phase = "response";
      state.category = 0;
      render();
      return;
    }
    submitProfile();
  }

  function handleClick(event) {
    const node = event.target.closest("[data-category]");
    if (node && !node.disabled) {
      state.category = Number(node.dataset.category);
      render();
      return;
    }
    const stepper = event.target.closest("[data-step]");
    if (stepper) {
      const index = Number(stepper.dataset.step);
      setAllocation(index, state.allocations[scanKey()][state.category][index] + Number(stepper.dataset.delta));
      return;
    }
    const action = event.target.closest("[data-action]")?.dataset.action;
    if (action === "previous") goPrevious();
    if (action === "next") goNext();
    if (action === "retry") submitProfile();
  }

  function handleInput(event) {
    if (event.target.matches("[data-trait]")) {
      setAllocation(Number(event.target.dataset.trait), event.target.value);
    }
  }

  function handleSubmit(event) {
    if (event.target.id !== "characterIdentityForm") return;
    event.preventDefault();
    if (!event.target.reportValidity()) return;
    const form = new FormData(event.target);
    state.player = {
      first_name: String(form.get("first_name") || "").trim(),
      surname: String(form.get("surname") || "").trim(),
      gender: String(form.get("gender") || ""),
      email: String(form.get("email") || "").trim()
    };
    state.phase = "basic";
    state.category = 0;
    render();
  }

  function start(session = {}) {
    if (!state.mounted || !session.authenticated) return;
    state.apiBase = session.apiBase || state.apiBase;
    if (session.user?.email && !state.player.email) state.player.email = session.user.email;
    document.body.classList.add("character-creation-active");
    gate.hidden = false;
    gate.removeAttribute("aria-hidden");
    render();
  }

  function initialize() {
    mount = document.getElementById("characterCreationMount");
    gate = document.getElementById("characterCreationGate");
    if (!mount || !gate) return;
    state.mounted = true;
    mount.addEventListener("click", handleClick);
    mount.addEventListener("input", handleInput);
    mount.addEventListener("submit", handleSubmit);
    window.addEventListener("leerpret-auth-changed", event => start(event.detail || {}));
    const session = window.LeerpretAuth?.getSession?.();
    if (session?.authenticated) start(session);
  }

  window.BehaviorCharacterCreation = {
    start,
    getPayload: payload,
    getStateSnapshot: () => JSON.parse(JSON.stringify(state))
  };

  initialize();
})();
