class LegoTowerRenderer {
  static animationId = 0;

  static palette = {
    green: {
      top: ["#38be72", "#288b52"],
      left: ["#217a46", "#15542e"],
      right: ["#1b6339", "#103e23"],
      stroke: "#6be39e"
    },
    blue: {
      top: ["#4c8df2", "#2a68cf"],
      left: ["#235abf", "#163c85"],
      right: ["#1a4596", "#0e2a61"],
      stroke: "#8bb8ff"
    },
    red: {
      top: ["#e33b3b", "#be1e1e"],
      left: ["#ab1818", "#730e0e"],
      right: ["#8a1313", "#540a0a"],
      stroke: "#ff8c8c"
    },
    yellow: {
      top: ["#fadd5c", "#f2c91a"],
      left: ["#d9b30d", "#a6890a"],
      right: ["#bf9e0b", "#8c7408"],
      stroke: "#ffee8c"
    },
    white: {
      top: ["#ffffff", "#e0e0e0"],
      left: ["#d0d0d0", "#b0b0b0"],
      right: ["#c0c0c0", "#a0a0a0"],
      stroke: "#ffffff"
    }
  };

  static blueprints = {
    A: { lower: "yellow", middle: "red", upper: "white", middleSize: "2x4" },
    B: { lower: "blue", middle: "yellow", upper: "green", middleSize: "2x2" },
    C: { lower: "white", middle: "blue", upper: "red", middleSize: "2x2" }
  };

  static pieces = {
    yellow_8: { color: "yellow", width: 2, depth: 4 },
    red_8: { color: "red", width: 2, depth: 4 },
    white_4: { color: "white", width: 2, depth: 2 },
    blue_8: { color: "blue", width: 2, depth: 4 },
    yellow_4: { color: "yellow", width: 2, depth: 2 },
    green_4: { color: "green", width: 2, depth: 2 },
    white_8: { color: "white", width: 2, depth: 4 },
    blue_4: { color: "blue", width: 2, depth: 2 },
    red_4: { color: "red", width: 2, depth: 2 }
  };

  static definitions() {
    return Object.entries(this.palette).map(([color, shades]) => `
      <linearGradient id="lego-${color}-top" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${shades.top[0]}"></stop>
        <stop offset="100%" stop-color="${shades.top[1]}"></stop>
      </linearGradient>
      <linearGradient id="lego-${color}-left" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="${shades.left[0]}"></stop>
        <stop offset="100%" stop-color="${shades.left[1]}"></stop>
      </linearGradient>
      <linearGradient id="lego-${color}-right" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="${shades.right[0]}"></stop>
        <stop offset="100%" stop-color="${shades.right[1]}"></stop>
      </linearGradient>
    `).join("");
  }

  static render(productId, label = "LEGO toren", blueprintOverride = null, className = "tower-large") {
    const blueprint = blueprintOverride || this.blueprints[productId] || this.blueprints.A;
    const bricks = [
      this.plate(0, 0, 0, 6, 6, "green"),
      this.brick(1, 1, 0.22, 2, 4, blueprint.lower),
      this.brick(3, 1, 0.22, 2, 4, blueprint.lower),
      blueprint.middleSize === "2x2"
        ? this.brick(2, 2, 1.0, 2, 2, blueprint.middle)
        : this.brick(1, 2, 1.0, 4, 2, blueprint.middle),
      this.brick(2, 2, 1.78, 2, 2, blueprint.upper)
    ];

    return `
      <svg class="${this.escape(className)}" viewBox="0 0 180 150" role="img" aria-label="${this.escape(label)}">
        <defs>${this.definitions()}</defs>
        <ellipse cx="90" cy="132" rx="58" ry="12" fill="rgba(0,0,0,0.14)"></ellipse>
        ${bricks.join("")}
      </svg>
    `;
  }

  /**
   * Bouwt een complete toren uit alleen de blokvolgorde.
   * De eerste twee 2x4-blokken komen naast elkaar, volgende blokken worden
   * automatisch gecentreerd en telkens een laag hoger geplaatst.
   */
  static layoutSequence(sequence) {
    if (!Array.isArray(sequence) || sequence.length < 1) return [];

    return sequence.map((pieceId, index) => {
      const piece = this.pieces[pieceId];
      if (!piece) throw new Error(`Onbekend LEGO-blok: ${pieceId}`);

      if (index === 0) return { ...piece, pieceId, x: 1, y: 1, z: 0.22 };
      if (index === 1) return { ...piece, pieceId, x: 3, y: 1, z: 0.22 };

      const isLong = piece.width === 2 && piece.depth === 4;
      return {
        ...piece,
        pieceId,
        x: isLong ? 1 : 2,
        y: 2,
        width: isLong ? 4 : piece.width,
        depth: isLong ? 2 : piece.depth,
        z: 0.22 + (index - 1) * 0.78
      };
    });
  }

  static renderAnimated(
    sequence,
    label = "Geanimeerde bouw van een LEGO-toren",
    className = "tower-animated"
  ) {
    const blocks = this.layoutSequence(sequence);
    const animationId = `lego-tower-build-${this.animationId += 1}`;
    const duration = Math.max(5.5, blocks.length * 1.25 + 1.5);
    const settleAt = Math.min(88, 22 + blocks.length * 15);
    const animationCss = blocks.map((block, index) => {
      const start = (index * 1.25 / duration) * 100;
      const land = ((index * 1.25 + 0.9) / duration) * 100;
      const bounce = ((index * 1.25 + 1.05) / duration) * 100;
      return `
        @keyframes ${animationId}-drop-${index} {
          0%, ${start.toFixed(1)}% { transform: translateY(-105px); opacity: 0; }
          ${(start + 0.1).toFixed(1)}% { opacity: 1; }
          ${land.toFixed(1)}% { transform: translateY(0); opacity: 1; }
          ${bounce.toFixed(1)}% { transform: translateY(-2.5px); opacity: 1; }
          ${(bounce + 2.2).toFixed(1)}%, ${settleAt}% { transform: translateY(0); opacity: 1; }
          96%, 100% { transform: translateY(-105px); opacity: 0; }
        }
        @keyframes ${animationId}-shadow-${index} {
          0%, ${start.toFixed(1)}% { opacity: 0; transform: scale(.45); }
          ${land.toFixed(1)}%, ${settleAt}% { opacity: .16; transform: scale(1); }
          96%, 100% { opacity: 0; transform: scale(.45); }
        }
        #${animationId} .animated-tower-block-${index} {
          animation: ${animationId}-drop-${index} ${duration}s cubic-bezier(.25,1,.5,1) infinite;
        }
        #${animationId} .animated-tower-shadow-${index} {
          animation: ${animationId}-shadow-${index} ${duration}s cubic-bezier(.25,1,.5,1) infinite;
          transform-box: fill-box;
          transform-origin: center;
        }`;
    }).join("");

    const blockMarkup = blocks.map((block, index) => {
      const [shadowX, shadowY] = this.iso(
        block.x + block.width / 2,
        block.y + block.depth / 2,
        block.z
      );
      return `
        <ellipse class="animated-tower-shadow-${index}"
                 cx="${shadowX}" cy="${shadowY + 4}"
                 rx="${Math.max(10, (block.width + block.depth) * 3.2)}" ry="4"></ellipse>
        <g class="animated-tower-block-${index}">
          ${this.brick(block.x, block.y, block.z, block.width, block.depth, block.color)}
        </g>`;
    }).join("");

    return `
      <svg id="${animationId}" class="${this.escape(className)}" viewBox="0 0 180 150"
           role="img" aria-label="${this.escape(label)}">
        <defs>${this.definitions()}</defs>
        <style>
          ${animationCss}
          #${animationId} [class^="animated-tower-shadow-"] { fill: #06140c; }
          @media (prefers-reduced-motion: reduce) {
            #${animationId} [class^="animated-tower-block-"],
            #${animationId} [class^="animated-tower-shadow-"] { animation: none !important; }
          }
        </style>
        <ellipse cx="90" cy="132" rx="58" ry="12" fill="rgba(0,0,0,.14)"></ellipse>
        ${this.plate(0, 0, 0, 6, 6, "green")}
        ${blockMarkup}
      </svg>
    `;
  }

  static renderPart(part, label = "LEGO blokje") {
    const color = part.color || "green";
    const width = part.width === "wide" ? 4 : 2;
    const depth = 2;
    const bricks = [
      part.id === "base_green"
        ? this.plate(0, 0, 0, 6, 6, color)
        : this.brick(2, 2, 0, width, depth, color)
    ];

    return `
      <svg class="lego-part-3d${part.id === "base_green" ? " base-plate" : ""}" viewBox="0 0 180 150" role="img" aria-label="${this.escape(label)}">
        <defs>${this.definitions()}</defs>
        <ellipse cx="90" cy="132" rx="58" ry="12" fill="rgba(0,0,0,0.12)"></ellipse>
        ${bricks.join("")}
      </svg>
    `;
  }

  static plate(x, y, z, width, depth, color) {
    return this.solid(x, y, z, width, depth, 0.22, color, true);
  }

  static brick(x, y, z, width, depth, color) {
    return this.solid(x, y, z, width, depth, 0.72, color, true);
  }

  static solid(x, y, z, width, depth, height, color, studs) {
    const shade = this.palette[color] || this.palette.blue;
    const topZ = z + height;
    const p0 = this.iso(x, y, topZ);
    const p1 = this.iso(x + width, y, topZ);
    const p2 = this.iso(x + width, y + depth, topZ);
    const p3 = this.iso(x, y + depth, topZ);
    const b0 = this.iso(x, y, z);
    const b1 = this.iso(x + width, y, z);
    const b2 = this.iso(x + width, y + depth, z);
    const b3 = this.iso(x, y + depth, z);
    const studMarkup = studs ? this.studs(x, y, topZ, width, depth, color) : "";

    return `
      <g class="iso-brick">
        <polygon points="${this.points([p3, p2, b2, b3])}" fill="url(#lego-${color}-left)"></polygon>
        <polygon points="${this.points([p1, p2, b2, b1])}" fill="url(#lego-${color}-right)"></polygon>
        <polygon points="${this.points([p0, p1, p2, p3])}"
                 fill="url(#lego-${color}-top)"
                 stroke="${shade.stroke}" stroke-opacity="0.42" stroke-width="0.65"></polygon>
        ${studMarkup}
      </g>
    `;
  }

  static studs(x, y, z, width, depth, color) {
    const markup = [];
    for (let sx = 0; sx < width; sx += 1) {
      for (let sy = 0; sy < depth; sy += 1) {
        const [cx, cy] = this.iso(x + sx + 0.5, y + sy + 0.5, z + 0.06);
        markup.push(this.stud(cx, cy, color, width >= 6 ? 0.75 : 0.88));
      }
    }
    return markup.join("");
  }

  static stud(cx, cy, color, scale) {
    const shade = this.palette[color] || this.palette.green;
    const radiusX = 4.8 * scale;
    const radiusY = 2.45 * scale;
    const topY = cy - 2.5 * scale;
    const bottomY = cy - 0.3 * scale;
    return `
      <path d="M ${cx - radiusX},${topY}
               L ${cx - radiusX},${bottomY}
               A ${radiusX} ${radiusY} 0 0 0 ${cx + radiusX},${bottomY}
               L ${cx + radiusX},${topY}
               A ${radiusX} ${radiusY} 0 0 1 ${cx - radiusX},${topY} Z"
            fill="url(#lego-${color}-right)"></path>
      <ellipse cx="${cx}" cy="${topY}" rx="${radiusX}" ry="${radiusY}"
               fill="url(#lego-${color}-top)"
               stroke="${shade.stroke}" stroke-opacity="0.62" stroke-width="0.55"></ellipse>
      <ellipse cx="${cx - radiusX * 0.2}" cy="${topY - radiusY * 0.25}"
               rx="${radiusX * 0.55}" ry="${radiusY * 0.38}"
               fill="rgba(255,255,255,0.22)"></ellipse>
    `;
  }

  static iso(x, y, z) {
    const originX = 90;
    const originY = 105;
    const isoX = 13;
    const isoY = 7;
    const isoZ = 17;
    const centeredX = x - 3;
    const centeredY = y - 3;
    return [
      originX + (centeredX - centeredY) * isoX,
      originY + (centeredX + centeredY) * isoY - z * isoZ
    ];
  }

  static points(list) {
    return list.map(point => point.join(",")).join(" ");
  }

  static escape(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }
}

window.LegoTowerRenderer = LegoTowerRenderer;
