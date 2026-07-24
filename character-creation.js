(() => {
  "use strict";

  const STORAGE_KEY = "learngame-om.behavior-profile.v1";
  const DRAFT_KEY = "learngame-om.behavior-draft.v1";
  const PROFILE_ENDPOINT = "/v1/player/behavior-profile";
  const AXES = ["Daadkracht", "Dynamiek", "Verbinding", "Structuur"];
  const AXIS_ICONS = ["◆", "✦", "●", "▦"];
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
  const freshTiming = () => ({
    basic_style_category_ms: Array(10).fill(0),
    response_style_category_ms: Array(10).fill(0),
    activeScan: null,
    activeCategory: null,
    activeSince: 0,
    edits: 0
  });
  const state = {
    phase: "intro",
    category: 0,
    allocations: { basic_style: freshAllocations(), response_style: freshAllocations() },
    submitting: false,
    submitError: "",
    checking: false,
    lookupError: "",
    qualityReview: null,
    timing: freshTiming(),
    result: null,
    entryMode: "onboarding",
    existingProfile: null,
    lookupSequence: 0,
    apiBase: "",
    mounted: false
  };

  let mount = null;
  let gate = null;

  function editButton() {
    return document.getElementById("characterEditButton");
  }

  function setEditButtonVisible(visible) {
    const button = editButton();
    if (button) button.hidden = !visible;
  }

  function scanKey() {
    return state.phase === "response" ? "response_style" : "basic_style";
  }

  function categoryTotal(scan = scanKey(), index = state.category) {
    return state.allocations[scan][index].reduce((sum, value) => sum + value, 0);
  }

  function beginCategoryTiming(scan = scanKey(), category = state.category) {
    state.timing.activeScan = scan;
    state.timing.activeCategory = category;
    state.timing.activeSince = Date.now();
  }

  function commitCategoryTiming() {
    const { activeScan, activeCategory, activeSince } = state.timing;
    if (!activeScan || activeCategory === null || !activeSince) return;
    const key = `${activeScan}_category_ms`;
    const elapsed = Math.max(0, Date.now() - activeSince);
    state.timing[key][activeCategory] += elapsed;
    state.timing.activeSince = Date.now();
  }

  function validAllocationMatrix(value) {
    return Array.isArray(value)
      && value.length === 10
      && value.every(category =>
        Array.isArray(category)
        && category.length === 4
        && category.every(points => Number.isInteger(points) && points >= 0 && points <= 10)
      );
  }

  function allocationsFromPayload(scan) {
    if (!Array.isArray(scan?.categories) || scan.categories.length !== 10) return null;
    const ordered = [...scan.categories].sort((left, right) => left.category_index - right.category_index);
    const matrix = ordered.map((category, index) =>
      TRAIT_GROUPS[index].map(([slug]) => Number(category?.traits?.[slug]))
    );
    return validAllocationMatrix(matrix) ? matrix : null;
  }

  function applyExistingProfile(profile) {
    const basic = allocationsFromPayload(profile?.scans?.basic_style);
    const response = allocationsFromPayload(profile?.scans?.response_style);
    if (!basic || !response) return false;
    state.allocations = { basic_style: basic, response_style: response };
    state.existingProfile = profile;
    return true;
  }

  function saveDraft() {
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify({
        phase: state.phase === "submitting" ? "response" : state.phase,
        category: state.phase === "submitting" ? 9 : state.category,
        allocations: state.allocations,
        timing: {
          basic_style_category_ms: state.timing.basic_style_category_ms,
          response_style_category_ms: state.timing.response_style_category_ms,
          edits: state.timing.edits
        }
      }));
    } catch {
      // A private browser may disable storage; the in-memory wizard still works.
    }
  }

  function restoreDraft() {
    try {
      const draft = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || "null");
      if (!draft || typeof draft !== "object") return;

      // Also accept the public payload shape. This makes it possible to save a
      // profile from an already-open older wizard before a hard refresh.
      if (draft.scans) {
        const basic = allocationsFromPayload(draft.scans.basic_style);
        const response = allocationsFromPayload(draft.scans.response_style);
        if (!basic || !response) return;
        state.allocations = { basic_style: basic, response_style: response };
        state.phase = "response";
        state.category = 9;
        saveDraft();
        return;
      }

      if (
        !validAllocationMatrix(draft.allocations?.basic_style)
        || !validAllocationMatrix(draft.allocations?.response_style)
      ) return;
      state.allocations = {
        basic_style: draft.allocations.basic_style,
        response_style: draft.allocations.response_style
      };
      if (Array.isArray(draft.timing?.basic_style_category_ms)) {
        state.timing.basic_style_category_ms = draft.timing.basic_style_category_ms.slice(0, 10);
        state.timing.response_style_category_ms = draft.timing.response_style_category_ms.slice(0, 10);
        state.timing.edits = Number(draft.timing.edits) || 0;
      }
      state.phase = ["intro", "basic", "response"].includes(draft.phase)
        ? draft.phase
        : "intro";
      state.category = Math.max(0, Math.min(9, Number(draft.category) || 0));
      if (["basic", "response"].includes(state.phase)) beginCategoryTiming();
      saveDraft();
    } catch {
      // Ignore a malformed or unavailable tab-local draft.
    }
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
    const active = state.phase === "intro" ? 1 : state.phase === "basic" ? 2 : 3;
    return `
      <header class="character-header">
        <div class="character-emblem" aria-hidden="true">OM</div>
        <div>
          <p class="behavior-kicker">Operations Simulation · Character Creation</p>
          <h1 id="characterCreationTitle">Stel je operationele avatar samen</h1>
        </div>
        <ol class="character-phases" aria-label="Voortgang">
          ${["Rolkeuze", "Basisstijl", "Drukproef"].map((label, index) => `
            <li class="${index + 1 === active ? "is-active" : ""} ${index + 1 < active ? "is-complete" : ""}">
              <span>${index + 1}</span>${label}
            </li>`).join("")}
        </ol>
      </header>`;
  }

  function introMarkup() {
    return `
      <div class="character-stage identity-stage">
        <div class="character-copy">
          <span class="behavior-kicker">Fase 1 · Jouw rol in de simulatie</span>
          <h2>Houd jezelf een spiegel voor</h2>
          <p>Om je een passende rol in de game te geven, vragen we je twee korte gedragsstijltests te doen. Op basis van je antwoorden kiest de game de rol die het beste bij je past.</p>
          <p>Neem er rustig de tijd voor: een nauwkeurige rolmatch verhoogt de leerpret en voorkomt dat jij of je team tijd verliest aan taken die minder goed passen.</p>
          <p>We vragen hiervoor niet om je naam, e-mailadres, geslacht of profielfoto. Je antwoorden worden alleen gekoppeld aan je pseudonieme gamesessie.</p>
          <div class="identity-avatar" aria-hidden="true"><span></span></div>
        </div>
        <div class="identity-form behavior-purpose-card">
          <strong>Waarom deze gedragsstijltest?</strong>
          <p>De simulatie gebruikt je verdeling om je spelrol en opdrachten passend te maken. Er wordt geen identiteit aan het profiel toegevoegd.</p>
          <button class="character-primary" type="button" data-action="begin-scans">Start gedragsstijltest <span aria-hidden="true">→</span></button>
        </div>
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
                <div class="trait-allocation-heading">
                  <label for="trait-${traitIndex}">
                    <span><i class="trait-axis-icon axis-${traitIndex}" aria-hidden="true">${AXIS_ICONS[traitIndex]}</i>${escapeHtml(label)}</span>
                  </label>
                  <input class="trait-value-input" type="number" min="0" max="10" step="1"
                         value="${values[traitIndex]}" data-trait-value="${traitIndex}"
                         aria-label="Punten voor ${escapeHtml(label)}">
                </div>
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

  function qualityWarningMarkup() {
    const metrics = state.qualityReview?.metrics || {};
    return `
      <div class="character-stage completion-stage quality-warning-stage">
        <div class="completion-sigil" aria-hidden="true">?</div>
        <span class="behavior-kicker">Even opnieuw in de spiegel kijken</span>
        <h2>Het systeem twijfelt of deze invulling genoeg onderscheid geeft</h2>
        <p>Dat zegt niets over jou. De antwoorden lijken alleen te weinig verschil te bevatten om met vertrouwen een passende rol en game-ervaring te kiezen.</p>
        <ul class="quality-reasons">
          ${(state.qualityReview?.reasons || []).map(reason => `<li>${escapeHtml(reason)}</li>`).join("")}
        </ul>
        <div class="quality-statistics" aria-label="Statistische controle">
          <span><strong>${metrics.basicFlatCategories ?? 0}/10</strong> vlakke basisverdelingen</span>
          <span><strong>${metrics.responseFlatCategories ?? 0}/10</strong> vlakke drukverdelingen</span>
          <span><strong>${metrics.identicalCategories ?? 0}/10</strong> identieke categorieën</span>
        </div>
        <p>Wil je de twee scans daarom nog een keer met wat meer aandacht invullen? Kies per categorie bewust welke kenmerken meer en minder bij je passen.</p>
        <button class="character-primary" type="button" data-action="retry-quality">Nog een keer met aandacht <span aria-hidden="true">↻</span></button>
      </div>`;
  }

  function overviewMarkup() {
    const allBalanced = ["basic_style", "response_style"].every(scan =>
      state.allocations[scan].every((_, index) => categoryTotal(scan, index) === 20)
    );
    const review = window.BehaviorResponseQuality?.assess(state.allocations, state.timing);
    const issuesFor = (scan, categoryIndex) => review?.rowIssues?.[scan]?.[categoryIndex] || [];
    const hasStatisticalWarnings = ["basic_style", "response_style"].some(scan =>
      TRAIT_GROUPS.some((_, categoryIndex) => issuesFor(scan, categoryIndex).length)
    );
    const scanTable = (scan, title) => `
      <section class="behavior-overview-scan">
        <h3>${title}</h3>
        <div class="behavior-overview-table">
          ${TRAIT_GROUPS.map((traits, categoryIndex) => `
            <div class="behavior-overview-row ${issuesFor(scan, categoryIndex).length ? "is-statistically-doubtful" : ""}"
                 ${issuesFor(scan, categoryIndex).length ? `title="${escapeHtml(issuesFor(scan, categoryIndex).join(" "))}"` : ""}>
              <strong>${categoryIndex + 1}</strong>
              ${traits.map(([, label], traitIndex) => `
                <label title="${escapeHtml(label)}">
                  <span>${escapeHtml(label)}</span>
                  <input type="number" min="0" max="10" step="1"
                         value="${state.allocations[scan][categoryIndex][traitIndex]}"
                         data-overview-scan="${scan}"
                         data-overview-category="${categoryIndex}"
                         data-overview-trait="${traitIndex}">
                </label>`).join("")}
              <output class="${categoryTotal(scan, categoryIndex) === 20 && !issuesFor(scan, categoryIndex).length ? "is-balanced" : "is-invalid"}">
                ${issuesFor(scan, categoryIndex).length ? "! " : ""}${categoryTotal(scan, categoryIndex)}/20
              </output>
            </div>`).join("")}
        </div>
      </section>`;
    return `
      <div class="character-stage behavior-overview-stage">
        <div class="scan-title-row">
          <div>
            <span class="behavior-kicker">Controle voor de rolmatching</span>
            <h2>Bekijk en pas je verdeling aan</h2>
            <p>Controleer rustig of dit de spiegel is die je wilde voorhouden. Iedere rij moet samen precies 20 punten bevatten.${hasStatisticalWarnings ? " Rode rijen vragen ook inhoudelijk om extra aandacht." : ""}</p>
          </div>
        </div>
        ${scanTable("basic_style", "Basisstijl · hoge punten = past het minst")}
        ${scanTable("response_style", "Drukproef · hoge punten = past het best")}
        <div class="character-actions">
          <button type="button" class="character-secondary" data-action="back-to-response">← Terug</button>
          <button type="button" class="character-primary" data-action="review-profile" ${allBalanced ? "" : "disabled"}>
            Bereken passende rol <span aria-hidden="true">→</span>
          </button>
        </div>
      </div>`;
  }

  function resultMarkup() {
    const analysis = state.result?.analysis || state.qualityReview || {};
    const profile = analysis.profile || {};
    const matches = profile.roleMatches || profile.role_matches || [];
    const recommended = profile.recommendedRole || profile.recommended_role || matches[0] || {};
    const reliability = analysis.reliability ?? 0;
    const leastMatching = [...matches].sort(
      (left, right) => Number(left.match) - Number(right.match)
    ).slice(0, Math.min(2, Math.max(0, matches.length - 1)));
    return `
      <div class="character-stage behavior-result-stage">
        <span class="behavior-kicker">Jouw rol in de simulatie</span>
        <h2>${escapeHtml(recommended.title || "Passende rol berekend")}</h2>
        <p>Op basis van je Basisstijl en je reactie onder druk past deze rol het beste bij je huidige profiel.</p>
        <div class="behavior-result-hero">
          <div class="role-match-ring" style="--match: ${Number(recommended.match || 0)}">
            <strong>${Number(recommended.match || 0)}%</strong><span>rolmatch</span>
          </div>
          <div>
            <span>Herkenbaar archetype</span>
            <strong>${escapeHtml(profile.archetype || "In balans")}</strong>
            <span>Betrouwbaarheid</span>
            <strong>${reliability}%</strong>
          </div>
        </div>
        <section class="role-fit-section">
          <h3>Wat goed bij je past</h3>
          <div class="role-match-list">
            ${matches.slice(0, 5).map(match => `
              <div><span>${escapeHtml(match.title)}</span><progress max="100" value="${Number(match.match)}"></progress><strong>${Number(match.match)}%</strong></div>
            `).join("")}
          </div>
        </section>
        ${leastMatching.length ? `
          <section class="role-fit-section role-fit-section-less">
            <h3>Wat minder bij je past</h3>
            <p>Deze rollen sluiten van de beschikbare rollen het minst aan op je huidige profiel.</p>
            <div class="role-match-list">
              ${leastMatching.map(match => `
                <div><span>${escapeHtml(match.title)}</span><progress max="100" value="${Number(match.match)}"></progress><strong>${Number(match.match)}%</strong></div>
              `).join("")}
            </div>
          </section>` : ""}
        ${(analysis.attentionNotes || analysis.attention_notes || []).map(note => `<p class="result-attention-note">${escapeHtml(note)}</p>`).join("")}
        <div class="character-actions">
          <button type="button" class="character-secondary" data-action="download-report">Download PDF-rapport</button>
          <button type="button" class="character-primary" data-action="start-game">Start in mijn rol <span aria-hidden="true">→</span></button>
        </div>
      </div>`;
  }

  function lookupMarkup() {
    return `
      <div class="character-stage completion-stage">
        <div class="completion-sigil" aria-hidden="true">${state.lookupError ? "!" : "…"}</div>
        <span class="behavior-kicker">Accountprofiel</span>
        <h2>${state.lookupError ? "Profielcontrole is niet gelukt" : "Bestaand karakter controleren"}</h2>
        <p>${escapeHtml(state.lookupError || "We controleren of je deze gedragsstijlscan al hebt voltooid.")}</p>
        ${state.lookupError
          ? '<button class="character-primary" type="button" data-action="retry-lookup">Opnieuw controleren</button>'
          : '<div class="profile-loader" aria-label="Bezig"></div>'}
      </div>`;
  }

  function render() {
    if (!mount) return;
    if (state.checking || state.lookupError) {
      mount.innerHTML = `<div class="character-creation-shell">${lookupMarkup()}</div>`;
      return;
    }
    mount.innerHTML = `
      <div class="character-creation-shell">
        ${phaseHeader()}
        ${state.phase === "intro"
          ? introMarkup()
          : state.phase === "submitting"
            ? submittingMarkup()
            : state.phase === "quality_warning"
              ? qualityWarningMarkup()
              : state.phase === "overview"
                ? overviewMarkup()
                : state.phase === "result"
                  ? resultMarkup()
              : scanMarkup()}
      </div>`;
  }

  function setAllocation(traitIndex, requested) {
    const values = state.allocations[scanKey()][state.category];
    const current = values[traitIndex];
    const totalWithoutCurrent = values.reduce((sum, value, index) => index === traitIndex ? sum : sum + value, 0);
    values[traitIndex] = Math.max(0, Math.min(10, 20 - totalWithoutCurrent, Number(requested)));
    if (values[traitIndex] !== current) {
      state.timing.edits += 1;
      saveDraft();
      render();
    }
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
      scans: {
        basic_style: { categories: categories("basic_style") },
        response_style: { categories: categories("response_style") }
      },
      metadata: {
        completion_timestamp: new Date().toISOString(),
        engine_target: "Leerpret Engine Archetype Matcher",
        timing: {
          basic_style_category_ms: state.timing.basic_style_category_ms.map(Math.round),
          response_style_category_ms: state.timing.response_style_category_ms.map(Math.round),
          edits: state.timing.edits
        }
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
        const error = new Error(
          response.status === 401
            ? "Je LO-sessie is verlopen of kon niet worden meegestuurd. Meld je opnieuw aan; je ingevulde punten blijven in dit venster bewaard."
            : detail || `De service antwoordde met status ${response.status}.`
        );
        error.status = response.status;
        throw error;
      }
      const result = await response.json();
      storeReceipt(result);
      sessionStorage.removeItem(DRAFT_KEY);
      state.existingProfile = body;
      state.result = result;
      state.qualityReview = result.analysis || state.qualityReview;
      state.phase = "result";
      state.submitting = false;
      setEditButtonVisible(true);
      window.dispatchEvent(new CustomEvent("behavior-profile-completed", { detail: { payload: body, receipt: result } }));
      render();
    } catch (error) {
      state.submitting = false;
      state.submitError = error.message || "Het profiel kon niet worden opgeslagen.";
      render();
      if (error.status === 401) {
        window.LeerpretAuth?.checkSession?.();
      }
    }
  }

  function finish() {
    document.body.classList.remove("character-creation-active");
    gate.hidden = true;
    gate.setAttribute("aria-hidden", "true");
    if (state.entryMode === "onboarding") {
      window.LEARNGameOMSimulator?.beginOnboardingTutorial?.();
    }
    state.entryMode = "onboarding";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goPrevious() {
    commitCategoryTiming();
    if (state.category > 0) {
      state.category -= 1;
    } else if (state.phase === "response") {
      state.phase = "basic";
      state.category = 9;
    } else {
      state.phase = "intro";
    }
    saveDraft();
    if (["basic", "response"].includes(state.phase)) beginCategoryTiming();
    render();
  }

  function goNext() {
    if (categoryTotal() !== 20) return;
    commitCategoryTiming();
    if (state.category < 9) {
      state.category += 1;
      beginCategoryTiming();
      saveDraft();
      render();
      return;
    }
    if (state.phase === "basic") {
      state.phase = "response";
      state.category = 0;
      beginCategoryTiming();
      saveDraft();
      render();
      return;
    }
    state.phase = "overview";
    saveDraft();
    render();
  }

  function handleClick(event) {
    const node = event.target.closest("[data-category]");
    if (node && !node.disabled) {
      commitCategoryTiming();
      state.category = Number(node.dataset.category);
      beginCategoryTiming();
      saveDraft();
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
    if (action === "begin-scans") {
      state.phase = "basic";
      state.category = 0;
      beginCategoryTiming();
      saveDraft();
      render();
    }
    if (action === "retry") submitProfile();
    if (action === "retry-quality") {
      state.allocations = { basic_style: freshAllocations(), response_style: freshAllocations() };
      state.timing = freshTiming();
      state.qualityReview = null;
      state.phase = "basic";
      state.category = 0;
      beginCategoryTiming();
      saveDraft();
      render();
    }
    if (action === "retry-lookup") {
      checkAccountProfile(window.LeerpretAuth?.getSession?.() || {});
    }
    if (action === "back-to-response") {
      state.phase = "response";
      state.category = 9;
      beginCategoryTiming();
      render();
    }
    if (action === "review-profile") {
      const review = window.BehaviorResponseQuality?.assess(state.allocations, state.timing);
      state.qualityReview = review;
      if (review?.doubtful) {
        state.phase = "quality_warning";
        render();
      } else {
        submitProfile();
      }
    }
    if (action === "start-game") finish();
    if (action === "download-report") downloadReport();
  }

  function handleInput(event) {
    if (event.target.matches("[data-trait]")) {
      setAllocation(Number(event.target.dataset.trait), event.target.value);
    }
    if (event.target.matches("[data-overview-scan]")) {
      const scan = event.target.dataset.overviewScan;
      const category = Number(event.target.dataset.overviewCategory);
      const trait = Number(event.target.dataset.overviewTrait);
      state.allocations[scan][category][trait] = Math.max(0, Math.min(10, Number(event.target.value) || 0));
      state.timing.edits += 1;
      saveDraft();
      render();
    }
  }

  function handleChange(event) {
    if (event.target.matches("[data-trait-value]")) {
      setAllocation(Number(event.target.dataset.traitValue), event.target.value);
    }
  }

  async function downloadReport() {
    const apiBase = (state.apiBase || window.LeerpretAuth?.getSession?.().apiBase || "").replace(/\/+$/, "");
    try {
      const response = await fetch(`${apiBase}${PROFILE_ENDPOINT}/report.pdf`, {
        credentials: "include",
        cache: "no-store"
      });
      if (!response.ok) throw new Error(`Rapportservice antwoordde met status ${response.status}.`);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "gedragsstijlrapport-lo-game.pdf";
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      state.submitError = error.message || "Het PDF-rapport kon niet worden gemaakt.";
      state.phase = "submitting";
      state.submitting = false;
      render();
    }
  }

  function showGate() {
    document.body.classList.add("character-creation-active");
    gate.hidden = false;
    gate.removeAttribute("aria-hidden");
  }

  async function checkAccountProfile(session = {}, { forceEdit = false } = {}) {
    if (!state.mounted || !session.authenticated) return;
    state.apiBase = session.apiBase || state.apiBase;
    const sequence = ++state.lookupSequence;
    state.entryMode = forceEdit ? "edit" : "onboarding";
    state.checking = true;
    state.lookupError = "";
    showGate();
    render();
    try {
      const apiBase = state.apiBase.replace(/\/+$/, "");
      const response = await fetch(`${apiBase}${PROFILE_ENDPOINT}`, {
        method: "GET",
        credentials: "include",
        cache: "no-store"
      });
      if (!response.ok) {
        const error = new Error(
          response.status === 401
            ? "Je LO-sessie is verlopen. Meld je opnieuw aan."
            : `De profielservice antwoordde met status ${response.status}.`
        );
        error.status = response.status;
        throw error;
      }
      const result = await response.json();
      if (sequence !== state.lookupSequence) return;
      state.checking = false;
      if (result.exists) {
        applyExistingProfile(result.profile);
        setEditButtonVisible(true);
        sessionStorage.removeItem(DRAFT_KEY);
        if (!forceEdit) {
          finish();
          return;
        }
      } else {
        state.existingProfile = null;
        setEditButtonVisible(false);
      }
      state.phase = "intro";
      state.category = 0;
      render();
    } catch (error) {
      if (sequence !== state.lookupSequence) return;
      state.checking = false;
      state.lookupError = error.message || "Het accountprofiel kon niet worden gecontroleerd.";
      render();
      if (error.status === 401) window.LeerpretAuth?.checkSession?.();
    }
  }

  function start(session = {}) {
    if (!session.authenticated) {
      setEditButtonVisible(false);
      return;
    }
    checkAccountProfile(session);
  }

  function edit() {
    const session = window.LeerpretAuth?.getSession?.() || {};
    if (!session.authenticated) return;
    checkAccountProfile(session, { forceEdit: true });
  }

  function initialize() {
    mount = document.getElementById("characterCreationMount");
    gate = document.getElementById("characterCreationGate");
    if (!mount || !gate) return;
    state.mounted = true;
    restoreDraft();
    mount.addEventListener("click", handleClick);
    mount.addEventListener("input", handleInput);
    mount.addEventListener("change", handleChange);
    editButton()?.addEventListener("click", edit);
    window.addEventListener("leerpret-auth-changed", event => start(event.detail || {}));
    const session = window.LeerpretAuth?.getSession?.();
    if (session?.authenticated) start(session);
  }

  window.BehaviorCharacterCreation = {
    start,
    edit,
    getPayload: payload,
    getStateSnapshot: () => JSON.parse(JSON.stringify(state))
  };

  initialize();
})();
