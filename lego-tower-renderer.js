class LegoTowerRenderer {
  static palette = {
    green: { top: "#31a75a", left: "#1f7b41", right: "#278c4b", stud: "#48bd70" },
    blue: { top: "#276fd0", left: "#1d4f99", right: "#235fb4", stud: "#4a91e5" },
    red: { top: "#d33e32", left: "#9d2b25", right: "#b8332b", stud: "#e25b50" },
    yellow: { top: "#f0c92f", left: "#b89218", right: "#d4aa20", stud: "#f7db61" },
    white: { top: "#f8f6ef", left: "#d4d0c8", right: "#e7e3dc", stud: "#ffffff" }
  };

  static blueprints = {
    A: { lower: "yellow", middle: "red", upper: "white", middleSize: "2x4" },
    B: { lower: "blue", middle: "yellow", upper: "green", middleSize: "2x2" },
    C: { lower: "white", middle: "blue", upper: "red", middleSize: "2x2" }
  };

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
        <ellipse cx="90" cy="132" rx="58" ry="12" fill="rgba(0,0,0,0.14)"></ellipse>
        ${bricks.join("")}
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
        <polygon points="${this.points([p3, p2, b2, b3])}" fill="${shade.left}"></polygon>
        <polygon points="${this.points([p1, p2, b2, b1])}" fill="${shade.right}"></polygon>
        <polygon points="${this.points([p0, p1, p2, p3])}" fill="${shade.top}" stroke="rgba(0,0,0,0.22)" stroke-width="1"></polygon>
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
    return `
      <ellipse cx="${cx}" cy="${cy - 1.8 * scale}" rx="${4.8 * scale}" ry="${2.7 * scale}" fill="${shade.stud}" stroke="rgba(0,0,0,0.18)" stroke-width="0.7"></ellipse>
      <ellipse cx="${cx}" cy="${cy - 3.0 * scale}" rx="${3.5 * scale}" ry="${1.5 * scale}" fill="rgba(255,255,255,0.34)"></ellipse>
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
