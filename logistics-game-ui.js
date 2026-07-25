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

  function towerMarkup(product) {
    if (
      window.LegoTowerRenderer
      && Array.isArray(product?.towerSequence)
      && product.towerSequence.length
    ) {
      return window.LegoTowerRenderer.renderAnimated(
        product.towerSequence,
        `Geanimeerde bouw van ${product.name}`,
        "sim-tower-renderer"
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
      this.transferred = false;
      this.waitingTab = "departments";
      this.lastFlowSignature = "";
      this.taskKey = null;
      this.customerOrderDraft = null;
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
      this.mount.addEventListener("click", this.handleClick);
      this.mount.addEventListener("change", this.handleChange);
      this.mount.addEventListener("submit", this.handleSubmit);
      this.render();
    }

    start(options = {}) {
      this.resetPlayerInput();
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
      this.mount.innerHTML = "";
    }

    resetPlayerInput() {
      this.selectedParts = {};
      this.signed = false;
      this.transferred = false;
      this.feedback = "";
      this.taskKey = null;
      this.customerOrderDraft = null;
    }

    handleClick(event) {
      const roleButton = event.target.closest("[data-sim-role]");
      if (roleButton) {
        this.engine.setHumanRole(roleButton.dataset.simRole);
        this.render();
        return;
      }

      const partButton = event.target.closest("[data-sim-part]");
      if (partButton) {
        const partId = partButton.dataset.simPart;
        const task = this.engine.playerTask();
        const required = Number(task?.requiredParts?.[partId] || 0);
        this.selectedParts[partId] = Math.min(required, Number(this.selectedParts[partId] || 0) + 1);
        this.feedback = "";
        this.render();
        return;
      }

      const resetPartButton = event.target.closest("[data-sim-part-reset]");
      if (resetPartButton) {
        this.selectedParts[resetPartButton.dataset.simPartReset] = 0;
        this.transferred = false;
        this.render();
        return;
      }

      const transferButton = event.target.closest("[data-sim-transfer]");
      if (transferButton && !transferButton.disabled) {
        this.transferred = true;
        this.feedback = "Overdracht staat gereed. Parafeer het formulier en rond de handeling af.";
        this.render();
        return;
      }

      const waitingTabButton = event.target.closest("[data-sim-waiting-tab]");
      if (waitingTabButton) {
        this.waitingTab = waitingTabButton.dataset.simWaitingTab;
        this.render();
        return;
      }

      const completeButton = event.target.closest("[data-sim-complete]");
      if (completeButton && !completeButton.disabled) {
        const result = this.engine.completePlayerAction({
          parts: { ...this.selectedParts },
          signed: this.signed,
          transferred: this.transferred
        });
        this.feedback = result.ok ? "Handeling verwerkt en doorgestuurd." : result.errors.join(" · ");
        if (result.ok) this.resetPlayerInput();
        this.render();
      }
    }

    handleChange(event) {
      const customerOrderForm = event.target.closest("[data-customer-order-form]");
      if (customerOrderForm) {
        const values = new FormData(customerOrderForm);
        this.customerOrderDraft = {
          productId: String(values.get("product_id") || ""),
          quantity: Math.max(1, Number(values.get("quantity")) || 1),
          dueMinutes: Math.max(2, Number(values.get("due_minutes")) || 2)
        };
        this.feedback = "";
        this.render();
        return;
      }
      if (event.target.matches("[data-sim-signature]")) {
        this.signed = event.target.checked;
        this.feedback = "";
        this.render();
      }
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
            <h3>${partEntries.length ? "1. Selecteer en stapel onderdelen" : "1. Controleer de opdracht"}</h3>
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
            <h3>2. Logistieke overdracht</h3>
            <button type="button"
                    class="sim-transfer-button ${this.transferred ? "is-complete" : ""}"
                    data-sim-transfer
                    ${!partsComplete || this.transferred ? "disabled" : ""}>
              <span aria-hidden="true">→</span>
              <strong>${this.transferred ? "Overdracht gereed" : escapeHtml(task.role.form.transferLabel)}</strong>
            </button>
          </section>
          <section class="sim-action-section">
            <h3>3. Administratief afronden</h3>
            <label class="sim-signature">
              <input type="checkbox" data-sim-signature ${this.signed ? "checked" : ""}>
              <span>Parafeer formulier</span>
            </label>
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
            <button type="button"
                    role="tab"
                    data-sim-waiting-tab="flow"
                    aria-selected="${this.waitingTab === "flow"}"
                    class="${this.waitingTab === "flow" ? "is-active" : ""}">
              <span>Productiestroom</span>
              <strong>${openOrders}</strong>
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
