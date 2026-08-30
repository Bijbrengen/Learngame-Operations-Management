import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

const source = fs.readFileSync(
  new URL("../isometric-logistics-view.js", import.meta.url),
  "utf8"
);

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

function harness({ packedLayer = 0 } = {}) {
  const calls = {
    createDiamondProjection: [],
    projectDiamond: [],
    projectBox: [],
    unionBoxes3: [],
    fitViewBox: [],
    formatViewBox: [],
    packSupportedGrid: [],
    positiveGridInteger: [],
    inverseTransformPoint2: [],
    cubicScreenPath: [],
    builderBoardProfile: [],
    physicalLayer: [],
    brick: [],
    orderDocument: [],
    openContainerLayers: [],
    isometricPaintOrder: []
  };
  const spatial = {
    LEGACY_RENDER_METRICS: Object.freeze({ plateHeight: 0.22, brickHeight: 0.72 }),
    createDiamondProjection(options) {
      calls.createDiamondProjection.push(plain(options));
      return Object.freeze({
        kind: "diamond-v1",
        ...plain(options),
        zScale: Number(options?.zScale ?? 1)
      });
    },
    projectDiamond(point, projection) {
      calls.projectDiamond.push({ point: plain(point), projection: plain(projection) });
      const [x, y, z = 0] = point;
      return [
        projection.originX + (x - y) * (projection.tileWidth / 2),
        projection.originY + (x + y) * (projection.tileHeight / 2) - z * projection.zScale
      ];
    },
    projectBox(box, projection) {
      calls.projectBox.push({ box: plain(box), projection: plain(projection) });
      const corners = [
        [box.x, box.y, box.z],
        [box.x + box.width, box.y, box.z],
        [box.x + box.width, box.y + box.depth, box.z],
        [box.x, box.y + box.depth, box.z],
        [box.x, box.y, box.z + box.height],
        [box.x + box.width, box.y, box.z + box.height],
        [box.x + box.width, box.y + box.depth, box.z + box.height],
        [box.x, box.y + box.depth, box.z + box.height]
      ];
      const projected = corners.map(point => this.projectDiamond(point, projection));
      return { floor: projected.slice(0, 4), roof: projected.slice(4) };
    },
    unionBoxes3(boxes) {
      calls.unionBoxes3.push(plain(boxes));
      if (!boxes.length) return null;
      return {
        minX: Math.min(...boxes.map(box => box.x)),
        minY: Math.min(...boxes.map(box => box.y)),
        minZ: Math.min(...boxes.map(box => box.z)),
        maxX: Math.max(...boxes.map(box => box.x + box.width)),
        maxY: Math.max(...boxes.map(box => box.y + box.depth)),
        maxZ: Math.max(...boxes.map(box => box.z + box.height))
      };
    },
    fitViewBox(points, options) {
      calls.fitViewBox.push({ points: plain(points), options: plain(options) });
      return Object.freeze({ x: 10, y: 20, width: 760, height: 560 });
    },
    formatViewBox(viewBox) {
      calls.formatViewBox.push(plain(viewBox));
      return [viewBox.x, viewBox.y, viewBox.width, viewBox.height]
        .map(value => Number(value).toFixed(2))
        .join(" ");
    },
    packSupportedGrid(items, options) {
      calls.packSupportedGrid.push({ items: plain(items), options: plain(options) });
      return items.map((item, index) => ({
        ...item,
        x: index * 2,
        y: 0,
        layer: packedLayer,
        width: Number(item.width || options.defaultWidth),
        depth: Number(item.depth || options.defaultDepth)
      }));
    },
    positiveGridInteger(value, fallback) {
      calls.positiveGridInteger.push({ value, fallback });
      const number = Number(value);
      return Number.isInteger(number) && number > 0 ? number : fallback;
    },
    inverseTransformPoint2(point, matrix) {
      calls.inverseTransformPoint2.push({ point: plain(point), matrix: plain(matrix) });
      const determinant = matrix.a * matrix.d - matrix.b * matrix.c;
      return [
        (matrix.d * (point[0] - matrix.e) - matrix.c * (point[1] - matrix.f)) / determinant,
        (-matrix.b * (point[0] - matrix.e) + matrix.a * (point[1] - matrix.f)) / determinant
      ];
    }
  };
  const cables = {
    cubicScreenPath(from, to, options) {
      calls.cubicScreenPath.push({ from: plain(from), to: plain(to), options: plain(options) });
      const bend = Math.max(options.minimumBend, Math.abs(to[0] - from[0]) * options.bendRatio);
      return `M ${from[0]} ${from[1]} C ${from[0] + bend} ${from[1] + options.controlOffsetY}, ${to[0] - bend} ${to[1] + options.controlOffsetY}, ${to[0]} ${to[1]}`;
    },
    connectionMarkup(options) {
      return `<g data-test-connection="${options.path}"></g>`;
    }
  };
  const renderer = {
    definitions: () => "",
    brick(...args) {
      calls.brick.push(plain(args));
      return "<g data-test-brick></g>";
    },
    isometricPaintOrder(solids) {
      calls.isometricPaintOrder.push(plain(solids));
      return solids.map((solid, index) => ({ solid, index }))
        .sort((left, right) => (
          left.solid.x + left.solid.width / 2 + left.solid.y + left.solid.depth / 2
          - right.solid.x - right.solid.width / 2 - right.solid.y - right.solid.depth / 2
          || left.index - right.index
        ))
        .map(entry => entry.index);
    },
    openContainerLayers(...args) {
      calls.openContainerLayers.push(plain(args));
      return { base: "", rear: "", front: "", roof: "" };
    },
    orderDocument(options) {
      calls.orderDocument.push(plain(options));
      const quantity = Math.max(1, Math.floor(Number(options?.order?.quantity) || 1));
      return `<g data-lego-order-document
                 data-blok-id="logistics.order-document"
                 data-order-document-id="${options?.order?.id || "ORDER"}"
                 data-order-document-quantity="${quantity}"></g>`;
    }
  };
  const builder = {
    builderBoardProfile(options) {
      calls.builderBoardProfile.push(plain(options));
      return Object.freeze({
        placement: Object.freeze({
          baseHeight: Number(options?.placement?.baseHeight ?? 0.22),
          layerPitch: Number(options?.placement?.layerPitch ?? 0.78),
          snapLift: Number(options?.placement?.snapLift ?? 0.04)
        })
      });
    },
    physicalLayer(layer, profile) {
      calls.physicalLayer.push({ layer, profile: plain(profile) });
      return profile.placement.baseHeight + Number(layer || 0) * profile.placement.layerPitch;
    }
  };
  const context = { console };
  context.window = context;
  context.globalThis = context;
  context.LeerpretSDK = {
    components: {
      "lego-spatial": spatial,
      "lego-cables": cables,
      "lego-builder": { logic: builder }
    }
  };
  context.LegoTowerRenderer = renderer;
  vm.runInNewContext(source, context, { filename: "isometric-logistics-view.js" });
  return { calls, view: context.IsometricLogisticsView };
}

test("projectie delegeert aan het bytecompatibele diamond-profiel", () => {
  const { calls, view } = harness();
  const projected = plain(view.project(3.1, 3.2, 54));

  assert.deepEqual(projected, { x: 656.7, y: 123.10000000000002 });
  assert.deepEqual(calls.createDiamondProjection, [{
    originX: 660,
    originY: 70,
    tileWidth: 66,
    tileHeight: 34
  }]);
  assert.deepEqual(calls.projectDiamond[0].point, [3.1, 3.2, 54]);
  assert.doesNotMatch(source, /PROJECTION\.originX\s*\+\s*\(x\s*-\s*y\)/);
});

test("doosgeometrie en configureerbare mountprojectie blijven pure SDK-projecties", () => {
  const { calls, view } = harness();
  const department = {
    id: "custom",
    title: "Configureerbaar",
    departmentColor: "raw",
    status: "idle",
    layout: { x: 1, y: 2, width: 3, depth: 4, height: 5 }
  };
  const customProjection = {
    originX: 100,
    originY: 200,
    tileWidth: 20,
    tileHeight: 10,
    zScale: 2
  };
  const container = {
    clientWidth: 400,
    clientHeight: 200,
    innerHTML: "",
    querySelector: () => null,
    querySelectorAll: () => [],
    contains: () => true
  };

  view.mount(container, { departments: [department], connections: [] }, {
    projection: customProjection
  });

  assert.deepEqual(calls.createDiamondProjection, [{
    originX: 100,
    originY: 200,
    tileWidth: 20,
    tileHeight: 10,
    zScale: 2
  }]);
  assert.ok(calls.projectBox.length >= 3);
  const departmentBox = calls.projectBox.find(call => (
    call.box.x === 1 && call.box.y === 2 && call.box.width === 3 && call.box.depth === 4
  ));
  assert.deepEqual(departmentBox?.box, {
    x: 1,
    y: 2,
    z: 0,
    width: 3,
    depth: 4,
    height: 5
  });
  assert.equal(departmentBox?.projection.zScale, 2);
  assert.match(container.innerHTML, /class="iso-zone-label" transform="translate\(85 294\)"/);
  assert.doesNotMatch(source, /const floor = \[\s*project\(/);
  assert.doesNotMatch(source, /const background = \[\s*project\(/);
  assert.equal(calls.unionBoxes3.length, 1);
  assert.equal(calls.isometricPaintOrder.length, 1);
  assert.doesNotMatch(source, /left\.layout\.x \+ left\.layout\.y/);
});

test("viewBox, voorraadpacking en kabelpad delegeren met het legacy-outputprofiel", () => {
  const { calls, view } = harness();
  const container = {
    clientWidth: 800,
    clientHeight: 600,
    innerHTML: "",
    querySelector: () => null,
    querySelectorAll: () => [],
    contains: () => true
  };

  view.mount(container, {
    title: "Delegatiecontract",
    connections: [{ from: "raw", to: "assembly", curveOffsetY: 18 }],
    departments: [
      {
        id: "raw",
        title: "Grondstoffen",
        departmentColor: "raw",
        status: "active",
        openRoof: true,
        layout: { x: 1, y: 8, width: 3.5, depth: 3.2, height: 54 },
        stockVisuals: [{ partId: "blue_8", color: "blue", width: 2, depth: 4, count: 1 }]
      },
      {
        id: "assembly",
        title: "Assemblage",
        departmentColor: "production-b",
        status: "idle",
        layout: { x: 7, y: 4, width: 3.8, depth: 3.4, height: 72 }
      }
    ]
  }, { centerDepartments: true });

  assert.equal(calls.fitViewBox.length, 1);
  assert.deepEqual(calls.fitViewBox[0].options, {
    minimumWidth: 760,
    minimumHeight: 560,
    paddingX: 180,
    paddingY: 170,
    minimumAspectRatio: 0.65,
    maximumAspectRatio: 2.4,
    aspectRatio: 4 / 3
  });
  assert.deepEqual(calls.formatViewBox, [{ x: 10, y: 20, width: 760, height: 560 }]);
  assert.match(container.innerHTML, /viewBox="10\.00 20\.00 760\.00 560\.00"/);

  const stockPacking = calls.packSupportedGrid.find(call => call.items.length === 1);
  assert.ok(stockPacking);
  assert.deepEqual(stockPacking.options, {
    width: 6,
    depth: 6,
    maxLayers: 4,
    defaultWidth: 2,
    defaultDepth: 2
  });
  assert.deepEqual(calls.builderBoardProfile, [{
    placement: { baseHeight: 0.22, layerPitch: 0.72 }
  }]);
  assert.deepEqual(calls.physicalLayer, [{
    layer: 0,
    profile: { placement: { baseHeight: 0.22, layerPitch: 0.72, snapLift: 0.04 } }
  }]);
  assert.equal(calls.brick[0][2], 0.22);
  assert.doesNotMatch(source, /0\.22\s*\+\s*visual\.layer\s*\*\s*0\.72/);

  assert.equal(calls.cubicScreenPath.length, 1);
  assert.deepEqual(calls.cubicScreenPath[0].options, {
    minimumBend: 36,
    bendRatio: 0.16,
    bendDirection: "positive",
    controlOffsetY: 18,
    round: false
  });
  assert.doesNotMatch(source, /const occupied = new Set\(\)/);
  assert.doesNotMatch(source, /const bend = Math\.max\(36,/);
});

test("voorraadlagen volgen ook bij afwijkende profielen uitsluitend SDK-rekenwerk", () => {
  const { calls, view } = harness({ packedLayer: 2 });
  const container = {
    clientWidth: 800,
    clientHeight: 600,
    innerHTML: "",
    querySelector: () => null,
    querySelectorAll: () => [],
    contains: () => true
  };

  view.mount(container, {
    connections: [],
    departments: [{
      id: "stock",
      title: "Voorraad",
      departmentColor: "raw",
      status: "active",
      openRoof: true,
      layout: { x: 1, y: 2, width: 3, depth: 3, height: 20 },
      stockVisuals: [{ partId: "blue_8", color: "blue", width: 2, depth: 4, count: 1 }]
    }]
  }, {
    stockBoardProfile: { placement: { baseHeight: 1, layerPitch: 2 } }
  });

  assert.deepEqual(calls.builderBoardProfile, [{
    placement: { baseHeight: 1, layerPitch: 2 }
  }]);
  assert.deepEqual(calls.physicalLayer, [{
    layer: 2,
    profile: { placement: { baseHeight: 1, layerPitch: 2, snapLift: 0.04 } }
  }]);
  assert.equal(calls.brick[0][2], 5);
  assert.match(container.innerHTML, /data-stock-grid-layer="2"/);
  assert.match(container.innerHTML, /data-stock-z="5"/);
});

test("SVG-sleepconversie gebruikt de pure SDK-matrixinverse zonder lokale DOM-formule", () => {
  assert.match(source, /spatial\(\)\.inverseTransformPoint2\(\[clientX, clientY\], screenMatrix\)/);
  assert.doesNotMatch(source, /createSVGPoint|matrixTransform|screenMatrix\.inverse\(\)/);
  assert.doesNotMatch(source, /matrix\.a \* clientX|matrix\.d \* clientY/);
});

test("torencargo gebruikt grondplaatafmetingen uit het scenecontract", () => {
  assert.match(source, /spatial\(\)\.positiveGridInteger\(cargo\.groundPlateWidth, 6\)/);
  assert.match(source, /spatial\(\)\.positiveGridInteger\(cargo\.groundPlateDepth, 6\)/);
  assert.doesNotMatch(source, /Number\(cargo\.groundPlate(?:Width|Depth) \|\| 6\)/);
  assert.doesNotMatch(source, /LegoTowerRenderer\.plate\(\s*0,\s*0,\s*0,\s*6,\s*6,/s);
});

test("orderinformatie rendert precies een canoniek SDK-bestelformulier en geen torenbatch", () => {
  const { calls, view } = harness();
  const container = {
    clientWidth: 800,
    clientHeight: 600,
    innerHTML: "",
    querySelector: () => null,
    querySelectorAll: () => [],
    contains: () => true
  };

  view.mount(container, {
    title: "Orderoverdracht",
    connections: [],
    departments: [{
      id: "operations",
      title: "Operations",
      departmentColor: "operations",
      status: "active",
      openRoof: true,
      layout: { x: 1, y: 2, width: 4.2, depth: 3.8, height: 78 },
      cargoVisual: {
        kind: "order_document",
        cargoKind: "order_information",
        cargoId: "ORD-009",
        productId: "B",
        quantity: 3,
        draggable: true,
        order: {
          id: "ORD-009",
          customerLabel: "Klant 9",
          productId: "B",
          productLabel: "Toren B",
          quantity: 3,
          deliveryLabel: "nog 20:00"
        },
        preview: {
          kind: "tower",
          sequence: ["blue_8", "blue_8", "yellow_4", "green_4"],
          groundPlate: { color: "green", widthStuds: 6, depthStuds: 6 }
        }
      }
    }]
  }, {});

  assert.equal(calls.orderDocument.length, 1);
  assert.deepEqual(calls.orderDocument[0].order, {
    id: "ORD-009",
    customerLabel: "Klant 9",
    productId: "B",
    productLabel: "Toren B",
    quantity: 3,
    deliveryLabel: "nog 20:00"
  });
  assert.deepEqual(calls.orderDocument[0].preview, {
    kind: "tower",
    sequence: ["blue_8", "blue_8", "yellow_4", "green_4"],
    groundPlate: { color: "green", widthStuds: 6, depthStuds: 6 }
  });
  assert.equal((container.innerHTML.match(/class="iso-cargo-order-document\b/g) || []).length, 1);
  assert.equal((container.innerHTML.match(/data-lego-order-document/g) || []).length, 1);
  assert.match(container.innerHTML, /data-cargo-kind="order_information"/);
  assert.match(container.innerHTML, /data-cargo-id="ORD-009"/);
  assert.match(container.innerHTML, /data-cargo-quantity="3"/);
  assert.match(container.innerHTML, /data-blok-id="logistics\.order-document"/);
  assert.match(container.innerHTML, /data-order-document-quantity="3"/);
  assert.doesNotMatch(container.innerHTML, /iso-cargo-tower(?:\s|"|-instance)/);
});

test("afdelings- en containermaten zijn pure configureerbare profielen", () => {
  const { view } = harness();
  const department = { layout: { x: 2, y: 3 } };
  assert.deepEqual(plain(view.departmentBox(department)), {
    x: 2,
    y: 3,
    z: 0,
    width: 3.4,
    depth: 3.1,
    height: 58
  });
  assert.deepEqual(plain(view.departmentBox(department, { width: 5, depth: 7, height: 11 })), {
    x: 2,
    y: 3,
    z: 0,
    width: 5,
    depth: 7,
    height: 11
  });
  assert.deepEqual(plain(view.warehouseContainerPlacement({ x: 400, y: 300 })), {
    x: -1,
    y: -1,
    width: 8,
    depth: 8,
    translateX: 310,
    translateY: 210,
    boardWidth: 6,
    boardDepth: 6,
    maxLayers: 4,
    defaultWidth: 2,
    defaultDepth: 2
  });
  assert.deepEqual(plain(view.warehouseContainerPlacement({ x: 400, y: 300 }, {
    board: { width: 8, depth: 10 },
    container: { margin: 2, translateX: -120, translateY: -80 },
    maxLayers: 6,
    defaultWidth: 1,
    defaultDepth: 3
  })), {
    x: -2,
    y: -2,
    width: 12,
    depth: 14,
    translateX: 280,
    translateY: 220,
    boardWidth: 8,
    boardDepth: 10,
    maxLayers: 6,
    defaultWidth: 1,
    defaultDepth: 3
  });
});

test("mount laat frame, viewport, afdelingsbox, achtergrond en voorraadgrid door de client bepalen", () => {
  const { calls, view } = harness();
  const container = {
    clientWidth: 500,
    clientHeight: 250,
    innerHTML: "",
    querySelector: () => null,
    querySelectorAll: () => [],
    contains: () => true
  };
  const department = {
    id: "stock",
    title: "Voorraad",
    departmentColor: "raw",
    status: "active",
    openRoof: true,
    layout: { x: 2, y: 3 },
    stockVisuals: [{ partId: "one", color: "blue", width: 1, depth: 3, count: 1 }]
  };
  view.mount(container, { departments: [department], connections: [] }, {
    centerDepartments: true,
    viewportProfile: { width: 1440, height: 960 },
    departmentProfile: { width: 5, depth: 7, height: 11 },
    frameProfile: {
      minimumWidth: 900,
      minimumHeight: 650,
      paddingX: 210,
      paddingY: 190,
      minimumAspectRatio: 0.8,
      maximumAspectRatio: 2
    },
    backgroundProfile: { minX: -4, minY: -3, maxX: 20, maxY: 16, left: 1, top: 2, right: 3, bottom: 4 },
    stockBoardProfile: {
      board: { width: 8, depth: 10 },
      container: { margin: 2, translateX: -120, translateY: -80 },
      maxLayers: 6,
      defaultWidth: 1,
      defaultDepth: 3
    }
  });

  assert.deepEqual(calls.fitViewBox[0].options, {
    minimumWidth: 900,
    minimumHeight: 650,
    paddingX: 210,
    paddingY: 190,
    minimumAspectRatio: 0.8,
    maximumAspectRatio: 2,
    aspectRatio: 2
  });
  assert.deepEqual(calls.unionBoxes3[0], [{ x: 2, y: 3, z: 0, width: 5, depth: 7, height: 11 }]);
  assert.deepEqual(calls.isometricPaintOrder[0], [{ x: 2, y: 3, z: 0, width: 5, depth: 7, height: 0 }]);
  assert.deepEqual(calls.packSupportedGrid[0].options, {
    width: 8,
    depth: 10,
    maxLayers: 6,
    defaultWidth: 1,
    defaultDepth: 3
  });
  assert.deepEqual(calls.openContainerLayers[0].slice(0, 5), [-2, -2, 0, 12, 14]);

  view.mount(container, { departments: [], connections: [] }, {
    viewportProfile: { width: 1440, height: 960 }
  });
  assert.match(container.innerHTML, /viewBox="0 0 1440 960"/);
});
