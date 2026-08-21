(() => {
  "use strict";

  // The digital multiplayer runtime has seven independently controllable
  // stations. Several educational role labels intentionally refer to the same
  // station; two human members may never own that station simultaneously.
  const ROLE_TO_STATION = Object.freeze({
    customer: "customer",
    customer1: "customer",
    customer2: "customer",
    customer3: "customer",
    customer4: "customer",
    logistics_manager: "operations",
    opr: "operations",
    operations: "operations",
    sales: "operations",
    finance: "operations",
    raw_warehouse: "srm",
    srm: "srm",
    supplier: "srm",
    production_1: "pd1",
    production_a: "pd1",
    pd1: "pd1",
    production_2: "pd2",
    production_b: "pd2",
    pd2: "pd2",
    production_3: "pd3",
    production_c: "pd3",
    pd3: "pd3",
    finished_warehouse: "ssf",
    mfp: "ssf",
    ssf: "ssf",
    transporter: "ssf"
  });

  function stationId(roleId) {
    return ROLE_TO_STATION[String(roleId || "").trim().toLowerCase()] || null;
  }

  function analyze(roleIds = []) {
    const selected = [];
    const unknown = [];
    const collisions = [];
    const firstByStation = new Map();
    for (const rawRoleId of roleIds || []) {
      const roleId = String(rawRoleId || "").trim().toLowerCase();
      if (!roleId || selected.includes(roleId)) continue;
      const station = stationId(roleId);
      if (!station) {
        unknown.push(roleId);
        continue;
      }
      const firstRoleId = firstByStation.get(station);
      if (firstRoleId) {
        collisions.push({ station_id: station, first_role_id: firstRoleId, role_id: roleId });
        continue;
      }
      firstByStation.set(station, roleId);
      selected.push(roleId);
    }
    return { role_ids: selected, unknown_role_ids: unknown, collisions };
  }

  window.LOMRuntimeRoles = Object.freeze({
    ROLE_TO_STATION,
    stationId,
    analyze,
    normalize: roleIds => analyze(roleIds).role_ids
  });
})();
