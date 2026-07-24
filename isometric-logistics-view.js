(() => {
  "use strict";

  const VIEWBOX = { width: 1320, height: 900 };
  const PROJECTION = { originX: 660, originY: 70, tileWidth: 66, tileHeight: 34 };
  const TUTORIAL_WAREHOUSE_PALETTES = Object.freeze({
    "tutorial-blue": {
      floor: "rgba(53, 139, 255, 0.34)",
      left: "#155b89",
      right: "#1d73aa",
      interior: "#0c2e49",
      rim: "#63c7f5"
    },
    "tutorial-yellow": {
      floor: "rgba(242, 193, 54, 0.34)",
      left: "#967a21",
      right: "#b99a2f",
      interior: "#3b3010",
      rim: "#f1d66d"
    },
    green: {
      floor: "rgba(43, 169, 121, 0.34)",
      left: "#1f543a",
      right: "#286847",
      interior: "#0d3020",
      rim: "#75df98"
    }
  });

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function formatEuro(value, signed = false) {
    const amount = Number(value || 0);
    const prefix = signed && amount > 0 ? "+" : "";
    return `${prefix}${new Intl.NumberFormat("nl-NL", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0
    }).format(amount)}`;
  }

  function project(x, y, z = 0) {
    return {
      x: PROJECTION.originX + (x - y) * (PROJECTION.tileWidth / 2),
      y: PROJECTION.originY + (x + y) * (PROJECTION.tileHeight / 2) - z
    };
  }

  function points(values) {
    return values.map(point => `${point.x},${point.y}`).join(" ");
  }

  function zoneGeometry(department) {
    const { x, y, width = 3.4, depth = 3.1, height = 58 } = department.layout;
    const floor = [
      project(x, y),
      project(x + width, y),
      project(x + width, y + depth),
      project(x, y + depth)
    ];
    const roof = [
      project(x, y, height),
      project(x + width, y, height),
      project(x + width, y + depth, height),
      project(x, y + depth, height)
    ];
    return {
      floor,
      roof,
      center: project(x + width / 2, y + depth / 2, height),
      floorCenter: project(x + width / 2, y + depth / 2),
      label: {
        x: project(x + width / 2, y + depth / 2).x,
        y: Math.max(...floor.map(point => point.y)) + 44
      },
      badge: {
        x: roof[1].x - 20,
        y: roof[1].y + 10
      }
    };
  }

  function flowPoint(referenceId, departmentById, offset = {}) {
    const department = departmentById.get(referenceId);
    if (!department) return null;
    const center = zoneGeometry(department).floorCenter;
    return { x: center.x + (offset.x || 0), y: center.y + (offset.y || 0) };
  }

  function flowPath(connection, departmentById) {
    const start = flowPoint(connection.from, departmentById, connection.fromOffset);
    const end = flowPoint(connection.to, departmentById, connection.toOffset);
    if (!start || !end) return "";
    const bend = Math.max(36, Math.abs(end.x - start.x) * 0.16);
    const curveOffsetY = Number(connection.curveOffsetY || 0);
    const path = `M ${start.x} ${start.y} C ${start.x + bend} ${start.y + curveOffsetY}, ${end.x - bend} ${end.y + curveOffsetY}, ${end.x} ${end.y}`;
    const flowKind = connection.kind === "customer" ? "customer" : "material";
    const markerId = flowKind === "customer" ? "isoFlowArrowCustomer" : "isoFlowArrowMaterial";
    const stateClass = connection.highlight ? " is-highlighted" : connection.locked ? " is-locked" : "";
    return `
      <path class="iso-flow-shadow flow-${flowKind}${stateClass}" d="${path}"></path>
      <path class="iso-flow-line flow-${flowKind}${stateClass}" d="${path}" marker-end="url(#${markerId})"></path>
    `;
  }

  function statusText(status) {
    return {
      active: "Actief",
      attention: "Aandacht",
      blocked: "Geblokkeerd",
      complete: "Gereed",
      idle: "Beschikbaar"
    }[status] || "Beschikbaar";
  }

  function symbolMarkup(department, center) {
    const x = center.x;
    const y = center.y + 6;
    if (department.kind === "warehouse") {
      return `
        <g class="iso-roof-symbol" aria-hidden="true">
          <rect x="${x - 24}" y="${y - 14}" width="14" height="14" rx="2"></rect>
          <rect x="${x - 7}" y="${y - 14}" width="14" height="14" rx="2"></rect>
          <rect x="${x + 10}" y="${y - 14}" width="14" height="14" rx="2"></rect>
          <path d="M ${x - 22} ${y - 7}h10M ${x - 5} ${y - 7}h10M ${x + 12} ${y - 7}h10"></path>
        </g>
      `;
    }
    if (department.kind === "quality") {
      return `
        <g class="iso-roof-symbol" aria-hidden="true">
          <circle cx="${x}" cy="${y - 8}" r="19"></circle>
          <path d="M ${x - 10} ${y - 8}l7 7 14-17"></path>
        </g>
      `;
    }
    if (department.kind === "dispatch") {
      return `
        <g class="iso-roof-symbol" aria-hidden="true">
          <path d="M ${x - 25} ${y + 2}h34v-19h16l13 13v16h-10M ${x + 9} ${y - 15}v12h24"></path>
          <circle cx="${x - 13}" cy="${y + 12}" r="6"></circle>
          <circle cx="${x + 24}" cy="${y + 12}" r="6"></circle>
        </g>
      `;
    }
    return `
      <g class="iso-roof-symbol" aria-hidden="true">
        <path d="M ${x - 25} ${y + 10}v-26l13 9 12-9 13 9 12-9v26z"></path>
        <path d="M ${x - 14} ${y + 10}v-10h12v10M ${x + 6} ${y + 10}v-10h12v10"></path>
      </g>
    `;
  }

  function openWarehouseMarkup(department, geometry) {
    const center = geometry.center;
    const palette = department.materialId
      ? TUTORIAL_WAREHOUSE_PALETTES[department.departmentColor]
      : null;
    const opening = geometry.roof.map(point => ({
      x: point.x + (center.x - point.x) * 0.12,
      y: point.y + (center.y - point.y) * 0.12 + 3
    }));
    const visuals = Array.isArray(department.stockVisuals) ? department.stockVisuals : [];
    const items = visuals.flatMap((visual, visualIndex) => (
      Array.from(
        { length: Math.max(0, Math.min(4, Number(visual.count || 0))) },
        (_, itemIndex) => ({
          ...visual,
          instanceId: `${visual.partId || visualIndex}-${itemIndex}`
        })
      )
    )).slice(0, 8);
    const scale = department.compactStock ? 0.3 : 0.34;
    const offsets = [
      { x: -49, y: 14 },
      { x: -17, y: 1 },
      { x: 18, y: 14 },
      { x: 49, y: 1 },
      { x: -16, y: -17 },
      { x: 20, y: -17 },
      { x: -47, y: -12 },
      { x: 49, y: -15 }
    ];
    const bricks = window.LegoTowerRenderer
      ? items.map((visual, index) => {
        const width = Number(visual.width || 2);
        const depth = Number(visual.depth || 2);
        const brickX = (6 - width) / 2;
        const brickY = (6 - depth) / 2;
        const offset = offsets[index];
        return `
          <g class="iso-stock-brick${visual.draggable ? " is-draggable iso-draggable-object" : ""}"
             transform="translate(${center.x + offset.x - 90 * scale} ${center.y + offset.y - 105 * scale}) scale(${scale})"
             data-drag-kind="stock"
             data-stock-source-id="${escapeHtml(department.id)}"
             data-stock-part-id="${escapeHtml(visual.partId || "")}"
             data-stock-instance-id="${escapeHtml(visual.instanceId)}"
             role="img"
             aria-label="${escapeHtml(visual.draggable
               ? `Sleep ${visual.label || "blok"} naar ${department.dragTargetLabel || "de Bouwvoorraad"}`
               : `${visual.label || "Blok"} in ${department.title}`)}">
            ${window.LegoTowerRenderer.brick(
              brickX,
              brickY,
              0,
              width,
              depth,
              visual.color || "blue"
            )}
          </g>
        `;
      }).join("")
      : "";
    const cargo = towerCargoMarkup(department, geometry);
    const empty = items.length === 0 && !cargo
      ? `<text class="iso-empty-stock-label"
               x="${center.x}"
               y="${center.y + 7}"
               text-anchor="middle">${escapeHtml(department.emptyLabel || "ophaalvak leeg")}</text>`
      : "";
    return `
      <polygon class="iso-building-interior"
               points="${points(opening)}"
               ${palette ? `style="fill:${palette.interior};stroke:${palette.rim};stroke-width:3"` : ""}></polygon>
      <polyline class="iso-building-rim"
                points="${points([...geometry.roof, geometry.roof[0]])}"
                ${palette ? `style="fill:none;stroke:${palette.rim};stroke-width:5"` : ""}></polyline>
      <g class="iso-visible-stock">${bricks}${cargo}${empty}</g>
    `;
  }

  function towerCargoMarkup(department, geometry) {
    const cargo = department.cargoVisual;
    if (!cargo || cargo.kind !== "tower" || !window.LegoTowerRenderer) return "";
    const scale = 0.56;
    const tower = [
      window.LegoTowerRenderer.plate(0, 0, 0, 6, 6, "green"),
      window.LegoTowerRenderer.brick(1, 1, 0.22, 2, 4, "blue"),
      window.LegoTowerRenderer.brick(3, 1, 0.22, 2, 4, "blue"),
      window.LegoTowerRenderer.brick(2, 2, 1, 2, 2, "yellow"),
      window.LegoTowerRenderer.brick(2, 2, 1.78, 2, 2, "green")
    ].join("");
    return `
      <g class="iso-cargo-tower${cargo.draggable ? " is-draggable iso-draggable-object" : ""}"
         transform="translate(${geometry.center.x - 90 * scale} ${geometry.center.y + 19 - 105 * scale}) scale(${scale})"
         data-drag-kind="cargo"
         data-cargo-source-id="${escapeHtml(department.id)}"
         data-cargo-id="${escapeHtml(cargo.cargoId || "")}"
         role="img"
         aria-label="${escapeHtml(cargo.draggable
           ? `Sleep ${cargo.label || "toren"} naar de volgende afdeling`
           : cargo.label || "Toren")}">
        ${tower}
      </g>
    `;
  }

  function stockDropTargetMarkup(department, geometry) {
    if (!department.acceptsStockDrop && !department.acceptsCargoDrop) return "";
    if (department.showDropLabel === false) return "";
    const offsetY = Number(department.dropLabelOffsetY ?? -62);
    return `
      <g class="iso-stock-drop-label" transform="translate(${geometry.center.x} ${geometry.center.y + offsetY})">
        <rect x="-74" y="-20" width="148" height="40" rx="10"></rect>
        <text y="5" text-anchor="middle">${escapeHtml(department.dropLabel || "BOUWAFDELING")}</text>
      </g>
    `;
  }

  function departmentMarkup(department, selectedId) {
    const geometry = zoneGeometry(department);
    const selected = department.id === selectedId;
    const orderCount = department.orders?.length || 0;
    const palette = department.materialId
      ? TUTORIAL_WAREHOUSE_PALETTES[department.departmentColor]
      : null;
    const selectedRenderState = selected || Boolean(palette) || department.forceSelectedRender;
    return `
      <g class="iso-department department-${escapeHtml(department.departmentColor)} status-${escapeHtml(department.status)}${department.openRoof ? " is-open-roof" : ""}${palette ? " is-tutorial-warehouse" : ""}${selectedRenderState ? " is-selected" : ""}${department.highlight ? " is-highlighted" : ""}${department.locked ? " is-locked" : ""}${department.acceptsStockDrop || department.acceptsCargoDrop ? " is-drop-target" : ""}"
         data-department-id="${escapeHtml(department.id)}"
         data-accepts-drag-kind="${department.acceptsCargoDrop ? "cargo" : department.acceptsStockDrop ? "stock" : ""}"
         role="button"
         tabindex="0"
         aria-disabled="${department.locked ? "true" : "false"}"
        aria-label="${escapeHtml(`${department.title}: ${statusText(department.status)}, ${department.badgeLabel || `${orderCount} lopende orders`}`)}">
        <g class="iso-building">
          <polygon class="iso-zone-floor"
                   points="${points(geometry.floor)}"
                   ${palette ? `style="fill:${palette.floor};stroke:${palette.rim};stroke-width:4"` : ""}></polygon>
          <polygon class="iso-building-left"
                   points="${points([
            geometry.floor[3], geometry.floor[2], geometry.roof[2], geometry.roof[3]
          ])}"
                   ${palette ? `style="fill:${palette.left};stroke:${palette.rim};stroke-width:2"` : ""}></polygon>
          <polygon class="iso-building-right"
                   points="${points([
            geometry.floor[1], geometry.floor[2], geometry.roof[2], geometry.roof[1]
          ])}"
                   ${palette ? `style="fill:${palette.right};stroke:${palette.rim};stroke-width:2"` : ""}></polygon>
          ${department.openRoof
            ? openWarehouseMarkup(department, geometry)
            : `
              <polygon class="iso-building-roof" points="${points(geometry.roof)}"></polygon>
              ${symbolMarkup(department, geometry.center)}
            `}
          ${stockDropTargetMarkup(department, geometry)}
        </g>
      </g>
    `;
  }

  function departmentOverlayMarkup(department, selectedId) {
    const geometry = zoneGeometry(department);
    const selected = department.id === selectedId;
    const selectedRenderState = selected || department.forceSelectedRender || Boolean(
      department.materialId
      && TUTORIAL_WAREHOUSE_PALETTES[department.departmentColor]
    );
    const orderCount = department.orders?.length || 0;
    const badgeValue = department.badgeValue ?? orderCount;
    const title = department.shortTitle || department.title;
    const labelWidth = title.length > 18 ? 230 : 194;
    const hideMetric = Boolean(department.hideMetric);
    return `
      <g class="iso-department-overlay department-${escapeHtml(department.departmentColor)}${selectedRenderState ? " is-selected" : ""}" aria-hidden="true">
        <g class="iso-status-badge" transform="translate(${geometry.badge.x} ${geometry.badge.y})">
          <circle r="13"></circle>
          <text text-anchor="middle" dominant-baseline="central">${escapeHtml(badgeValue)}</text>
        </g>
        <g class="iso-zone-label" transform="translate(${geometry.label.x} ${geometry.label.y})">
          <rect x="${-labelWidth / 2}" y="-21" width="${labelWidth}" height="${hideMetric ? 36 : 52}" rx="9"></rect>
          <text class="iso-zone-title" y="${hideMetric ? 2 : -3}" text-anchor="middle">${escapeHtml(title)}</text>
          ${hideMetric ? "" : `<text class="iso-zone-metric" y="18" text-anchor="middle">${escapeHtml(department.primaryMetric)}</text>`}
        </g>
      </g>
    `;
  }

  function detailMarkup(department) {
    if (!department) {
      return `
        <aside class="iso-department-detail" aria-live="polite">
          <p class="eyebrow">Afdelingsinformatie</p>
          <h3>Selecteer een afdeling</h3>
          <p>Klik op een ruimte om voorraad, status en lopende orders te bekijken.</p>
        </aside>
      `;
    }
    const facts = (department.facts || []).map(fact => `
      <div class="iso-detail-fact">
        <span>${escapeHtml(fact.label)}</span>
        <strong>${escapeHtml(fact.value)}</strong>
      </div>
    `).join("");
    const orders = (department.orders || []).length
      ? department.orders.map(order => `
          <li>
            <strong>${escapeHtml(order.id)}</strong>
            <span>${escapeHtml(order.product)} · ${escapeHtml(order.stage)}</span>
          </li>
        `).join("")
      : "<li><span>Geen lopende orders in deze afdeling.</span></li>";
    const action = department.action
      ? `<button type="button"
                 class="primary-button iso-department-action"
                 data-department-action="${escapeHtml(department.id)}"
                 ${department.action.disabled ? "disabled" : ""}>
           ${escapeHtml(department.action.label)}
         </button>`
      : "";
    const feedback = department.feedback
      ? `<p class="iso-detail-feedback is-${escapeHtml(department.feedback.kind || "info")}">${escapeHtml(department.feedback.text)}</p>`
      : "";
    return `
      <aside class="iso-department-detail" aria-live="polite">
        <div class="iso-detail-heading">
          <div>
            <p class="eyebrow">Afdelingsinformatie</p>
            <h3>${escapeHtml(department.title)}</h3>
          </div>
          <span class="iso-detail-status status-${escapeHtml(department.status)}">${statusText(department.status)}</span>
        </div>
        <p>${escapeHtml(department.description)}</p>
        <div class="iso-detail-facts">${facts}</div>
        ${feedback}
        ${action}
        <h4>Lopende orders</h4>
        <ul class="iso-detail-orders">${orders}</ul>
      </aside>
    `;
  }

  function tutorialMarkup(tutorial) {
    if (!tutorial?.active) return "";
    const collected = Number(tutorial.collected || 0);
    const required = Math.max(1, Number(tutorial.required || 1));
    const progress = Math.min(100, Math.round((collected / required) * 100));
    if (tutorial.visualOnly) {
      return `
        <section class="iso-tutorial-banner is-visual-only" aria-label="${escapeHtml(tutorial.title || "Tutorial")}">
          <p class="iso-visual-step">${escapeHtml(tutorial.stepLabel || "")}</p>
          ${tutorial.towerSequence && window.LegoTowerRenderer
            ? window.LegoTowerRenderer.renderAnimated(
                tutorial.towerSequence,
                "Geanimeerde bouw van Toren B",
                "iso-tutorial-visual"
              )
            : tutorial.image
              ? `<img class="iso-tutorial-visual" src="${escapeHtml(tutorial.image)}" alt="">`
              : ""}
          <div class="iso-tutorial-progress" aria-label="${progress}% voltooid">
            <span>${collected}/${required}</span>
            <div><i style="width:${progress}%"></i></div>
          </div>
        </section>
      `;
    }
    return `
      <section class="iso-tutorial-banner is-${escapeHtml(tutorial.status || "collecting")}" aria-live="polite">
        <div class="iso-tutorial-copy">
          <p class="eyebrow">${escapeHtml(tutorial.eyebrow || "Self-starting tutorial · stap 2")}</p>
          <h3>${escapeHtml(tutorial.title || "Magazijn & voorraad")}</h3>
          <p>${escapeHtml(tutorial.instruction || "")}</p>
          <strong>${escapeHtml(tutorial.feedback || "")}</strong>
        </div>
        <div class="iso-tutorial-progress" aria-label="${progress}% voltooid">
          <span>${collected}/${required}</span>
          <div><i style="width:${progress}%"></i></div>
        </div>
      </section>
    `;
  }

  function financeHudMarkup(finance) {
    if (!finance?.active) return "";
    const flash = finance.flash === "credit"
      ? " is-credit"
      : finance.flash === "debit"
        ? " is-debit"
        : "";
    return `
      <aside class="iso-finance-hud${flash}${finance.moneyEnabled ? "" : " is-disabled"}"
             aria-live="polite"
             aria-label="${finance.moneyEnabled ? `Kassasaldo ${formatEuro(finance.balance)}` : "Spelen met geld staat uit"}">
        <span class="iso-finance-icon" aria-hidden="true">€</span>
        <span>
          <small>${finance.moneyEnabled ? "Kassasaldo" : "Game Master"}</small>
          <strong>${finance.moneyEnabled ? formatEuro(finance.balance) : "Geld uit"}</strong>
        </span>
      </aside>
    `;
  }

  function financeMutationMarkup(finance, departmentById) {
    const mutation = finance?.mutation;
    if (!finance?.active || !finance.moneyEnabled || !mutation) return "";
    const department = departmentById.get(mutation.departmentId);
    if (!department) return "";
    const geometry = zoneGeometry(department);
    const positive = Number(mutation.amount) > 0;
    return `
      <g transform="translate(${geometry.center.x} ${geometry.center.y - 64})" aria-hidden="true">
        <g class="iso-money-mutation ${positive ? "is-positive" : "is-negative"}">
          <rect x="-54" y="-22" width="108" height="44" rx="22"></rect>
          <text text-anchor="middle" dominant-baseline="central">${escapeHtml(formatEuro(mutation.amount, true))}</text>
        </g>
      </g>
    `;
  }

  function financeSummaryMarkup(finance) {
    if (!finance?.active || !finance.complete) return "";
    const value = amount => finance.moneyEnabled ? formatEuro(amount) : "—";
    const resultValue = !finance.moneyEnabled
      ? "—"
      : finance.pnlEnabled
        ? formatEuro(finance.margin)
        : "Verborgen";
    return `
      <section class="iso-finance-summary" role="dialog" aria-modal="false" aria-labelledby="isoFinanceSummaryTitle">
        <p class="eyebrow">Transactie voltooid</p>
        <h3 id="isoFinanceSummaryTitle">${finance.moneyEnabled ? "Resultaat van deze order" : "Financiële module uitgeschakeld"}</h3>
        <dl>
          <div><dt>Inkoopkosten</dt><dd class="is-cost">${value(finance.purchaseCost)}</dd></div>
          <div><dt>Verkoopopbrengst</dt><dd class="is-revenue">${value(finance.revenue)}</dd></div>
          <div class="is-result"><dt>Resultaat / marge</dt><dd>${resultValue}</dd></div>
        </dl>
        ${finance.moneyEnabled
          ? `<p>Van ${formatEuro(finance.openingBalance)} naar <strong>${formatEuro(finance.balance)}</strong>.</p>`
          : "<p>De orderstroom werkt door, maar er zijn geen bedragen geboekt.</p>"}
        ${finance.moneyEnabled && !finance.pnlEnabled
          ? "<p>De Game Master heeft de resultaatweergave uitgeschakeld.</p>"
          : ""}
        <button type="button" class="primary-button" data-finance-action="next">
          ${escapeHtml(finance.nextLabel || "Naar Stap 5")}
        </button>
      </section>
    `;
  }

  function mount(container, scene, options = {}) {
    if (!container) return;
    const departments = (scene.departments || [])
      .filter(department => department.visible !== false)
      .map(department => (
        scene.tutorial?.active
          ? { ...department, forceSelectedRender: true }
          : department
      ));
    const departmentById = new Map(departments.map(department => [department.id, department]));
    const selected = departmentById.get(scene.selectedDepartmentId) || null;
    const minX = Math.min(...departments.map(department => department.layout.x), 0) - 2;
    const minY = Math.min(...departments.map(department => department.layout.y), 0) - 1;
    const maxX = Math.max(...departments.map(department => department.layout.x + department.layout.width), 13) + 2;
    const maxY = Math.max(...departments.map(department => department.layout.y + department.layout.depth), 10) + 2;
    const background = [
      project(minX, minY),
      project(maxX, minY),
      project(maxX, maxY),
      project(minX, maxY)
    ];
    const flows = (scene.connections || [])
      .filter(connection => (
        departmentById.has(connection.from)
        && departmentById.has(connection.to)
      ))
      .map(connection => flowPath(connection, departmentById))
      .join("");
    const sortedDepartments = [...departments].sort((left, right) => {
      const leftDepth = left.layout.x + left.layout.y;
      const rightDepth = right.layout.x + right.layout.y;
      return leftDepth - rightDepth || left.layout.x - right.layout.x;
    });
    const zones = sortedDepartments.map(department => departmentMarkup(department, selected?.id)).join("");
    const overlays = sortedDepartments.map(department => departmentOverlayMarkup({
      ...department,
      hideMetric: department.hideMetric || Boolean(scene.tutorial?.active)
    }, selected?.id)).join("");
    const legend = (scene.legend || []).map(item => `
      <span><i class="department-${escapeHtml(item.color)}"></i>${escapeHtml(item.label)}</span>
    `).join("");

    container.innerHTML = `
      <div class="iso-logistics-view${scene.tutorial?.active ? " is-tutorial" : ""}">
        <div class="iso-map-frame">
          <div class="iso-map-toolbar">
            <div>
              <p class="eyebrow">Live ketenkaart</p>
              <strong>${escapeHtml(scene.title || "Vaste isometrische projectie")}</strong>
            </div>
            <div class="iso-map-legend" aria-label="Afdelingslegenda">${legend}</div>
          </div>
          ${tutorialMarkup(scene.tutorial)}
          ${financeHudMarkup(scene.finance)}
          <svg class="iso-map"
               viewBox="0 0 ${VIEWBOX.width} ${VIEWBOX.height}"
               preserveAspectRatio="xMidYMid meet"
               role="img"
               aria-label="Isometrische kaart van de logistieke afdelingen">
            <defs>
              ${window.LegoTowerRenderer ? window.LegoTowerRenderer.definitions() : ""}
              <linearGradient id="isoGroundGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#123039"></stop>
                <stop offset="100%" stop-color="#08161c"></stop>
              </linearGradient>
              <filter id="isoDepartmentShadow" x="-30%" y="-30%" width="160%" height="180%">
                <feDropShadow dx="0" dy="10" stdDeviation="8" flood-color="#000000" flood-opacity="0.42"></feDropShadow>
              </filter>
              <marker id="isoFlowArrowMaterial" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="8" markerHeight="8" orient="auto">
                <path d="M 0 0 L 10 5 L 0 10 z"></path>
              </marker>
              <marker id="isoFlowArrowCustomer" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="8" markerHeight="8" orient="auto">
                <path d="M 0 0 L 10 5 L 0 10 z"></path>
              </marker>
            </defs>
            <polygon class="iso-map-ground" points="${points(background)}"></polygon>
            <g class="iso-grid-lines" aria-hidden="true"></g>
            <g class="iso-flow-layer" aria-hidden="true">${flows}</g>
            <g class="iso-department-layer">${zones}</g>
            <g class="iso-overlay-layer">${overlays}${financeMutationMarkup(scene.finance, departmentById)}</g>
          </svg>
          ${financeSummaryMarkup(scene.finance)}
        </div>
        ${scene.tutorial?.active ? "" : detailMarkup(selected)}
      </div>
    `;

    const activate = element => {
      const departmentId = element?.dataset.departmentId;
      if (departmentId && typeof options.onDepartmentSelect === "function") {
        options.onDepartmentSelect(departmentId);
      }
    };
    container.querySelectorAll(".iso-department").forEach(element => {
      element.addEventListener("click", () => activate(element));
      element.addEventListener("keydown", event => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          activate(element);
        }
      });
    });
    let stockDrag = null;
    const clearDropTarget = () => {
      container.querySelector(".iso-department.is-drag-over")?.classList.remove("is-drag-over");
    };
    const dropTargetAt = (clientX, clientY, dragKind) => {
      const target = document.elementFromPoint(clientX, clientY)?.closest(".iso-department.is-drop-target");
      return target
        && container.contains(target)
        && target.dataset.acceptsDragKind === dragKind
        ? target
        : null;
    };
    const finishStockDrag = (event, cancelled = false) => {
      if (!stockDrag || event.pointerId !== stockDrag.pointerId) return;
      const { element, dragKind, sourceDepartmentId, partId, instanceId, cargoId } = stockDrag;
      const target = cancelled ? null : dropTargetAt(event.clientX, event.clientY, dragKind);
      clearDropTarget();
      element.classList.remove("is-dragging");
      element.style.translate = "";
      if (element.hasPointerCapture(event.pointerId)) {
        element.releasePointerCapture(event.pointerId);
      }
      stockDrag = null;
      let accepted = null;
      if (target && dragKind === "stock" && typeof options.onStockDrop === "function") {
        accepted = options.onStockDrop({
          sourceDepartmentId,
          targetDepartmentId: target.dataset.departmentId,
          partId,
          instanceId
        });
      }
      if (target && dragKind === "cargo" && typeof options.onCargoDrop === "function") {
        accepted = options.onCargoDrop({
          sourceDepartmentId,
          targetDepartmentId: target.dataset.departmentId,
          cargoId
        });
      }
      if ((!target || accepted === false) && element.isConnected) {
        element.classList.add("is-rejected");
        window.setTimeout(() => element.classList.remove("is-rejected"), 430);
      }
    };
    container.querySelectorAll(".iso-draggable-object").forEach(element => {
      element.addEventListener("pointerdown", event => {
        if (event.button !== 0) return;
        event.preventDefault();
        event.stopPropagation();
        element.setPointerCapture(event.pointerId);
        element.classList.add("is-dragging");
        stockDrag = {
          element,
          pointerId: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
          dragKind: element.dataset.dragKind,
          sourceDepartmentId: element.dataset.stockSourceId || element.dataset.cargoSourceId,
          partId: element.dataset.stockPartId,
          instanceId: element.dataset.stockInstanceId,
          cargoId: element.dataset.cargoId
        };
      });
      element.addEventListener("pointermove", event => {
        if (!stockDrag || event.pointerId !== stockDrag.pointerId) return;
        const deltaX = event.clientX - stockDrag.startX;
        const deltaY = event.clientY - stockDrag.startY;
        element.style.translate = `${deltaX}px ${deltaY}px`;
        clearDropTarget();
        dropTargetAt(event.clientX, event.clientY, stockDrag.dragKind)?.classList.add("is-drag-over");
      });
      element.addEventListener("pointerup", finishStockDrag);
      element.addEventListener("pointercancel", event => finishStockDrag(event, true));
    });
    container.querySelector(".iso-department-action")?.addEventListener("click", event => {
      const departmentId = event.currentTarget.dataset.departmentAction;
      if (departmentId && typeof options.onDepartmentAction === "function") {
        options.onDepartmentAction(departmentId);
      }
    });
    container.querySelector("[data-finance-action]")?.addEventListener("click", event => {
      const action = event.currentTarget.dataset.financeAction;
      if (action && typeof options.onFinanceAction === "function") {
        options.onFinanceAction(action);
      }
    });
  }

  window.IsometricLogisticsView = Object.freeze({
    mount,
    project,
    geometryForDepartment: zoneGeometry
  });
})();
