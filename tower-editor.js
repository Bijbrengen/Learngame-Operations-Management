(() => {
  "use strict";

  const GROUND_PLATE_SIZE = Object.freeze({ width: 6, depth: 6 });
  const GROUND_PLATE_COLORS = Object.freeze([
    { id: "green", label: "Grasgroen", hex: "#38be72" },
    { id: "blue", label: "Blauw", hex: "#4c8df2" },
    { id: "light_gray", label: "Lichtgrijs", hex: "#cbd5e1" },
    { id: "dark_gray", label: "Donkergrijs", hex: "#64748b" },
    { id: "black", label: "Zwart", hex: "#111827" },
    { id: "sand", label: "Zandgeel", hex: "#f0d58a" }
  ]);
  const CLASSIC_LAYER_COLORS = Object.freeze({
    layer1: "blue",
    layer2: "blue",
    layer3: "blue"
  });

  const state = {
    mount: null,
    parts: [],
    products: [],
    sequence: [],
    groundPlateColor: "green",
    multipleColors: false,
    editableColorLayers: [],
    onAdd: null,
    onDelete: null,
    sessionRunning: false,
    message: ""
  };

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function partById(partId) {
    return state.parts.find(part => part.id === partId);
  }

  function partLabel(part) {
    if (!part) return "Onbekend blok";
    const size = part.width === "wide" ? "2×4" : "2×2";
    return `${part.color} ${size}`;
  }

  function sequenceFor(product) {
    return Array.isArray(product.towerSequence) ? product.towerSequence : [];
  }

  function groundPlateColorFor(product) {
    const color = product?.groundPlate?.color;
    return GROUND_PLATE_COLORS.some(option => option.id === color) ? color : "green";
  }

  function foundationCount(sequence = state.sequence) {
    const firstPart = partById(sequence[0]);
    return firstPart?.width === "narrow" ? 4 : 2;
  }

  function minimumBlockCount(sequence = state.sequence) {
    return foundationCount(sequence) + 2;
  }

  function completedLayerCount(sequence = state.sequence) {
    if (!sequence.length) return 0;
    const foundation = foundationCount(sequence);
    if (sequence.length < foundation) return 0;
    return Math.min(3, 1 + sequence.length - foundation);
  }

  function currentLayerId(sequence = state.sequence) {
    const foundation = foundationCount(sequence);
    if (sequence.length < foundation) return "layer1";
    if (sequence.length === foundation) return "layer2";
    return "layer3";
  }

  function mayChooseLayerColor(layerId) {
    return state.multipleColors && state.editableColorLayers.includes(layerId);
  }

  function partFitsCurrentLayer(part, sequence = state.sequence) {
    if (!part) return false;
    const layerId = currentLayerId(sequence);
    if (!mayChooseLayerColor(layerId) && part.color !== CLASSIC_LAYER_COLORS[layerId]) {
      return false;
    }
    if (!sequence.length) return true;
    const foundation = foundationCount(sequence);
    if (sequence.length >= foundation) {
      return sequence.length < foundation + 2;
    }
    const firstPart = partById(sequence[0]);
    return part.width === firstPart?.width;
  }

  function buildHint() {
    if (!state.sequence.length) {
      return "Kies het eerste blok van laag 1.";
    }
    const foundation = foundationCount();
    if (state.sequence.length < foundation) {
      const remaining = foundation - state.sequence.length;
      const size = foundation === 4 ? "2×2" : "2×4";
      return `Vul laag 1 met nog ${remaining} ${size}-blok${remaining === 1 ? "" : "ken"}.`;
    }
    if (state.sequence.length === foundation) return "Laag 1 is vol. Kies één blok voor laag 2.";
    if (state.sequence.length === foundation + 1) return "Kies nog één blok voor laag 3.";
    return "De toren is precies 3 lagen hoog en klaar om toe te voegen.";
  }

  function previewMarkup() {
    if (!state.sequence.length) {
      return `
        <div class="tower-editor-empty-preview">
          <span aria-hidden="true">+</span>
          <p>Kies blokken om je toren van onder naar boven op te bouwen.</p>
        </div>
      `;
    }
    return window.LegoTowerRenderer.renderSequence(
      state.sequence,
      "Voorbeeld van de ontworpen toren",
      "tower-editor-preview-svg",
      state.groundPlateColor
    );
  }

  function groundPlateMarkup() {
    const groundPlateEditable = mayChooseLayerColor("groundPlate");
    return `
      <fieldset class="tower-ground-plate">
        <legend>Grondplaat</legend>
        <div class="tower-ground-plate-size">
          Grootte: <strong>${GROUND_PLATE_SIZE.width}×${GROUND_PLATE_SIZE.depth} noppen</strong>
          <span>vast</span>
        </div>
        <div class="tower-ground-plate-colors" aria-label="Kleur van de grondplaat">
          ${GROUND_PLATE_COLORS.map(option => `
            <button type="button"
                    class="tower-ground-plate-color${state.groundPlateColor === option.id ? " is-selected" : ""}"
                    data-ground-plate-color="${option.id}"
                    aria-label="${option.label}"
                    aria-pressed="${state.groundPlateColor === option.id}"
                    aria-disabled="${!groundPlateEditable}"
                    ${groundPlateEditable ? "" : "disabled"}
                    title="${option.label}">
              <span style="--ground-plate-swatch:${option.hex}" aria-hidden="true"></span>
              <small>${option.label}</small>
            </button>
          `).join("")}
        </div>
        <small class="tower-ground-plate-note">
          ${groundPlateEditable
            ? "Deze laag is vrijgegeven in de game-instellingen."
            : "Vast stijlblauw met groene grondplaat · geef Meerdere kleuren vrij om dit te wijzigen."}
        </small>
      </fieldset>
    `;
  }

  function paletteMarkup() {
    return state.parts.map(part => {
      const allowed = partFitsCurrentLayer(part);
      const title = allowed
        ? `Voeg ${partLabel(part)} toe`
        : (completedLayerCount() === 3
          ? "De toren is al 3 lagen hoog"
          : "Maak de eerste laag af met hetzelfde blokformaat");
      return `
      <button type="button"
              class="tower-part-choice${allowed ? "" : " is-disabled"}"
              data-add-tower-part="${escapeHtml(part.id)}"
              aria-disabled="${!allowed}"
              title="${title}">
        ${window.LegoTowerRenderer.renderPart(part, part.name)}
        <span>${escapeHtml(partLabel(part))}</span>
      </button>
    `;
    }).join("");
  }

  function stackMarkup() {
    if (!state.sequence.length) {
      return `<p class="tower-stack-empty">Nog geen blokken gekozen.</p>`;
    }
    return state.sequence.map((partId, index) => {
      const part = partById(partId);
      return `
        <li>
          <span class="tower-stack-index">${index + 1}</span>
          <span>
            <strong>${escapeHtml(partLabel(part))}</strong>
            <small>${index < foundationCount() ? "eerste laag" : `laag ${index - foundationCount() + 2}`}</small>
          </span>
          <button type="button" data-remove-tower-part="${index}" aria-label="Verwijder ${escapeHtml(partLabel(part))}">×</button>
        </li>
      `;
    }).join("");
  }

  function galleryMarkup() {
    if (!state.products.length) {
      return `<p class="tower-gallery-empty">Het productassortiment is nog leeg.</p>`;
    }
    return state.products.map(product => `
      <article class="tower-assortment-card">
        <div class="tower-assortment-animation">
          ${window.LegoTowerRenderer.renderAnimated(
            sequenceFor(product),
            `Geanimeerde bouw van ${product.name}`,
            "tower-assortment-svg",
            groundPlateColorFor(product)
          )}
        </div>
        <div>
          <p class="eyebrow">${product.custom ? "Eigen ontwerp" : "Standaardproduct"}</p>
          <h3>${escapeHtml(product.name)}</h3>
          <span>EUR ${Math.round(product.price)} · ${sequenceFor(product).length} blokken</span>
          ${product.custom ? `
            <button type="button"
                    class="tower-assortment-remove${state.sessionRunning ? " is-disabled" : ""}"
                    data-remove-assortment-product="${escapeHtml(product.id)}"
                    aria-disabled="${state.sessionRunning}"
                    title="${state.sessionRunning ? "Kan niet bij een actieve gamesessie" : `Verwijder ${escapeHtml(product.name)}`}">
              Verwijderen
            </button>
          ` : ""}
        </div>
      </article>
    `).join("");
  }

  function render() {
    if (!state.mount || !window.LegoTowerRenderer) return;
    const required = minimumBlockCount();
    const canAdd = state.sequence.length === required;
    state.mount.innerHTML = `
      <div class="tower-editor-workspace">
        <section class="tower-editor-builder" aria-labelledby="towerBuilderHeading">
          <div class="tower-editor-subhead">
            <div>
              <p class="eyebrow">Bouwtafel</p>
              <h3 id="towerBuilderHeading">Bouw van onder naar boven</h3>
            </div>
            <span>${completedLayerCount()}/3 lagen gereed</span>
          </div>
          <div class="tower-editor-design-grid">
            <div>
              <div class="tower-editor-preview">${previewMarkup()}</div>
              ${groundPlateMarkup()}
            </div>
            <div>
              <strong class="tower-editor-field-label">Beschikbare blokken</strong>
              <div class="tower-part-palette">${paletteMarkup()}</div>
            </div>
          </div>
          <div class="tower-stack-section">
            <div class="tower-editor-field-row">
              <strong class="tower-editor-field-label">Bouwvolgorde</strong>
              <button type="button" data-clear-tower ${state.sequence.length ? "" : "disabled"}>Opnieuw beginnen</button>
            </div>
            <ol class="tower-stack-list">${stackMarkup()}</ol>
          </div>
          <form class="tower-product-form" data-tower-product-form>
            <label>
              <span>Productnaam</span>
              <input name="name" maxlength="48" value="Toren maatwerk ${state.products.filter(product => product.custom).length + 1}" required>
            </label>
            <label>
              <span>Verkoopprijs</span>
              <input name="price" type="number" min="1" max="9999" step="1" value="75" required>
            </label>
            <button class="primary-button" type="submit" ${canAdd ? "" : "disabled"}>
              Akkoord &amp; toevoegen
            </button>
          </form>
          <p class="tower-editor-hint">${buildHint()}</p>
          ${state.message ? `<p class="tower-editor-success" role="status">${escapeHtml(state.message)}</p>` : ""}
        </section>

        <section class="tower-assortment" aria-labelledby="towerAssortmentHeading">
          <div class="tower-editor-subhead">
            <div>
              <p class="eyebrow">Productassortiment</p>
              <h3 id="towerAssortmentHeading">Geanimeerde torengalerij</h3>
            </div>
            <span>${state.products.length} producten</span>
          </div>
          <div class="tower-assortment-grid">${galleryMarkup()}</div>
        </section>
      </div>
    `;
  }

  function handleClick(event) {
    const groundPlateButton = event.target.closest("[data-ground-plate-color]");
    if (groundPlateButton) {
      if (!mayChooseLayerColor("groundPlate")) return;
      state.groundPlateColor = groundPlateButton.dataset.groundPlateColor;
      state.message = "";
      render();
      return;
    }
    const addButton = event.target.closest("[data-add-tower-part]");
    if (addButton) {
      const part = partById(addButton.dataset.addTowerPart);
      if (!partFitsCurrentLayer(part)) return;
      state.sequence.push(addButton.dataset.addTowerPart);
      state.message = "";
      render();
      return;
    }
    const removeButton = event.target.closest("[data-remove-tower-part]");
    if (removeButton) {
      state.sequence.splice(Number(removeButton.dataset.removeTowerPart));
      state.message = "";
      render();
      return;
    }
    if (event.target.closest("[data-clear-tower]")) {
      state.sequence = [];
      state.message = "";
      render();
      return;
    }
    const deleteButton = event.target.closest("[data-remove-assortment-product]");
    if (deleteButton) {
      if (state.sessionRunning) return;
      const productId = deleteButton.dataset.removeAssortmentProduct;
      const product = state.products.find(item => item.id === productId && item.custom);
      if (!product) return;
      if (!window.confirm(`Wil je ${product.name} uit het productassortiment verwijderen?`)) return;
      if (state.onDelete?.(productId) === false) return;
      state.products = state.products.filter(item => item.id !== productId);
      state.message = `${product.name} is uit het productassortiment verwijderd.`;
      render();
    }
  }

  function handleSubmit(event) {
    if (!event.target.matches("[data-tower-product-form]")) return;
    event.preventDefault();
    if (state.sequence.length !== minimumBlockCount()) return;
    const form = new FormData(event.target);
    const draft = {
      name: String(form.get("name") || "").trim(),
      price: Number(form.get("price")),
      towerSequence: [...state.sequence],
      groundPlate: {
        color: state.groundPlateColor,
        width: GROUND_PLATE_SIZE.width,
        depth: GROUND_PLATE_SIZE.depth
      }
    };
    const product = state.onAdd?.(draft);
    if (!product) return;
    state.products = [...state.products, product];
    state.sequence = [];
    state.groundPlateColor = "green";
    state.message = `${product.name} is toegevoegd aan het productassortiment.`;
    render();
  }

  function mount(mountPoint, options = {}) {
    if (!mountPoint || !window.LegoTowerRenderer) return;
    state.mount = mountPoint;
    state.parts = (options.parts || []).filter(part => part.id !== "base_green");
    state.products = [...(options.products || [])];
    state.multipleColors = Boolean(options.colorConfiguration?.multipleColors);
    state.editableColorLayers = state.multipleColors
      ? [...(options.colorConfiguration?.editableColorLayers || [])]
      : [];
    state.onAdd = options.onAdd;
    state.onDelete = options.onDelete;
    state.sequence = [];
    state.groundPlateColor = "green";
    state.message = "";
    mountPoint.addEventListener("click", handleClick);
    mountPoint.addEventListener("submit", handleSubmit);
    render();
  }

  function setProducts(products) {
    state.products = [...(products || [])];
    render();
  }

  function setColorConfiguration(configuration = {}) {
    state.multipleColors = Boolean(configuration.multipleColors);
    state.editableColorLayers = state.multipleColors
      ? [...new Set(configuration.editableColorLayers || [])].filter(layerId => (
          ["groundPlate", "layer1", "layer2", "layer3"].includes(layerId)
        ))
      : [];
    if (!mayChooseLayerColor("groundPlate")) {
      state.groundPlateColor = "green";
    }
    const invalidLayerColor = state.sequence.some((partId, index, sequence) => {
      const foundation = foundationCount(sequence);
      const layerId = index < foundation
        ? "layer1"
        : index === foundation
          ? "layer2"
          : "layer3";
      return !mayChooseLayerColor(layerId)
        && partById(partId)?.color !== CLASSIC_LAYER_COLORS[layerId];
    });
    if (invalidLayerColor) {
      state.sequence = [];
      state.message = "Het ontwerp is leeggemaakt omdat de nieuwe game-instelling andere vaste laagkleuren gebruikt.";
    }
    render();
  }

  window.addEventListener("learngame-session-state", event => {
    const running = Boolean(event.detail?.running);
    if (state.sessionRunning === running) return;
    state.sessionRunning = running;
    render();
  });

  window.TowerEditor = { mount, setProducts, setColorConfiguration };
})();
