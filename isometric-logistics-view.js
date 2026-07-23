(() => {
  "use strict";

  const VIEWBOX = { width: 1320, height: 900 };
  const PROJECTION = { originX: 660, originY: 70, tileWidth: 66, tileHeight: 34 };

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
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
    return `
      <path class="iso-flow-shadow flow-${flowKind}" d="${path}"></path>
      <path class="iso-flow-line flow-${flowKind}" d="${path}" marker-end="url(#${markerId})"></path>
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

  function departmentMarkup(department, selectedId) {
    const geometry = zoneGeometry(department);
    const selected = department.id === selectedId;
    const orderCount = department.orders?.length || 0;
    return `
      <g class="iso-department department-${escapeHtml(department.departmentColor)} status-${escapeHtml(department.status)}${selected ? " is-selected" : ""}"
         data-department-id="${escapeHtml(department.id)}"
         role="button"
         tabindex="0"
         aria-label="${escapeHtml(`${department.title}: ${statusText(department.status)}, ${orderCount} lopende orders`)}">
        <g class="iso-building">
          <polygon class="iso-zone-floor" points="${points(geometry.floor)}"></polygon>
          <polygon class="iso-building-left" points="${points([
            geometry.floor[3], geometry.floor[2], geometry.roof[2], geometry.roof[3]
          ])}"></polygon>
          <polygon class="iso-building-right" points="${points([
            geometry.floor[1], geometry.floor[2], geometry.roof[2], geometry.roof[1]
          ])}"></polygon>
          <polygon class="iso-building-roof" points="${points(geometry.roof)}"></polygon>
          ${symbolMarkup(department, geometry.center)}
        </g>
      </g>
    `;
  }

  function departmentOverlayMarkup(department, selectedId) {
    const geometry = zoneGeometry(department);
    const selected = department.id === selectedId;
    const orderCount = department.orders?.length || 0;
    const title = department.shortTitle || department.title;
    const labelWidth = title.length > 18 ? 230 : 194;
    return `
      <g class="iso-department-overlay department-${escapeHtml(department.departmentColor)}${selected ? " is-selected" : ""}" aria-hidden="true">
        <g class="iso-status-badge" transform="translate(${geometry.badge.x} ${geometry.badge.y})">
          <circle r="13"></circle>
          <text text-anchor="middle" dominant-baseline="central">${orderCount}</text>
        </g>
        <g class="iso-zone-label" transform="translate(${geometry.label.x} ${geometry.label.y})">
          <rect x="${-labelWidth / 2}" y="-21" width="${labelWidth}" height="52" rx="9"></rect>
          <text class="iso-zone-title" y="-3" text-anchor="middle">${escapeHtml(title)}</text>
          <text class="iso-zone-metric" y="18" text-anchor="middle">${escapeHtml(department.primaryMetric)}</text>
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
        <h4>Lopende orders</h4>
        <ul class="iso-detail-orders">${orders}</ul>
      </aside>
    `;
  }

  function mount(container, scene, options = {}) {
    if (!container) return;
    const departments = (scene.departments || []).filter(department => department.visible !== false);
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
    const overlays = sortedDepartments.map(department => departmentOverlayMarkup(department, selected?.id)).join("");
    const legend = (scene.legend || []).map(item => `
      <span><i class="department-${escapeHtml(item.color)}"></i>${escapeHtml(item.label)}</span>
    `).join("");

    container.innerHTML = `
      <div class="iso-logistics-view">
        <div class="iso-map-frame">
          <div class="iso-map-toolbar">
            <div>
              <p class="eyebrow">Live ketenkaart</p>
              <strong>${escapeHtml(scene.title || "Vaste isometrische projectie")}</strong>
            </div>
            <div class="iso-map-legend" aria-label="Afdelingslegenda">${legend}</div>
          </div>
          <svg class="iso-map" viewBox="0 0 ${VIEWBOX.width} ${VIEWBOX.height}" role="img" aria-label="Isometrische kaart van de logistieke afdelingen">
            <defs>
              <linearGradient id="isoGroundGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#edf4ec"></stop>
                <stop offset="100%" stop-color="#dfe8dc"></stop>
              </linearGradient>
              <filter id="isoDepartmentShadow" x="-30%" y="-30%" width="160%" height="180%">
                <feDropShadow dx="0" dy="10" stdDeviation="8" flood-color="#24332e" flood-opacity="0.18"></feDropShadow>
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
            <g class="iso-overlay-layer">${overlays}</g>
          </svg>
        </div>
        ${detailMarkup(selected)}
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
  }

  window.IsometricLogisticsView = Object.freeze({
    mount,
    project,
    geometryForDepartment: zoneGeometry
  });
})();
