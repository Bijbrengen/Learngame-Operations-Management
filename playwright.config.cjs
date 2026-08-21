const fs = require("node:fs");
const path = require("node:path");
const { defineConfig, devices } = require("@playwright/test");

const root = __dirname;

function dotenv(filePath) {
  if (!fs.existsSync(filePath)) return {};
  return Object.fromEntries(
    fs.readFileSync(filePath, "utf8")
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line && !line.startsWith("#") && line.includes("="))
      .map(line => {
        const separator = line.indexOf("=");
        return [
          line.slice(0, separator).trim(),
          line.slice(separator + 1).trim().replace(/^(['"])(.*)\1$/, "$2")
        ];
      })
  );
}

const defaults = dotenv(path.join(root, ".env.example"));
const local = dotenv(path.join(root, ".env"));
const appUrl = process.env.LEARNGAME_OM_URL || local.LEARNGAME_OM_URL || defaults.LEARNGAME_OM_URL;

if (!appUrl) {
  throw new Error("LEARNGAME_OM_URL ontbreekt in .env");
}

const endpoint = new URL(appUrl);
const localServer = ["127.0.0.1", "localhost", "::1"].includes(endpoint.hostname);
if (localServer && !endpoint.port) throw new Error("Een lokale LEARNGAME_OM_URL moet een expliciete poort bevatten");

module.exports = defineConfig({
  testDir: "./tests/visual",
  outputDir: "./test-results",
  timeout: 30_000,
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 4 : undefined,
  expect: {
    timeout: 5_000
  },
  use: {
    baseURL: appUrl,
    navigationTimeout: 30_000,
    actionTimeout: 10_000,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "off",
    serviceWorkers: "block",
    reducedMotion: "reduce"
  },
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report", open: "never" }]
  ],
  projects: [
    {
      name: "desktop-chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 1000 }
      }
    },
    {
      name: "mobile-chromium",
      testMatch: /(?:authentication|character-creation|critical-regressions|smoke)\.spec\.js/,
      use: {
        ...devices["Pixel 7"]
      }
    }
  ],
  webServer: localServer ? {
    command: `python -m http.server ${endpoint.port} --bind ${endpoint.hostname}`,
    cwd: root,
    url: appUrl,
    reuseExistingServer: !process.env.CI,
    timeout: 15_000
  } : undefined
});
