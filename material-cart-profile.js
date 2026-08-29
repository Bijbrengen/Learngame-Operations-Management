(() => {
  "use strict";

  const blok = Object.freeze({
    id: "logistics.material-cart",
    file: "logistics/materiaalwagen.blok",
    preset: "logistics-material-cart.green"
  });
  const view = Object.freeze({ originX: 32, originY: 58, scale: 0.36 });

  function countParts(parts) {
    return (parts || []).reduce(
      (total, part) => total + Math.max(0, Math.floor(Number(part.count) || 0)),
      0
    );
  }

  function rendererOptions(parts, scope) {
    return {
      x: 0,
      y: 0,
      zHalfLayers: 0,
      color: "green",
      wheelColor: "black",
      parts,
      maxVisibleParts: 8,
      scope,
      view
    };
  }

  function fallbackMarkup(partCount, variant) {
    if (variant === "isometric") {
      return `
          <g data-lego-material-cart
             data-material-part-count="${partCount}"
             data-material-cart-fallback="true"
             data-blok-id="${blok.id}"
             data-blok-file="${blok.file}"
             data-blok-render-preset="${blok.preset}">
            <title>Materiaalwagen met ${partCount} losse LEGO-onderdelen</title>
            <text class="iso-material-cart-fallback-copy" x="32" y="34" text-anchor="middle">MATERIAALWAGEN</text>
          </g>
        `;
    }
    if (variant !== "stage") throw new Error(`Onbekende materiaalwagenfallback: ${variant}`);
    return `
      <g data-lego-material-cart
         data-material-part-count="${partCount}"
         data-material-cart-fallback="true"
         data-blok-id="${blok.id}"
         data-blok-file="${blok.file}"
         data-blok-render-preset="${blok.preset}">
        <title>Materiaalwagen met ${partCount} losse LEGO-onderdelen</title>
        <text class="sim-material-cart-fallback-symbol" x="32" y="29" text-anchor="middle" aria-hidden="true">WAGEN</text>
        <text class="sim-material-cart-fallback-copy" x="32" y="44" text-anchor="middle">Materiaalwagen</text>
      </g>
    `;
  }

  function markup(parts, scope, fallbackVariant) {
    const renderer = window.LegoTowerRenderer;
    if (typeof renderer?.materialCart === "function") {
      return renderer.materialCart(rendererOptions(parts, scope));
    }
    return fallbackMarkup(countParts(parts), fallbackVariant);
  }

  window.LOMMaterialCartProfile = Object.freeze({
    blok,
    view,
    countParts,
    rendererOptions,
    fallbackMarkup,
    markup
  });
})();
