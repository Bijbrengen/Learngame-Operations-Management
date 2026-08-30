(() => {
  "use strict";

  const VIEWBOX = Object.freeze({ width: 1320, height: 900 });
  const PROJECTION = Object.freeze({ originX: 660, originY: 70, tileWidth: 66, tileHeight: 34 });
  const BACKGROUND_BOUNDS = Object.freeze({ minX: 0, minY: 0, maxX: 13, maxY: 10, left: 2, top: 1, right: 2, bottom: 2 });
  const DEPARTMENT_BOX_PROFILE = Object.freeze({ width: 3.4, depth: 3.1, height: 58 });
  const DEPARTMENT_LABEL_PROFILE = Object.freeze({
    aboveVisualOffset: 40,
    belowVisualOffset: 44
  });
  const FRAME_PROFILE = Object.freeze({
    minimumWidth: 760,
    minimumHeight: 560,
    paddingX: 180,
    paddingY: 170,
    minimumAspectRatio: 0.65,
    maximumAspectRatio: 2.4
  });
  const WAREHOUSE_CONTAINER_PROFILE = Object.freeze({
    boardWidth: 6,
    boardDepth: 6,
    maxLayers: 4,
    defaultWidth: 2,
    defaultDepth: 2,
    margin: 1,
    translateX: -90,
    translateY: -90
  });
  let diamondProjection = null;
  let defaultStockBoardProfile = null;

  function spatial() {
    const api = window.LeerpretSDK?.components?.["lego-spatial"];
    if (
      !api?.createDiamondProjection
      || !api?.projectDiamond
      || !api?.projectBox
      || !api?.bounds2
      || !api?.unionBoxes3
      || !api?.boxAlignmentOffset3
      || !api?.fitViewBox
      || !api?.formatViewBox
      || !api?.packSupportedGrid
      || !api?.positiveGridInteger
      || !api?.inverseTransformPoint2
    ) {
      throw new Error("De centrale LeerpretSDK-ruimtelijke bouwkern is niet geladen.");
    }
    return api;
  }

  function projection(options) {
    if (options?.kind === "diamond-v1") return options;
    if (options) {
      return spatial().createDiamondProjection({ ...PROJECTION, ...options });
    }
    if (!diamondProjection) diamondProjection = spatial().createDiamondProjection(PROJECTION);
    return diamondProjection;
  }

  function builderCore() {
    const core = window.LeerpretSDK?.components?.["lego-builder"]?.logic;
    if (!core?.builderBoardProfile || !core?.physicalLayer) {
      throw new Error("De centrale LeerpretSDK-bouwbordkern is niet geladen.");
    }
    return core;
  }

  function stockBoardProfile(options) {
    if (!options && defaultStockBoardProfile) return defaultStockBoardProfile;
    const metrics = spatial().LEGACY_RENDER_METRICS;
    if (!metrics || !Number.isFinite(Number(metrics.plateHeight)) || !Number.isFinite(Number(metrics.brickHeight))) {
      throw new Error("Het centrale LeerpretSDK-rendermaatprofiel is niet geladen.");
    }
    const source = options || {};
    const profile = builderCore().builderBoardProfile({
      ...source,
      placement: {
        baseHeight: metrics.plateHeight,
        layerPitch: metrics.brickHeight,
        ...(source.placement || {})
      }
    });
    if (!options) defaultStockBoardProfile = profile;
    return profile;
  }
  let legoGradientInstance = 0;

  function materialCartProfile() {
    const profile = window.LOMMaterialCartProfile;
    if (!profile?.markup || !profile?.countParts || !profile?.blok) {
      throw new Error("Het gedeelde LOM-materiaalwagenprofiel is niet geladen.");
    }
    return profile;
  }
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

  function screenPoint(value) {
    return { x: value[0], y: value[1] };
  }

  function project(x, y, z = 0, projectionOptions) {
    const [screenX, screenY] = spatial().projectDiamond([x, y, z], projection(projectionOptions));
    return {
      x: screenX,
      y: screenY
    };
  }

  function points(values) {
    return values.map(point => `${point.x},${point.y}`).join(" ");
  }

  function profileValue(value, fallback) {
    return value === undefined ? fallback : value;
  }

  function departmentBox(department, options) {
    const layout = department?.layout || {};
    const defaults = { ...DEPARTMENT_BOX_PROFILE, ...(options || {}) };
    return Object.freeze({
      x: layout.x,
      y: layout.y,
      z: 0,
      width: profileValue(layout.width, defaults.width),
      depth: profileValue(layout.depth, defaults.depth),
      height: profileValue(layout.height, defaults.height)
    });
  }

  function warehouseContainerPlacement(center, options) {
    const source = options || {};
    const board = source.board || {};
    const container = source.container || {};
    const width = Number(profileValue(board.width, WAREHOUSE_CONTAINER_PROFILE.boardWidth));
    const depth = Number(profileValue(board.depth, WAREHOUSE_CONTAINER_PROFILE.boardDepth));
    const margin = Number(profileValue(container.margin, WAREHOUSE_CONTAINER_PROFILE.margin));
    return Object.freeze({
      x: -margin,
      y: -margin,
      width: width + margin * 2,
      depth: depth + margin * 2,
      translateX: center.x + Number(profileValue(container.translateX, WAREHOUSE_CONTAINER_PROFILE.translateX)),
      translateY: center.y + Number(profileValue(container.translateY, WAREHOUSE_CONTAINER_PROFILE.translateY)),
      boardWidth: width,
      boardDepth: depth,
      maxLayers: Number(profileValue(source.maxLayers, WAREHOUSE_CONTAINER_PROFILE.maxLayers)),
      defaultWidth: Number(profileValue(source.defaultWidth, WAREHOUSE_CONTAINER_PROFILE.defaultWidth)),
      defaultDepth: Number(profileValue(source.defaultDepth, WAREHOUSE_CONTAINER_PROFILE.defaultDepth))
    });
  }

  function zoneGeometry(
    department,
    projectionOptions,
    departmentProfile,
    departmentLabelProfile,
    stockProfileOptions
  ) {
    const { x, y, width, depth, height } = departmentBox(department, departmentProfile);
    const labelProfile = { ...DEPARTMENT_LABEL_PROFILE, ...(departmentLabelProfile || {}) };
    const aboveVisualOffset = Number(labelProfile.aboveVisualOffset);
    const belowVisualOffset = Number(labelProfile.belowVisualOffset);
    if (
      !Number.isFinite(aboveVisualOffset)
      || aboveVisualOffset < 0
      || !Number.isFinite(belowVisualOffset)
      || belowVisualOffset < 0
    ) {
      throw new Error("Het afdelingslabelprofiel vereist niet-negatieve eindige offsets.");
    }
    const camera = projection(projectionOptions);
    const projectedBox = spatial().projectBox(
      { x, y, z: 0, width, depth, height },
      camera
    );
    const floor = projectedBox.floor.map(screenPoint);
    const roof = projectedBox.roof.map(screenPoint);
    const center = project(x + width / 2, y + depth / 2, height, camera);
    const floorCenter = project(x + width / 2, y + depth / 2, 0, camera);
    const visualBounds = departmentBuildingScreenBounds(department, center, stockProfileOptions);
    const visualTop = visualBounds?.minY ?? Math.min(...roof.map(point => point.y));
    const visualBottom = visualBounds?.maxY ?? Math.max(...floor.map(point => point.y));
    const labelAboveBuilding = department.labelPosition === "above";
    return {
      floor,
      roof,
      center,
      floorCenter,
      label: {
        x: floorCenter.x,
        y: labelAboveBuilding
          ? visualTop - aboveVisualOffset
          : visualBottom + belowVisualOffset
      },
      badge: {
        x: roof[1].x - 20,
        y: roof[1].y + 10
      },
      visualBounds
    };
  }

  function centeredDepartmentViewBox(
    departments,
    aspectRatio = VIEWBOX.width / VIEWBOX.height,
    projectionOptions,
    frameOptions,
    viewportOptions,
    departmentProfile
  ) {
    const viewport = { ...VIEWBOX, ...(viewportOptions || {}) };
    const frame = { ...FRAME_PROFILE, ...(frameOptions || {}) };
    if (!departments.length) return `0 0 ${viewport.width} ${viewport.height}`;
    const projectedPoints = departments.flatMap(department => {
      const geometry = zoneGeometry(department, projectionOptions, departmentProfile);
      return [...geometry.floor, ...geometry.roof];
    });
    const viewBox = spatial().fitViewBox(
      projectedPoints.map(point => [point.x, point.y]),
      {
        minimumWidth: frame.minimumWidth,
        minimumHeight: frame.minimumHeight,
        paddingX: frame.paddingX,
        paddingY: frame.paddingY,
        minimumAspectRatio: frame.minimumAspectRatio,
        maximumAspectRatio: frame.maximumAspectRatio,
        aspectRatio
      }
    );
    return spatial().formatViewBox(viewBox);
  }

  function flowPoint(referenceId, departmentById, offset = {}, projectionOptions, departmentProfile) {
    const department = departmentById.get(referenceId);
    if (!department) return null;
    const center = zoneGeometry(department, projectionOptions, departmentProfile).floorCenter;
    return { x: center.x + (offset.x || 0), y: center.y + (offset.y || 0) };
  }

  function wallStudFlowPoint(referenceId, departmentById, target, offset = {}, projectionOptions, renderProfile = {}) {
    const department = departmentById.get(referenceId);
    const cables = window.LeerpretSDK?.components?.["lego-cables"];
    const renderer = window.LegoTowerRenderer;
    if (!department || !cables?.containerWallStudAnchor || !renderer?.iso) {
      return flowPoint(referenceId, departmentById, offset, projectionOptions, renderProfile.departmentProfile);
    }
    const center = zoneGeometry(department, projectionOptions, renderProfile.departmentProfile).center;
    const placement = warehouseContainerPlacement(center, renderProfile.stockBoardProfile);
    const targetPoint = target
      ? [target.x + Number(offset.x || 0), target.y + Number(offset.y || 0)]
      : null;
    const anchor = cables.containerWallStudAnchor(renderer, {
      x: placement.x,
      y: placement.y,
      z: 0,
      width: placement.width,
      depth: placement.depth,
      translate: [placement.translateX, placement.translateY],
      target: targetPoint
    });
    return {
      x: anchor.screen[0],
      y: anchor.screen[1],
      wall: anchor.wall,
      column: anchor.column,
      row: anchor.row
    };
  }

  function flowPath(connection, departmentById, connectionIndex, scope, projectionOptions, renderProfile) {
    const sourceCenter = flowPoint(connection.from, departmentById, {}, projectionOptions, renderProfile.departmentProfile);
    const targetCenter = flowPoint(connection.to, departmentById, {}, projectionOptions, renderProfile.departmentProfile);
    const start = wallStudFlowPoint(
      connection.from,
      departmentById,
      targetCenter,
      connection.fromOffset,
      projectionOptions,
      renderProfile
    );
    const end = wallStudFlowPoint(
      connection.to,
      departmentById,
      sourceCenter,
      connection.toOffset,
      projectionOptions,
      renderProfile
    );
    if (!start || !end) return "";
    const curveOffsetY = Number(connection.curveOffsetY || 0);
    const flowKind = connection.kind === "customer" ? "customer" : "material";
    const cables = window.LeerpretSDK?.components?.["lego-cables"];
    if (!cables?.cubicScreenPath || !cables?.connectionMarkup) return "";
    const path = cables.cubicScreenPath(
      [start.x, start.y],
      [end.x, end.y],
      {
        minimumBend: 36,
        bendRatio: 0.16,
        bendDirection: "positive",
        controlOffsetY: curveOffsetY,
        round: false
      }
    );
    return cables.connectionMarkup({
      id: `${scope}-${connectionIndex}-${connection.from}-${connection.to}`,
      path,
      from: [start.x, start.y],
      to: [end.x, end.y],
      direction: "forward",
      className: `iso-flow-cable flow-${flowKind}`,
      state: connection.highlight ? "highlighted" : connection.locked ? "locked" : ""
    });
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

  const DEPARTMENT_MODEL_IDS = Object.freeze(["store", "office", "warehouse", "factory"]);
  const DEPARTMENT_MODEL_ACCENTS = Object.freeze({
    customer: "red",
    operations: "blue",
    raw: "yellow",
    finished: "blue",
    "production-a": "yellow",
    "production-b": "blue",
    "production-c": "red",
    production: "red",
    purple: "red",
    blue: "blue",
    yellow: "yellow",
    green: "green",
    "tutorial-blue": "blue",
    "tutorial-yellow": "yellow",
    "tutorial-transit": "dark_gray",
    warehouse: "dark_gray"
  });

  function departmentModelProfile(department) {
    const explicit = String(department.departmentModel || "");
    if (DEPARTMENT_MODEL_IDS.includes(explicit)) return explicit;
    if (department.kind === "warehouse") return "warehouse";
    if (department.kind === "quality" || department.kind === "operations") return "office";
    if (department.kind === "production") return "factory";
    return "warehouse";
  }

  function departmentModelAccent(department) {
    return DEPARTMENT_MODEL_ACCENTS[department.departmentColor] || undefined;
  }

  function departmentBuildingScreenBounds(department, center, stockProfileOptions) {
    const renderer = window.LegoTowerRenderer;
    if (
      typeof renderer?.departmentBuildingGeometry !== "function"
      || typeof renderer?.worldToScreen !== "function"
    ) return null;
    const placement = warehouseContainerPlacement(center, stockProfileOptions);
    const geometry = renderer.departmentBuildingGeometry({
      profile: departmentModelProfile(department),
      x: placement.x,
      y: placement.y,
      z: 0,
      width: placement.width,
      depth: placement.depth
    });
    const projectedPoints = (geometry.volumes || []).flatMap(volume => {
      const projected = spatial().projectBox(volume, null, point => (
        renderer.worldToScreen(point[0], point[1], point[2])
      ));
      return [...projected.floor, ...projected.roof];
    });
    const bounds = spatial().bounds2(projectedPoints);
    if (!bounds) return null;
    return Object.freeze({
      minX: bounds.minX + placement.translateX,
      minY: bounds.minY + placement.translateY,
      maxX: bounds.maxX + placement.translateX,
      maxY: bounds.maxY + placement.translateY,
      width: bounds.width,
      height: bounds.height
    });
  }

  function layoutStockItems(items, profileOptions) {
    const placement = warehouseContainerPlacement({ x: 0, y: 0 }, profileOptions);
    return spatial().packSupportedGrid(items, {
      width: placement.boardWidth,
      depth: placement.boardDepth,
      maxLayers: placement.maxLayers,
      defaultWidth: placement.defaultWidth,
      defaultDepth: placement.defaultDepth
    });
  }

  function openWarehouseMarkup(department, geometry, legoGradientScope, stockProfileOptions) {
    const center = geometry.center;
    const palette = department.materialId
      ? TUTORIAL_WAREHOUSE_PALETTES[department.departmentColor]
      : null;
    const opening = geometry.roof.map(point => ({
      x: point.x + (center.x - point.x) * 0.12,
      y: point.y + (center.y - point.y) * 0.12 + 3
    }));
    const visuals = Array.isArray(department.stockVisuals) ? department.stockVisuals : [];
    const hasLogisticsContent = Boolean(department.openRoof || visuals.length || department.cargoVisual);
    const items = visuals.flatMap((visual, visualIndex) => (
      Array.from(
        { length: Math.max(0, Math.min(4, Number(visual.count || 0))) },
        (_, itemIndex) => ({
          ...visual,
          instanceId: `${visual.partId || visualIndex}-${itemIndex}`
        })
      )
    )).slice(0, 8);
    const laidOutItems = layoutStockItems(items, stockProfileOptions);
    const containerPlacement = warehouseContainerPlacement(center, stockProfileOptions);
    const containerTransform = `translate(${containerPlacement.translateX} ${containerPlacement.translateY})`;
    const fallbackContainerColor = {
      "tutorial-blue": "blue",
      "tutorial-yellow": "yellow",
      "tutorial-transit": "dark_gray",
      finished: "blue"
    }[department.departmentColor] || "green";
    const departmentModel = departmentModelProfile(department);
    const renderer = window.LegoTowerRenderer;
    const container = typeof renderer?.departmentBuildingLayers === "function"
      ? renderer.departmentBuildingLayers({
          profile: departmentModel,
          x: containerPlacement.x,
          y: containerPlacement.y,
          z: 0,
          width: containerPlacement.width,
          depth: containerPlacement.depth,
          accentColor: departmentModelAccent(department),
          scope: legoGradientScope
        })
      : renderer?.openContainerLayers?.(
          containerPlacement.x,
          containerPlacement.y,
          0,
          containerPlacement.width,
          containerPlacement.depth,
          fallbackContainerColor,
          legoGradientScope
        );
    const placementProfile = laidOutItems.length && window.LegoTowerRenderer
      ? stockBoardProfile(stockProfileOptions)
      : null;
    const bricks = window.LegoTowerRenderer
      ? laidOutItems.map(visual => {
        const brickZ = builderCore().physicalLayer(visual.layer, placementProfile);
        return `
          <g class="iso-stock-brick${visual.draggable ? " is-draggable iso-draggable-object" : ""}"
             transform="${containerTransform}"
             data-stock-grid-x="${visual.x}"
             data-stock-grid-y="${visual.y}"
             data-stock-grid-layer="${visual.layer}"
             data-stock-z="${brickZ}"
             data-drag-kind="stock"
             data-stock-source-id="${escapeHtml(department.id)}"
             data-stock-part-id="${escapeHtml(visual.partId || "")}"
             data-stock-instance-id="${escapeHtml(visual.instanceId)}"
             role="img"
             aria-label="${escapeHtml(visual.draggable
               ? `Sleep ${visual.label || "blok"} naar ${department.dragTargetLabel || "de Bouwvoorraad"}`
               : `${visual.label || "Blok"} in ${department.title}`)}">
            ${window.LegoTowerRenderer.brick(
              visual.x,
              visual.y,
              brickZ,
              visual.width,
              visual.depth,
              visual.color || "blue",
              legoGradientScope
            )}
          </g>
        `;
      }).join("")
      : "";
    const cargo = cargoMarkup(department, geometry, legoGradientScope, {
      interior: container?.interior,
      transform: containerTransform
    });
    const empty = hasLogisticsContent && items.length === 0 && !cargo
      ? `<text class="iso-empty-stock-label"
               x="${center.x}"
               y="${center.y + 7}"
               text-anchor="middle">${escapeHtml(department.emptyLabel || "ophaalvak leeg")}</text>`
      : "";
    if (container) {
      const model = container.model;
      return `
        <g class="iso-lego-box iso-department-model"
           data-department-model="${escapeHtml(departmentModel)}"
           data-container-grid="${containerPlacement.width}x${containerPlacement.depth}"
           data-blok-id="${escapeHtml(model?.blokId || "")}"
           data-blok-file="${escapeHtml(model?.blokFile || "")}"
           data-blok-render-preset="${escapeHtml(model?.renderPreset || "")}">
          <g transform="${containerTransform}">${container.base}${container.rear}${container.fixtures || ""}</g>
          <g class="iso-lego-box-interior">${bricks}${cargo}${empty}</g>
          <g class="iso-lego-container-front" transform="${containerTransform}">${container.front}</g>
          <g class="iso-lego-container-roof" transform="${containerTransform}">${container.roof}</g>
        </g>
      `;
    }
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

  function materialCartCargoMarkup(department, geometry, legoGradientScope) {
    const cargo = department.cargoVisual;
    if (!cargo || cargo.kind !== "material_cart") return "";
    const quantity = Math.max(1, Math.floor(Number(cargo.quantity) || 1));
    const partGroups = Array.isArray(cargo.parts) ? cargo.parts : [];
    const materialCart = materialCartProfile();
    const materialPartCount = materialCart.countParts(partGroups);
    const cartPrimitive = materialCart.markup(
      partGroups,
      `${legoGradientScope}-material-cart`,
      "isometric"
    );
    const scale = 2.35;
    return `
      <g class="iso-cargo-material-cart iso-cargo-object${cargo.draggable ? " is-draggable iso-draggable-object" : ""}"
         transform="translate(${geometry.center.x - 75} ${geometry.center.y - 69}) scale(${scale})"
         data-drag-kind="cargo"
         data-cargo-kind="${escapeHtml(cargo.cargoKind || "material_kits")}"
         data-cargo-source-id="${escapeHtml(department.id)}"
         data-cargo-id="${escapeHtml(cargo.cargoId || "")}"
         data-cargo-quantity="${quantity}"
         data-material-part-count="${materialPartCount}"
         data-blok-id="${materialCart.blok.id}"
         data-blok-file="${materialCart.blok.file}"
         data-blok-render-preset="${materialCart.blok.preset}"
         role="${cargo.draggable ? "button" : "img"}"
         tabindex="${cargo.draggable ? "0" : "-1"}"
         ${cargo.draggable ? 'aria-pressed="false" aria-keyshortcuts="Enter Space Escape"' : ""}
         aria-label="${escapeHtml(cargo.draggable
           ? `Pak de materiaalwagen met ${materialPartCount} losse LEGO-onderdelen op en zet de complete wagen neer in de gemarkeerde volgende afdeling`
           : `${cargo.label || "Materiaalwagen"}; ${materialPartCount} losse LEGO-onderdelen`)}">
        ${cargo.draggable
          ? '<rect class="iso-cargo-hitbox" x="-4" y="-5" width="72" height="72" fill="transparent" pointer-events="all"></rect>'
          : ""}
        ${cartPrimitive}
      </g>
    `;
  }

  function orderDocumentCargoMarkup(department, legoGradientScope, containerContext) {
    const cargo = department.cargoVisual;
    if (!cargo || cargo.kind !== "order_document") return "";
    const quantity = Math.max(1, Math.floor(Number(cargo.quantity) || 1));
    const order = {
      id: cargo.order?.id || cargo.cargoId || "ORDER",
      customerLabel: cargo.order?.customerLabel || "Klant",
      productId: cargo.order?.productId || cargo.productId || "A",
      productLabel: cargo.order?.productLabel || "Toren",
      quantity,
      deliveryLabel: cargo.order?.deliveryLabel || "Te plannen"
    };
    const previewGroundPlate = cargo.preview?.groundPlate || {};
    const preview = {
      kind: "tower",
      sequence: Array.isArray(cargo.preview?.sequence)
        ? cargo.preview.sequence
        : Array.isArray(cargo.towerSequence) ? cargo.towerSequence : [],
      groundPlate: {
        color: previewGroundPlate.color || cargo.groundPlateColor || "green",
        widthStuds: spatial().positiveGridInteger(
          previewGroundPlate.widthStuds ?? cargo.groundPlateWidth,
          6
        ),
        depthStuds: spatial().positiveGridInteger(
          previewGroundPlate.depthStuds ?? cargo.groundPlateDepth,
          6
        )
      }
    };
    const renderer = window.LegoTowerRenderer;
    const interior = containerContext?.interior;
    if (
      !interior
      || typeof renderer?.orderDocument !== "function"
      || typeof renderer?.orderDocumentGeometry !== "function"
      || typeof renderer?.iso !== "function"
    ) return "";
    let documentPrimitive;
    let documentGeometry;
    let hitbox;
    try {
      const originGeometry = renderer.orderDocumentGeometry({ x: 0, y: 0, z: 0, frontFace: "left" });
      const placement = spatial().boxAlignmentOffset3(
        originGeometry.physicalBounds,
        interior,
        { x: "center", y: "center", z: "min" }
      );
      const documentOptions = {
        x: placement.x,
        y: placement.y,
        z: placement.z,
        frontFace: "left",
        scope: `${legoGradientScope}-order-${cargo.cargoId || department.id}`,
        order,
        preview
      };
      documentGeometry = renderer.orderDocumentGeometry(documentOptions);
      documentPrimitive = renderer.orderDocument(documentOptions);
      hitbox = spatial().projectBox(
        documentGeometry.physicalBounds,
        null,
        point => renderer.iso(point[0], point[1], point[2])
      ).bounds;
    } catch (_error) {
      return "";
    }
    return `
      <g class="iso-cargo-order-document iso-cargo-object${cargo.draggable ? " is-draggable iso-draggable-object" : ""}"
         transform="${containerContext.transform}"
         data-drag-kind="cargo"
         data-cargo-kind="${escapeHtml(cargo.cargoKind || "order_information")}"
         data-cargo-source-id="${escapeHtml(department.id)}"
         data-cargo-id="${escapeHtml(cargo.cargoId || "")}"
         data-cargo-quantity="${quantity}"
         data-container-alignment="center-center-min"
         data-model-x="${documentGeometry.x}"
         data-model-y="${documentGeometry.y}"
         data-model-z="${documentGeometry.z}"
         role="${cargo.draggable ? "button" : "img"}"
         tabindex="${cargo.draggable ? "0" : "-1"}"
         ${cargo.draggable ? 'aria-pressed="false" aria-keyshortcuts="Enter Space Escape"' : ""}
        aria-label="${escapeHtml(cargo.draggable
           ? `Pak het bestelformulier voor order ${order.id} op en zet het neer in de gemarkeerde volgende afdeling`
           : `${cargo.label || `Bestelformulier ${order.id}`}; ${quantity}× ${order.productLabel}`)}">
        ${cargo.draggable
          ? `<rect class="iso-cargo-hitbox" x="${hitbox.minX}" y="${hitbox.minY}" width="${hitbox.width}" height="${hitbox.height}" fill="transparent" pointer-events="all"></rect>`
          : ""}
        <g aria-hidden="true">${documentPrimitive}</g>
      </g>
    `;
  }

  function cargoMarkup(department, geometry, legoGradientScope, containerContext) {
    if (department.cargoVisual?.kind === "order_document") {
      return orderDocumentCargoMarkup(department, legoGradientScope, containerContext);
    }
    if (department.cargoVisual?.kind === "material_cart") {
      return materialCartCargoMarkup(department, geometry, legoGradientScope);
    }
    return towerCargoMarkup(department, geometry, legoGradientScope);
  }

  function towerCargoMarkup(department, geometry, legoGradientScope) {
    const cargo = department.cargoVisual;
    if (!cargo || cargo.kind !== "tower") return "";
    const quantity = Math.max(1, Math.floor(Number(cargo.quantity) || 1));
    const visibleQuantity = Math.min(quantity, 4);
    const requestedScale = Number(cargo.displayScale);
    const scale = Number.isFinite(requestedScale) && requestedScale > 0
      ? requestedScale
      : visibleQuantity > 1 ? 0.44 : 0.56;
    const sequence = Array.isArray(cargo.towerSequence) ? cargo.towerSequence : [];
    const canRenderLego = Boolean(
      window.LegoTowerRenderer?.layoutSequence
      && window.LegoTowerRenderer?.plate
      && window.LegoTowerRenderer?.brick
    );
    const blocks = canRenderLego
      ? window.LegoTowerRenderer.layoutSequence(
          sequence.length ? sequence : ["blue_8", "blue_8", "yellow_4", "green_4"]
        )
      : [];
    const fallbackColors = [...new Set(
      (sequence.length ? sequence : ["blue_8", "yellow_4", "white_4"])
        .map(partId => String(partId).split("_")[0])
        .filter(Boolean)
    )];
    const fallbackPalette = {
      blue: "#338bca",
      green: "#49a66b",
      red: "#d85a55",
      white: "#eef5f4",
      yellow: "#e8bd52"
    };
    const tower = canRenderLego
      ? [
          window.LegoTowerRenderer.plate(
            0,
            0,
            0,
            spatial().positiveGridInteger(cargo.groundPlateWidth, 6),
            spatial().positiveGridInteger(cargo.groundPlateDepth, 6),
            cargo.groundPlateColor || "green",
            legoGradientScope
          ),
          ...blocks.map(block => window.LegoTowerRenderer.brick(
            block.x,
            block.y,
            block.z,
            block.width,
            block.depth,
            block.color,
            legoGradientScope
          ))
        ].join("")
      : `<g class="iso-cargo-fallback-tower">
           <polygon points="0,112 88,84 174,112 86,142" fill="#31865b" stroke="#cce9df" stroke-width="4"></polygon>
           ${fallbackColors.slice(0, 3).map((color, index) => {
             const y = 76 - index * 30;
             const width = index === 1 ? 104 : 132;
             const x = (174 - width) / 2;
             return `<rect x="${x}" y="${y}" width="${width}" height="26" rx="4"
                           fill="${fallbackPalette[color] || "#d9e5e2"}"
                           stroke="#f2fbfa" stroke-width="3"></rect>`;
           }).join("")}
         </g>`;
    const positions = {
      1: [[0, 0]],
      2: [[-62, 20], [62, -20]],
      3: [[-70, 28], [0, -28], [70, 28]],
      4: [[-62, -28], [62, -28], [-62, 44], [62, 44]]
    }[visibleQuantity];
    const towers = positions.map(([offsetX, offsetY], index) => `
      <g class="iso-cargo-tower-instance"
         data-cargo-instance="${index + 1}"
         transform="translate(${offsetX} ${offsetY})">
        ${tower}
      </g>
    `).join("");
    const overflow = quantity > visibleQuantity
      ? `<g class="iso-cargo-quantity-overflow" aria-hidden="true">
           <circle cx="186" cy="-34" r="31"></circle>
           <text x="186" y="-24" text-anchor="middle">+${quantity - visibleQuantity}</text>
         </g>`
      : "";
    return `
      <g class="iso-cargo-tower iso-cargo-object${cargo.draggable ? " is-draggable iso-draggable-object" : ""}"
         transform="translate(${geometry.center.x - 90 * scale} ${geometry.center.y + 19 - 105 * scale}) scale(${scale})"
         data-drag-kind="cargo"
         data-cargo-kind="${escapeHtml(cargo.cargoKind || "tower_batch")}"
         data-cargo-source-id="${escapeHtml(department.id)}"
         data-cargo-id="${escapeHtml(cargo.cargoId || "")}"
         data-cargo-quantity="${quantity}"
         role="${cargo.draggable ? "button" : "img"}"
         tabindex="${cargo.draggable ? "0" : "-1"}"
         ${cargo.draggable ? 'aria-pressed="false" aria-keyshortcuts="Enter Space Escape"' : ""}
         aria-label="${escapeHtml(cargo.draggable
           ? `Pak ${quantity > 1 ? `${quantity} torens` : cargo.label || "toren"} op en zet de complete batch neer in de gemarkeerde volgende afdeling`
           : quantity > 1 ? `${quantity} torens` : cargo.label || "Toren")}">
        ${cargo.draggable
          ? '<rect class="iso-cargo-hitbox" x="-84" y="-64" width="348" height="294" fill="transparent" pointer-events="all"></rect>'
          : ""}
        ${towers}${overflow}
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

  function departmentMarkup(department, selectedId, legoGradientScope, renderContext = {}) {
    const geometry = zoneGeometry(
      department,
      renderContext.projection,
      renderContext.departmentProfile,
      renderContext.departmentLabelProfile,
      renderContext.stockBoardProfile
    );
    const selected = department.id === selectedId;
    const orderCount = department.orders?.length || 0;
    const palette = department.materialId
      ? TUTORIAL_WAREHOUSE_PALETTES[department.departmentColor]
      : null;
    const selectedRenderState = selected || Boolean(palette) || department.forceSelectedRender;
    const usesLegoContainer = Boolean(
      typeof window.LegoTowerRenderer?.departmentBuildingLayers === "function"
      || typeof window.LegoTowerRenderer?.openContainerLayers === "function"
    );
    const usesDepartmentModel = typeof window.LegoTowerRenderer?.departmentBuildingLayers === "function";
    const usesOpenInterior = Boolean(
      usesLegoContainer
      || department.openRoof
      || department.cargoVisual
      || department.stockVisuals?.length
    );
    return `
      <g class="iso-department department-${escapeHtml(department.departmentColor)} status-${escapeHtml(department.status)}${department.openRoof ? " is-open-roof" : ""}${usesLegoContainer ? " has-lego-box" : ""}${usesDepartmentModel ? " has-department-model" : ""}${palette ? " is-tutorial-warehouse" : ""}${selectedRenderState ? " is-selected" : ""}${department.highlight ? " is-highlighted" : ""}${department.locked ? " is-locked" : ""}${department.acceptsStockDrop || department.acceptsCargoDrop ? " is-drop-target" : ""}"
         data-department-id="${escapeHtml(department.id)}"
         data-accepts-drag-kind="${department.acceptsCargoDrop ? "cargo" : department.acceptsStockDrop ? "stock" : ""}"
         role="button"
         tabindex="0"
         aria-disabled="${department.locked ? "true" : "false"}"
        aria-label="${escapeHtml(department.acceptsCargoDrop && department.dropAriaLabel
          ? department.dropAriaLabel
          : `${department.title}: ${statusText(department.status)}, ${department.badgeLabel || `${orderCount} lopende orders`}`)}">
        <g class="iso-building">
          ${usesLegoContainer ? "" : `<polygon class="iso-zone-floor"
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
                   ${palette ? `style="fill:${palette.right};stroke:${palette.rim};stroke-width:2"` : ""}></polygon>`}
          ${usesOpenInterior
            ? openWarehouseMarkup(
              department,
              geometry,
              legoGradientScope,
              renderContext.stockBoardProfile
            )
            : `
              <polygon class="iso-building-roof" points="${points(geometry.roof)}"></polygon>
            `}
          ${stockDropTargetMarkup(department, geometry)}
        </g>
      </g>
    `;
  }

  function departmentOverlayMarkup(
    department,
    selectedId,
    projectionOptions,
    departmentProfile,
    departmentLabelProfile,
    stockProfileOptions
  ) {
    const geometry = zoneGeometry(
      department,
      projectionOptions,
      departmentProfile,
      departmentLabelProfile,
      stockProfileOptions
    );
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
      <g class="iso-department-overlay department-${escapeHtml(department.departmentColor)}${selectedRenderState ? " is-selected" : ""}" data-department-overlay-for="${escapeHtml(department.id)}" aria-hidden="true">
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

  function detailMarkup(department, options = {}) {
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
    const closeButton = options.closeable
      ? `<button type="button"
                 class="iso-detail-close"
                 data-department-detail-close
                 aria-label="Afdelingsinformatie sluiten">×</button>`
      : "";
    return `
      <aside class="iso-department-detail"
             aria-live="polite"
             ${options.closeable ? 'aria-labelledby="isoDepartmentDetailTitle"' : ""}>
        <div class="iso-detail-heading">
          <div>
            <p class="eyebrow">Afdelingsinformatie</p>
            <h3${options.closeable ? ' id="isoDepartmentDetailTitle"' : ""}>${escapeHtml(department.title)}</h3>
          </div>
          <div class="iso-detail-heading-actions">
            <span class="iso-detail-status status-${escapeHtml(department.status)}">${statusText(department.status)}</span>
            ${closeButton}
          </div>
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

  function detailPopupMarkup(department) {
    if (!department) return "";
    return `
      <section class="iso-department-detail-popup"
               role="dialog"
               aria-modal="true"
               aria-labelledby="isoDepartmentDetailTitle">
        <button type="button"
                class="iso-detail-backdrop"
                data-department-detail-close
                aria-label="Afdelingsinformatie sluiten"></button>
        ${detailMarkup(department, { closeable: true })}
      </section>
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

  function processProfileMarkup(profile) {
    if (!profile) return "";
    const flow = (profile.flow || []).map(step => `<li>${escapeHtml(step)}</li>`).join("");
    return `
      <section class="iso-process-profile is-${escapeHtml(profile.id)}"
               aria-label="Actieve productieroutes">
        <div>
          <p class="eyebrow">Logistiek proces</p>
          <strong>${escapeHtml(profile.label)}</strong>
        </div>
        <ol>${flow}</ol>
        <dl>
          <div><dt>Balans</dt><dd>${escapeHtml(profile.finance?.balance || "")}</dd></div>
          <div><dt>W&amp;R</dt><dd>${escapeHtml(profile.finance?.profitAndLoss || "")}</dd></div>
          <div><dt>Voorraad</dt><dd>${escapeHtml(profile.finance?.inventory || "")}</dd></div>
        </dl>
      </section>
    `;
  }

  function financeMutationMarkup(finance, departmentById, projectionOptions, departmentProfile) {
    const mutation = finance?.mutation;
    if (!finance?.active || !finance.moneyEnabled || !mutation) return "";
    const department = departmentById.get(mutation.departmentId);
    if (!department) return "";
    const geometry = zoneGeometry(department, projectionOptions, departmentProfile);
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
    // Een live game-update mag het SVG-element met pointer capture niet
    // vervangen zolang de speler nog sleept. Bewaar alleen de nieuwste render
    // en voer die direct na pointerup/pointercancel uit.
    if (container._isoStockDragActive) {
      container._isoPendingMount = { scene, options };
      return;
    }
    const mapProjection = projection(options.projection || scene.projection);
    const viewportProfile = { ...VIEWBOX, ...(scene.viewportProfile || {}), ...(options.viewportProfile || {}) };
    const frameProfile = { ...FRAME_PROFILE, ...(scene.frameProfile || {}), ...(options.frameProfile || {}) };
    const departmentProfile = {
      ...DEPARTMENT_BOX_PROFILE,
      ...(scene.departmentProfile || {}),
      ...(options.departmentProfile || {})
    };
    const departmentLabelProfile = {
      ...DEPARTMENT_LABEL_PROFILE,
      ...(scene.departmentLabelProfile || {}),
      ...(options.departmentLabelProfile || {})
    };
    const backgroundProfile = {
      ...BACKGROUND_BOUNDS,
      ...(scene.backgroundProfile || {}),
      ...(options.backgroundProfile || {})
    };
    const renderContext = Object.freeze({
      projection: mapProjection,
      stockBoardProfile: options.stockBoardProfile || scene.stockBoardProfile,
      departmentProfile: Object.freeze(departmentProfile),
      departmentLabelProfile: Object.freeze(departmentLabelProfile)
    });
    const legoGradientScope = `iso-logistics-${legoGradientInstance += 1}`;
    const departments = (scene.departments || [])
      .filter(department => department.visible !== false)
      .map(department => (
        scene.tutorial?.active
          ? { ...department, forceSelectedRender: true }
          : department
      ));
    const mapAspectRatio = container.clientWidth / Math.max(1, container.clientHeight);
    const mapViewBox = options.centerDepartments
      ? centeredDepartmentViewBox(
        departments,
        mapAspectRatio,
        mapProjection,
        frameProfile,
        viewportProfile,
        departmentProfile
      )
      : `0 0 ${viewportProfile.width} ${viewportProfile.height}`;
    const departmentById = new Map(departments.map(department => [department.id, department]));
    const selected = departmentById.get(scene.selectedDepartmentId) || null;
    const departmentBounds = spatial().unionBoxes3(
      departments.map(department => departmentBox(department, departmentProfile))
    );
    const minX = Math.min(departmentBounds?.minX ?? backgroundProfile.minX, backgroundProfile.minX) - backgroundProfile.left;
    const minY = Math.min(departmentBounds?.minY ?? backgroundProfile.minY, backgroundProfile.minY) - backgroundProfile.top;
    const maxX = Math.max(departmentBounds?.maxX ?? backgroundProfile.maxX, backgroundProfile.maxX) + backgroundProfile.right;
    const maxY = Math.max(departmentBounds?.maxY ?? backgroundProfile.maxY, backgroundProfile.maxY) + backgroundProfile.bottom;
    const background = spatial().projectBox({
      x: minX,
      y: minY,
      z: 0,
      width: maxX - minX,
      depth: maxY - minY,
      height: 0
    }, mapProjection).floor.map(screenPoint);
    const flows = (scene.connections || [])
      .filter(connection => (
        departmentById.has(connection.from)
        && departmentById.has(connection.to)
      ))
      .map((connection, connectionIndex) => flowPath(
        connection,
        departmentById,
        connectionIndex,
        legoGradientScope,
        mapProjection,
        renderContext
      ))
      .join("");
    const sortedDepartments = window.LegoTowerRenderer.isometricPaintOrder(departments.map(department => ({
      ...departmentBox(department, departmentProfile),
      height: 0
    }))).map(index => departments[index]);
    const zones = sortedDepartments
      .map(department => departmentMarkup(
        department,
        selected?.id,
        legoGradientScope,
        renderContext
      ))
      .join("");
    const overlays = sortedDepartments.map(department => departmentOverlayMarkup({
      ...department,
      hideMetric: department.hideMetric || Boolean(scene.tutorial?.active)
    }, selected?.id, mapProjection, departmentProfile, departmentLabelProfile, renderContext.stockBoardProfile)).join("");
    const legend = (scene.legend || []).map(item => `
      <span><i class="department-${escapeHtml(item.color)}"></i>${escapeHtml(item.label)}</span>
    `).join("");
    const hasInteractiveCargo = departments.some(department => (
      Boolean(department.cargoVisual?.draggable)
      || (department.stockVisuals || []).some(visual => visual.draggable)
    ));

    container.innerHTML = `
      <div class="iso-logistics-view${scene.tutorial?.active ? " is-tutorial" : ""}${options.departmentDetailMode === "popup" ? " has-detail-popup" : ""}${options.departmentDetailMode === "none" ? " has-no-detail" : ""}">
        <div class="iso-map-frame">
          <div class="iso-map-toolbar">
            <div>
              <p class="eyebrow">Live ketenkaart</p>
              <strong>${escapeHtml(scene.title || "Vaste isometrische projectie")}</strong>
            </div>
            <div class="iso-map-legend" aria-label="Afdelingslegenda">${legend}</div>
          </div>
          ${processProfileMarkup(scene.processProfile)}
          ${tutorialMarkup(scene.tutorial)}
          ${financeHudMarkup(scene.finance)}
          <svg class="iso-map"
               viewBox="${mapViewBox}"
               preserveAspectRatio="xMidYMid meet"
               role="${hasInteractiveCargo ? "group" : "img"}"
               aria-label="Isometrische kaart van de logistieke afdelingen">
            <defs>
              ${window.LegoTowerRenderer
                ? window.LegoTowerRenderer.definitions(legoGradientScope)
                : ""}
              <linearGradient id="isoGroundGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#123039"></stop>
                <stop offset="100%" stop-color="#08161c"></stop>
              </linearGradient>
              <filter id="isoDepartmentShadow" x="-30%" y="-30%" width="160%" height="180%">
                <feDropShadow dx="0" dy="10" stdDeviation="8" flood-color="#000000" flood-opacity="0.42"></feDropShadow>
              </filter>
            </defs>
            <polygon class="iso-map-ground" points="${points(background)}"></polygon>
            <g class="iso-grid-lines" aria-hidden="true"></g>
            <g class="iso-flow-layer" aria-hidden="true">${flows}</g>
            <g class="iso-department-layer">${zones}</g>
            <g class="iso-overlay-layer">${overlays}${financeMutationMarkup(
              scene.finance,
              departmentById,
              mapProjection,
              departmentProfile
            )}</g>
          </svg>
          ${financeSummaryMarkup(scene.finance)}
        </div>
        ${scene.tutorial?.active
          ? ""
          : options.departmentDetailMode === "popup"
            ? detailPopupMarkup(selected)
            : options.departmentDetailMode === "none"
              ? ""
              : detailMarkup(selected)}
      </div>
    `;
    const dragSurface = container.querySelector(".iso-logistics-view");
    let keyboardDrag = null;

    const activate = element => {
      const departmentId = element?.dataset.departmentId;
      if (departmentId && typeof options.onDepartmentSelect === "function") {
        options.onDepartmentSelect(departmentId);
      }
    };
    container.querySelectorAll(".iso-department").forEach(element => {
      element.addEventListener("click", event => {
        if (keyboardDrag && element.dataset.acceptsDragKind === keyboardDrag.dragKind) {
          event.preventDefault();
          finishKeyboardDrag(element);
          return;
        }
        activate(element);
      });
      element.addEventListener("keydown", event => {
        if (event.key === "Escape" && keyboardDrag) {
          event.preventDefault();
          event.stopPropagation();
          cancelKeyboardDrag();
          return;
        }
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          event.stopPropagation();
          if (keyboardDrag) {
            if (element.dataset.acceptsDragKind === keyboardDrag.dragKind) {
              finishKeyboardDrag(element);
            }
            return;
          }
          activate(element);
        }
      });
    });
    const closeDepartmentDetail = () => {
      if (typeof options.onDepartmentClose === "function") options.onDepartmentClose();
    };
    container.querySelectorAll("[data-department-detail-close]").forEach(button => {
      button.addEventListener("click", closeDepartmentDetail);
    });
    const detailPopup = container.querySelector(".iso-department-detail-popup");
    if (detailPopup) {
      detailPopup.addEventListener("keydown", event => {
        if (event.key === "Escape") {
          event.preventDefault();
          closeDepartmentDetail();
        }
      });
      container.querySelector(".iso-detail-close")?.focus?.();
    }
    let stockDrag = null;
    let interactionSafetyCleanup = null;
    const rejectTimers = new WeakMap();
    const dragDescriptor = element => ({
      element,
      dragKind: element.dataset.dragKind,
      sourceDepartmentId: element.dataset.stockSourceId || element.dataset.cargoSourceId,
      partId: element.dataset.stockPartId,
      instanceId: element.dataset.stockInstanceId,
      cargoId: element.dataset.cargoId,
      quantity: Number(element.dataset.cargoQuantity || 0) || null
    });
    const clientPointInDragLayer = (dragLayer, clientX, clientY) => {
      const screenMatrix = dragLayer?.getScreenCTM?.();
      if (!screenMatrix) return { x: clientX, y: clientY };
      try {
        const point = spatial().inverseTransformPoint2([clientX, clientY], screenMatrix);
        return { x: point[0], y: point[1] };
      } catch (_error) {
        // Houd slepen bruikbaar in oudere SVG-implementaties zonder inverse CTM.
        return { x: clientX, y: clientY };
      }
    };
    const notifyDragState = active => {
      container._isoStockDragActive = Boolean(active);
      if (typeof options.onDragStateChange === "function") {
        try {
          options.onDragStateChange(Boolean(active));
        } catch (error) {
          console.error("De bovenliggende weergave kon de sleepstatus niet verwerken.", error);
        }
      }
    };
    const detachInteractionSafety = () => {
      interactionSafetyCleanup?.();
      interactionSafetyCleanup = null;
    };
    const completeDragCycle = () => {
      detachInteractionSafety();
      const pendingMount = container._isoPendingMount;
      container._isoPendingMount = null;
      try {
        notifyDragState(false);
      } finally {
        if (pendingMount && container.isConnected) {
          mount(container, pendingMount.scene, pendingMount.options);
        }
      }
    };
    const submitDrop = (drag, target, inputMethod) => {
      if (!drag || !target) return false;
      if (drag.dragKind === "stock" && typeof options.onStockDrop === "function") {
        return options.onStockDrop({
          sourceDepartmentId: drag.sourceDepartmentId,
          targetDepartmentId: target.dataset.departmentId,
          partId: drag.partId,
          instanceId: drag.instanceId,
          inputMethod
        });
      }
      if (drag.dragKind === "cargo" && typeof options.onCargoDrop === "function") {
        return options.onCargoDrop({
          sourceDepartmentId: drag.sourceDepartmentId,
          targetDepartmentId: target.dataset.departmentId,
          cargoId: drag.cargoId,
          quantity: drag.quantity,
          inputMethod
        });
      }
      return false;
    };
    const clearRejectState = element => {
      if (!element) return;
      const timer = rejectTimers.get(element);
      if (timer) window.clearTimeout(timer);
      rejectTimers.delete(element);
      element.classList.remove("is-rejected");
    };
    const rejectDrag = element => {
      if (!element?.isConnected) return;
      clearRejectState(element);
      element.classList.add("is-rejected");
      const timer = window.setTimeout(() => {
        element.classList.remove("is-rejected");
        rejectTimers.delete(element);
      }, 430);
      rejectTimers.set(element, timer);
    };
    const clearDropTarget = () => {
      container.querySelector(".iso-department.is-drag-over")?.classList.remove("is-drag-over");
    };
    const clearKeyboardDropTarget = () => {
      container.querySelector(".iso-department.is-keyboard-target")?.classList.remove("is-keyboard-target");
    };
    const dropTargetAt = (clientX, clientY, dragKind) => {
      // Houd het gesleepte SVG-object zelf onder de pointer. `pointer-events: none`
      // maakte de grijpcursor onderweg weer een vingercursor en kon in browsers de
      // pointer-capture verbreken. elementsFromPoint laat ons toch door het blok
      // heen naar de onderliggende dropzone kijken.
      const target = document.elementsFromPoint(clientX, clientY)
        .map(element => element.closest?.(".iso-department.is-drop-target"))
        .find(Boolean);
      return target
        && container.contains(target)
        && target.dataset.acceptsDragKind === dragKind
        ? target
        : null;
    };
    const keyboardDropTarget = dragKind => (
      Array.from(container.querySelectorAll(".iso-department.is-drop-target"))
        .find(element => element.dataset.acceptsDragKind === dragKind)
      || null
    );
    const cancelKeyboardDrag = () => {
      if (!keyboardDrag) return;
      const source = keyboardDrag.element;
      source.classList.remove("is-keyboard-dragging");
      source.setAttribute("aria-pressed", "false");
      clearKeyboardDropTarget();
      keyboardDrag = null;
      source.focus?.();
      completeDragCycle();
    };
    const finishKeyboardDrag = target => {
      if (!keyboardDrag) return;
      const drag = keyboardDrag;
      const source = drag.element;
      try {
        const accepted = submitDrop(drag, target, "keyboard");
        if (accepted === false) rejectDrag(source);
        return accepted;
      } catch (error) {
        rejectDrag(source);
        console.error("De toetsenbordactie kon niet worden afgeleverd.", error);
        return false;
      } finally {
        source.classList.remove("is-keyboard-dragging");
        source.setAttribute("aria-pressed", "false");
        clearKeyboardDropTarget();
        keyboardDrag = null;
        completeDragCycle();
      }
    };
    const startKeyboardDrag = element => {
      if (stockDrag || keyboardDrag) return;
      const target = keyboardDropTarget(element.dataset.dragKind);
      if (!target) {
        rejectDrag(element);
        return;
      }
      keyboardDrag = dragDescriptor(element);
      element.classList.add("is-keyboard-dragging");
      element.setAttribute("aria-pressed", "true");
      target.classList.add("is-keyboard-target");
      notifyDragState(true);
      attachInteractionSafety();
      target.focus?.();
    };
    const finishStockDrag = (event = {}, cancelled = false, force = false) => {
      if (!stockDrag || (!force && event.pointerId !== stockDrag.pointerId)) return;
      const {
        element,
        dragKind,
        sourceDepartmentId,
        partId,
        instanceId,
        cargoId,
        quantity,
        originalParent,
        originalNextSibling,
        moved
      } = stockDrag;
      const target = cancelled || !Number.isFinite(event.clientX) || !Number.isFinite(event.clientY)
        ? null
        : dropTargetAt(event.clientX, event.clientY, dragKind);
      clearDropTarget();
      element.classList.remove("is-dragging");
      dragSurface?.classList.remove("is-stock-dragging");
      element.style.translate = "";
      try {
        if (originalParent?.isConnected) {
          const sibling = originalNextSibling?.parentNode === originalParent ? originalNextSibling : null;
          originalParent.insertBefore(element, sibling);
        }
      } catch (error) {
        console.warn("Het sleepobject kon niet op zijn bronpositie worden teruggezet.", error);
      }
      stockDrag = null;
      try {
        if (dragSurface?.hasPointerCapture(event.pointerId)) {
          dragSurface.releasePointerCapture(event.pointerId);
        }
      } catch (_error) {
        // Capture kan tussen controle en vrijgave al door de browser eindigen.
      }
      try {
        const accepted = target
          ? submitDrop({ element, dragKind, sourceDepartmentId, partId, instanceId, cargoId, quantity }, target, "pointer")
          : false;
        if (!cancelled && moved && (!target || accepted === false)) rejectDrag(element);
        return accepted;
      } catch (error) {
        if (!cancelled && moved) rejectDrag(element);
        console.error("De sleepactie kon niet worden afgeleverd.", error);
        return false;
      } finally {
        completeDragCycle();
      }
    };
    const cancelActiveInteraction = () => {
      if (stockDrag) {
        finishStockDrag({
          pointerId: stockDrag.pointerId,
          clientX: stockDrag.startX,
          clientY: stockDrag.startY
        }, true, true);
      } else if (keyboardDrag) {
        cancelKeyboardDrag();
      } else if (container._isoStockDragActive) {
        completeDragCycle();
      }
    };
    const attachInteractionSafety = () => {
      detachInteractionSafety();
      const onPointerUp = event => finishStockDrag(event);
      const onPointerCancel = event => finishStockDrag(event, true);
      const onWindowBlur = () => cancelActiveInteraction();
      const onVisibilityChange = () => {
        if (document.visibilityState === "hidden") cancelActiveInteraction();
      };
      const onGlobalKeydown = event => {
        if (event.key !== "Escape" || (!keyboardDrag && !stockDrag)) return;
        event.preventDefault();
        cancelActiveInteraction();
      };
      window.addEventListener("pointerup", onPointerUp, true);
      window.addEventListener("pointercancel", onPointerCancel, true);
      window.addEventListener("blur", onWindowBlur);
      window.addEventListener("pagehide", onWindowBlur);
      window.addEventListener("keydown", onGlobalKeydown, true);
      document.addEventListener("visibilitychange", onVisibilityChange);
      interactionSafetyCleanup = () => {
        window.removeEventListener("pointerup", onPointerUp, true);
        window.removeEventListener("pointercancel", onPointerCancel, true);
        window.removeEventListener("blur", onWindowBlur);
        window.removeEventListener("pagehide", onWindowBlur);
        window.removeEventListener("keydown", onGlobalKeydown, true);
        document.removeEventListener("visibilitychange", onVisibilityChange);
      };
    };
    container._isoCancelDrag = cancelActiveInteraction;
    container.querySelectorAll(".iso-draggable-object").forEach(element => {
      element.addEventListener("click", event => event.stopPropagation());
      if (element.matches('[data-drag-kind="cargo"]')) {
        element.addEventListener("keydown", event => {
          if (event.key === "Escape" && keyboardDrag) {
            event.preventDefault();
            event.stopPropagation();
            cancelKeyboardDrag();
            return;
          }
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          event.stopPropagation();
          startKeyboardDrag(element);
        });
      }
      element.addEventListener("pointerdown", event => {
        if (event.button !== 0) return;
        clearRejectState(element);
        if (stockDrag) {
          cancelActiveInteraction();
          if (!element.isConnected) return;
        }
        if (keyboardDrag) {
          cancelKeyboardDrag();
          if (!element.isConnected) return;
        }
        event.preventDefault();
        event.stopPropagation();
        // Capture op de stabiele HTML-kaart in plaats van het samengestelde
        // SVG-object. Vooral een toren bevat veel geneste vlakken die in
        // browsers afzonderlijk hit-tested worden.
        try {
          dragSurface?.setPointerCapture(event.pointerId);
        } catch (_error) {
          // Synthetische pointers ondersteunen capture niet in iedere browser.
        }
        element.classList.add("is-dragging");
        dragSurface?.classList.add("is-stock-dragging");
        const originalParent = element.parentNode;
        const originalNextSibling = element.nextSibling;
        const dragLayer = container.querySelector(".iso-overlay-layer");
        dragLayer?.appendChild(element);
        stockDrag = {
          ...dragDescriptor(element),
          pointerId: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
          moved: false,
          dragLayer,
          originalParent,
          originalNextSibling
        };
        notifyDragState(true);
        attachInteractionSafety();
      });
    });
    dragSurface?.addEventListener("pointermove", event => {
      if (!stockDrag || event.pointerId !== stockDrag.pointerId) return;
      // PointerEvents leveren schermpixels, terwijl CSS-translate op een SVG-groep
      // in viewBox-eenheden wordt toegepast. Zet beide punten daarom met de
      // inverse schermmatrix om; zo blijft het grijppunt ook in responsive kaarten
      // exact onder muis of vinger.
      const start = clientPointInDragLayer(
        stockDrag.dragLayer,
        stockDrag.startX,
        stockDrag.startY
      );
      const current = clientPointInDragLayer(
        stockDrag.dragLayer,
        event.clientX,
        event.clientY
      );
      const deltaX = current.x - start.x;
      const deltaY = current.y - start.y;
      if (Math.hypot(event.clientX - stockDrag.startX, event.clientY - stockDrag.startY) >= 4) {
        stockDrag.moved = true;
      }
      stockDrag.element.style.translate = `${deltaX}px ${deltaY}px`;
      clearDropTarget();
      dropTargetAt(event.clientX, event.clientY, stockDrag.dragKind)?.classList.add("is-drag-over");
    });
    dragSurface?.addEventListener("pointerup", finishStockDrag);
    dragSurface?.addEventListener("pointercancel", event => finishStockDrag(event, true));
    dragSurface?.addEventListener("lostpointercapture", event => finishStockDrag(event, true));
    dragSurface?.addEventListener("keydown", event => {
      if (event.key !== "Escape" || !keyboardDrag) return;
      event.preventDefault();
      event.stopPropagation();
      cancelKeyboardDrag();
    });
    dragSurface?.addEventListener("focusout", event => {
      if (
        keyboardDrag
        && (!event.relatedTarget || !dragSurface.contains(event.relatedTarget))
      ) {
        cancelKeyboardDrag();
      }
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
    geometryForDepartment: zoneGeometry,
    wallStudFlowPoint,
    departmentBox,
    warehouseContainerPlacement,
    profiles: Object.freeze({
      viewport: VIEWBOX,
      projection: PROJECTION,
      background: BACKGROUND_BOUNDS,
      department: DEPARTMENT_BOX_PROFILE,
      departmentLabel: DEPARTMENT_LABEL_PROFILE,
      frame: FRAME_PROFILE,
      warehouse: WAREHOUSE_CONTAINER_PROFILE
    })
  });
})();
