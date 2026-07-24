(() => {
  "use strict";

  const PIECES = {
    yellow_8: { id: "yellow_8", label: "Geel 2×4", color: "yellow", width: 2, depth: 4 },
    red_8: { id: "red_8", label: "Rood 2×4", color: "red", width: 2, depth: 4 },
    white_4: { id: "white_4", label: "Wit 2×2", color: "white", width: 2, depth: 2 },
    blue_8: { id: "blue_8", label: "Blauw 2×4", color: "blue", width: 2, depth: 4 },
    yellow_4: { id: "yellow_4", label: "Geel 2×2", color: "yellow", width: 2, depth: 2 },
    green_4: { id: "green_4", label: "Groen 2×2", color: "green", width: 2, depth: 2 },
    white_8: { id: "white_8", label: "Wit 2×4", color: "white", width: 2, depth: 4 },
    blue_4: { id: "blue_4", label: "Blauw 2×2", color: "blue", width: 2, depth: 2 },
    red_4: { id: "red_4", label: "Rood 2×2", color: "red", width: 2, depth: 2 }
  };

  const GOALS = {
    A: {
      name: "Toren A",
      sequence: ["yellow_8", "yellow_8", "red_8", "white_4"],
      request: "Bouw twee gele 2×4-blokken, een rood 2×4-blok en een wit 2×2-blok.",
      bricks: [
        { type: "yellow_8", x: 1, y: 1, width: 2, depth: 4, z: 0 },
        { type: "yellow_8", x: 3, y: 1, width: 2, depth: 4, z: 0 },
        { type: "red_8", x: 1, y: 2, width: 4, depth: 2, z: 1 },
        { type: "white_4", x: 2, y: 2, width: 2, depth: 2, z: 2 }
      ]
    },
    B: {
      name: "Toren B",
      sequence: ["blue_8", "blue_8", "yellow_4", "green_4"],
      request: "Bouw twee blauwe 2×4-blokken met daarop geel 2×2 en groen 2×2.",
      bricks: [
        { type: "blue_8", x: 1, y: 1, width: 2, depth: 4, z: 0 },
        { type: "blue_8", x: 3, y: 1, width: 2, depth: 4, z: 0 },
        { type: "yellow_4", x: 2, y: 2, width: 2, depth: 2, z: 1 },
        { type: "green_4", x: 2, y: 2, width: 2, depth: 2, z: 2 }
      ]
    },
    C: {
      name: "Toren C",
      sequence: ["white_8", "white_8", "blue_4", "red_4"],
      request: "Bouw twee witte 2×4-blokken met daarop blauw 2×2 en rood 2×2.",
      bricks: [
        { type: "white_8", x: 1, y: 1, width: 2, depth: 4, z: 0 },
        { type: "white_8", x: 3, y: 1, width: 2, depth: 4, z: 0 },
        { type: "blue_4", x: 2, y: 2, width: 2, depth: 2, z: 1 },
        { type: "red_4", x: 2, y: 2, width: 2, depth: 2, z: 2 }
      ]
    }
  };

  const TUTORIAL = [
    {
      expectedCount: 2,
      sequence: ["yellow_8", "yellow_8"]
    },
    {
      expectedCount: 3,
      sequence: ["yellow_8", "yellow_8", "red_8"]
    },
    {
      expectedCount: 4,
      sequence: ["yellow_8", "yellow_8", "red_8", "white_4"]
    }
  ];

  const BOARD_VIEWBOX = { width: 520, height: 420 };
  const BOARD_TRANSFORM = { x: 170, y: 62, scale: 2 };

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

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function canonical(brick) {
    return `${brick.type}:${brick.x}:${brick.y}:${brick.width}:${brick.depth}:${brick.z}`;
  }

  function sameBuild(actual, expected) {
    return actual.map(canonical).sort().join("|") === expected.map(canonical).sort().join("|");
  }

  function rotateBrick(brick) {
    return {
      ...brick,
      x: -brick.y - brick.depth,
      y: brick.x,
      width: brick.depth,
      depth: brick.width
    };
  }

  function normalizedSignature(bricks) {
    if (!bricks.length) return "";
    const minX = Math.min(...bricks.map(brick => brick.x));
    const minY = Math.min(...bricks.map(brick => brick.y));
    return bricks
      .map(brick => canonical({ ...brick, x: brick.x - minX, y: brick.y - minY }))
      .sort()
      .join("|");
  }

  function validateBuild(productId, bricks) {
    if (!GOALS[productId] || !Array.isArray(bricks)) return false;
    const actualSignature = normalizedSignature(bricks);
    let expected = GOALS[productId].bricks.map(brick => ({ ...brick }));
    for (let turn = 0; turn < 4; turn += 1) {
      if (actualSignature === normalizedSignature(expected)) return true;
      expected = expected.map(rotateBrick);
    }
    return false;
  }

  function isExpectedTutorialBrick(candidate) {
    const expected = GOALS.A.bricks.slice(0, TUTORIAL[state.tutorialStep].expectedCount);
    return expected.some(brick => canonical(brick) === canonical(candidate))
      && !state.bricks.some(brick => canonical(brick) === canonical(candidate));
  }

  function surfaceAt(x, y) {
    return state.bricks.reduce((height, brick) => {
      const covers = x >= brick.x && x < brick.x + brick.width && y >= brick.y && y < brick.y + brick.depth;
      return covers ? Math.max(height, brick.z + 1) : height;
    }, 0);
  }

  function supportedLayer(x, y, width, depth) {
    const heights = [];
    for (let px = x; px < x + width; px += 1) {
      for (let py = y; py < y + depth; py += 1) heights.push(surfaceAt(px, py));
    }
    return heights.every(height => height === heights[0]) ? heights[0] : null;
  }

  function currentPiece() {
    const piece = PIECES[state.selectedType];
    if (!piece) return null;
    const rotate = state.rotated && piece.width !== piece.depth;
    return {
      ...piece,
      width: rotate ? piece.depth : piece.width,
      depth: rotate ? piece.width : piece.depth
    };
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
    const piece = currentPiece();
    if (!piece) return;
    if (state.mode === "stock_waiting") {
      reject("De blokken zijn op. Haal eerst de nieuwe bouwvoorraad uit de magazijnen.", "stock_not_collected");
      return;
    }
    if (state.mode === "stock_build" && (state.availableStock[piece.id] || 0) <= 0) {
      reject(`${piece.label} is niet meer beschikbaar in je bouwvoorraad.`, "tutorial_stock_empty");
      return;
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
      reject("Dit blok hoort hier nog niet. Volg de gemarkeerde tutorialstap.", "tutorial_mismatch");
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

  function physicalLayer(z) {
    return 0.22 + z * 0.78;
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
    const correct = validateBuild(state.productId, state.bricks);
    state.feedback = correct
      ? { kind: "success", text: `${GOALS[state.productId].name} klopt met de klantbestelling en kan worden geleverd.` }
      : { kind: "error", text: "De levering wijkt af: controleer kleuren, maten, lagen en posities." };
    emit("validate_lego_delivery", {
      productId: state.productId,
      result: correct ? "correct" : "incorrect",
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
      piece.color
    );
  }

  function targetMarkup() {
    let expected = [];
    if (state.mode === "tutorial" && !state.tutorialComplete) {
      expected = GOALS.A.bricks.slice(0, TUTORIAL[state.tutorialStep].expectedCount);
    } else if (state.mode === "stock_build" && !state.stockTutorialComplete) {
      const missing = GOALS[state.productId].bricks
        .filter(target => !state.bricks.some(brick => canonical(brick) === canonical(target)));
      const nextLayer = Math.min(...missing.map(target => target.z));
      expected = missing.filter(target => target.z === nextLayer);
    }
    return expected
      .filter(target => !state.bricks.some(brick => canonical(brick) === canonical(target)))
      .map(target => {
        const z = physicalLayer(target.z) + 0.05;
        const corners = [
          window.LegoTowerRenderer.iso(target.x, target.y, z),
          window.LegoTowerRenderer.iso(target.x + target.width, target.y, z),
          window.LegoTowerRenderer.iso(target.x + target.width, target.y + target.depth, z),
          window.LegoTowerRenderer.iso(target.x, target.y + target.depth, z)
        ];
        return `
          <g class="builder-target" aria-hidden="true">
            <polygon points="${corners.map(point => point.join(",")).join(" ")}"></polygon>
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
           aria-label="Isometrische groene 6 bij 6 LEGO-grondplaat">
        <defs>
          ${window.LegoTowerRenderer.definitions()}
          <filter id="builderBoardShadow" x="-30%" y="-30%" width="170%" height="190%">
            <feDropShadow dx="0" dy="7" stdDeviation="5" flood-color="#173d26" flood-opacity="0.25"></feDropShadow>
          </filter>
        </defs>
        <ellipse cx="350" cy="357" rx="150" ry="30" fill="rgba(28, 54, 39, 0.16)"></ellipse>
        <g class="builder-isometric-scene"
           transform="translate(${BOARD_TRANSFORM.x} ${BOARD_TRANSFORM.y}) scale(${BOARD_TRANSFORM.scale})"
           filter="url(#builderBoardShadow)">
          ${window.LegoTowerRenderer.plate(0, 0, 0, 6, 6, "green")}
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
        return `
      <button type="button"
              class="builder-palette-item brick-${piece.color}${state.selectedType === piece.id ? " is-selected" : ""}${outOfStock ? " is-out-of-stock" : ""}"
              data-piece-type="${piece.id}"
              ${outOfStock ? 'data-out-of-stock data-tooltip="Geen blokjes meer in voorraad"' : ""}
              draggable="${outOfStock ? "false" : "true"}"
              aria-disabled="${outOfStock}"
              aria-label="${escapeHtml(piece.label)}${outOfStock ? ", geen blokjes meer in voorraad" : stockBound ? `, ${available} beschikbaar` : ""}"
              aria-pressed="${state.selectedType === piece.id}">
        ${window.LegoTowerRenderer
          ? window.LegoTowerRenderer.renderPart(
              { id: piece.id, color: piece.color, width: piece.width === 2 && piece.depth === 4 ? "wide" : "narrow" },
              piece.label
            )
          : `<span class="palette-brick-shape ${piece.width === 2 && piece.depth === 2 ? "is-square" : ""}"></span>`}
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
    const orderSequence = state.mode === "tutorial"
      ? TUTORIAL[state.tutorialStep].sequence
      : goal.sequence;
    const orderVisual = window.LegoTowerRenderer
      ? window.LegoTowerRenderer.renderAnimated(
          orderSequence,
          state.mode === "tutorial"
            ? `Bouwvoorbeeld ${state.tutorialStep + 1} van Toren A`
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
            <p class="eyebrow">Klantbestelling</p>
            <h3>Je bent leverancier van LEGO-torens.</h3>
            <p class="builder-customer-request">Een klant wil deze toren.</p>
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
        if (!button.hasAttribute("data-out-of-stock")) return;
        event.preventDefault();
        state.stockHintOpen = true;
        render();
        container.querySelector("[data-close-stock-hint]")?.focus();
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
    board.addEventListener("dragover", event => {
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
    });
    board.addEventListener("drop", event => {
      event.preventDefault();
      const type = event.dataTransfer.getData("text/plain");
      if (PIECES[type]) state.selectedType = type;
      state.rotated = tutorialRotationForPiece(state.selectedType);
      const candidate = snapCandidate(event);
      if (candidate) placeAt(candidate.x, candidate.y);
    });
    container.querySelector(".builder-deliver")?.addEventListener("click", deliver);
    container.querySelector(".builder-undo").addEventListener("click", undo);
    container.querySelector(".builder-reset").addEventListener("click", resetBuild);
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
    const sequence = Array.isArray(product?.towerSequence)
      ? product.towerSequence.filter(pieceId => PIECES[pieceId])
      : [];
    const foundationCount = PIECES[sequence[0]]?.width === 2 && PIECES[sequence[0]]?.depth === 2
      ? 4
      : 2;
    if (
      !product?.id
      || !product?.name
      || sequence.length !== foundationCount + 2
      || !sequence.slice(0, foundationCount).every(type => (
        PIECES[type]?.width === PIECES[sequence[0]]?.width
        && PIECES[type]?.depth === PIECES[sequence[0]]?.depth
      ))
    ) {
      return false;
    }
    const foundationPositions = foundationCount === 4
      ? [[1, 1], [3, 1], [1, 3], [3, 3]]
      : [[1, 1], [3, 1]];
    const bricks = sequence.map((type, index) => {
      const piece = PIECES[type];
      if (index < foundationCount) {
        const [x, y] = foundationPositions[index];
        return { type, x, y, width: piece.width, depth: piece.depth, z: 0 };
      }
      const long = piece.width === 2 && piece.depth === 4;
      return {
        type,
        x: long ? 1 : 2,
        y: 2,
        width: long ? 4 : piece.width,
        depth: long ? 2 : piece.depth,
        z: index - foundationCount + 1
      };
    });
    GOALS[product.id] = {
      name: product.name,
      sequence,
      request: `Bouw ${product.name} volgens het ontwerp uit het productassortiment.`,
      bricks
    };
    return true;
  }

  function unregisterProduct(productId) {
    if (["A", "B", "C"].includes(productId) || !GOALS[productId]) return false;
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
