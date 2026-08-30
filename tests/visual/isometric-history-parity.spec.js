"use strict";

const { createHash } = require("node:crypto");
const { isDeepStrictEqual } = require("node:util");

const { test, expect } = require("./fixtures");
const {
  loadCurrentSources,
  loadHistoricalSources
} = require("./isometric-history-source.cjs");
const {
  captureOutputFingerprint,
  stableStringify
} = require("./isometric-parity-fingerprint.cjs");
const { compareDecodedPixels } = require("./png-pixels.cjs");

const DETERMINISTIC_CSS = `
  html, body {
    margin: 0 !important;
    width: 1440px !important;
    min-width: 1440px !important;
    min-height: 1000px !important;
    background: #071014 !important;
    font-family: Arial, sans-serif !important;
  }
  *, *::before, *::after {
    animation: none !important;
    caret-color: transparent !important;
    transition: none !important;
  }
  #parity-reset {
    display: block;
    width: 120px;
    height: 32px;
    margin: 8px 0 8px 8px;
  }
  #parity-scene {
    display: block;
    width: 1320px;
    height: 760px;
    margin: 0;
  }
`;

function sdkBaseUrl() {
  return process.env.LEERPRET_API_URL
    || (process.env.CI ? "https://api.leerpretpark.nl/api" : "http://127.0.0.1:47111/api");
}

async function engineRuntime(page) {
  const sdkBase = sdkBaseUrl().replace(/\/$/u, "");
  const response = await page.request.get(`${sdkBase}/sdk/manifest.json`);
  expect(response.ok(), `Engine-manifest ${sdkBase}`).toBe(true);
  const body = await response.body();
  const manifest = JSON.parse(body.toString("utf8"));
  return {
    sdkBase,
    manifest,
    fingerprint: {
      sdkBase,
      manifestVersion: String(manifest.version),
      manifestSha256: createHash("sha256").update(body).digest("hex")
    }
  };
}

async function preparePage(page, sources, rendererSource, runtime) {
  const errors = [];
  const onPageError = error => errors.push(String(error?.stack || error));
  page.on("pageerror", onPageError);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/style.css");
  await page.setContent(`<!doctype html>
    <html lang="nl">
      <head><meta charset="utf-8"><title>LOM isometrische pariteit</title></head>
      <body>
        <button id="parity-reset" type="button">Herstel scene</button>
        <main id="parity-scene" aria-label="Historische pariteitsscene"></main>
      </body>
    </html>`);
  await page.addStyleTag({ content: sources["style.css"] });
  await page.addStyleTag({ content: DETERMINISTIC_CSS });
  await page.addScriptTag({
    url: `${runtime.sdkBase}/sdk/sdk-loader/loader.js?v=${encodeURIComponent(runtime.manifest.version)}`
  });
  await page.evaluate(async ({ sdkBase, manifest }) => {
    await window.LeerpretSDK.Loader.create({ base: sdkBase, manifest })
      .load(["lego-renderer", "lego-cables", "lego-builder"]);
  }, { sdkBase: runtime.sdkBase, manifest: runtime.manifest });
  if (sources["material-cart-profile.js"]) {
    await page.addScriptTag({ content: sources["material-cart-profile.js"] });
  }
  await page.addScriptTag({ content: rendererSource });
  await page.evaluate(() => {
    const cargo = Object.freeze({
      kind: "material_cart",
      cargoKind: "material_kits",
      cargoId: "parity-cart-01",
      label: "Materiaalwagen",
      quantity: 1,
      draggable: true,
      parts: [
        { partId: "red_8", color: "red", width: 2, depth: 4, count: 2 },
        { partId: "white_4", color: "white", width: 2, depth: 2, count: 1 }
      ]
    });
    const sceneRoot = document.getElementById("parity-scene");
    let selectedDepartmentId = "intake";
    let cargoDepartmentId = "intake";
    let resetCount = 0;
    let renderCount = 0;
    let selections = [];
    let drops = [];
    let dragStates = [];

    const department = (id, overrides) => ({
      id,
      title: id,
      shortTitle: id,
      description: `${id} in het vaste LEGO-raster.`,
      kind: "warehouse",
      status: "active",
      primaryMetric: "pariteit",
      orders: [],
      ...overrides
    });
    const scene = () => ({
      title: "Materiaalstroom-pariteit",
      selectedDepartmentId,
      legend: [
        { color: "raw", label: "Ontvangst" },
        { color: "production-b", label: "Assemblage" },
        { color: "finished", label: "Gereed" }
      ],
      connections: [
        { from: "intake", to: "assembly", kind: "material" },
        { from: "assembly", to: "finished", kind: "customer", curveOffsetY: 18 }
      ],
      departments: [
        department("intake", {
          title: "Magazijn Grondstoffen",
          shortTitle: "Ontvangst",
          departmentColor: "raw",
          openRoof: true,
          layout: { x: 1, y: 8, width: 3.5, depth: 3.2, height: 54 },
          cargoVisual: cargoDepartmentId === "intake" ? cargo : undefined
        }),
        department("assembly", {
          title: "Assemblage",
          departmentColor: "production-b",
          status: "attention",
          openRoof: true,
          acceptsCargoDrop: true,
          dropLabel: "ASSEMBLAGE",
          dropAriaLabel: "Zet de materiaalwagen in Assemblage",
          layout: { x: 7, y: 4, width: 3.8, depth: 3.4, height: 72 },
          cargoVisual: cargoDepartmentId === "assembly" ? cargo : undefined
        }),
        department("finished", {
          title: "Magazijn Gereed Product",
          shortTitle: "Gereed",
          departmentColor: "finished",
          status: "idle",
          openRoof: true,
          layout: { x: 13, y: 1, width: 4, depth: 3.6, height: 62 },
          stockVisuals: [
            { partId: "blue_8", color: "blue", width: 2, depth: 4, count: 2, label: "Blauw 2×4" },
            { partId: "yellow_4", color: "yellow", width: 2, depth: 2, count: 1, label: "Geel 2×2" }
          ]
        })
      ]
    });
    const options = {
      centerDepartments: true,
      onDepartmentSelect(departmentId) {
        selections.push(departmentId);
        selectedDepartmentId = departmentId;
        render();
      },
      onCargoDrop(payload) {
        drops.push({ ...payload });
        if (
          payload.sourceDepartmentId !== "intake"
          || payload.targetDepartmentId !== "assembly"
          || payload.cargoId !== "parity-cart-01"
        ) return false;
        cargoDepartmentId = "assembly";
        selectedDepartmentId = "assembly";
        render();
        return true;
      },
      onDragStateChange(active) {
        dragStates.push(Boolean(active));
      }
    };
    function render() {
      renderCount += 1;
      window.IsometricLogisticsView.mount(sceneRoot, scene(), options);
    }
    function reset() {
      selectedDepartmentId = "intake";
      cargoDepartmentId = "intake";
      resetCount += 1;
      renderCount = 0;
      selections = [];
      drops = [];
      dragStates = [];
      render();
    }
    function readState() {
      return JSON.parse(JSON.stringify({
        selectedDepartmentId,
        cargoDepartmentId,
        resetCount,
        renderCount,
        selections,
        drops,
        dragStates
      }));
    }
    window.__lomParity = Object.freeze({ readState, reset });
    document.getElementById("parity-reset").addEventListener("click", reset);
    render();
  });
  await page.locator("#parity-scene .iso-map").waitFor();
  await page.mouse.move(1439, 999);
  return {
    errors,
    dispose() {
      page.off("pageerror", onPageError);
    }
  };
}

async function readState(page) {
  return page.evaluate(() => window.__lomParity.readState());
}

async function checkpoint(page, name, runtime, provenance) {
  return {
    name,
    ...await captureOutputFingerprint(
      page,
      "#parity-scene",
      await readState(page),
      runtime.fingerprint,
      provenance.contracts.geometryQuantum
    )
  };
}

async function runScenario(page, runtime, provenance) {
  const captures = [];
  const capture = async name => captures.push(await checkpoint(page, name, runtime, provenance));
  const cargo = () => page.locator('[data-cargo-id="parity-cart-01"]');
  const target = () => page.locator('.iso-department[data-department-id="assembly"]');

  await capture("initial");

  await target().click();
  await page.waitForFunction(() => window.__lomParity.readState().selectedDepartmentId === "assembly");
  await capture("department-selected");

  await cargo().focus();
  await page.keyboard.press("Enter");
  await expect(cargo()).toHaveAttribute("aria-pressed", "true");
  await expect(target()).toHaveClass(/is-keyboard-target/u);
  await capture("keyboard-picked-up");

  await page.keyboard.press("Escape");
  await expect(cargo()).toHaveAttribute("aria-pressed", "false");
  await capture("keyboard-cancelled");

  await cargo().focus();
  await page.keyboard.press("Enter");
  await expect(target()).toHaveClass(/is-keyboard-target/u);
  await page.keyboard.press("Enter");
  await page.waitForFunction(() => window.__lomParity.readState().cargoDepartmentId === "assembly");
  await capture("keyboard-dropped");

  await page.locator("#parity-reset").click();
  await page.waitForFunction(() => {
    const state = window.__lomParity.readState();
    return state.cargoDepartmentId === "intake" && state.resetCount === 1;
  });
  await capture("reset");

  const cargoBox = await cargo().boundingBox();
  const targetBox = await target().locator(".iso-building").boundingBox();
  if (!cargoBox || !targetBox) throw new Error("Sleepbron of -doel heeft geen zichtbare browsergeometrie.");
  await page.mouse.move(cargoBox.x + cargoBox.width / 2, cargoBox.y + cargoBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2, { steps: 12 });
  await expect(target()).toHaveClass(/is-drag-over/u);
  await capture("pointer-dragging");
  await page.mouse.up();
  await page.waitForFunction(() => window.__lomParity.readState().cargoDepartmentId === "assembly");
  await capture("pointer-dropped");

  expect(captures.map(item => item.name)).toEqual(provenance.scenario.checkpoints);
  return captures;
}

async function attachMismatch(testInfo, checkpointName, historical, current, pixelComparison) {
  await Promise.all([
    testInfo.attach(`${checkpointName}-historical-fingerprint.json`, {
      body: Buffer.from(stableStringify(historical.fingerprint)),
      contentType: "application/json"
    }),
    testInfo.attach(`${checkpointName}-current-fingerprint.json`, {
      body: Buffer.from(stableStringify(current.fingerprint)),
      contentType: "application/json"
    }),
    testInfo.attach(`${checkpointName}-historical.png`, {
      body: historical.png,
      contentType: "image/png"
    }),
    testInfo.attach(`${checkpointName}-current.png`, {
      body: current.png,
      contentType: "image/png"
    }),
    testInfo.attach(`${checkpointName}-pixel-comparison.json`, {
      body: Buffer.from(JSON.stringify(pixelComparison, null, 2)),
      contentType: "application/json"
    })
  ]);
}

function firstDifferences(left, right, limit = 8) {
  const differences = [];
  const summarize = value => {
    const encoded = JSON.stringify(value);
    return encoded && encoded.length > 180 ? `${encoded.slice(0, 177)}...` : encoded;
  };
  const visit = (leftValue, rightValue, location) => {
    if (differences.length >= limit || Object.is(leftValue, rightValue)) return;
    if (
      leftValue === null
      || rightValue === null
      || typeof leftValue !== "object"
      || typeof rightValue !== "object"
      || Array.isArray(leftValue) !== Array.isArray(rightValue)
    ) {
      differences.push(`${location}: ${summarize(leftValue)} != ${summarize(rightValue)}`);
      return;
    }
    const keys = Array.from(new Set([...Object.keys(leftValue), ...Object.keys(rightValue)])).sort();
    for (const key of keys) {
      if (!(key in leftValue) || !(key in rightValue)) {
        differences.push(`${location}.${key}: ontbreekt aan één zijde`);
      } else {
        visit(leftValue[key], rightValue[key], `${location}.${key}`);
      }
      if (differences.length >= limit) break;
    }
  };
  visit(left, right, "fingerprint");
  return differences;
}

test("historische en actuele isometrische logistiek blijven browserexact gelijk", async ({ page }, testInfo) => {
  test.skip(
    testInfo.project.name !== "history-parity-chromium",
    "Deze nul-pixelpoort draait in het deterministische software-rasterproject."
  );
  test.setTimeout(120_000);
  const { provenance, sources: historicalSources } = loadHistoricalSources();
  const currentSources = loadCurrentSources(Object.keys(historicalSources));
  const currentRenderer = currentSources["isometric-logistics-view.js"];
  const historicalRenderer = historicalSources["isometric-logistics-view.js"];
  const runtime = await engineRuntime(page);
  testInfo.annotations.push(
    { type: "baseline-commit", description: provenance.baselineCommit },
    {
      type: "engine-manifest",
      description: `${runtime.fingerprint.manifestVersion} sha256:${runtime.fingerprint.manifestSha256}`
    },
    { type: "comparison-mode", description: provenance.comparisonMode }
  );
  let activePreparation = null;

  try {
    activePreparation = await preparePage(
      page,
      historicalSources,
      historicalRenderer,
      runtime
    );
    const historicalCaptures = await runScenario(page, runtime, provenance);
    const historicalErrors = [...activePreparation.errors];
    activePreparation.dispose();
    activePreparation = await preparePage(
      page,
      currentSources,
      currentRenderer,
      runtime
    );
    const currentCaptures = await runScenario(page, runtime, provenance);
    const currentErrors = [...activePreparation.errors];

    expect(historicalErrors, "Historische paginafouten").toEqual([]);
    expect(currentErrors, "Actuele paginafouten").toEqual([]);
    for (let index = 0; index < historicalCaptures.length; index += 1) {
      const historical = historicalCaptures[index];
      const current = currentCaptures[index];
      expect(current.name).toBe(historical.name);
      const fingerprintsEqual = isDeepStrictEqual(current.fingerprint, historical.fingerprint);
      const pixelComparison = compareDecodedPixels(historical.png, current.png, {
        maximumChannelNoise: provenance.contracts.maximumChannelNoise
      });
      if (!fingerprintsEqual || !pixelComparison.equal) {
        await attachMismatch(testInfo, historical.name, historical, current, pixelComparison);
        const differingSections = Object.keys(historical.fingerprint.hashes).filter(
          name => historical.fingerprint.hashes[name] !== current.fingerprint.hashes[name]
        );
        const detail = firstDifferences(historical.fingerprint, current.fingerprint).join(" | ");
        throw new Error(
          `Pariteitsafwijking bij ${historical.name}; secties: ${differingSections.join(", ") || "geen"}; `
          + `afwijkende pixels: ${pixelComparison.differentPixels ?? "andere afmetingen"}; `
          + `ruwe pixelafwijkingen: ${pixelComparison.rawDifferentPixels ?? "onbekend"}; `
          + `maximale kanaaldelta: ${pixelComparison.maximumChannelDelta ?? "onbekend"}; `
          + `details: ${detail}; pixels: ${JSON.stringify(pixelComparison.samples || [])}.`
        );
      }
      expect(pixelComparison.differentPixels).toBe(provenance.contracts.maxDiffPixels);
    }
  } finally {
    activePreparation?.dispose();
  }
});
