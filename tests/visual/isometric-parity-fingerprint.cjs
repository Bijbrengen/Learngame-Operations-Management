"use strict";

const { createHash } = require("node:crypto");

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value).sort().map(key => [key, canonicalize(value[key])])
    );
  }
  return value;
}

function stableStringify(value) {
  return JSON.stringify(canonicalize(value));
}

function digest(value) {
  return createHash("sha256").update(stableStringify(value)).digest("hex");
}

async function settlePage(page) {
  await page.evaluate(async () => {
    const freezeSvgTimeline = () => document.querySelectorAll("svg").forEach(svg => {
      try {
        svg.pauseAnimations?.();
        svg.setCurrentTime?.(0);
      } catch (_error) {
        // Niet ieder ingebed SVG-element exposeert een SMIL-tijdlijn.
      }
    });
    freezeSvgTimeline();
    if (document.fonts?.ready) await document.fonts.ready;
    await new Promise(resolve => requestAnimationFrame(resolve));
    freezeSvgTimeline();
    await new Promise(resolve => requestAnimationFrame(resolve));
  });
}

async function captureOutputFingerprint(page, selector, state, runtime, geometryQuantum) {
  await page.bringToFront();
  await settlePage(page);
  const sections = await page.locator(selector).evaluate((root, args) => {
    const cssProperties = [
      "align-items", "aspect-ratio", "background-color", "background-image",
      "border-bottom-color", "border-bottom-width", "border-left-color", "border-left-width",
      "border-radius", "border-right-color", "border-right-width", "border-top-color", "border-top-width",
      "box-sizing", "box-shadow", "clip-path", "color", "column-gap", "content", "cursor",
      "display", "fill", "filter", "flex-basis", "flex-direction", "flex-grow", "flex-shrink",
      "font-family", "font-size", "font-style", "font-weight", "gap", "grid-template-columns",
      "height", "justify-content", "left", "letter-spacing", "line-height", "margin-bottom",
      "margin-left", "margin-right", "margin-top", "max-height", "max-width", "min-height",
      "min-width", "opacity", "overflow-x", "overflow-y", "padding-bottom", "padding-left",
      "padding-right", "padding-top", "pointer-events", "position", "right", "row-gap", "stroke",
      "stroke-dasharray", "stroke-dashoffset", "stroke-linecap", "stroke-linejoin", "stroke-width",
      "text-align", "text-anchor", "text-decoration", "text-transform", "top", "transform",
      "transform-origin", "translate", "vertical-align", "visibility", "white-space", "width", "z-index"
    ];
    const elements = [root, ...root.querySelectorAll("*")];
    const indexByElement = new Map(elements.map((element, index) => [element, index]));
    const quantize = value => {
      const number = Number(value);
      if (!Number.isFinite(number)) return null;
      const rounded = Math.round(number / args.geometryQuantum) * args.geometryQuantum;
      return Object.is(rounded, -0) ? 0 : Number(rounded.toFixed(6));
    };
    const rectValue = rect => ({
      x: quantize(rect.x),
      y: quantize(rect.y),
      width: quantize(rect.width),
      height: quantize(rect.height),
      top: quantize(rect.top),
      right: quantize(rect.right),
      bottom: quantize(rect.bottom),
      left: quantize(rect.left)
    });
    const elementKey = element => {
      if (indexByElement.has(element)) return String(indexByElement.get(element));
      const parts = [];
      let current = element;
      while (current && current.nodeType === Node.ELEMENT_NODE) {
        const siblings = current.parentElement
          ? Array.from(current.parentElement.children).filter(candidate => candidate.tagName === current.tagName)
          : [current];
        parts.push(`${current.tagName.toLowerCase()}:${siblings.indexOf(current)}`);
        current = current.parentElement;
      }
      return parts.reverse().join("/");
    };
    const computedValues = (element, pseudo = null) => {
      const style = getComputedStyle(element, pseudo);
      return Object.fromEntries(cssProperties.map(property => [property, style.getPropertyValue(property)]));
    };

    const computed = elements.map(element => {
      const pseudos = {};
      for (const pseudo of ["::before", "::after"]) {
        const style = getComputedStyle(element, pseudo);
        if (!new Set(["none", "normal", ""]).has(style.content)) {
          pseudos[pseudo] = computedValues(element, pseudo);
        }
      }
      return {
        key: elementKey(element),
        tag: element.tagName.toLowerCase(),
        values: computedValues(element),
        pseudos
      };
    });

    const geometry = elements.map(element => {
      const rect = element.getBoundingClientRect();
      return {
        key: elementKey(element),
        tag: element.tagName.toLowerCase(),
        id: element.id || "",
        className: typeof element.className === "string" ? element.className : element.getAttribute("class") || "",
        rect: rectValue(rect),
        client: [quantize(element.clientWidth), quantize(element.clientHeight)],
        offset: [quantize(element.offsetWidth), quantize(element.offsetHeight)],
        scroll: [quantize(element.scrollWidth), quantize(element.scrollHeight)]
      };
    });

    const svg = elements.filter(element => element instanceof SVGElement).map(element => {
      let box = null;
      let matrix = null;
      let pathLength = null;
      try {
        const value = element.getBBox();
        box = { x: quantize(value.x), y: quantize(value.y), width: quantize(value.width), height: quantize(value.height) };
      } catch (_error) {
        box = null;
      }
      try {
        const value = element.getCTM();
        matrix = value ? [value.a, value.b, value.c, value.d, value.e, value.f].map(quantize) : null;
      } catch (_error) {
        matrix = null;
      }
      if (element.tagName.toLowerCase() === "path" && typeof element.getTotalLength === "function") {
        try {
          pathLength = quantize(element.getTotalLength());
        } catch (_error) {
          pathLength = null;
        }
      }
      return {
        key: elementKey(element),
        tag: element.tagName.toLowerCase(),
        attributes: Array.from(element.attributes)
          .map(attribute => [attribute.name, attribute.value])
          .sort(([left], [right]) => left.localeCompare(right)),
        box,
        matrix,
        pathLength
      };
    });

    const cssRules = [];
    const relevantSelector = /(?:\.iso-|\.department-|\.status-|#parity-scene|\[data-(?:cargo|department|drag|stock))/u;
    const visitRules = (rules, context = []) => {
      for (let index = 0; index < rules.length; index += 1) {
        const rule = rules[index];
        if (rule.selectorText && relevantSelector.test(rule.selectorText)) {
          cssRules.push({ context, selector: rule.selectorText, cssText: rule.cssText });
        }
        if (rule.cssRules) {
          const label = rule.conditionText || rule.name || rule.constructor?.name || `rule-${index}`;
          visitRules(rule.cssRules, [...context, label]);
        }
      }
    };
    for (const sheet of document.styleSheets) {
      try {
        visitRules(sheet.cssRules || []);
      } catch (_error) {
        // Cross-origin styles blijven zichtbaar via computed style.
      }
    }

    return {
      markup: root.outerHTML,
      cssRules,
      computed,
      geometry,
      svg,
      state: {
        ...args.state,
        activeElement: document.activeElement ? elementKey(document.activeElement) : null
      }
    };
  }, { state, runtime, geometryQuantum });

  const fingerprint = {
    schemaVersion: 1,
    runtime,
    sections,
    hashes: Object.fromEntries(
      Object.entries(sections).map(([name, value]) => [name, digest(value)])
    )
  };
  const locator = page.locator(selector);
  const screenshotOptions = {
    caret: "hide",
    scale: "css"
  };
  await page.evaluate(rootSelector => {
    const root = document.querySelector(rootSelector);
    const records = Array.from(root?.querySelectorAll("animate, animateMotion, animateTransform, set") || [])
      .map(node => ({ node, parent: node.parentNode, index: Array.prototype.indexOf.call(node.parentNode.childNodes, node) }));
    records.forEach(record => record.node.remove());
    window.__lomParitySuspendedSvgTiming = records;
  }, selector);
  let png;
  try {
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve)));
    // De eerste paint na een documentrender initialiseert SVG-filtertiles.
    await locator.screenshot(screenshotOptions);
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve)));
    png = await locator.screenshot(screenshotOptions);
  } finally {
    await page.evaluate(() => {
      const records = window.__lomParitySuspendedSvgTiming || [];
      const byParent = new Map();
      records.forEach(record => {
        if (!byParent.has(record.parent)) byParent.set(record.parent, []);
        byParent.get(record.parent).push(record);
      });
      byParent.forEach(parentRecords => {
        parentRecords.sort((left, right) => left.index - right.index).forEach(record => {
          record.parent.insertBefore(record.node, record.parent.childNodes[record.index] || null);
        });
      });
      delete window.__lomParitySuspendedSvgTiming;
    });
  }
  return { fingerprint, png };
}

module.exports = { captureOutputFingerprint, digest, stableStringify };
