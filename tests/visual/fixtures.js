const playwright = require("@playwright/test");

const PRODUCTION_API_ORIGIN = "https://api.leerpretpark.nl";
const PRODUCTION_APP_ORIGIN = "https://bijbrengen.github.io";
const PRODUCTION_APP_URL = `${PRODUCTION_APP_ORIGIN}/Learngame-Operations-Management/`;
const publicResourceCache = new Map();

function isCiPreview(baseURL) {
  if (!process.env.CI || !baseURL) return false;
  try {
    const url = new URL(baseURL);
    return ["127.0.0.1", "localhost", "::1"].includes(url.hostname)
      && url.port === "47913";
  } catch {
    return false;
  }
}

function isPublicEngineResource(method, pathname) {
  if (method === "GET" && (
    pathname === "/api/health"
    || pathname.startsWith("/api/sdk/")
    || pathname.startsWith("/api/ui/")
    || pathname.startsWith("/api/help/assets/")
    || pathname.startsWith("/api/leerbox-runtime/")
  )) return true;
  return method === "POST" && pathname === "/api/sdk/session/refresh";
}

async function fulfillPreflight(route, previewOrigin) {
  const request = route.request();
  await route.fulfill({
    status: 204,
    headers: {
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Allow-Headers": request.headers()["access-control-request-headers"] || "*",
      "Access-Control-Allow-Methods": request.headers()["access-control-request-method"] || "GET, POST, OPTIONS",
      "Access-Control-Allow-Origin": previewOrigin,
      "Access-Control-Max-Age": "600"
    },
    body: ""
  });
}

async function forwardPublicEngineResource(route, previewOrigin) {
  const request = route.request();
  const url = new URL(request.url());
  const requestHeaders = request.headers();
  const headers = {
    origin: PRODUCTION_APP_ORIGIN,
    referer: PRODUCTION_APP_URL
  };
  [
    "accept",
    "content-type",
    "x-leerpret-sdk",
    "x-leerpret-sdk-client",
    "x-leerpret-sdk-token"
  ].forEach(name => {
    if (requestHeaders[name]) headers[name] = requestHeaders[name];
  });
  const requestBody = request.method() === "GET" || request.method() === "HEAD"
    ? undefined
    : request.postDataBuffer();

  const cacheable = request.method() === "GET" && (
    (url.pathname.startsWith("/api/sdk/") && url.pathname !== "/api/sdk/session")
    || url.pathname.startsWith("/api/ui/")
    || url.pathname.startsWith("/api/help/assets/")
  );
  const load = async () => {
    // Use Node's fetch rather than route.fetch: cached responses must outlive
    // the browser context that happened to request them first.
    const response = await fetch(request.url(), {
      method: request.method(),
      headers,
      body: requestBody,
      redirect: "error",
      signal: AbortSignal.timeout(30_000)
    });
    const responseHeaders = Object.fromEntries(response.headers.entries());
    delete responseHeaders["content-encoding"];
    delete responseHeaders["content-length"];
    delete responseHeaders["set-cookie"];
    return {
      status: response.status,
      headers: responseHeaders,
      body: Buffer.from(await response.arrayBuffer())
    };
  };
  let result;
  if (cacheable) {
    if (!publicResourceCache.has(request.url())) {
      publicResourceCache.set(request.url(), load().catch(error => {
        publicResourceCache.delete(request.url());
        throw error;
      }));
    }
    result = await publicResourceCache.get(request.url());
    if (result.status < 200 || result.status >= 300) {
      publicResourceCache.delete(request.url());
    }
  } else {
    result = await load();
  }
  await route.fulfill({
    status: result.status,
    headers: {
      ...result.headers,
      "access-control-allow-credentials": "true",
      "access-control-allow-origin": previewOrigin
    },
    body: result.body
  });
}

const test = playwright.test.extend({
  ciProductionEngineBridge: [async ({ context, baseURL }, use) => {
    if (!isCiPreview(baseURL)) {
      await use();
      return;
    }

    const previewOrigin = new URL(baseURL).origin;
    const corsHeaders = {
      "access-control-allow-credentials": "true",
      "access-control-allow-origin": previewOrigin
    };
    await context.route(`${PRODUCTION_API_ORIGIN}/api/**`, async route => {
      const request = route.request();
      const url = new URL(request.url());
      if (request.method() === "OPTIONS") {
        await fulfillPreflight(route, previewOrigin);
        return;
      }
      if (isPublicEngineResource(request.method(), url.pathname)) {
        await forwardPublicEngineResource(route, previewOrigin);
        return;
      }
      if (url.pathname.startsWith("/api/auth/")) {
        await route.fulfill({
          status: 401,
          headers: { ...corsHeaders, "content-type": "application/json" },
          body: JSON.stringify({ detail: "Geen actieve testsessie." })
        });
        return;
      }
      await route.fulfill({
        status: 503,
        headers: { ...corsHeaders, "content-type": "application/json" },
        body: JSON.stringify({
          detail: "De CI-preview geeft alleen publieke Engine-bronnen door; deze API hoort door de test te worden gemockt."
        })
      });
    });

    await use();
  }, { auto: true }]
});

module.exports = { test, expect: playwright.expect };
