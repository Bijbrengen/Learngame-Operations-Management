(() => {
  "use strict";

  // LeerpretSDK · component "lego-builder"
  // Data en pure logica komen uit de SDK-module (sdk/components/lego-builder.logic.js),
  // die vóór dit bestand geladen wordt. Dit bestand bevat alleen nog DOM/render/events.
  const LOGIC = (typeof window !== "undefined"
    && window.LeerpretSDK
    && window.LeerpretSDK.components
    && window.LeerpretSDK.components["lego-builder"]
    && window.LeerpretSDK.components["lego-builder"].logic) || null;

  if (!LOGIC) {
    // Nette degradatie i.p.v. een crash wanneer de SDK-logica niet geladen is.
    const noop = () => {};
    window.LegoBuilder = {
      mount(target) {
        if (target) {
          var tried = (typeof window !== "undefined" && window.__LEERPRET_SDK_LOAD_ERROR)
            ? " Geprobeerde URL: " + window.__LEERPRET_SDK_LOAD_ERROR + " (pagina: " + location.origin + ")."
            : "";
          target.innerHTML =
            '<p class="builder-feedback is-error">De LeerpretSDK lego-logica kon niet worden geladen. Controleer of de backend bereikbaar is (of stel window.LEERPRET_SDK_BASE in).' + tried + '</p>';
        }
      },
      setProduct: () => false,
      registerProduct: () => false,
      unregisterProduct: () => false,
      startFreeBuild: noop,
      prepareStockTutorial: noop,
      setStockTutorialInventory: noop,
      reset: noop,
      restartTutorial: noop,
      setFreeBuildUnlocked: noop,
      setInternalLogisticsComplete: noop,
      skipTutorial: noop,
      validateBuild: () => false,
      getCatalog: () => ({}),
      getSnapshot: () => ({})
    };
    return;
  }

  // Eén bron van waarheid: verse, geïsoleerde instantie van de logica-kern.
  const core = LOGIC.create();
  const PIECES = core.PIECES;
  const GOALS = core.GOALS;
  const TUTORIAL = core.TUTORIAL;
  const escapeHtml = core.escapeHtml;
  const canonical = core.canonical;
  const sameBuild = core.sameBuild;
  const physicalLayer = core.physicalLayer;

  const BOARD_VIEWBOX = { width: 520, height: 420 };
  const BOARD_TRANSFORM = { x: 170, y: 62, scale: 2 };
  const BOARD_GRADIENT_SCOPE = "builder-board";

  let container = null;
  let options = {};
  const state = {
    mode: "tutorial",
    tutorialStep: 0,
    tutorialComplete: false,
    freeBuildUnlocked: false,
    stockTutorialComplete: false,
    internalLogisticsComplete: false,
    availableStock: {},
    productId: "A",
    selectedType: "yellow_8",
    rotated: false,
    bricks: [],
    stockHintOpen: false,
    feedback: { kind: "info", text: "Lees de klantvraag en kies het eerste blokje." }
  };

  function rotateSelectedPiece() {
    const piece = PIECES[state.selectedType];
    if (!piece || piece.width === piece.depth) {
      state.feedback = { kind: "info", text: "Een vierkant 2×2-blokje hoeft niet te worden gedraaid." };
      render();
      return;
    }
    state.rotated = !state.rotated;
    const current = currentPiece();
    state.feedback = {
      kind: "info",
      text: `Oriëntatie gedraaid: ${current.label} (${current.width}×${current.depth}).`
    };
    emit("rotate_lego_brick", {
      selectedType: state.selectedType,
      rotated: state.rotated,
      dimensions: `${current.width}x${current.depth}`
    });
    render();
  }

  function validateBuildStrict(productId, bricks) {
    return core.validateBuildStrict(GOALS, productId, bricks);
  }

  function validateBuild(productId, bricks) {
    return core.validateBuild(GOALS, productId, bricks);
  }

  function isExpectedTutorialBrick(candidate) {
    const expected = GOALS.A.bricks.slice(0, TUTORIAL[state.tutorialStep].expectedCount);
    return expected.some(brick => canonical(brick) === canonical(candidate))
      && !state.bricks.some(brick => canonical(brick) === canonical(candidate));
  }

  function tutorialPlacementTarget(type, x, y) {
    if (state.mode !== "tutorial" || state.tutorialComplete) return null;
    return GOALS.A.bricks
      .slice(0, TUTORIAL[state.tutorialStep].expectedCount)
      .filter(target => (
        target.type === type
        && !state.bricks.some(brick => canonical(brick) === canonical(target))
      ))
      .sort((left, right) => (
        Math.hypot(left.x - x, left.y - y) - Math.hypot(right.x - x, right.y - y)
      ))[0] || null;
  }

  function supportedLayer(x, y, width, depth) {
    return core.supportedLayer(state.bricks, x, y, width, depth);
  }

  function currentPiece() {
    return core.resolvePiece(PIECES, state.selectedType, state.rotated);
  }

  function tutorialRotationForPiece(type) {
    const piece = PIECES[type];
    if (!piece || piece.width === piece.depth) return false;
    const targets = state.mode === "tutorial" && !state.tutorialComplete
      ? GOALS.A.bricks.slice(0, TUTORIAL[state.tutorialStep].expectedCount)
      : GOALS[state.productId].bricks;
    const expected = targets
      .find(target => target.type === type && !state.bricks.some(brick => canonical(brick) === canonical(target)));
    return Boolean(expected && expected.width === piece.depth && expected.depth === piece.width);
  }

  function emit(actionType, data = {}) {
    if (typeof options.onEvent === "function") options.onEvent(actionType, data);
  }

  function animateRejection() {
    requestAnimationFrame(() => {
      const selected = container?.querySelector(`[data-piece-type="${state.selectedType}"]`);
      const board = container?.querySelector(".builder-board");
      selected?.classList.add("is-rejected");
      board?.classList.add("is-rejected");
      window.setTimeout(() => {
        selected?.classList.remove("is-rejected");
        board?.classList.remove("is-rejected");
      }, 430);
    });
  }

  function reject(text, reason) {
    state.feedback = { kind: "error", text };
    emit("reject_lego_brick", { reason, productId: state.productId, selectedType: state.selectedType });
    render();
    animateRejection();
  }

  function placeAt(x, y) {
    let piece = currentPiece();
    if (!piece) return;
    if (state.mode === "stock_waiting") {
      reject("De blokken zijn op. Haal eerst de nieuwe bouwvoorraad uit de magazijnen.", "stock_not_collected");
      return;
    }
    if (state.mode === "stock_build" && (state.availableStock[piece.id] || 0) <= 0) {
      reject(`${piece.label} is niet meer beschikbaar in je bouwvoorraad.`, "tutorial_stock_empty");
      return;
    }
    const tutorialTarget = tutorialPlacementTarget(piece.id, x, y);
    if (tutorialTarget) {
      const basePiece = PIECES[piece.id];
      state.rotated = (
        basePiece.width !== basePiece.depth
        && tutorialTarget.width === basePiece.depth
        && tutorialTarget.depth === basePiece.width
      );
      piece = currentPiece();
      x = tutorialTarget.x;
      y = tutorialTarget.y;
    }
    const snappedX = Math.max(0, Math.min(6 - piece.width, Math.round(x)));
    const snappedY = Math.max(0, Math.min(6 - piece.depth, Math.round(y)));
    const z = supportedLayer(snappedX, snappedY, piece.width, piece.depth);
    if (z === null) {
      reject("Dit blok heeft geen vlak, volledig ondersteund oppervlak.", "unsupported_surface");
      return;
    }
    const candidate = {
      type: piece.id,
      color: piece.color,
      x: snappedX,
      y: snappedY,
      width: piece.width,
      depth: piece.depth,
      z
    };
    if (state.mode === "tutorial" && !isExpectedTutorialBrick(candidate)) {
      reject("Kies het blokje met dezelfde kleur en hetzelfde formaat als het transparante hulpblok.", "tutorial_mismatch");
      return;
    }
    state.bricks.push(candidate);
    if (state.mode === "stock_build") {
      state.availableStock[piece.id] -= 1;
      if (state.availableStock[piece.id] <= 0) {
        const nextBrick = GOALS[state.productId].bricks.find(
          brick => !state.bricks.some(placed => canonical(placed) === canonical(brick))
            && (state.availableStock[brick.type] || 0) > 0
        );
        if (nextBrick) {
          state.selectedType = nextBrick.type;
          state.rotated = false;
        }
      }
    }
    state.feedback = { kind: "success", text: `${piece.label} vastgeklikt op laag ${z + 1}.` };
    emit("place_lego_brick", { productId: state.productId, brick: { ...candidate }, mode: state.mode });
    advanceTutorial();
    render();
  }

  function advanceTutorial() {
    if (state.mode !== "tutorial") return;
    const step = TUTORIAL[state.tutorialStep];
    const expected = GOALS.A.bricks.slice(0, step.expectedCount);
    if (!sameBuild(state.bricks, expected)) return;
    if (state.tutorialStep < TUTORIAL.length - 1) {
      state.tutorialStep += 1;
      const nextType = GOALS.A.bricks[state.bricks.length].type;
      state.selectedType = nextType;
      state.rotated = nextType === "red_8";
      state.feedback = { kind: "success", text: `Goed. Stap ${state.tutorialStep + 1} staat klaar.` };
      emit("complete_lego_tutorial_step", { step: state.tutorialStep, productId: "A" });
      return;
    }
    state.tutorialComplete = true;
    state.feedback = { kind: "success", text: "" };
  }

  function boardPoint(event) {
    const board = event.currentTarget;
    const rect = board.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * BOARD_VIEWBOX.width,
      y: ((event.clientY - rect.top) / rect.height) * BOARD_VIEWBOX.height
    };
  }

  function boardProjection(x, y, z) {
    const [localX, localY] = window.LegoTowerRenderer.iso(x, y, z);
    return {
      x: BOARD_TRANSFORM.x + localX * BOARD_TRANSFORM.scale,
      y: BOARD_TRANSFORM.y + localY * BOARD_TRANSFORM.scale
    };
  }

  function snapCandidate(event) {
    const piece = currentPiece();
    const pointer = boardPoint(event);
    const candidates = [];
    for (let x = 0; x <= 6 - piece.width; x += 1) {
      for (let y = 0; y <= 6 - piece.depth; y += 1) {
        const z = supportedLayer(x, y, piece.width, piece.depth);
        if (z === null) continue;
        const projected = boardProjection(
          x + piece.width / 2,
          y + piece.depth / 2,
          physicalLayer(z) + 0.04
        );
        candidates.push({
          x,
          y,
          z,
          distance: Math.hypot(projected.x - pointer.x, projected.y - pointer.y)
        });
      }
    }
    return candidates.sort((left, right) => left.distance - right.distance || right.z - left.z)[0] || null;
  }

  function startFreeBuild(productId = state.productId) {
    state.mode = "free";
    state.productId = GOALS[productId] ? productId : "A";
    state.selectedType = GOALS[state.productId].bricks[0].type;
    state.rotated = false;
    state.bricks = [];
    state.feedback = { kind: "info", text: `Nieuwe klantbestelling: bouw ${GOALS[state.productId].name}.` };
    emit("start_lego_build", { productId: state.productId });
    render();
  }

  function prepareStockTutorial(productId = "B") {
    state.mode = "stock_waiting";
    state.productId = GOALS[productId] ? productId : "B";
    state.selectedType = GOALS[state.productId].bricks[0].type;
    state.rotated = false;
    state.bricks = [];
    state.availableStock = {};
    state.stockTutorialComplete = false;
    state.internalLogisticsComplete = false;
    state.feedback = {
      kind: "error",
      text: `Nieuwe bestelling: ${GOALS[state.productId].name}. Het blokkenpalet is leeg; haal eerst voorraad op.`
    };
    emit("show_tutorial_stockout", { productId: state.productId });
    render();
  }

  function setStockTutorialInventory(stock = {}) {
    state.mode = "stock_build";
    state.availableStock = Object.fromEntries(
      Object.keys(PIECES).map(partId => [partId, Math.max(0, Number(stock[partId] || 0))])
    );
    state.selectedType = GOALS[state.productId].bricks.find(
      brick => (state.availableStock[brick.type] || 0) > 0
    )?.type || GOALS[state.productId].bricks[0].type;
    state.rotated = false;
    state.bricks = [];
    state.feedback = {
      kind: "success",
      text: "De opgehaalde onderdelen zijn bij de bouwafdeling aangekomen. Bouw nu Toren B."
    };
    emit("start_stock_tutorial_build", {
      productId: state.productId,
      availableStock: { ...state.availableStock }
    });
    render();
  }

  function resetBuild() {
    if (state.mode === "stock_build") {
      state.bricks.forEach(brick => {
        state.availableStock[brick.type] = (state.availableStock[brick.type] || 0) + 1;
      });
    }
    state.bricks = [];
    if (state.mode === "tutorial") {
      state.tutorialStep = 0;
      state.tutorialComplete = false;
      state.freeBuildUnlocked = false;
      state.productId = "A";
      state.selectedType = "yellow_8";
    } else {
      state.selectedType = GOALS[state.productId].bricks[0].type;
    }
    state.rotated = false;
    state.feedback = { kind: "info", text: "De grondplaat is leeggemaakt." };
    emit("reset_lego_build", { productId: state.productId, mode: state.mode });
    render();
  }

  function restartTutorial() {
    state.mode = "tutorial";
    state.tutorialStep = 0;
    state.tutorialComplete = false;
    state.freeBuildUnlocked = false;
    state.stockTutorialComplete = false;
    state.internalLogisticsComplete = false;
    state.availableStock = {};
    state.productId = "A";
    state.selectedType = "yellow_8";
    state.rotated = false;
    state.bricks = [];
    state.feedback = { kind: "info", text: "Lees de klantvraag en kies het eerste blokje." };
    emit("restart_lego_tutorial", { productId: "A" });
    render();
  }

  function undo() {
    const removed = state.bricks.pop();
    if (!removed) return;
    if (state.mode === "stock_build") {
      state.availableStock[removed.type] = (state.availableStock[removed.type] || 0) + 1;
    }
    state.feedback = { kind: "info", text: `${PIECES[removed.type].label} verwijderd.` };
    emit("undo_lego_brick", { productId: state.productId, brick: removed });
    render();
  }

  function deliver() {
    if (state.mode === "stock_waiting") {
      if (typeof options.onTutorialNextRequested === "function") {
        options.onTutorialNextRequested();
      }
      return;
    }
    if (state.mode === "stock_build" && state.stockTutorialComplete) {
      if (!state.internalLogisticsComplete) {
        emit("complete_stock_tutorial_build", {
          productId: state.productId,
          brickCount: state.bricks.length
        });
        return;
      }
      startFreeBuild(state.productId);
      return;
    }
    if (state.mode === "tutorial") {
      if (!state.tutorialComplete) {
        reject("Maak eerst alle drie tutorialstappen af.", "tutorial_incomplete");
        return;
      }
      emit("complete_lego_tutorial", { productId: "A" });
      return;
    }
    const check = validateBuildStrict(state.productId, state.bricks);
    const correct = check.valid;
    if (correct) {
      state.feedback = {
        kind: "success",
        text: `${GOALS[state.productId].name} klopt exact qua maten, lagen én oriëntatie (kwaliteitscontrole goedgekeurd).`
      };
    } else if (check.reason === "quality_orientation_mismatch") {
      state.feedback = {
        kind: "error",
        text: "Kwaliteitscontrole afgekeurd: De toren staat in een foutieve oriëntatie / draairichting. Voldoet niet aan de kwaliteitseisen."
      };
    } else {
      state.feedback = {
        kind: "error",
        text: "Kwaliteitscontrole afgekeurd: De levering wijkt af in kleuren, maten, posities of lagen."
      };
    }
    emit("validate_lego_delivery", {
      productId: state.productId,
      result: correct ? "correct" : "incorrect",
      reason: check.reason,
      brickCount: state.bricks.length
    });
    if (typeof options.onDelivered === "function") {
      options.onDelivered({ productId: state.productId, correct, bricks: state.bricks.map(brick => ({ ...brick })) });
    }
    if (state.mode === "stock_build" && correct) {
      state.stockTutorialComplete = true;
    }
    render();
    if (!correct) animateRejection();
  }

  function brickMarkup(brick) {
    const piece = PIECES[brick.type];
    return window.LegoTowerRenderer.brick(
      brick.x,
      brick.y,
      physicalLayer(brick.z),
      brick.width,
      brick.depth,
      piece.color,
      BOARD_GRADIENT_SCOPE
    );
  }

  function targetMarkup() {
    let expected = [];
    if (state.mode === "tutorial" && !state.tutorialComplete) {
      expected = GOALS.A.bricks.slice(0, TUTORIAL[state.tutorialStep].expectedCount);
    }
    return expected
      .filter(target => !state.bricks.some(brick => canonical(brick) === canonical(target)))
      .map(target => {
        const piece = PIECES[target.type];
        if (!piece) return "";
        return `
          <g class="builder-target" aria-hidden="true">
            ${window.LegoTowerRenderer.brick(
              target.x,
              target.y,
              physicalLayer(target.z),
              target.width,
              target.depth,
              piece.color,
              BOARD_GRADIENT_SCOPE
            )}
          </g>
        `;
      }).join("");
  }

  function boardMarkup() {
    if (!window.LegoTowerRenderer) {
      return '<p class="builder-feedback is-error">De isometrische LEGO-renderer kon niet worden geladen.</p>';
    }
    const sortedBricks = [...state.bricks].sort((left, right) => (
      left.z - right.z
      || (left.x + left.y) - (right.x + right.y)
      || left.x - right.x
    ));
    return `
      <svg class="builder-board"
           viewBox="0 0 ${BOARD_VIEWBOX.width} ${BOARD_VIEWBOX.height}"
           role="application"
           tabindex="0"
           aria-label="Isometrische groene 6 bij 6 LEGO-grondplaat. Gebruik de middelste muisknop, scrollwiel of R om te draaien.">
        <defs>
          ${window.LegoTowerRenderer.definitions(BOARD_GRADIENT_SCOPE)}
          <filter id="builderBoardShadow" x="-30%" y="-30%" width="170%" height="190%">
            <feDropShadow dx="0" dy="7" stdDeviation="5" flood-color="#173d26" flood-opacity="0.25"></feDropShadow>
          </filter>
        </defs>
        <ellipse cx="350" cy="357" rx="150" ry="30" fill="rgba(28, 54, 39, 0.16)"></ellipse>
        <g class="builder-isometric-scene"
           transform="translate(${BOARD_TRANSFORM.x} ${BOARD_TRANSFORM.y}) scale(${BOARD_TRANSFORM.scale})"
           filter="url(#builderBoardShadow)">
          ${window.LegoTowerRenderer.plate(
            0,
            0,
            0,
            6,
            6,
            "green",
            BOARD_GRADIENT_SCOPE
          )}
          ${sortedBricks.map(brickMarkup).join("")}
          ${targetMarkup()}
        </g>
      </svg>
    `;
  }

  function paletteMarkup() {
    const stockBound = state.mode === "stock_waiting" || state.mode === "stock_build";
    const allowedTypes = stockBound
      ? new Set(GOALS[state.productId].bricks.map(brick => brick.type))
      : null;
    return Object.values(PIECES)
      .filter(piece => !allowedTypes || allowedTypes.has(piece.id))
      .map(piece => {
        const available = state.mode === "stock_build" ? (state.availableStock[piece.id] || 0) : 0;
        const outOfStock = stockBound && (state.mode === "stock_waiting" || available <= 0);
        const isRotated = state.selectedType === piece.id && state.rotated && piece.width !== piece.depth;
        return `
      <button type="button"
              class="builder-palette-item brick-${piece.color}${state.selectedType === piece.id ? " is-selected" : ""}${outOfStock ? " is-out-of-stock" : ""}"
              data-piece-type="${piece.id}"
              ${outOfStock ? 'data-out-of-stock data-tooltip="Geen blokjes meer in voorraad"' : ""}
              draggable="${outOfStock ? "false" : "true"}"
              aria-disabled="${outOfStock}"
              aria-label="${escapeHtml(piece.label)}${isRotated ? ", oriëntatie gedraaid 90 graden" : ""}${outOfStock ? ", geen blokjes meer in voorraad" : stockBound ? `, ${available} beschikbaar` : ""}"
              aria-pressed="${state.selectedType === piece.id}">
        ${window.LegoTowerRenderer
          ? window.LegoTowerRenderer.renderPart(
              { id: piece.id, color: piece.color, width: piece.width === 2 && piece.depth === 4 ? "wide" : "narrow" },
              piece.label
            )
          : `<span class="palette-brick-shape ${piece.width === 2 && piece.depth === 2 ? "is-square" : ""}"></span>`}
        ${isRotated ? `<span class="builder-rotate-badge" title="Gedraaid 90° (Middelste muisknop / R)" aria-hidden="true">90°</span>` : ""}
        ${stockBound ? `<span class="builder-stock-count" aria-hidden="true">${available}</span>` : ""}
      </button>
    `;
      }).join("");
  }

  function stockHintMarkup() {
    if (!state.stockHintOpen) return "";
    return `
      <div class="builder-stock-hint-backdrop" role="presentation">
        <section class="builder-stock-hint" role="dialog" aria-modal="true"
                 aria-labelledby="builderStockHintTitle"
                 aria-describedby="builderStockHintText">
          <div class="builder-stock-hint-icon" aria-hidden="true">0</div>
          <p class="eyebrow">Voorraadmelding</p>
          <h3 id="builderStockHintTitle">Geen blokjes meer in voorraad</h3>
          <p id="builderStockHintText">Hint: haal voorraad uit het magazijn.</p>
          <button type="button" class="primary-button" data-close-stock-hint>Begrepen</button>
        </section>
      </div>
    `;
  }

  function render() {
    if (!container) return;
    const goal = GOALS[state.productId];
    // The order card is the learner's blueprint: keep showing the complete
    // tower, even while the board guidance advances one tutorial step at a time.
    const orderSequence = goal.sequence;
    const orderVisual = window.LegoTowerRenderer
      ? window.LegoTowerRenderer.renderAnimated(
          orderSequence,
          state.mode === "tutorial"
            ? "Volledig bouwvoorbeeld van Toren A"
            : `Geanimeerde bouw van ${goal.name}`,
          "builder-order-animation"
        )
      : `<span class="builder-order-visual-fallback" role="img"
               aria-label="${escapeHtml(goal.name)}"></span>`;
    const firstTowerComplete = state.mode === "tutorial" && state.tutorialComplete;
    const warehouseNext = state.mode === "stock_waiting";
    const deliverLabel = firstTowerComplete
      ? "Volgende stap"
      : warehouseNext
      ? "Naar de magazijnen"
      : state.mode === "stock_build" && state.stockTutorialComplete && !state.internalLogisticsComplete
        ? "Ga verder"
        : state.mode === "stock_build" && state.stockTutorialComplete
          ? "Naar de volgende opdracht"
          : "Lever de toren";
    const deliverIcon = firstTowerComplete
      ? "→"
      : warehouseNext
      ? `<svg class="builder-warehouse-icon" viewBox="0 0 32 32" aria-hidden="true">
          <path d="M3 14 16 5l13 9v14H3V14Z"></path>
          <path d="M8 14h16M9 18h5v10H9V18Zm9 0h5v4h-5v-4Zm0 7h5v3h-5v-3Z"></path>
        </svg>`
      : state.stockTutorialComplete
        ? "→"
        : "✓";
    const catalog = state.mode === "free"
      ? `
        <div class="builder-catalog" aria-label="Productcatalogus">
          ${Object.values(GOALS).map(product => `
            <button type="button" data-product-id="${product.name.slice(-1)}"
                    class="${state.productId === product.name.slice(-1) ? "is-selected" : ""}">
              ${escapeHtml(product.name)}
            </button>
          `).join("")}
        </div>
      `
      : "";
    const deliverButton = state.mode === "tutorial" && !state.tutorialComplete
      ? ""
      : `
        <button type="button"
                class="primary-button builder-icon-button builder-deliver"
                aria-label="${escapeHtml(deliverLabel)}"
                title="${escapeHtml(deliverLabel)}">
          ${deliverIcon}
        </button>
      `;
    const showCompletion = state.mode === "tutorial" && state.tutorialComplete
      || state.mode === "stock_build" && state.stockTutorialComplete && !state.internalLogisticsComplete;
    const completion = showCompletion
      ? `
        <section class="builder-step-complete" role="status" aria-live="polite">
          <span aria-hidden="true">✓</span>
          <div>
            <strong>Gefeliciteerd!</strong>
            <p>Je hebt deze stap onder de knie.</p>
          </div>
        </section>
      `
      : "";
    container.innerHTML = `
      <div class="lego-builder-shell">
        ${stockHintMarkup()}
        <header class="builder-order-card">
          <div>
            <p class="eyebrow">Klantbestelling · Kwaliteitscontrole</p>
            <h3>Je bent leverancier van LEGO-torens.</h3>
            <p class="builder-customer-request">Een klant wil deze toren. Bouw de toren exact volgens specificatie (positie én oriëntatie voor kwaliteitscontrole).</p>
          </div>
          ${orderVisual}
        </header>
        ${completion}
        ${catalog}
        <div class="builder-workspace">
          <aside class="builder-palette" aria-label="Lego-blokkenpalet">
            <div class="builder-palette-grid">${paletteMarkup()}</div>
          </aside>
          <div class="builder-board-column">
            ${boardMarkup()}
          </div>
          <aside class="builder-actions" aria-label="Bouwacties">
            ${deliverButton}
            <button type="button"
                    class="secondary-button builder-icon-button builder-rotate"
                    aria-label="Blokje 90° draaien (R / Middelste muisknop / Scrollwiel)"
                    title="Blokje 90° draaien (Middelste muisknop / Scrollwiel / Hotkey 'R')">
              🔄
            </button>
            <button type="button"
                    class="secondary-button builder-icon-button builder-undo"
                    aria-label="Laatste bewerking terugdraaien"
                    title="Laatste bewerking terugdraaien"
                    ${state.bricks.length ? "" : "disabled"}>↶</button>
            <button type="button"
                    class="secondary-button builder-icon-button builder-reset"
                    aria-label="Grondplaat leegmaken"
                    title="Grondplaat leegmaken">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13M10 10v7m4-7v7"></path>
              </svg>
            </button>
          </aside>
        </div>
      </div>
    `;
    wire();
  }

  function wire() {
    container.querySelectorAll("[data-piece-type]").forEach(button => {
      button.addEventListener("click", event => {
        if (button.hasAttribute("data-out-of-stock")) {
          event.preventDefault();
          state.stockHintOpen = true;
          render();
          container.querySelector("[data-close-stock-hint]")?.focus();
          return;
        }
        if (state.mode === "tutorial" && !state.tutorialComplete) {
          state.selectedType = button.dataset.pieceType;
          state.rotated = tutorialRotationForPiece(state.selectedType);
          render();
          return;
        }
        if (state.selectedType === button.dataset.pieceType) {
          rotateSelectedPiece();
        } else {
          state.selectedType = button.dataset.pieceType;
          state.rotated = tutorialRotationForPiece(state.selectedType);
          render();
        }
      });
      button.addEventListener("dragstart", event => {
        if (button.hasAttribute("data-out-of-stock")) {
          event.preventDefault();
          return;
        }
        state.selectedType = button.dataset.pieceType;
        state.rotated = tutorialRotationForPiece(state.selectedType);
        event.dataTransfer.setData("text/plain", state.selectedType);
        event.dataTransfer.effectAllowed = "copy";
      });
    });
    container.querySelector("[data-close-stock-hint]")?.addEventListener("click", () => {
      state.stockHintOpen = false;
      render();
      container.querySelector("[data-out-of-stock]")?.focus();
    });
    container.querySelectorAll("[data-product-id]").forEach(button => {
      button.addEventListener("click", () => startFreeBuild(button.dataset.productId));
    });
    const board = container.querySelector(".builder-board");
    if (board) {
      board.addEventListener("dragover", event => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
      });
      board.addEventListener("drop", event => {
        event.preventDefault();
        const type = event.dataTransfer.getData("text/plain");
        if (PIECES[type]) state.selectedType = type;
        const candidate = snapCandidate(event);
        if (candidate) placeAt(candidate.x, candidate.y);
      });
      // Click on board places candidate, or middle click / scroll wheel rotates
      board.addEventListener("mousedown", event => {
        if (event.button === 1) {
          event.preventDefault();
          rotateSelectedPiece();
        }
      });
      board.addEventListener("auxclick", event => {
        if (event.button === 1) {
          event.preventDefault();
          rotateSelectedPiece();
        }
      });
      board.addEventListener("wheel", event => {
        event.preventDefault();
        rotateSelectedPiece();
      }, { passive: false });
    }

    container.querySelector(".builder-rotate")?.addEventListener("click", rotateSelectedPiece);
    container.querySelector(".builder-deliver")?.addEventListener("click", deliver);
    container.querySelector(".builder-undo")?.addEventListener("click", undo);
    container.querySelector(".builder-reset")?.addEventListener("click", resetBuild);

    const handleKeyDown = event => {
      if (!container || !container.offsetParent) return;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)) return;
      if (event.key === "r" || event.key === "R") {
        event.preventDefault();
        rotateSelectedPiece();
      }
    };
    if (container._handleRotateKey) {
      window.removeEventListener("keydown", container._handleRotateKey);
    }
    container._handleRotateKey = handleKeyDown;
    window.addEventListener("keydown", container._handleRotateKey);
  }

  function mount(target, mountOptions = {}) {
    container = target;
    options = mountOptions;
    render();
  }

  function setProduct(productId) {
    if (!GOALS[productId]) return false;
    state.productId = productId;
    if (state.mode === "free") startFreeBuild(productId);
    return true;
  }

  function registerProduct(product) {
    const goal = core.buildProductGoal(PIECES, product);
    if (!goal) return false;
    GOALS[product.id] = goal;
    return true;
  }

  function unregisterProduct(productId) {
    if (core.isBuiltinProduct(productId) || !GOALS[productId]) return false;
    delete GOALS[productId];
    if (state.productId === productId) {
      state.productId = "A";
      state.selectedType = GOALS.A.bricks[0].type;
      state.bricks = [];
      state.feedback = {
        kind: "info",
        text: "Het verwijderde ontwerp was actief. Toren A is opnieuw geselecteerd."
      };
      render();
    }
    return true;
  }

  function setFreeBuildUnlocked(unlocked) {
    state.freeBuildUnlocked = Boolean(unlocked);
    if (state.freeBuildUnlocked && state.mode === "tutorial" && state.tutorialComplete) {
      state.feedback = {
        kind: "success",
        text: "Voorraad compleet en bij Assemblage. De vrije opdracht is ontgrendeld."
      };
    }
    render();
  }

  function setInternalLogisticsComplete(completed) {
    state.internalLogisticsComplete = Boolean(completed);
    state.freeBuildUnlocked = state.internalLogisticsComplete;
    if (state.internalLogisticsComplete && state.mode === "stock_build" && state.stockTutorialComplete) {
      state.feedback = {
        kind: "success",
        text: "Stap 3 is voltooid. Je kunt nu verder naar een vrije opdracht."
      };
    }
    render();
  }

  function skipTutorial() {
    const productId = GOALS[state.productId] ? state.productId : "A";
    state.tutorialComplete = true;
    state.stockTutorialComplete = true;
    state.internalLogisticsComplete = true;
    state.freeBuildUnlocked = true;
    emit("skip_lego_tutorial", { productId });
    startFreeBuild(productId);
  }

  window.LegoBuilder = {
    mount,
    setProduct,
    registerProduct,
    unregisterProduct,
    startFreeBuild,
    prepareStockTutorial,
    setStockTutorialInventory,
    reset: resetBuild,
    restartTutorial,
    setFreeBuildUnlocked,
    setInternalLogisticsComplete,
    skipTutorial,
    validateBuild,
    getCatalog: () => Object.fromEntries(
      Object.entries(GOALS).map(([productId, goal]) => [
        productId,
        { ...goal, bricks: goal.bricks.map(brick => ({ ...brick })) }
      ])
    ),
    getSnapshot: () => ({
      mode: state.mode,
      tutorialStep: state.tutorialStep,
      tutorialComplete: state.tutorialComplete,
      freeBuildUnlocked: state.freeBuildUnlocked,
      stockTutorialComplete: state.stockTutorialComplete,
      internalLogisticsComplete: state.internalLogisticsComplete,
      availableStock: { ...state.availableStock },
      productId: state.productId,
      selectedType: state.selectedType,
      rotated: state.rotated,
      bricks: state.bricks.map(brick => ({ ...brick }))
    })
  };
})();
