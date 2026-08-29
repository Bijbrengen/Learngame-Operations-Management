const { createHash } = require("node:crypto");
const { test, expect } = require("./fixtures");

test("de isometrische logistiek-scene behoudt exact dezelfde gegenereerde markup", async ({ page }) => {
  const sdkBase = process.env.LEERPRET_API_URL
    || (process.env.CI ? "https://api.leerpretpark.nl/api" : "http://127.0.0.1:47111/api");
  const manifestResponse = await page.request.get(`${sdkBase}/sdk/manifest.json`);
  expect(manifestResponse.ok()).toBe(true);
  const manifest = await manifestResponse.json();

  await page.goto("/style.css");
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.setContent(`<!doctype html><html><body>
    <main id="compatibility-scene" style="width:1100px;height:700px"></main>
  </body></html>`);
  await page.addScriptTag({ url: `${sdkBase}/sdk/sdk-loader/loader.js?v=${manifest.version}` });
  await page.evaluate(async ({ sdkBase, manifest }) => {
    await window.LeerpretSDK.Loader.create({ base: sdkBase, manifest })
      .load(["lego-renderer", "lego-cables", "lego-builder"]);
  }, { sdkBase, manifest });
  await page.addScriptTag({ url: "/material-cart-profile.js" });
  await page.addScriptTag({ url: "/isometric-logistics-view.js" });

  await page.evaluate(() => {
    window.IsometricLogisticsView.mount(document.getElementById("compatibility-scene"), {
      title: "Compatibiliteitsmeting",
      selectedDepartmentId: "assembly",
      legend: [
        { color: "raw", label: "Grondstoffen" },
        { color: "production-b", label: "Assemblage" },
        { color: "finished", label: "Gereed" }
      ],
      connections: [
        { from: "raw", to: "assembly", kind: "material" },
        { from: "assembly", to: "finished", kind: "customer", curveOffsetY: 18 }
      ],
      departments: [
        {
          id: "raw",
          title: "Magazijn Grondstoffen",
          shortTitle: "Grondstoffen",
          description: "Rastervaste voorraad.",
          kind: "warehouse",
          departmentColor: "raw",
          status: "active",
          primaryMetric: "8 onderdelen",
          openRoof: true,
          layout: { x: 1, y: 8, width: 3.5, depth: 3.2, height: 54 },
          stockVisuals: [
            { partId: "blue_8", color: "blue", width: 2, depth: 4, count: 4, label: "Blauw 2×4" },
            { partId: "yellow_4", color: "yellow", width: 2, depth: 2, count: 4, label: "Geel 2×2" }
          ]
        },
        {
          id: "assembly",
          title: "Assemblage",
          shortTitle: "Assemblage",
          description: "Bouwt de toren.",
          kind: "production",
          departmentColor: "production-b",
          status: "attention",
          primaryMetric: "4 torens",
          openRoof: true,
          layout: { x: 7, y: 4, width: 3.8, depth: 3.4, height: 72 },
          cargoVisual: {
            kind: "tower",
            cargoId: "batch-4",
            label: "Toren B",
            quantity: 4,
            towerSequence: ["blue_8", "blue_8", "yellow_4", "green_4"]
          }
        },
        {
          id: "finished",
          title: "Magazijn Gereed Product",
          shortTitle: "Gereed Product",
          description: "Ontvangt de complete batch.",
          kind: "warehouse",
          departmentColor: "finished",
          status: "idle",
          primaryMetric: "0 gereed",
          openRoof: true,
          layout: { x: 13, y: 1, width: 4, depth: 3.6, height: 62 },
          cargoVisual: {
            kind: "material_cart",
            cargoId: "cart-3",
            label: "Materiaalwagen",
            quantity: 1,
            parts: [
              { partId: "red_8", color: "red", width: 2, depth: 4, count: 2 },
              { partId: "white_4", color: "white", width: 2, depth: 2, count: 1 }
            ]
          }
        }
      ]
    }, { centerDepartments: true });
  });

  const markup = await page.locator("#compatibility-scene").innerHTML();
  const digest = createHash("sha256").update(markup).digest("hex");
  expect(digest).toBe("7db5277b2bcedf4e31a671c24d6229692bbf4421b6989070358773446eca6f89");
});
