(() => {
  "use strict";

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function formatClock(timestamp) {
    return new Intl.DateTimeFormat("nl-NL", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    }).format(new Date(timestamp));
  }

  function formatCountdown(timestamp, now = Date.now()) {
    const remaining = Math.max(0, timestamp - now);
    const totalSeconds = Math.ceil(remaining / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  function eventTargetClosest(event, selector) {
    const target = event?.target;
    const element = typeof target?.closest === "function" ? target : target?.parentElement;
    return typeof element?.closest === "function" ? element.closest(selector) : null;
  }

  function towerMarkup(product) {
    if (
      window.LegoTowerRenderer
      && Array.isArray(product?.towerSequence)
      && product.towerSequence.length
    ) {
      return window.LegoTowerRenderer.renderAnimated(
        product.towerSequence,
        `Geanimeerde bouw van ${product.name}`,
        "sim-tower-renderer",
        product.groundPlate?.color || "green"
      );
    }
    const colors = Array.isArray(product?.colors) ? product.colors : ["yellow", "red", "white"];
    return `
      <div class="sim-tower" aria-label="${escapeHtml(product?.name || "LEGO-toren")}">
        <span class="sim-tower-layer is-top" style="--tower-color: var(--brick-${escapeHtml(colors[2])})"></span>
        <span class="sim-tower-layer" style="--tower-color: var(--brick-${escapeHtml(colors[1])})"></span>
        <span class="sim-tower-layer is-wide" style="--tower-color: var(--brick-${escapeHtml(colors[0])})"></span>
        <span class="sim-tower-base"></span>
      </div>
    `;
  }

  class LogisticsGameUIController {
    constructor(mount, options = {}) {
      if (!mount) throw new Error("Een mount-element is verplicht.");
      if (!window.LogisticsGameEngine) throw new Error("LogisticsGameEngine is niet geladen.");
      this.mount = mount;
      this.engine = options.engine || new window.LogisticsGameEngine.LogisticsGameEngine(options.engineOptions);
      this.selectedParts = {};
      this.signed = false;
      this.signatureStrokes = [];
      this.activeSignaturePointer = null;
      this.transferred = false;
      this.waitingTab = "flow";
      this.lastFlowSignature = "";
      this.taskKey = null;
      this.customerOrderDraft = null;
      this.digitalSelectedPartId = null;
      this.feedback = "";
      this.renderProcessFlow = typeof options.renderProcessFlow === "function"
        ? options.renderProcessFlow
        : null;
      this.unsubscribe = this.engine.subscribe(event => {
        if (
          event.type === "tick"
          && this.engine.playerTask()
          && this.mount.querySelector(".sim-countdown")
        ) {
          const countdown = this.mount.querySelector(".sim-countdown");
          countdown.textContent = formatCountdown(this.engine.playerTask().order.dueAt);
          return;
        }
        if (
          event.type === "tick"
          && !this.engine.playerTask()
          && this.waitingTab === "flow"
          && this.mount.querySelector("[data-sim-process-flow]")
        ) {
          const signature = this.processFlowSignature(event.snapshot);
          if (signature !== this.lastFlowSignature) {
            this.lastFlowSignature = signature;
            this.mountProcessFlow(event.snapshot);
          }
          return;
        }
        if (event.type === "player-action-required") this.resetPlayerInput();
        this.render();
      });
      this.handleClick = this.handleClick.bind(this);
      this.handleChange = this.handleChange.bind(this);
      this.handleSubmit = this.handleSubmit.bind(this);
      this.handleDragStart = this.handleDragStart.bind(this);
      this.handleDragOver = this.handleDragOver.bind(this);
      this.handleDrop = this.handleDrop.bind(this);
      this.handlePointerDown = this.handlePointerDown.bind(this);
      this.handlePointerMove = this.handlePointerMove.bind(this);
      this.handlePointerUp = this.handlePointerUp.bind(this);
      this.mount.addEventListener("click", this.handleClick);
      this.mount.addEventListener("change", this.handleChange);
      this.mount.addEventListener("submit", this.handleSubmit);
      this.mount.addEventListener("dragstart", this.handleDragStart);
      this.mount.addEventListener("dragover", this.handleDragOver);
      this.mount.addEventListener("drop", this.handleDrop);
      this.mount.addEventListener("pointerdown", this.handlePointerDown);
      this.mount.addEventListener("pointermove", this.handlePointerMove);
      this.mount.addEventListener("pointerup", this.handlePointerUp);
      this.mount.addEventListener("pointercancel", this.handlePointerUp);
      this.render();
    }

    start(options = {}) {
      this.resetPlayerInput();
      this.waitingTab = "flow";
      this.mount.hidden = false;
      this.engine.start(options);
      this.render();
      return this;
    }

    stop() {
      this.engine.stop();
      this.mount.hidden = true;
      this.render();
    }

    pause() {
      this.engine.loop.stop();
      this.mount.hidden = true;
    }

    resume() {
      if (!this.engine.started) return;
      this.engine.loop.start();
      this.mount.hidden = false;
      this.render();
    }

    destroy() {
      this.unsubscribe?.();
      this.engine.stop();
      this.mount.removeEventListener("click", this.handleClick);
      this.mount.removeEventListener("change", this.handleChange);
      this.mount.removeEventListener("submit", this.handleSubmit);
      this.mount.removeEventListener("dragstart", this.handleDragStart);
      this.mount.removeEventListener("dragover", this.handleDragOver);
      this.mount.removeEventListener("drop", this.handleDrop);
      this.mount.removeEventListener("pointerdown", this.handlePointerDown);
      this.mount.removeEventListener("pointermove", this.handlePointerMove);
      this.mount.removeEventListener("pointerup", this.handlePointerUp);
      this.mount.removeEventListener("pointercancel", this.handlePointerUp);
      this.mount.innerHTML = "";
    }

    resetPlayerInput() {
      this.selectedParts = {};
      this.signed = false;
      this.signatureStrokes = [];
      this.activeSignaturePointer = null;
      this.transferred = false;
      this.feedback = "";
      this.taskKey = null;
      this.customerOrderDraft = null;
      this.digitalSelectedPartId = null;
    }

    handleClick(event) {
      const roleButton = eventTargetClosest(event, "[data-sim-role]");
      if (roleButton) {
        this.engine.setHumanRole(roleButton.dataset.simRole);
        this.render();
        return;
      }

      const clearSignatureButton = eventTargetClosest(event, "[data-sim-signature-clear]");
      if (clearSignatureButton && !clearSignatureButton.disabled) {
        this.signatureStrokes = [];
        this.signed = false;
        this.feedback = "De orderparaaf is gewist.";
        this.render();
        return;
      }

      const digitalPart = eventTargetClosest(event, "[data-sim-drag-part]");
      if (digitalPart) {
        this.digitalSelectedPartId = digitalPart.dataset.simDragPart;
        this.feedback = "";
        this.render();
        return;
      }

      const digitalBoard = eventTargetClosest(event, "[data-sim-builder-board]");
      if (digitalBoard && this.digitalSelectedPartId) {
        this.placeDigitalBoardPart(this.digitalSelectedPartId, event, digitalBoard);
        return;
      }

      const transferCargo = eventTargetClosest(event, "[data-sim-transfer-cargo]");
      if (transferCargo && !transferCargo.disabled) {
        this.completeDigitalTransfer();
        return;
      }

      const partButton = eventTargetClosest(event, "[data-sim-part]");
      if (partButton) {
        const partId = partButton.dataset.simPart;
        const task = this.engine.playerTask();
        const required = Number(task?.requiredParts?.[partId] || 0);
        this.selectedParts[partId] = Math.min(required, Number(this.selectedParts[partId] || 0) + 1);
        this.feedback = "";
        this.render();
        return;
      }

      const resetPartButton = eventTargetClosest(event, "[data-sim-part-reset]");
      if (resetPartButton) {
        this.selectedParts[resetPartButton.dataset.simPartReset] = 0;
        this.transferred = false;
        this.signed = false;
        this.signatureStrokes = [];
        this.render();
        return;
      }

      const transferButton = eventTargetClosest(event, "[data-sim-transfer]");
      if (transferButton && !transferButton.disabled) {
        this.transferred = true;
        this.feedback = "De volledige orderbatch is in één keer overgedragen.";
        this.render();
        return;
      }

      const waitingTabButton = eventTargetClosest(event, "[data-sim-waiting-tab]");
      if (waitingTabButton) {
        this.waitingTab = waitingTabButton.dataset.simWaitingTab;
        this.render();
        return;
      }

      const completeButton = eventTargetClosest(event, "[data-sim-complete]");
      if (completeButton && !completeButton.disabled) {
        const result = this.engine.completePlayerAction({
          parts: { ...this.selectedParts },
          signed: this.signed,
          signature: this.signatureEvidence(),
          completedQuantity: this.completedOrderQuantity(task),
          transferred: this.transferred
        });
        this.feedback = result.ok ? "Handeling verwerkt en doorgestuurd." : result.errors.join(" · ");
        if (result.ok) this.resetPlayerInput();
        this.render();
      }
    }

    addDigitalPart(partId) {
      const task = this.engine.playerTask();
      const required = Number(task?.requiredParts?.[partId] || 0);
      if (!required) {
        const part = this.engine.parts[partId];
        this.feedback = `${part?.label || "Dit onderdeel"} staat niet op de stuklijst.`;
        this.render();
        return false;
      }
      const selected = Number(this.selectedParts[partId] || 0);
      if (selected >= required) {
        this.feedback = "De benodigde hoeveelheid van dit onderdeel ligt al klaar.";
        this.render();
        return false;
      }
      this.selectedParts[partId] = selected + 1;
      this.transferred = false;
      this.signed = false;
      this.signatureStrokes = [];
      this.feedback = "";
      this.render();
      return true;
    }

    completeDigitalTransfer() {
      const task = this.engine.playerTask();
      if (!this.partsComplete(task) || !this.signed) {
        this.feedback = !this.partsComplete(task)
          ? "Maak eerst alle torens van deze order af."
          : "Zet eerst één paraaf voor de volledige order.";
        this.render();
        return false;
      }
      this.transferred = true;
      this.feedback = "";
      this.render();
      return true;
    }

    handleDragStart(event) {
      const part = eventTargetClosest(event, "[data-sim-drag-part]");
      if (part) {
        this.digitalSelectedPartId = part.dataset.simDragPart;
        event.dataTransfer?.setData("application/x-learngame-part", part.dataset.simDragPart);
        event.dataTransfer?.setData("text/plain", part.dataset.simDragPart);
        if (event.dataTransfer) event.dataTransfer.effectAllowed = "copy";
        return;
      }
      const cargo = eventTargetClosest(event, "[data-sim-transfer-cargo]");
      if (cargo && !cargo.disabled) {
        event.dataTransfer?.setData("application/x-learngame-transfer", "ready");
        if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
      }
    }

    handleDragOver(event) {
      if (eventTargetClosest(event, "[data-sim-part-dropzone]")) {
        event.preventDefault();
        if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
        return;
      }
      if (eventTargetClosest(event, "[data-sim-transfer-dropzone]")) {
        event.preventDefault();
        if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
      }
    }

    handleDrop(event) {
      const partTarget = eventTargetClosest(event, "[data-sim-part-dropzone]");
      if (partTarget) {
        event.preventDefault();
        const partId = event.dataTransfer?.getData("application/x-learngame-part")
          || event.dataTransfer?.getData("text/plain");
        const board = eventTargetClosest(event, "[data-sim-builder-board]");
        if (partId && board) this.placeDigitalBoardPart(partId, event, board);
        else if (partId) this.addDigitalPart(partId);
        return;
      }
      const transferTarget = eventTargetClosest(event, "[data-sim-transfer-dropzone]");
      if (transferTarget) {
        event.preventDefault();
        const ready = event.dataTransfer?.getData("application/x-learngame-transfer");
        if (ready === "ready") this.completeDigitalTransfer();
      }
    }

    handleChange(event) {
      const customerOrderForm = eventTargetClosest(event, "[data-customer-order-form]");
      if (customerOrderForm) {
        const values = new FormData(customerOrderForm);
        this.customerOrderDraft = {
          productId: String(values.get("product_id") || ""),
          quantity: Math.max(1, Number(values.get("quantity")) || 1),
          dueMinutes: Math.max(2, Number(values.get("due_minutes")) || 2)
        };
        this.feedback = "";
        // Een volledige render tijdens de blur/change van een numeriek veld
        // vervangt de submitknop nog vóór diens click-event. Daardoor leek de
        // knop niets te doen. Alleen een productkeuze moet de torenpreview
        // direct opnieuw tekenen; aantallen blijven in het bestaande formulier.
        if (event.target?.matches?.('[name="product_id"]')) this.render();
        return;
      }
    }

    signaturePoint(event, pad) {
      const bounds = pad.getBoundingClientRect();
      return {
        x: Math.max(0, Math.min(320, ((event.clientX - bounds.left) / Math.max(1, bounds.width)) * 320)),
        y: Math.max(0, Math.min(96, ((event.clientY - bounds.top) / Math.max(1, bounds.height)) * 96))
      };
    }

    handlePointerDown(event) {
      const pad = eventTargetClosest(event, "[data-sim-signature-pad]");
      if (!pad || pad.getAttribute("aria-disabled") === "true") return;
      event.preventDefault();
      const stroke = [this.signaturePoint(event, pad)];
      this.signatureStrokes.push(stroke);
      const line = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
      line.setAttribute("data-active-signature-stroke", "");
      line.setAttribute("points", `${stroke[0].x.toFixed(1)},${stroke[0].y.toFixed(1)}`);
      pad.appendChild(line);
      this.activeSignaturePointer = { id: event.pointerId, stroke, pad };
      pad.setPointerCapture?.(event.pointerId);
    }

    handlePointerMove(event) {
      const active = this.activeSignaturePointer;
      if (!active || active.id !== event.pointerId) return;
      event.preventDefault();
      const point = this.signaturePoint(event, active.pad);
      const previous = active.stroke[active.stroke.length - 1];
      if (Math.hypot(point.x - previous.x, point.y - previous.y) < 1.5) return;
      active.stroke.push(point);
      const line = active.pad.querySelector("[data-active-signature-stroke]");
      if (line) {
        line.setAttribute(
          "points",
          active.stroke.map(item => `${item.x.toFixed(1)},${item.y.toFixed(1)}`).join(" ")
        );
      }
    }

    handlePointerUp(event) {
      const active = this.activeSignaturePointer;
      if (!active || active.id !== event.pointerId) return;
      active.pad.releasePointerCapture?.(event.pointerId);
      this.activeSignaturePointer = null;
      this.signed = this.signatureHasInk();
      this.feedback = this.signed
        ? "Orderparaaf geregistreerd. De volledige batch mag nu worden overgedragen."
        : "Zet een herkenbare paraaf in het vak; één tik is niet voldoende.";
      this.render();
    }

    signatureHasInk() {
      let distance = 0;
      let points = 0;
      this.signatureStrokes.forEach(stroke => {
        points += stroke.length;
        for (let index = 1; index < stroke.length; index += 1) {
          distance += Math.hypot(
            stroke[index].x - stroke[index - 1].x,
            stroke[index].y - stroke[index - 1].y
          );
        }
      });
      return points >= 5 && distance >= 18;
    }

    signatureEvidence() {
      return this.signed
        ? this.signatureStrokes.map(stroke => stroke.map(point => [
          Number(point.x.toFixed(1)),
          Number(point.y.toFixed(1))
        ]))
        : [];
    }

    completedOrderQuantity(task) {
      if (!["pd1", "pd2", "pd3"].includes(task?.role?.id)) {
        return Number(task?.order?.quantity || 1);
      }
      if (task.playMode !== "digital") {
        return this.partsComplete(task) ? Number(task.order.quantity || 1) : 0;
      }
      return this.digitalBuildState(task).completedTowers;
    }

    handleSubmit(event) {
      if (!event.target.matches("[data-customer-order-form]")) return;
      event.preventDefault();
      const values = new FormData(event.target);
      const result = this.engine.completePlayerAction({
        customerOrder: {
          productId: String(values.get("product_id") || ""),
          quantity: Number(values.get("quantity")),
          dueMinutes: Number(values.get("due_minutes"))
        }
      });
      this.feedback = result.ok ? "Order geplaatst en doorgestuurd naar Operations." : result.errors.join(" · ");
      if (result.ok) this.resetPlayerInput();
      this.render();
    }

    partsComplete(task) {
      return Object.entries(task?.requiredParts || {}).every(
        ([partId, required]) => Number(this.selectedParts[partId] || 0) >= Number(required)
      );
    }

    render() {
      const snapshot = this.engine.snapshot();
      if (!snapshot.started) {
        this.mount.innerHTML = "";
        return;
      }
      if (!snapshot.humanRoleId) {
        this.mount.innerHTML = this.rolePickerMarkup(snapshot);
        return;
      }
      const task = this.engine.playerTask();
      if (task) {
        const nextKey = `${task.order.id}:${task.role.id}`;
        if (this.taskKey !== nextKey) {
          this.resetPlayerInput();
          this.taskKey = nextKey;
        }
        this.mount.innerHTML = this.taskDashboardMarkup(snapshot, task);
        return;
      }
      this.taskKey = null;
      this.mount.innerHTML = this.factoryOverviewMarkup(snapshot);
      this.mountProcessFlow(snapshot);
    }

    mountProcessFlow(snapshot) {
      if (this.waitingTab !== "flow") return;
      const processMount = this.mount.querySelector("[data-sim-process-flow]");
      if (!processMount) return;
      this.lastFlowSignature = this.processFlowSignature(snapshot);
      if (this.renderProcessFlow) {
        this.renderProcessFlow(processMount, snapshot);
        return;
      }
      processMount.innerHTML = this.fallbackProcessFlowMarkup(snapshot);
    }

    processFlowSignature(snapshot) {
      return JSON.stringify({
        roles: snapshot.roleFlow.map(roleId => {
          const runtime = snapshot.roleRuntime[roleId];
          return [
            roleId,
            runtime.state,
            runtime.activeOrderId,
            runtime.queue,
            runtime.incident?.id || null
          ];
        }),
        orders: snapshot.orders.map(order => [
          order.id,
          order.currentRoleId,
          order.status,
          order.routeIndex
        ]),
        latestEventId: snapshot.feed[0]?.id || null
      });
    }

    rolePickerMarkup(snapshot) {
      return `
        <section class="sim-role-picker" aria-labelledby="simRolePickerTitle">
          <div>
            <p class="eyebrow">Gamesessie gestart</p>
            <h2 id="simRolePickerTitle">Kies jouw rol in de logistieke keten</h2>
            <p>De zes overige rollen worden lokaal door vaste state machines uitgevoerd.</p>
          </div>
          <div class="sim-role-grid">
            ${snapshot.roleFlow.map(roleId => {
              const role = snapshot.roles[roleId];
              return `
                <button type="button" data-sim-role="${escapeHtml(roleId)}">
                  <span>${escapeHtml(role.token)}</span>
                  <strong>${escapeHtml(role.department)}</strong>
                  <small>${escapeHtml(role.title)}</small>
                </button>
              `;
            }).join("")}
          </div>
        </section>
      `;
    }

    taskDashboardMarkup(snapshot, task) {
      const { role, order, product } = task;
      const selectedProductId = role.id === "customer"
        ? (this.customerOrderDraft?.productId || order.productId)
        : order.productId;
      const displayProduct = role.id === "customer"
        ? (task.availableProducts || []).find(item => item.id === selectedProductId) || product
        : product;
      const displayQuantity = role.id === "customer"
        ? (this.customerOrderDraft?.quantity || order.quantity)
        : order.quantity;
      const tasks = role.form.tasks.map(item => `<li>${escapeHtml(item)}</li>`).join("");
      return `
        <section class="sim-player-dashboard" aria-label="Actieve handeling voor ${escapeHtml(role.title)}">
          <article class="sim-order-form">
            <header class="sim-form-header">
              <div>
                <p>${escapeHtml(role.department)}</p>
                <h2>${escapeHtml(role.title)}</h2>
              </div>
              <span>${escapeHtml(role.form.name)}</span>
            </header>
            <div class="sim-order-metadata">
              <div><span>Klant</span><strong>${escapeHtml(order.customer)}</strong></div>
              <div><span>Order #</span><strong>${escapeHtml(order.id)}</strong></div>
              <div><span>Levertijd</span><strong class="sim-countdown">${formatCountdown(order.dueAt)}</strong></div>
              <div><span>Aantal</span><strong>${displayQuantity}</strong></div>
            </div>
            <div class="sim-work-code">
              <span>Werkzaamheden</span>
              <strong>${escapeHtml(role.form.code)}</strong>
            </div>
            <div class="sim-form-body">
              <div>
                <p class="eyebrow">Takenlijst</p>
                <ol>${tasks}</ol>
                <div class="sim-route-progress" aria-label="Voortgang door de keten">
                  ${snapshot.roleFlow.map((roleId, index) => `
                    <span class="${index < order.routeIndex ? "is-done" : index === order.routeIndex ? "is-current" : ""}">
                      ${escapeHtml(snapshot.roles[roleId].token)}
                    </span>
                  `).join("")}
                </div>
              </div>
              <div class="sim-product-visual">
                ${towerMarkup(displayProduct)}
                <strong>${escapeHtml(displayProduct.name)}</strong>
                <small>${displayQuantity} exempl${displayQuantity === 1 ? "aar" : "aren"}</small>
              </div>
            </div>
          </article>
          ${role.id === "customer" ? this.customerOrderPanelMarkup(task) : this.actionPanelMarkup(task)}
        </section>
      `;
    }

    customerOrderPanelMarkup(task) {
      const free = task.customerOrderMode === "free";
      const selectedProductId = this.customerOrderDraft?.productId || task.order.productId;
      const selectedQuantity = this.customerOrderDraft?.quantity || task.order.quantity;
      const dueMinutes = this.customerOrderDraft?.dueMinutes
        || Math.max(2, Math.round((task.order.dueAt - Date.now()) / 60000));
      const productOptions = (task.availableProducts || []).map(product => `
        <option value="${escapeHtml(product.id)}"${product.id === selectedProductId ? " selected" : ""}>
          ${escapeHtml(product.name)}
        </option>
      `).join("");
      return `
        <aside class="sim-action-panel sim-customer-order-panel">
          <header>
            <p class="eyebrow">Klantactie</p>
            <h2>Plaats een torenbestelling</h2>
            <span>${free ? "Vrije bestelling" : "Verplichte bestelling vanuit de spelvariant"}</span>
          </header>
          <form class="sim-customer-order-form" data-customer-order-form>
            <label>
              <span>Toren</span>
              ${free
                ? `<select name="product_id" required>${productOptions}</select>`
                : `<strong>${escapeHtml(task.product.name)}</strong><input type="hidden" name="product_id" value="${escapeHtml(task.product.id)}">`}
            </label>
            <label>
              <span>Aantal</span>
              ${free
                ? `<input type="number" name="quantity" min="1" max="12" value="${selectedQuantity}" required>`
                : `<strong>${task.order.quantity}</strong><input type="hidden" name="quantity" value="${task.order.quantity}">`}
            </label>
            <label>
              <span>Gewenste levertijd</span>
              ${free
                ? `<input type="number" name="due_minutes" min="2" max="120" value="${dueMinutes}" required><small>minuten</small>`
                : `<strong>${dueMinutes} minuten</strong><input type="hidden" name="due_minutes" value="${dueMinutes}">`}
            </label>
            <button class="primary-button sim-customer-order-submit" type="submit">
              Order plaatsen en naar Operations sturen
            </button>
            <p class="sim-action-note">
              Jij bestelt het eindproduct. Bouwstenen verzamelen en stapelen gebeurt pas bij magazijn en productie.
            </p>
            ${this.feedback ? `<p class="sim-action-feedback">${escapeHtml(this.feedback)}</p>` : ""}
          </form>
        </aside>
      `;
    }

    actionPanelMarkup(task) {
      return task.playMode === "digital"
        ? this.digitalActionPanelMarkup(task)
        : this.physicalActionPanelMarkup(task);
    }

    legacySignatureMarkup() {
      return `
        <button type="button"
                class="sim-signature${this.signed ? " is-signed" : ""}"
                data-sim-signature
                aria-pressed="${this.signed ? "true" : "false"}">
          <span class="sim-signature-box" aria-hidden="true">${this.signed ? "✓" : ""}</span>
          <span>${this.signed ? "Formulier geparafeerd ✓" : "Parafeer formulier"}</span>
        </button>
      `;
    }

    signatureMarkup(task, enabled) {
      const strokes = this.signatureStrokes.map((stroke, index) => `
        <polyline ${index === this.signatureStrokes.length - 1 ? "data-active-signature-stroke" : ""}
                  points="${stroke.map(point => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ")}"></polyline>
      `).join("");
      return `
        <div class="sim-signature${this.signed ? " is-signed" : ""}${enabled ? "" : " is-disabled"}">
          <div>
            <strong>${this.signed ? "Order geparafeerd ✓" : "Paraaf volledige order"}</strong>
            <small>${enabled
              ? `Teken met muis of vinger voor ${Number(task.order.quantity || 1)} toren(s).`
              : `Bouw eerst alle ${Number(task.order.quantity || 1)} toren(s).`}</small>
          </div>
          <svg viewBox="0 0 320 96"
               role="img"
               aria-label="Veld voor orderparaaf"
               aria-disabled="${enabled ? "false" : "true"}"
               data-sim-signature-pad>${strokes}</svg>
          <button type="button"
                  data-sim-signature-clear
                  ${this.signatureStrokes.length && enabled ? "" : "disabled"}>Wis paraaf</button>
        </div>
      `;
    }

    physicalActionPanelMarkup(task) {
      const partEntries = Object.entries(task.requiredParts || {});
      const partsComplete = this.partsComplete(task);
      const canComplete = partsComplete && this.transferred && this.signed;
      return `
        <aside class="sim-action-panel">
          <header>
            <p class="eyebrow">Hardcoded input</p>
            <h2>Jouw handeling</h2>
            <span>${escapeHtml(task.role.form.actionLabel)}</span>
          </header>
          <section class="sim-action-section">
            <h3>${partEntries.length ? "1. Selecteer de fysiek gebruikte onderdelen" : "1. Controleer de opdracht"}</h3>
            ${partEntries.length
              ? `<div class="sim-part-buttons">
                  ${partEntries.map(([partId, required]) => {
                    const part = this.engine.parts[partId] || { label: partId, size: "" };
                    const selected = Number(this.selectedParts[partId] || 0);
                    return `
                      <div class="sim-part-control">
                        <button type="button"
                                data-sim-part="${escapeHtml(partId)}"
                                ${selected >= required ? "disabled" : ""}>
                          <span>+</span>
                          <strong>${escapeHtml(part.label)}</strong>
                          <small>${escapeHtml(part.size)} · ${selected}/${required}</small>
                        </button>
                        <button type="button"
                                class="sim-part-reset"
                                data-sim-part-reset="${escapeHtml(partId)}"
                                aria-label="Wis ${escapeHtml(part.label)}">×</button>
                      </div>
                    `;
                  }).join("")}
                </div>`
              : `<p class="sim-action-note">Controleer de metadata en taken op het orderformulier.</p>`}
          </section>
          <section class="sim-action-section">
            <h3>2. Parafeer de complete order</h3>
            ${this.signatureMarkup(task, partsComplete)}
          </section>
          <section class="sim-action-section">
            <h3>3. Lever de volledige batch af</h3>
            <button type="button"
                    class="sim-transfer-button ${this.transferred ? "is-complete" : ""}"
                    data-sim-transfer
                    ${!partsComplete || !this.signed || this.transferred ? "disabled" : ""}>
              <span aria-hidden="true">→</span>
              <strong>${this.transferred ? "Overdracht gereed" : escapeHtml(task.role.form.transferLabel)}</strong>
            </button>
          </section>
          <section class="sim-action-section">
            <h3>4. Administratief afronden</h3>
            <button type="button"
                    class="primary-button sim-complete-button"
                    data-sim-complete
                    ${canComplete ? "" : "disabled"}>
              Uitgevoerd
            </button>
            ${this.feedback ? `<p class="sim-action-feedback">${escapeHtml(this.feedback)}</p>` : ""}
          </section>
        </aside>
      `;
    }

    digitalSourceParts(task) {
      const requiredIds = Object.keys(task.requiredParts || {})
        .filter(partId => task.role.id === "srm" || partId !== "base_green");
      const distractorIds = Object.keys(this.engine.parts)
        .filter(partId => !requiredIds.includes(partId) && partId !== "base_green")
        .slice(0, 3);
      return [...requiredIds, ...distractorIds].map(partId => {
        const part = this.engine.parts[partId] || { label: partId, color: "white", size: "" };
        const required = Number(task.requiredParts?.[partId] || 0);
        const selected = Number(this.selectedParts[partId] || 0);
        const complete = required > 0 && selected >= required;
        const dimensions = this.digitalPartDimensions(partId);
        const selectedClass = this.digitalSelectedPartId === partId ? " is-selected" : "";
        const partVisual = window.LegoTowerRenderer
          ? window.LegoTowerRenderer.renderPart(
              {
                id: partId,
                color: part.color,
                width: dimensions.width === dimensions.depth ? "narrow" : "wide"
              },
              part.label
            )
          : `<i aria-hidden="true"><span></span><span></span></i>`;
        return `
          <button type="button"
                  class="builder-palette-item brick-${escapeHtml(part.color)} sim-material-brick ${required ? "is-required" : "is-distractor"}${selectedClass}"
                  style="--sim-brick-color: var(--brick-${escapeHtml(part.color)})"
                  data-sim-drag-part="${escapeHtml(partId)}"
                  draggable="${complete ? "false" : "true"}"
                  aria-pressed="${this.digitalSelectedPartId === partId}"
                  ${complete ? "disabled" : ""}>
            ${partVisual}
            <strong>${escapeHtml(part.label)}</strong>
            <small>${escapeHtml(part.size)}${required ? ` · nog ${Math.max(0, required - selected)}` : ""}</small>
          </button>
        `;
      }).join("");
    }

    digitalPartDimensions(partId) {
      const size = String(this.engine.parts[partId]?.size || "");
      const dimensions = size.match(/(\d+)\D+(\d+)/);
      return {
        width: Number(dimensions?.[1] || 2),
        depth: Number(dimensions?.[2] || 2)
      };
    }

    digitalLayerBricks(task, roleId, z) {
      const recipe = Object.entries(task.product?.stages?.[roleId] || {})
        .filter(([partId]) => partId !== "base_green")
        .flatMap(([partId, amount]) => Array.from(
          { length: Math.max(0, Number(amount) || 0) },
          () => ({ type: partId, ...this.digitalPartDimensions(partId) })
        ));
      if (!recipe.length) return [];
      if (recipe.length === 1) {
        const brick = recipe[0];
        if (brick.width !== brick.depth && z === 1) {
          return [{ ...brick, x: 1, y: 2, width: 4, depth: 2, z }];
        }
        return [{ ...brick, x: 2, y: brick.depth === 4 ? 1 : 2, z }];
      }
      if (recipe.length === 2 && recipe.every(brick => brick.width === 2 && brick.depth === 4)) {
        return recipe.map((brick, index) => ({ ...brick, x: 1 + index * 2, y: 1, z }));
      }
      if (recipe.every(brick => brick.width === 2 && brick.depth === 2)) {
        const positions = [[1, 1], [3, 1], [1, 3], [3, 3]];
        return recipe.map((brick, index) => ({
          ...brick,
          x: positions[index % positions.length][0],
          y: positions[index % positions.length][1],
          z
        }));
      }
      return recipe.map((brick, index) => ({
        ...brick,
        x: Math.max(0, Math.min(6 - brick.width, 1 + (index * 2) % 4)),
        y: Math.max(0, Math.min(6 - brick.depth, 1 + Math.floor(index / 2) * 2)),
        z
      }));
    }

    digitalBuildState(task) {
      const stageOrder = ["pd1", "pd2", "pd3"];
      const currentIndex = stageOrder.indexOf(task.role.id);
      const previous = stageOrder
        .slice(0, Math.max(0, currentIndex))
        .flatMap((roleId, index) => this.digitalLayerBricks(task, roleId, index));
      const targets = currentIndex >= 0 ? this.digitalLayerBricks(task, task.role.id, currentIndex) : [];
      const selectedCount = [...new Set(targets.map(target => target.type))].reduce(
        (total, partId) => total + Number(this.selectedParts[partId] || 0),
        0
      );
      const quantity = Math.max(1, Number(task.order?.quantity || 1));
      const perTower = Math.max(1, targets.length);
      const completedTowers = Math.min(quantity, Math.floor(selectedCount / perTower));
      const complete = completedTowers >= quantity;
      const placedCount = complete ? targets.length : selectedCount % perTower;
      return {
        previous,
        targets,
        placed: targets.slice(0, placedCount),
        nextTarget: complete ? null : targets[placedCount],
        quantity,
        completedTowers,
        currentTower: complete ? quantity : Math.min(quantity, completedTowers + 1),
        complete
      };
    }

    digitalBuilderBoardMarkup(task) {
      if (!window.LegoTowerRenderer) {
        return `
          <div class="sim-digital-workbench is-building"
               data-sim-builder-board
               data-sim-part-dropzone>
            <p class="builder-feedback is-error">De isometrische LEGO-renderer kon niet worden geladen.</p>
          </div>
        `;
      }
      const state = this.digitalBuildState(task);
      const rendererScope = "sim-builder";
      const bricks = [...state.previous, ...state.placed].sort((left, right) => (
        left.z - right.z
        || (left.x + left.y) - (right.x + right.y)
        || left.x - right.x
      ));
      const brickMarkup = brick => {
        const color = this.engine.parts[brick.type]?.color || "white";
        return window.LegoTowerRenderer.brick(
          brick.x,
          brick.y,
          0.22 + brick.z * 0.78,
          brick.width,
          brick.depth,
          color,
          rendererScope
        );
      };
      let targetMarkup = "";
      if (state.nextTarget) {
        const target = state.nextTarget;
        const height = 0.27 + target.z * 0.78;
        const corners = [
          window.LegoTowerRenderer.iso(target.x, target.y, height),
          window.LegoTowerRenderer.iso(target.x + target.width, target.y, height),
          window.LegoTowerRenderer.iso(target.x + target.width, target.y + target.depth, height),
          window.LegoTowerRenderer.iso(target.x, target.y + target.depth, height)
        ];
        targetMarkup = `
          <g class="sim-builder-target" aria-hidden="true">
            <polygon points="${corners.map(point => point.join(",")).join(" ")}"></polygon>
          </g>
        `;
      }
      return `
        <div class="sim-inline-builder">
          <div class="sim-inline-builder-status">
            <span>${escapeHtml(task.product.name)}</span>
            <strong>${state.complete
              ? `${state.quantity} van ${state.quantity} torens gebouwd`
              : `Bouw toren ${state.currentTower} van ${state.quantity}`}</strong>
          </div>
          <svg class="sim-inline-builder-board"
               viewBox="0 0 520 420"
               role="application"
               tabindex="0"
               data-sim-builder-board
               data-sim-part-dropzone
               aria-label="Bouw ${escapeHtml(task.product.name)} op de isometrische groene 6 bij 6 grondplaat">
            <defs>
              ${window.LegoTowerRenderer.definitions(rendererScope)}
              <filter id="simBuilderBoardShadow" x="-30%" y="-30%" width="170%" height="190%">
                <feDropShadow dx="0" dy="7" stdDeviation="5" flood-color="#173d26" flood-opacity="0.25"></feDropShadow>
              </filter>
            </defs>
            <ellipse cx="350" cy="357" rx="150" ry="30" fill="rgba(28, 54, 39, 0.16)"></ellipse>
            <g class="builder-isometric-scene"
               transform="translate(170 62) scale(2)"
               filter="url(#simBuilderBoardShadow)">
              ${window.LegoTowerRenderer.plate(0, 0, 0, 6, 6, "green", rendererScope)}
              ${bricks.map(brickMarkup).join("")}
              ${targetMarkup}
            </g>
          </svg>
          <small>Kies of sleep een blok en klik op het gemarkeerde bouwvlak.</small>
        </div>
      `;
    }

    placeDigitalBoardPart(partId, event, board) {
      const task = this.engine.playerTask();
      if (!task || !["pd1", "pd2", "pd3"].includes(task.role.id)) return false;
      const state = this.digitalBuildState(task);
      const target = state.nextTarget;
      if (!target) {
        this.feedback = "Alle torens voor deze order zijn al opgebouwd.";
        this.render();
        return false;
      }
      if (partId !== target.type) {
        this.feedback = `${this.engine.parts[partId]?.label || "Dit onderdeel"} hoort niet op het gemarkeerde bouwvlak.`;
        this.render();
        return false;
      }
      const rect = board.getBoundingClientRect?.();
      if (rect?.width && rect?.height && Number.isFinite(event?.clientX) && Number.isFinite(event?.clientY)) {
        const pointerX = ((event.clientX - rect.left) / rect.width) * 520;
        const pointerY = ((event.clientY - rect.top) / rect.height) * 420;
        const projected = window.LegoTowerRenderer.iso(
          target.x + target.width / 2,
          target.y + target.depth / 2,
          0.27 + target.z * 0.78
        );
        const targetX = 170 + projected[0] * 2;
        const targetY = 62 + projected[1] * 2;
        if (Math.hypot(targetX - pointerX, targetY - pointerY) > 90) {
          this.feedback = "Plaats het blok op het gemarkeerde bouwvlak.";
          this.render();
          return false;
        }
      }
      this.digitalSelectedPartId = null;
      return this.addDigitalPart(partId);
    }

    digitalPartStageMarkup(task) {
      const selected = Object.entries(task.requiredParts || {}).flatMap(([partId, required]) => {
        const part = this.engine.parts[partId] || { label: partId, color: "white", size: "" };
        const amount = Math.min(required, Number(this.selectedParts[partId] || 0));
        return Array.from({ length: amount }, (_, index) => `
          <span class="sim-staged-brick"
                style="--sim-brick-color: var(--brick-${escapeHtml(part.color)})"
                title="${escapeHtml(part.label)} ${index + 1}">
            ${escapeHtml(part.size)}
          </span>
        `);
      });
      if (["pd1", "pd2", "pd3"].includes(task.role.id)) {
        return this.digitalBuilderBoardMarkup(task);
      }
      return `
        <div class="sim-digital-workbench is-staging"
             data-sim-virtual-stage
             data-sim-part-dropzone
             role="region"
             aria-label="Klaarlegvlak voor magazijnonderdelen">
          <div>
            <span>Klaarlegvlak</span>
            <strong>${selected.length} ${selected.length === 1 ? "onderdeel" : "onderdelen"} klaargelegd</strong>
          </div>
          <div class="sim-staged-bricks">${selected.length ? selected.join("") : "<small>Sleep de juiste blokken hierheen.</small>"}</div>
        </div>
      `;
    }

    digitalMaterialActionMarkup(task) {
      const hasParts = Object.keys(task.requiredParts || {}).length > 0;
      if (!hasParts) {
        return `
          <div class="sim-digital-check is-complete">
            <span aria-hidden="true">✓</span>
            <strong>Digitale opdracht gereed voor overdracht</strong>
          </div>
        `;
      }
      return `
        <div class="sim-material-action">
          <div class="sim-material-source" aria-label="Beschikbare LEGO-onderdelen">
            <span>${task.role.id === "srm" ? "Magazijnstelling" : "Onderdelenbak"}</span>
            <div>${this.digitalSourceParts(task)}</div>
          </div>
          <span class="sim-drag-route" aria-hidden="true">⇢</span>
          ${this.digitalPartStageMarkup(task)}
        </div>
      `;
    }

    digitalTransportMarkup(task, batchReady) {
      const quantity = Number(task.order.quantity || 1);
      return `
        <div class="sim-digital-transport ${batchReady ? "is-ready" : "is-locked"}">
          <button type="button"
                  class="sim-transfer-cargo"
                  data-sim-transfer-cargo
                  draggable="${batchReady ? "true" : "false"}"
                  ${batchReady ? "" : "disabled"}>
            <span aria-hidden="true">${task.role.id === "srm" ? "▦" : "▤"}</span>
            <strong>${quantity}× ${task.role.id === "srm" ? "complete materiaalset" : task.product.name}</strong>
          </button>
          <span aria-hidden="true">⇢</span>
          <div class="sim-transfer-destination"
               data-sim-transfer-dropzone
               aria-label="${escapeHtml(task.role.form.transferLabel)}">
            <span aria-hidden="true">⌂</span>
            <strong>${escapeHtml(task.role.form.transferLabel)}</strong>
          </div>
        </div>
      `;
    }

    digitalFormSummaryMarkup(task) {
      const rows = Object.entries(task.requiredParts || {}).map(([partId, required]) => {
        const part = this.engine.parts[partId] || { label: partId };
        return `<li><span>${escapeHtml(part.label)}</span><strong>${required}/${required}</strong></li>`;
      }).join("");
      return `
        <div class="sim-auto-form-summary" data-sim-form-parts>
          <strong>Automatisch overgenomen uit de virtuele handeling</strong>
          ${rows ? `<ul>${rows}</ul>` : "<p>Digitale opdracht gecontroleerd.</p>"}
          <small>Transport naar de volgende afdeling is geregistreerd.</small>
        </div>
      `;
    }

    digitalActionPanelMarkup(task) {
      if (
        ["pd1", "pd2", "pd3"].includes(task.role.id)
        && Number(task.requiredParts?.base_green || 0) > 0
      ) {
        this.selectedParts.base_green = Number(task.requiredParts.base_green);
      }
      const partEntries = Object.entries(task.requiredParts || {});
      const partsComplete = this.partsComplete(task);
      const batchReady = partsComplete && this.signed;
      const canComplete = partsComplete && this.transferred && this.signed;
      const partActionTitle = task.role.id === "srm"
        ? "1. Haal onderdelen uit het magazijn en leg ze klaar"
        : partEntries.length
          ? "1. Selecteer onderdelen en zet ze op de toren"
          : "1. Controleer de digitale opdracht";
      return `
        <aside class="sim-action-panel sim-digital-action-panel">
          <header>
            <div>
              <p class="eyebrow">Digitale spelmodus</p>
              <h2>Virtuele handeling</h2>
              <span>${escapeHtml(task.role.form.actionLabel)}</span>
            </div>
            <details class="sim-action-help">
              <summary aria-label="Help bij deze handeling">i</summary>
              <div>
                <strong>Hulp</strong>
                <p>Sleep de juiste blokken vanuit de materiaalbak naar het klaarlegvlak of de toren. Sleep daarna de materiaalset of toren naar de volgende afdeling.</p>
              </div>
            </details>
          </header>
          <section class="sim-action-section sim-digital-stage-section" aria-label="${partActionTitle}">
            ${this.digitalMaterialActionMarkup(task)}
            ${this.feedback ? `<p class="sim-action-feedback">${escapeHtml(this.feedback)}</p>` : ""}
          </section>
          <section class="sim-action-section">
            <h3>2. Parafeer de complete order</h3>
            ${this.signatureMarkup(task, partsComplete)}
          </section>
          ${this.transferred ? "" : `
            <section class="sim-action-section sim-digital-transfer-section" aria-label="Virtuele logistieke overdracht">
              <h3>3. Lever alle ${Number(task.order.quantity || 1)} torens tegelijk af</h3>
              ${this.digitalTransportMarkup(task, batchReady)}
            </section>
          `}
          ${this.transferred ? `
            <section class="sim-action-section">
              <h3>4. Administratief afronden</h3>
              ${this.digitalFormSummaryMarkup(task)}
              <button type="button"
                      class="primary-button sim-complete-button"
                      data-sim-complete
                      ${canComplete ? "" : "disabled"}>
                Uitgevoerd
              </button>
              ${this.feedback ? `<p class="sim-action-feedback">${escapeHtml(this.feedback)}</p>` : ""}
            </section>
          ` : ""}
        </aside>
      `;
    }

    factoryOverviewMarkup(snapshot) {
      const humanRole = snapshot.roles[snapshot.humanRoleId];
      const openOrders = snapshot.orders.filter(order => order.status !== "DELIVERED").length;
      return `
        <section class="sim-factory-overview">
          <header>
            <div>
              <p class="eyebrow">Wachten = live meekijken</p>
              <h2>Live fabrieksoverzicht</h2>
              <p>Je speelt als <strong>${escapeHtml(humanRole.title)}</strong>. Zodra jouw rol nodig is, verschijnt automatisch het orderformulier.</p>
            </div>
            <span class="sim-live-indicator"><i></i> Live</span>
          </header>
          <nav class="sim-waiting-tabs" aria-label="Fabrieksoverzicht" role="tablist">
            <button type="button"
                    role="tab"
                    data-sim-waiting-tab="flow"
                    aria-selected="${this.waitingTab === "flow"}"
                    class="${this.waitingTab === "flow" ? "is-active" : ""}">
              <span>Productiestroom</span>
              <strong>${openOrders}</strong>
            </button>
            <button type="button"
                    role="tab"
                    data-sim-waiting-tab="departments"
                    aria-selected="${this.waitingTab === "departments"}"
                    class="${this.waitingTab === "departments" ? "is-active" : ""}">
              <span>Afdelingen</span>
              <strong>7</strong>
            </button>
            <button type="button"
                    role="tab"
                    data-sim-waiting-tab="events"
                    aria-selected="${this.waitingTab === "events"}"
                    class="${this.waitingTab === "events" ? "is-active" : ""}">
              <span>Live gebeurtenissen</span>
              <strong>${snapshot.feed.length}</strong>
            </button>
          </nav>
          <div class="sim-waiting-panel" role="tabpanel">
            ${this.waitingTab === "departments" ? `
              <div class="sim-role-status-grid">
                ${snapshot.roleFlow.map(roleId => this.roleStatusMarkup(snapshot, roleId)).join("")}
              </div>
            ` : ""}
            ${this.waitingTab === "events" ? `
              <div class="sim-live-feed" role="log" aria-live="polite">
                ${snapshot.feed.length
                  ? snapshot.feed.slice(0, 30).map(item => `
                      <div class="sim-feed-item is-${escapeHtml(item.kind)}">
                        <time>${formatClock(item.at)}</time>
                        <span>${escapeHtml(item.message)}</span>
                      </div>
                    `).join("")
                  : `<p>De fabriek wacht op de eerste order.</p>`}
              </div>
            ` : ""}
            ${this.waitingTab === "flow" ? `
              <div class="sim-process-flow-mount"
                   data-sim-process-flow
                   aria-label="Productiestromen tussen de afdelingen"></div>
            ` : ""}
          </div>
        </section>
      `;
    }

    fallbackProcessFlowMarkup(snapshot) {
      return `
        <div class="sim-fallback-flow">
          ${snapshot.roleFlow.map((roleId, index) => {
            const role = snapshot.roles[roleId];
            return `
              <article>
                <span>${escapeHtml(role.token)}</span>
                <strong>${escapeHtml(role.department)}</strong>
              </article>
              ${index < snapshot.roleFlow.length - 1 ? `<i aria-hidden="true">→</i>` : ""}
            `;
          }).join("")}
        </div>
      `;
    }

    roleStatusMarkup(snapshot, roleId) {
      const role = snapshot.roles[roleId];
      const runtime = snapshot.roleRuntime[roleId];
      const stateLabels = {
        IDLE: "Wacht op input",
        PROCESSING: "Verwerkt order",
        WAITING_FOR_NEXT: "Bereidt overdracht voor",
        AWAITING_PLAYER: "Wacht op speler"
      };
      return `
        <article class="sim-role-status is-${runtime.state.toLowerCase()} ${roleId === snapshot.humanRoleId ? "is-human" : ""}">
          <span>${escapeHtml(role.token)}</span>
          <div>
            <strong>${escapeHtml(role.department)}</strong>
            <small>${escapeHtml(stateLabels[runtime.state] || runtime.state)}${runtime.activeOrderId ? ` · ${escapeHtml(runtime.activeOrderId)}` : ""}</small>
          </div>
          <i aria-hidden="true"></i>
        </article>
      `;
    }
  }

  window.LogisticsGameUI = Object.freeze({
    LogisticsGameUIController,
    mount(mount, options) {
      return new LogisticsGameUIController(mount, options);
    }
  });
})();
