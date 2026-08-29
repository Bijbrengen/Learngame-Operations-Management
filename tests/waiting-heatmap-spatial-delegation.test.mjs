import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

const source = fs.readFileSync(new URL("../logistics-game-ui.js", import.meta.url), "utf8");

test("wachtheatmap delegeert ellipsgeometrie en houdt de legacy-SVG bytegelijk", () => {
  const calls = [];
  const context = { console };
  context.window = context;
  context.globalThis = context;
  context.LeerpretSDK = {
    components: {
      "lego-spatial": {
        radialAxes(count, options) {
          calls.push({ count, options });
          const angleStep = Math.PI * 2 / count;
          return Array.from({ length: count }, (_, index) => {
            const angle = -Math.PI / 2 + index * angleStep;
            return {
              x: options.center[0] + Math.cos(angle) * options.radiusX,
              y: options.center[1] + Math.sin(angle) * options.radiusY
            };
          });
        }
      }
    }
  };
  vm.runInNewContext(source, context, { filename: "logistics-game-ui.js" });
  const controller = Object.create(context.LogisticsGameUI.LogisticsGameUIController.prototype);
  const markup = controller.waitingHeatmapMarkup({
    roleFlow: ["srm", "pd1", "quality"],
    roles: {
      srm: { department: "Magazijn", token: "MAG" },
      pd1: { department: "Productie", token: "P1" },
      quality: { department: "Kwaliteit", token: "KW" }
    },
    roleRuntime: {
      srm: { queue: ["o1"], activeOrderId: "o1", state: "BUSY" },
      pd1: { queue: [], activeOrderId: null, state: "IDLE" },
      quality: { queue: ["o2", "o3"], activeOrderId: null, state: "WAIT" }
    }
  });

  assert.deepEqual(JSON.parse(JSON.stringify(calls)), [{
    count: 3,
    options: { center: [250, 180], radiusX: 190, radiusY: 125 }
  }]);
  assert.equal(Buffer.byteLength(markup), 1738);
  assert.equal(
    crypto.createHash("sha256").update(markup).digest("hex"),
    "4a3dc20f96847b214444055302fc218fed0dff090f6181f1d0c40fe8ae74a8c7"
  );
  assert.doesNotMatch(source, /Math\.(?:cos|sin)\(/);
});

test("handtekeningpunten gebruiken de generieke geklemde rechthoekmapping", () => {
  const calls = [];
  const context = { console };
  context.window = context;
  context.globalThis = context;
  context.LeerpretSDK = {
    components: {
      "lego-spatial": {
        mapPointBetweenRects(point, sourceRect, targetRect, options) {
          calls.push({ point, sourceRect, targetRect, options });
          const x = targetRect.x + (point.clientX - sourceRect.left) / Math.max(1, sourceRect.width) * targetRect.width;
          const y = targetRect.y + (point.clientY - sourceRect.top) / Math.max(1, sourceRect.height) * targetRect.height;
          return {
            x: Math.max(targetRect.x, Math.min(targetRect.x + targetRect.width, x)),
            y: Math.max(targetRect.y, Math.min(targetRect.y + targetRect.height, y))
          };
        }
      }
    }
  };
  vm.runInNewContext(source, context, { filename: "logistics-game-ui.js" });
  const controller = Object.create(context.LogisticsGameUI.LogisticsGameUIController.prototype);
  const bounds = { left: 10, top: 20, width: 160, height: 48 };
  const event = { clientX: 210, clientY: 8 };

  assert.deepEqual(
    JSON.parse(JSON.stringify(controller.signaturePoint(event, { getBoundingClientRect: () => bounds }))),
    { x: 320, y: 0 }
  );
  assert.deepEqual(JSON.parse(JSON.stringify(calls)), [{
    point: event,
    sourceRect: bounds,
    targetRect: { x: 0, y: 0, width: 320, height: 96 },
    options: { clamp: true, minimumSourceExtent: 1 }
  }]);
  assert.doesNotMatch(source, /\(event\.clientX - bounds\.left\).*\* 320/s);
});
