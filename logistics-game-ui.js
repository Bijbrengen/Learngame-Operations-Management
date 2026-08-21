(() => {
  "use strict";

  const MAX_SIGNATURE_STROKES = 64;
  const MAX_SIGNATURE_POINTS = 512;

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

  function inlineProcessCable(id) {
    const cables = window.LeerpretSDK?.components?.["lego-cables"];
    if (!cables?.connectionMarkup) return "";
    return `<svg class="sim-inline-cable" viewBox="0 0 72 44" aria-hidden="true">${cables.connectionMarkup({
      id: `fallback-${id}`,
      from: [4, 12],
      to: [68, 12],
      bend: 16,
      sag: 18,
      direction: "forward",
      className: "sim-fallback-cable"
    })}</svg>`;
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
      this.lastFlowSignature = "";
      this.taskKey = null;
      this.customerOrderDraft = null;
      this.digitalSelectedPartId = null;
      this.activeDigitalDrag = false;
      this.pendingDigitalDragRender = false;
      this.feedback = "";
      this.remoteActionSubmitter = typeof options.actionSubmitter === "function"
        ? options.actionSubmitter
        : null;
      this.remoteActionPending = false;
      this.restoringSharedSnapshot = false;
      this.renderProcessFlow = typeof options.renderProcessFlow === "function"
        ? options.renderProcessFlow
        : null;
      this.unsubscribe = this.engine.subscribe(event => {
        if (event.snapshot) {
          this.renderTopDepartmentMini(event.snapshot);
          this.renderTopLiveEvents(event.snapshot);
        }
        if (this.restoringSharedSnapshot && event.type === "snapshot-restored") return;
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
        if (event.type === "snapshot-restored" && !this.engine.playerTask()) {
          this.remoteActionPending = false;
        }
        this.render();
      });
      this.handleClick = this.handleClick.bind(this);
      this.handleChange = this.handleChange.bind(this);
      this.handleSubmit = this.handleSubmit.bind(this);
      this.handleDragStart = this.handleDragStart.bind(this);
      this.handleDragEnd = this.handleDragEnd.bind(this);
      this.handleDragOver = this.handleDragOver.bind(this);
      this.handleDrop = this.handleDrop.bind(this);
      this.handlePointerDown = this.handlePointerDown.bind(this);
      this.handlePointerMove = this.handlePointerMove.bind(this);
      this.handlePointerUp = this.handlePointerUp.bind(this);
      this.handleTopDepartmentClick = this.handleTopDepartmentClick.bind(this);
      this.handleTopDepartmentKeydown = this.handleTopDepartmentKeydown.bind(this);
      this.mount.addEventListener("click", this.handleClick);
      this.mount.addEventListener("change", this.handleChange);
      this.mount.addEventListener("submit", this.handleSubmit);
      this.mount.addEventListener("dragstart", this.handleDragStart);
      this.mount.addEventListener("dragend", this.handleDragEnd);
      this.mount.addEventListener("dragover", this.handleDragOver);
      this.mount.addEventListener("drop", this.handleDrop);
      this.mount.addEventListener("pointerdown", this.handlePointerDown);
      this.mount.addEventListener("pointermove", this.handlePointerMove);
      this.mount.addEventListener("pointerup", this.handlePointerUp);
      this.mount.addEventListener("pointercancel", this.handlePointerUp);
      document.getElementById("topDepartmentMiniView")
        ?.addEventListener("click", this.handleTopDepartmentClick);
      document.getElementById("topDepartmentMiniView")
        ?.addEventListener("keydown", this.handleTopDepartmentKeydown);
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

    setActionSubmitter(submitter) {
      const normalized = typeof submitter === "function" ? submitter : null;
      if (normalized === this.remoteActionSubmitter) return;
      this.remoteActionPending = false;
      this.remoteActionSubmitter = normalized;
      this.render();
    }

    confirmRemoteAction() {
      if (!this.remoteActionPending) return;
      this.remoteActionPending = false;
      this.resetPlayerInput();
      this.feedback = "Handeling is in de gedeelde spelstatus verwerkt.";
      this.render();
    }

    rejectRemoteAction(errors = []) {
      this.remoteActionPending = false;
      this.feedback = (errors.length ? errors : ["De handeling past niet meer bij de actuele spelsituatie."])
        .map(error => String(error))
        .join(" Â· ");
      this.render();
    }

    restoreSnapshot(snapshot, options = {}) {
      const previousTask = this.engine.playerTask();
      const previousTaskKey = previousTask
        ? `${previousTask.role.id}:${previousTask.order.id}`
        : "";
      this.restoringSharedSnapshot = true;
      try {
        this.engine.restoreSnapshot(snapshot, options);
      } finally {
        this.restoringSharedSnapshot = false;
      }
      const nextTask = this.engine.playerTask();
      const nextTaskKey = nextTask ? `${nextTask.role.id}:${nextTask.order.id}` : "";
      if (previousTaskKey !== nextTaskKey || !nextTaskKey) {
        this.resetPlayerInput();
        this.remoteActionPending = false;
        this.render();
      } else {
        const restored = this.engine.snapshot();
        this.renderTopDepartmentMini(restored);
        this.renderTopLiveEvents(restored);
        const countdown = this.mount.querySelector(".sim-countdown");
        if (countdown && nextTask) countdown.textContent = formatCountdown(nextTask.order.dueAt);
      }
      return this;
    }

    async submitPlayerAction(payload, successMessage) {
      if (this.remoteActionPending) {
        return { ok: false, pending: true, errors: ["Deze handeling wordt al verwerkt."] };
      }
      if (!this.remoteActionSubmitter) {
        const result = this.engine.completePlayerAction(payload);
        this.feedback = result.ok ? successMessage : result.errors.join(" · ");
        if (result.ok) this.resetPlayerInput();
        this.render();
        return result;
      }
      this.remoteActionPending = true;
      this.feedback = "Handeling wordt gedeeld met de andere spelers…";
      this.render();
      try {
        const task = this.engine.playerTask();
        const roleId = task?.role?.id || this.engine.humanRoleId || "unknown";
        const productId = task?.order?.productId || "unknown";
        const result = await this.remoteActionSubmitter(payload, {
          action_type: roleId === "customer"
            ? "simulation_customer_order_submitted"
            : "simulation_role_action_submitted",
          learning_object_id: `lom.simulation.${roleId}.${productId}`,
          role_id: roleId,
          order_id: task?.order?.id || null,
          product_id: task?.order?.productId || null
        });
        if (result?.ok === false) {
          this.remoteActionPending = false;
          this.feedback = (result.errors || ["De handeling kon niet worden verwerkt."]).join(" · ");
        } else {
          this.feedback = result?.message || "Handeling ontvangen; de gedeelde spelstatus wordt bijgewerkt.";
        }
        this.render();
        return result || { ok: true, queued: true };
      } catch (error) {
        this.remoteActionPending = false;
        this.feedback = error?.message || "De handeling kon niet worden gedeeld.";
        this.render();
        return { ok: false, errors: [this.feedback] };
      }
    }

    destroy() {
      this.unsubscribe?.();
      this.engine.stop();
      this.mount.removeEventListener("click", this.handleClick);
      this.mount.removeEventListener("change", this.handleChange);
      this.mount.removeEventListener("submit", this.handleSubmit);
      this.mount.removeEventListener("dragstart", this.handleDragStart);
      this.mount.removeEventListener("dragend", this.handleDragEnd);
      this.mount.removeEventListener("dragover", this.handleDragOver);
      this.mount.removeEventListener("drop", this.handleDrop);
      this.mount.removeEventListener("pointerdown", this.handlePointerDown);
      this.mount.removeEventListener("pointermove", this.handlePointerMove);
      this.mount.removeEventListener("pointerup", this.handlePointerUp);
      this.mount.removeEventListener("pointercancel", this.handlePointerUp);
      document.getElementById("topDepartmentMiniView")
        ?.removeEventListener("click", this.handleTopDepartmentClick);
      document.getElementById("topDepartmentMiniView")
        ?.removeEventListener("keydown", this.handleTopDepartmentKeydown);
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

      const completeButton = eventTargetClosest(event, "[data-sim-complete]");
      if (completeButton && !completeButton.disabled) {
        const task = this.engine.playerTask();
        void this.submitPlayerAction({
          parts: { ...this.selectedParts },
          signed: this.signed,
          signature: this.signatureEvidence(),
          completedQuantity: this.completedOrderQuantity(task),
          transferred: this.transferred
        }, "Handeling verwerkt en doorgestuurd.");
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
        this.activeDigitalDrag = true;
        this.mount.classList.add("is-digital-dragging");
        this.digitalSelectedPartId = part.dataset.simDragPart;
        event.dataTransfer?.setData("application/x-learngame-part", part.dataset.simDragPart);
        event.dataTransfer?.setData("text/plain", part.dataset.simDragPart);
        if (event.dataTransfer) event.dataTransfer.effectAllowed = "copy";
        return;
      }
      const cargo = eventTargetClosest(event, "[data-sim-transfer-cargo]");
      if (cargo && !cargo.disabled) {
        this.activeDigitalDrag = true;
        this.mount.classList.add("is-digital-dragging");
        event.dataTransfer?.setData("application/x-learngame-transfer", "ready");
        if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
      }
    }

    handleDragEnd() {
      if (!this.activeDigitalDrag) return;
      this.activeDigitalDrag = false;
      this.mount.classList.remove("is-digital-dragging");
      if (this.pendingDigitalDragRender) {
        this.pendingDigitalDragRender = false;
        this.render();
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
      if (
        this.signatureStrokes.length >= MAX_SIGNATURE_STROKES
        || this.signatureStrokes.reduce((sum, stroke) => sum + stroke.length, 0) >= MAX_SIGNATURE_POINTS
      ) return;
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
      if (this.signatureStrokes.reduce((sum, stroke) => sum + stroke.length, 0) >= MAX_SIGNATURE_POINTS) return;
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
      if (!this.signed) return [];
      let remaining = MAX_SIGNATURE_POINTS;
      return this.signatureStrokes.slice(0, MAX_SIGNATURE_STROKES).flatMap(stroke => {
        if (remaining <= 0) return [];
        const bounded = stroke.slice(0, remaining);
        remaining -= bounded.length;
        return [bounded.map(point => [
          Number(point.x.toFixed(1)),
          Number(point.y.toFixed(1))
        ])];
      });
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
      void this.submitPlayerAction({
        customerOrder: {
          productId: String(values.get("product_id") || ""),
          quantity: Number(values.get("quantity")),
          dueMinutes: Number(values.get("due_minutes"))
        }
      }, "Order geplaatst en doorgestuurd naar Operations.");
    }

    partsComplete(task) {
      return Object.entries(task?.requiredParts || {}).every(
        ([partId, required]) => Number(this.selectedParts[partId] || 0) >= Number(required)
      );
    }

    render() {
      if (this.activeDigitalDrag) {
        this.pendingDigitalDragRender = true;
        return;
      }
      const snapshot = this.engine.snapshot();
      this.renderTopDepartmentMini(snapshot);
      this.renderTopLiveEvents(snapshot);
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

    renderTopDepartmentMini(snapshot) {
      const miniView = document.getElementById("topDepartmentMiniView");
      if (!miniView) return;
      const visible = Boolean(snapshot?.started);
      miniView.hidden = !visible;
      if (!visible) {
        miniView.replaceChildren();
        window.dispatchEvent(new CustomEvent("learngame-top-department-close"));
        return;
      }
      const stateLabels = {
        IDLE: "Wacht op input",
        PROCESSING: "Verwerkt order",
        WAITING_FOR_NEXT: "Bereidt overdracht voor",
        AWAITING_PLAYER: "Wacht op speler"
      };
      miniView.innerHTML = `
        <small>Afdelingen</small>
        <div>
          ${snapshot.roleFlow.map(roleId => {
            const role = snapshot.roles[roleId];
            const runtime = snapshot.roleRuntime[roleId];
            const stateClass = String(runtime.state || "IDLE").toLowerCase();
            const status = stateLabels[runtime.state] || runtime.state;
            return `
              <span class="top-department-mini is-${escapeHtml(stateClass)} ${roleId === snapshot.humanRoleId ? "is-human" : ""}"
                    role="button"
                    tabindex="0"
                    data-top-department-id="${escapeHtml(roleId)}"
                    aria-label="${escapeHtml(role.department)}: ${escapeHtml(status)}. Open afdelingsinformatie."
                    title="${escapeHtml(role.department)} · ${escapeHtml(status)}${runtime.activeOrderId ? ` · ${escapeHtml(runtime.activeOrderId)}` : ""}">
                <b>${escapeHtml(role.token)}</b>
                <i aria-hidden="true"></i>
              </span>
            `;
          }).join("")}
        </div>
      `;
    }

    handleTopDepartmentClick(event) {
      const button = eventTargetClosest(event, "[data-top-department-id]");
      if (!button) return;
      this.openTopDepartment(button);
    }

    handleTopDepartmentKeydown(event) {
      if (event.key !== "Enter" && event.key !== " ") return;
      const button = eventTargetClosest(event, "[data-top-department-id]");
      if (!button) return;
      event.preventDefault();
      this.openTopDepartment(button);
    }

    openTopDepartment(button) {
      window.dispatchEvent(new CustomEvent("learngame-top-department-select", {
        detail: { departmentId: button.dataset.topDepartmentId }
      }));
    }

    renderTopLiveEvents(snapshot) {
      const count = document.getElementById("liveEventCountValue");
      const feed = document.getElementById("topLiveEventFeed");
      const toggle = document.getElementById("liveEventsToggle");
      const popover = document.getElementById("topLiveEventsPopover");
      const metricStrip = document.querySelector(".metric-strip");
      const live = Boolean(snapshot?.started);
      const items = live && Array.isArray(snapshot.feed) ? snapshot.feed : [];
      metricStrip?.classList.toggle("has-live-simulation", live);
      if (live) metricStrip?.setAttribute("aria-disabled", "false");
      if (toggle) {
        toggle.disabled = !live;
        if (!live) {
          toggle.setAttribute("aria-expanded", "false");
          toggle.classList.remove("is-open");
          if (popover) popover.hidden = true;
        }
      }
      if (count) count.textContent = String(items.length);
      if (!feed) return;
      feed.innerHTML = items.length
        ? items.map(item => `
            <div class="sim-feed-item is-${escapeHtml(item.kind)}">
              <time>${formatClock(item.at)}</time>
              <span>${escapeHtml(item.message)}</span>
            </div>
          `).join("")
        : `<p class="top-live-events-empty">${
            snapshot?.started
              ? "De simulatie wacht op de eerste live gebeurtenis."
              : "Start een gamesessie om live gebeurtenissen te zien."
          }</p>`;
    }

    mountProcessFlow(snapshot) {
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
      const productCatalog = (task.availableProducts || []).map(product => `
        <label class="sim-customer-catalog-card${product.id === selectedProductId ? " is-selected" : ""}">
          <input type="radio"
                 name="product_id"
                 value="${escapeHtml(product.id)}"
                 ${product.id === selectedProductId ? "checked" : ""}
                 required>
          <span class="sim-customer-catalog-visual">${towerMarkup(product)}</span>
          <strong>${escapeHtml(product.name)}</strong>
          <small>${product.id === selectedProductId ? "Gekozen" : "Kies deze toren"}</small>
        </label>
      `).join("");
      return `
        <aside class="sim-action-panel sim-customer-order-panel">
          <header>
            <p class="eyebrow">Klantactie</p>
            <h2>Plaats een torenbestelling</h2>
            <span>${free ? "Vrije bestelling" : "Verplichte bestelling vanuit de spelvariant"}</span>
          </header>
          <form class="sim-customer-order-form" data-customer-order-form>
            ${free ? `
              <fieldset class="sim-customer-catalog">
                <legend>Kies uit het productassortiment</legend>
                <div class="sim-customer-catalog-grid">${productCatalog}</div>
              </fieldset>
            ` : `
              <label>
                <span>Toren</span>
                <strong>${escapeHtml(task.product.name)}</strong>
                <input type="hidden" name="product_id" value="${escapeHtml(task.product.id)}">
              </label>
            `}
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
            <button class="primary-button sim-customer-order-submit" type="submit" ${this.remoteActionPending ? "disabled" : ""}>
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
                    ${canComplete && !this.remoteActionPending ? "" : "disabled"}>
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
        const dimensions = this.builderCore().pieceDimensions(partId, this.engine.parts);
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

    builderCore() {
      const core = window.LeerpretSDK?.components?.["lego-builder"]?.logic;
      if (!core?.planRecipeBuild || !core?.validatePlannedPlacement) {
        throw new Error("De centrale LeerpretSDK-bouwkern is niet geladen.");
      }
      return core;
    }

    digitalBuildState(task) {
      const plan = this.builderCore().planRecipeBuild({
        stageOrder: ["pd1", "pd2", "pd3"],
        currentStage: task.role.id,
        route: task.order?.productionRoute,
        assignedStage: task.order?.productionDepartment,
        stages: task.product?.stages,
        pieces: this.engine.parts,
        selectedCounts: this.selectedParts,
        quantity: task.order?.quantity,
        groundPlatePartId: "base_green",
        boardWidth: 6,
        boardDepth: 6
      });
      return {
        ...plan,
        completedTowers: plan.completedUnits,
        currentTower: plan.currentUnit
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
              : `${state.completedTowers} van ${state.quantity} torens gebouwd · bouw toren ${state.currentTower}`}</strong>
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
      const rect = board.getBoundingClientRect?.();
      let pointer = null;
      let targetPoint = null;
      if (target && rect?.width && rect?.height && Number.isFinite(event?.clientX) && Number.isFinite(event?.clientY)) {
        pointer = { x: ((event.clientX - rect.left) / rect.width) * 520, y: ((event.clientY - rect.top) / rect.height) * 420 };
        const projected = window.LegoTowerRenderer.iso(target.x + target.width / 2, target.y + target.depth / 2, 0.27 + target.z * 0.78);
        targetPoint = { x: 170 + projected[0] * 2, y: 62 + projected[1] * 2 };
      }
      const validation = this.builderCore().validatePlannedPlacement({
        plan: state, partId, pointer, targetPoint, tolerance: 90
      });
      if (validation.reason === "build_complete") {
        this.feedback = "Alle torens voor deze order zijn al opgebouwd.";
        this.render();
        return false;
      }
      if (validation.reason === "wrong_part") {
        this.feedback = `${this.engine.parts[partId]?.label || "Dit onderdeel"} hoort niet op het gemarkeerde bouwvlak.`;
        this.render();
        return false;
      }
      if (validation.reason === "outside_target") {
        this.feedback = "Plaats het blok op het gemarkeerde bouwvlak.";
        this.render();
        return false;
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
                      ${canComplete && !this.remoteActionPending ? "" : "disabled"}>
                Uitgevoerd
              </button>
              ${this.feedback ? `<p class="sim-action-feedback">${escapeHtml(this.feedback)}</p>` : ""}
            </section>
          ` : ""}
        </aside>
      `;
    }

    waitingHeatmapMarkup(snapshot) {
      const roles = snapshot.roleFlow.map(roleId => {
        const role = snapshot.roles[roleId];
        const runtime = snapshot.roleRuntime[roleId];
        const activity = (runtime.queue?.length || 0)
          + (runtime.activeOrderId ? 2 : 0)
          + (runtime.state !== "IDLE" ? 1 : 0);
        return { roleId, role, activity };
      });
      const maximum = Math.max(1, ...roles.map(item => item.activity));
      const center = { x: 250, y: 180 };
      const radius = { x: 190, y: 125 };
      const positioned = roles.map((item, index) => {
        const angle = (-Math.PI / 2) + (index / Math.max(1, roles.length)) * Math.PI * 2;
        return {
          ...item,
          x: center.x + Math.cos(angle) * radius.x,
          y: center.y + Math.sin(angle) * radius.y,
          level: item.activity
            ? Math.max(1, Math.min(4, Math.ceil((item.activity / maximum) * 4)))
            : 0
        };
      });
      return `
        <svg class="sim-waiting-heatmap"
             viewBox="0 0 500 360"
             role="img"
             aria-label="Heatmap van actuele activiteit per afdeling">
          ${positioned.map(item => `
            <line x1="${center.x}" y1="${center.y}"
                  x2="${item.x.toFixed(1)}" y2="${item.y.toFixed(1)}"
                  class="level-${item.level}"></line>
          `).join("")}
          <g class="sim-heatmap-center" transform="translate(${center.x} ${center.y})">
            <circle r="29"></circle>
            <text y="4">JIJ</text>
          </g>
          ${positioned.map(item => `
            <g class="sim-heatmap-node level-${item.level}"
               transform="translate(${item.x.toFixed(1)} ${item.y.toFixed(1)})">
              <title>${escapeHtml(item.role.department)}: ${item.activity} activiteitspunten</title>
              <circle r="27"></circle>
              <text y="3">${escapeHtml(item.role.token || item.role.department.slice(0, 3))}</text>
              <text class="sim-heatmap-count" y="42">× ${item.activity}</text>
            </g>
          `).join("")}
        </svg>
      `;
    }

    liveLayoutMarkup(snapshot) {
      const diagram = window.ConfigurationLayoutPreview?.diagramMarkup?.({
        game_type: snapshot.gameType,
        organization_model: snapshot.organizationModel,
        play_mode: snapshot.playMode,
        production_processes: snapshot.productionProcesses,
        intermediate_stock: snapshot.intermediateStock,
        enabled_roles: snapshot.enabledRoles
      });
      return diagram || this.fallbackProcessFlowMarkup(snapshot);
    }

    factoryOverviewMarkup(snapshot) {
      const openOrders = snapshot.orders.filter(order => order.status !== "DELIVERED").length;
      return `
        <section class="sim-factory-overview">
          <div class="sim-waiting-overview" aria-label="Drie gelijktijdige liveweergaven">
            <section class="sim-waiting-view sim-live-layout-view" aria-labelledby="simWaitingLayoutTitle">
              <header>
                <h3 id="simWaitingLayoutTitle">Logistieke opstelling</h3>
                <strong>Live</strong>
              </header>
              <div class="sim-waiting-view-body sim-live-layout-body"
                   data-sim-live-layout
                   aria-label="Actieve logistieke opstelling">
                ${this.liveLayoutMarkup(snapshot)}
              </div>
            </section>
            <section class="sim-waiting-view" aria-labelledby="simWaitingFlowTitle">
              <header>
                <h3 id="simWaitingFlowTitle">Productiestroom</h3>
                <strong>${openOrders}</strong>
              </header>
              <div class="sim-waiting-view-body">
                <div class="sim-process-flow-mount"
                     data-sim-process-flow
                     aria-label="Productiestromen tussen de afdelingen"></div>
              </div>
            </section>
            <section class="sim-waiting-view" aria-labelledby="simWaitingHeatmapTitle">
              <header>
                <h3 id="simWaitingHeatmapTitle">Heatmap</h3>
                <strong>${snapshot.roleFlow.length}</strong>
              </header>
              <div class="sim-waiting-view-body sim-waiting-heatmap-body">
                ${this.waitingHeatmapMarkup(snapshot)}
              </div>
            </section>
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
              ${index < snapshot.roleFlow.length - 1 ? inlineProcessCable(`${roleId}-${index}`) : ""}
            `;
          }).join("")}
        </div>
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
