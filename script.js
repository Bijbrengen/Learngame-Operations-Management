(() => {
  const LEARNING_OBJECT_ID = "leerbox-learngame-operations-management";
  const PERSON_ID = `person-${Math.random().toString(36).slice(2, 8)}`;
  const CUSTOM_PRODUCTS_STORAGE = "learngame.om.customProducts.v1";
  const GROUND_PLATE_COLORS = new Set([
    "green",
    "blue",
    "light_gray",
    "dark_gray",
    "black",
    "sand"
  ]);
  const COLOR_LAYER_IDS = Object.freeze(["groundPlate", "layer1", "layer2", "layer3"]);

  function normalizeEditableColorLayers(value) {
    if (!Array.isArray(value)) return [];
    return [...new Set(value)].filter(layerId => COLOR_LAYER_IDS.includes(layerId));
  }

  const ROLES = [
    { id: "customer1", token: "K1", lane: "customer", title: "Klant 1" },
    { id: "customer2", token: "K2", lane: "customer", title: "Klant 2" },
    { id: "customer3", token: "K3", lane: "customer", title: "Klant 3" },
    { id: "customer4", token: "K4", lane: "customer", title: "Klant 4" },
    { id: "opr", token: "OPR", lane: "operations", title: "Operations Manager" },
    { id: "srm", token: "SRM", lane: "raw", title: "Magazijn Grondstoffen" },
    { id: "pd1", token: "PD1", lane: "pd1", title: "Productie Afdeling 1" },
    { id: "pd2", token: "PD2", lane: "pd2", title: "Productie Afdeling 2" },
    { id: "pd3", token: "PD3", lane: "pd3", title: "Productie Afdeling 3" },
    { id: "mfp", token: "MFP", lane: "finished", title: "Magazijn Gereed Product" }
  ];

  const PARTS = [
    { id: "base_green", name: "groene 6x6 grondplaten", price: 5, color: "green", width: "plate", stock: 8, reorder: 3 },
    { id: "blue_8", name: "blauwe 2x4 blokken", price: 4, color: "blue", width: "wide", stock: 14, reorder: 4 },
    { id: "blue_4", name: "blauwe 2x2 blokken", price: 2, color: "blue", width: "narrow", stock: 14, reorder: 4 },
    { id: "white_8", name: "witte 2x4 blokken", price: 3, color: "white", width: "wide", stock: 12, reorder: 4 },
    { id: "white_4", name: "witte 2x2 blokken", price: 1, color: "white", width: "narrow", stock: 16, reorder: 5 },
    { id: "red_8", name: "rode 2x4 blokken", price: 4, color: "red", width: "wide", stock: 10, reorder: 3 },
    { id: "red_4", name: "rode 2x2 blokken", price: 2, color: "red", width: "narrow", stock: 12, reorder: 4 },
    { id: "yellow_8", name: "gele 2x4 blokken", price: 4, color: "yellow", width: "wide", stock: 10, reorder: 3 },
    { id: "yellow_4", name: "gele 2x2 blokken", price: 2, color: "yellow", width: "narrow", stock: 12, reorder: 4 },
    { id: "green_4", name: "groene 2x2 blokken", price: 2, color: "green", width: "narrow", stock: 12, reorder: 4 }
  ];

  const BASE_PRODUCTS = {
    A: {
      id: "A",
      name: "Toren A",
      towerBlueprint: { lower: "yellow", middle: "red", upper: "white", middleSize: "2x4" },
      price: 49,
      towerSequence: ["yellow_8", "yellow_8", "red_8", "white_4"],
      stages: [
        { department: 1, output: "ss1", recipe: { base_green: 1, yellow_8: 2 } },
        { department: 2, input: "ss1", output: "ss2", recipe: { red_8: 1 } },
        { department: 3, input: "ss2", output: "finished", recipe: { white_4: 1 } }
      ],
      visual: [["white_4"], ["red_8"], ["yellow_8", "yellow_8"], ["base_green"]]
    },
    B: {
      id: "B",
      name: "Toren B",
      towerBlueprint: { lower: "blue", middle: "yellow", upper: "green", middleSize: "2x2" },
      price: 58,
      towerSequence: ["blue_8", "blue_8", "yellow_4", "green_4"],
      stages: [
        { department: 1, output: "ss1", recipe: { base_green: 1, blue_8: 2 } },
        { department: 2, input: "ss1", output: "ss2", recipe: { yellow_4: 1 } },
        { department: 3, input: "ss2", output: "finished", recipe: { green_4: 1 } }
      ],
      visual: [["green_4"], ["yellow_4"], ["blue_8", "blue_8"], ["base_green"]]
    },
    C: {
      id: "C",
      name: "Toren C",
      towerBlueprint: { lower: "white", middle: "blue", upper: "red", middleSize: "2x2" },
      price: 76,
      towerSequence: ["white_8", "white_8", "blue_4", "red_4"],
      stages: [
        { department: 1, output: "ss1", recipe: { base_green: 1, white_8: 2 } },
        { department: 2, input: "ss1", output: "ss2", recipe: { blue_4: 1 } },
        { department: 3, input: "ss2", output: "finished", recipe: { red_4: 1 } }
      ],
      visual: [["red_4"], ["blue_4"], ["white_8", "white_8"], ["base_green"]]
    }
  };

  const TOWER_BLUEPRINTS = [
    { lower: "yellow", middle: "red", upper: "white", middleSize: "2x4" },
    { lower: "blue", middle: "yellow", upper: "green", middleSize: "2x2" },
    { lower: "white", middle: "blue", upper: "red", middleSize: "2x2" },
    { lower: "yellow", middle: "blue", upper: "red", middleSize: "2x4" },
    { lower: "white", middle: "green", upper: "yellow", middleSize: "2x2" },
    { lower: "red", middle: "blue", upper: "white", middleSize: "2x4" },
    { lower: "yellow", middle: "red", upper: "green", middleSize: "2x2" },
    { lower: "white", middle: "yellow", upper: "blue", middleSize: "2x4" },
    { lower: "green", middle: "red", upper: "yellow", middleSize: "2x2" }
  ];

  const PRODUCT_IDS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  const MIN_PRODUCT_TYPES = 1;
  const MAX_PRODUCT_TYPES = TOWER_BLUEPRINTS.length;
  let PRODUCTS = {};
  let logisticsGameController = null;
  let standaloneSelectedDepartmentId = null;

  const LANES = [
    { id: "customer", title: "Klanten", subtitle: "4 mogelijke klanten" },
    { id: "operations", title: "Operations", subtitle: "catalogus, orderregistratie, vrijgave" },
    { id: "raw", title: "Magazijn grondstoffen", subtitle: "materiaaluitgifte per stap" },
    { id: "pd1", title: "Productie 1", subtitle: "productiestap 1" },
    { id: "ss1", title: "SS1", subtitle: "tussenvoorraad 1" },
    { id: "pd2", title: "Productie 2", subtitle: "productiestap 2" },
    { id: "ss2", title: "SS2", subtitle: "tussenvoorraad 2" },
    { id: "pd3", title: "Productie 3", subtitle: "productiestap 3" },
    { id: "finished", title: "Gereed product", subtitle: "kwaliteitscontrole" },
    { id: "archive", title: "Archief", subtitle: "afgehandeld" }
  ];

  const DATA_MODEL_GROUPS = [
    { id: "customers", title: "100 - Klanten" },
    { id: "sales", title: "200 - Verkoop" },
    { id: "administration", title: "300 - Administratie" },
    { id: "operations", title: "400 - Operations" },
    { id: "purchase", title: "500 - Inkoop" },
    { id: "production_a", title: "600 - Productie afdeling A" },
    { id: "production_b", title: "700 - Productie afdeling B" },
    { id: "production_c", title: "800 - Productie afdeling C" },
    { id: "raw_warehouse", title: "900 - Magazijn grondstoffen" },
    { id: "finished_warehouse", title: "1000 - Magazijn gereed product" }
  ];

  const DATA_MODEL_LEARNING_OBJECTS = [
    { id: "dm_00_inkoop", modelNumber: 0, label: "Inkoop", groupId: "purchase", role: "Manager Inkoop", from: "501", to: "000", mapsTo: ["purchase_materials"] },
    { id: "dm_01_wil_bestellen", modelNumber: 1, label: "Wil bestellen", groupId: "customers", role: "Klant", from: "0", to: "201", mapsTo: ["customer_order_request"] },
    { id: "dm_01_verkooptransactie", modelNumber: 1, label: "Verkooptransactie", groupId: "sales", role: "Manager Verkoop", from: "201", to: "205", mapsTo: ["customer_order_request"] },
    { id: "dm_02_orderformulier_naar_adm", modelNumber: 2, label: "Orderformulier -> ADM", groupId: "sales", role: "Manager Verkoop", from: "205", to: "301", mapsTo: ["register_order"] },
    { id: "dm_02_ontv_orderformulier_adm", modelNumber: 2, label: "Ontv. orderformulier", groupId: "administration", role: "Manager Administratie", from: "301", to: "305", mapsTo: ["register_order"] },
    { id: "dm_03_orderverwerking", modelNumber: 3, label: "Orderverwerking", groupId: "administration", role: "Manager Administratie", from: "305", to: "310", mapsTo: ["register_order"] },
    { id: "dm_04_orderformulier_naar_ops", modelNumber: 4, label: "Orderformulier -> OPS", groupId: "administration", role: "Manager Administratie", from: "310", to: "401", mapsTo: ["update_worklist"] },
    { id: "dm_05_ontv_orderformulier_ops", modelNumber: 5, label: "Ontv. orderformulier", groupId: "operations", role: "Manager Operations", from: "401", to: "405", mapsTo: ["update_worklist"] },
    { id: "dm_06_orderformulier_naar_pdt_a", modelNumber: 6, label: "Orderformulier -> PDT A", groupId: "operations", role: "Manager Operations", from: "405", to: "601", mapsTo: ["release_to_pd1"] },
    { id: "dm_06_orderformulier_naar_pdt_b", modelNumber: 6, label: "Orderformulier -> PDT B", groupId: "operations", role: "Manager Operations", from: "406", to: "701", mapsTo: ["release_to_pd2"] },
    { id: "dm_06_orderformulier_naar_pdt_c", modelNumber: 6, label: "Orderformulier -> PDT C", groupId: "operations", role: "Manager Operations", from: "407", to: "801", mapsTo: ["release_to_pd3"] },
    { id: "dm_07_ontv_orderformulier_pda_a", modelNumber: 7, label: "Ontv. orderformulier A", groupId: "production_a", role: "Manager Prod Afd A", from: "601", to: "605", mapsTo: ["confirm_order_receipt"] },
    { id: "dm_07_grondstoffen_halen_a", modelNumber: 7, label: "Grondstoffen halen A", groupId: "production_a", role: "Manager Prod Afd A", from: "605", to: "901", mapsTo: ["issue_materials"] },
    { id: "dm_07_ontv_orderformulier_pda_b", modelNumber: 7, label: "Ontv. orderformulier B", groupId: "production_b", role: "Manager Prod Afd B", from: "701", to: "705", mapsTo: ["confirm_order_receipt"] },
    { id: "dm_07_grondstoffen_halen_b", modelNumber: 7, label: "Grondstoffen halen B", groupId: "production_b", role: "Manager Prod Afd B", from: "705", to: "902", mapsTo: ["issue_materials"] },
    { id: "dm_07_ontv_orderformulier_pda_c", modelNumber: 7, label: "Ontv. orderformulier C", groupId: "production_c", role: "Manager Prod Afd C", from: "801", to: "805", mapsTo: ["confirm_order_receipt"] },
    { id: "dm_07_grondstoffen_halen_c", modelNumber: 7, label: "Grondstoffen halen C", groupId: "production_c", role: "Manager Prod Afd C", from: "805", to: "903", mapsTo: ["issue_materials"] },
    { id: "dm_08_materiaaluitgifte_pda_a", modelNumber: 8, label: "Materiaaluitgifte PDA A", groupId: "raw_warehouse", role: "Manager Mag. GS", from: "901", to: "610", mapsTo: ["issue_materials"] },
    { id: "dm_08_materiaaluitgifte_pda_b", modelNumber: 8, label: "Materiaaluitgifte PDA B", groupId: "raw_warehouse", role: "Manager Mag. GS", from: "902", to: "710", mapsTo: ["issue_materials"] },
    { id: "dm_08_materiaaluitgifte_pda_c", modelNumber: 8, label: "Materiaaluitgifte PDA C", groupId: "raw_warehouse", role: "Manager Mag. GS", from: "903", to: "810", mapsTo: ["issue_materials"] },
    { id: "dm_09_start_productie_a", modelNumber: 9, label: "Start productie A", groupId: "production_a", role: "Manager Prod Afd A", from: "610", to: "615", mapsTo: ["start_production"] },
    { id: "dm_10_productie_gereed_a", modelNumber: 10, label: "Productie gereed A", groupId: "production_a", role: "Manager Prod Afd A", from: "615", to: "620", mapsTo: ["complete_production_step"] },
    { id: "dm_11_producten_naar_mag_gp_a", modelNumber: 11, label: "Producten -> MAG GP A", groupId: "production_a", role: "Manager Prod Afd A", from: "620", to: "1001", mapsTo: ["complete_production_step"] },
    { id: "dm_09_start_productie_b", modelNumber: 9, label: "Start productie B", groupId: "production_b", role: "Manager Prod Afd B", from: "710", to: "715", mapsTo: ["start_production"] },
    { id: "dm_10_productie_gereed_b", modelNumber: 10, label: "Productie gereed B", groupId: "production_b", role: "Manager Prod Afd B", from: "715", to: "720", mapsTo: ["complete_production_step"] },
    { id: "dm_11_producten_naar_mag_gp_b", modelNumber: 11, label: "Producten -> MAG GP B", groupId: "production_b", role: "Manager Prod Afd B", from: "720", to: "1002", mapsTo: ["complete_production_step"] },
    { id: "dm_09_start_productie_c", modelNumber: 9, label: "Start productie C", groupId: "production_c", role: "Manager Prod Afd C", from: "810", to: "815", mapsTo: ["start_production"] },
    { id: "dm_10_productie_gereed_c", modelNumber: 10, label: "Productie gereed C", groupId: "production_c", role: "Manager Prod Afd C", from: "815", to: "820", mapsTo: ["complete_production_step"] },
    { id: "dm_11_producten_naar_mag_gp_c", modelNumber: 11, label: "Producten -> MAG GP C", groupId: "production_c", role: "Manager Prod Afd C", from: "820", to: "1003", mapsTo: ["complete_production_step"] },
    { id: "dm_12_ontv_producten_pda_a", modelNumber: 12, label: "Ontv. producten PDA A", groupId: "finished_warehouse", role: "Manager Gereed Product", from: "1001", to: "625", mapsTo: ["quality_control"] },
    { id: "dm_12_ontv_producten_pda_b", modelNumber: 12, label: "Ontv. producten PDA B", groupId: "finished_warehouse", role: "Manager Gereed Product", from: "1002", to: "725", mapsTo: ["quality_control"] },
    { id: "dm_12_ontv_producten_pda_c", modelNumber: 12, label: "Ontv. producten PDA C", groupId: "finished_warehouse", role: "Manager Gereed Product", from: "1003", to: "825", mapsTo: ["quality_control"] },
    { id: "dm_13_orderformulier_naar_ops_a", modelNumber: 13, label: "Orderformulier -> OPS A", groupId: "production_a", role: "Manager Prod Afd A", from: "625", to: "410", mapsTo: ["complete_production_step"] },
    { id: "dm_13_orderformulier_naar_ops_b", modelNumber: 13, label: "Orderformulier -> OPS B", groupId: "production_b", role: "Manager Prod Afd B", from: "725", to: "410", mapsTo: ["complete_production_step"] },
    { id: "dm_13_orderformulier_naar_ops_c", modelNumber: 13, label: "Orderformulier -> OPS C", groupId: "production_c", role: "Manager Prod Afd C", from: "825", to: "410", mapsTo: ["complete_production_step"] },
    { id: "dm_14_ontv_orderformulier_ops", modelNumber: 14, label: "Ontv. orderformulier", groupId: "operations", role: "Manager Operations", from: "410", to: "415", mapsTo: ["confirm_customer_accepted"] },
    { id: "dm_15_orderformulier_naar_vkp", modelNumber: 15, label: "Orderformulier -> VKP", groupId: "operations", role: "Manager Operations", from: "415", to: "210", mapsTo: ["release_to_customer"] },
    { id: "dm_14_ontv_orderformulier_ops_terug", modelNumber: 14, label: "Ontv. orderformulier", groupId: "operations", role: "Manager Operations", from: "420", to: "425", mapsTo: ["confirm_customer_accepted"] },
    { id: "dm_15_orderformulier_naar_vkp_terug", modelNumber: 15, label: "Orderformulier -> VKP", groupId: "operations", role: "Manager Operations", from: "425", to: "210", mapsTo: ["release_to_customer"] },
    { id: "dm_16_ontv_orderformulier_vkp", modelNumber: 16, label: "Ontv. orderformulier", groupId: "sales", role: "Manager Verkoop", from: "210", to: "215", mapsTo: ["release_to_customer"] },
    { id: "dm_17_producten_halen", modelNumber: 17, label: "Producten halen", groupId: "sales", role: "Manager Verkoop", from: "215", to: "1005", mapsTo: ["quality_control"] },
    { id: "dm_18_uitgifte_producten", modelNumber: 18, label: "Uitgifte producten", groupId: "finished_warehouse", role: "Manager Gereed Product", from: "1005", to: "220", mapsTo: ["quality_control"] },
    { id: "dm_19_ontvangst_producten_vkp", modelNumber: 19, label: "Ontvangst producten", groupId: "sales", role: "Manager Verkoop", from: "220", to: "225", mapsTo: ["customer_acceptance"] },
    { id: "dm_19_afleveren_producten", modelNumber: 19, label: "Afleveren producten", groupId: "sales", role: "Manager Verkoop", from: "225", to: "105", mapsTo: ["customer_acceptance"] },
    { id: "dm_20_ontv_producten_klant", modelNumber: 20, label: "Ontv. producten", groupId: "customers", role: "Klant", from: "105", to: "110", mapsTo: ["customer_acceptance"] },
    { id: "dm_20_betaal_vkp", modelNumber: 20, label: "Betaal VKP", groupId: "customers", role: "Klant", from: "110", to: "230", mapsTo: ["customer_acceptance"] },
    { id: "dm_21_ontv_betaling", modelNumber: 21, label: "Ontv. betaling", groupId: "sales", role: "Manager Verkoop", from: "230", to: "235", mapsTo: ["customer_acceptance"] },
    { id: "dm_22_geld_naar_adm", modelNumber: 22, label: "Geld -> ADM", groupId: "sales", role: "Manager Verkoop", from: "235", to: "315", mapsTo: ["archive_order"] },
    { id: "dm_22_ontvangst_geld_en_form", modelNumber: 22, label: "Ontvangst geld en formulier", groupId: "administration", role: "Manager Administratie", from: "315", to: "320", mapsTo: ["archive_order"] },
    { id: "dm_23_archiveren_formulier", modelNumber: 23, label: "Archiveren formulier", groupId: "administration", role: "Manager Administratie", from: "320", to: "0", mapsTo: ["archive_order"] }
  ];

  const DATA_MODEL_EDGES = [
    ["dm_01_wil_bestellen", "dm_01_verkooptransactie"],
    ["dm_01_verkooptransactie", "dm_02_orderformulier_naar_adm"],
    ["dm_02_orderformulier_naar_adm", "dm_02_ontv_orderformulier_adm"],
    ["dm_02_ontv_orderformulier_adm", "dm_03_orderverwerking"],
    ["dm_03_orderverwerking", "dm_04_orderformulier_naar_ops"],
    ["dm_04_orderformulier_naar_ops", "dm_05_ontv_orderformulier_ops"],
    ["dm_05_ontv_orderformulier_ops", "dm_06_orderformulier_naar_pdt_a"],
    ["dm_05_ontv_orderformulier_ops", "dm_06_orderformulier_naar_pdt_b"],
    ["dm_05_ontv_orderformulier_ops", "dm_06_orderformulier_naar_pdt_c"],
    ["dm_06_orderformulier_naar_pdt_a", "dm_07_ontv_orderformulier_pda_a"],
    ["dm_07_ontv_orderformulier_pda_a", "dm_07_grondstoffen_halen_a"],
    ["dm_07_grondstoffen_halen_a", "dm_08_materiaaluitgifte_pda_a"],
    ["dm_08_materiaaluitgifte_pda_a", "dm_09_start_productie_a"],
    ["dm_09_start_productie_a", "dm_10_productie_gereed_a"],
    ["dm_10_productie_gereed_a", "dm_11_producten_naar_mag_gp_a"],
    ["dm_11_producten_naar_mag_gp_a", "dm_12_ontv_producten_pda_a"],
    ["dm_12_ontv_producten_pda_a", "dm_13_orderformulier_naar_ops_a"],
    ["dm_13_orderformulier_naar_ops_a", "dm_14_ontv_orderformulier_ops"],
    ["dm_13_orderformulier_naar_ops_a", "dm_14_ontv_orderformulier_ops_terug"],
    ["dm_06_orderformulier_naar_pdt_b", "dm_07_ontv_orderformulier_pda_b"],
    ["dm_07_ontv_orderformulier_pda_b", "dm_07_grondstoffen_halen_b"],
    ["dm_07_grondstoffen_halen_b", "dm_08_materiaaluitgifte_pda_b"],
    ["dm_08_materiaaluitgifte_pda_b", "dm_09_start_productie_b"],
    ["dm_09_start_productie_b", "dm_10_productie_gereed_b"],
    ["dm_10_productie_gereed_b", "dm_11_producten_naar_mag_gp_b"],
    ["dm_11_producten_naar_mag_gp_b", "dm_12_ontv_producten_pda_b"],
    ["dm_12_ontv_producten_pda_b", "dm_13_orderformulier_naar_ops_b"],
    ["dm_13_orderformulier_naar_ops_b", "dm_14_ontv_orderformulier_ops"],
    ["dm_13_orderformulier_naar_ops_b", "dm_14_ontv_orderformulier_ops_terug"],
    ["dm_06_orderformulier_naar_pdt_c", "dm_07_ontv_orderformulier_pda_c"],
    ["dm_07_ontv_orderformulier_pda_c", "dm_07_grondstoffen_halen_c"],
    ["dm_07_grondstoffen_halen_c", "dm_08_materiaaluitgifte_pda_c"],
    ["dm_08_materiaaluitgifte_pda_c", "dm_09_start_productie_c"],
    ["dm_09_start_productie_c", "dm_10_productie_gereed_c"],
    ["dm_10_productie_gereed_c", "dm_11_producten_naar_mag_gp_c"],
    ["dm_11_producten_naar_mag_gp_c", "dm_12_ontv_producten_pda_c"],
    ["dm_12_ontv_producten_pda_c", "dm_13_orderformulier_naar_ops_c"],
    ["dm_13_orderformulier_naar_ops_c", "dm_14_ontv_orderformulier_ops"],
    ["dm_13_orderformulier_naar_ops_c", "dm_14_ontv_orderformulier_ops_terug"],
    ["dm_14_ontv_orderformulier_ops", "dm_15_orderformulier_naar_vkp"],
    ["dm_14_ontv_orderformulier_ops_terug", "dm_15_orderformulier_naar_vkp_terug"],
    ["dm_15_orderformulier_naar_vkp", "dm_16_ontv_orderformulier_vkp"],
    ["dm_15_orderformulier_naar_vkp_terug", "dm_16_ontv_orderformulier_vkp"],
    ["dm_16_ontv_orderformulier_vkp", "dm_17_producten_halen"],
    ["dm_17_producten_halen", "dm_18_uitgifte_producten"],
    ["dm_18_uitgifte_producten", "dm_19_ontvangst_producten_vkp"],
    ["dm_19_ontvangst_producten_vkp", "dm_19_afleveren_producten"],
    ["dm_19_afleveren_producten", "dm_20_ontv_producten_klant"],
    ["dm_20_ontv_producten_klant", "dm_20_betaal_vkp"],
    ["dm_20_betaal_vkp", "dm_21_ontv_betaling"],
    ["dm_21_ontv_betaling", "dm_22_geld_naar_adm"],
    ["dm_22_geld_naar_adm", "dm_22_ontvangst_geld_en_form"],
    ["dm_22_ontvangst_geld_en_form", "dm_23_archiveren_formulier"],
    ["dm_00_inkoop", "dm_08_materiaaluitgifte_pda_a"],
    ["dm_00_inkoop", "dm_08_materiaaluitgifte_pda_b"],
    ["dm_00_inkoop", "dm_08_materiaaluitgifte_pda_c"]
  ];

  const ORDER_PROCESS_SEQUENCE = [
    "dm_01_wil_bestellen",
    "dm_01_verkooptransactie",
    "dm_02_orderformulier_naar_adm",
    "dm_02_ontv_orderformulier_adm",
    "dm_03_orderverwerking",
    "dm_04_orderformulier_naar_ops",
    "dm_05_ontv_orderformulier_ops",
    "dm_00_inkoop",
    "dm_06_orderformulier_naar_pdt_a",
    "dm_07_ontv_orderformulier_pda_a",
    "dm_07_grondstoffen_halen_a",
    "dm_08_materiaaluitgifte_pda_a",
    "dm_09_start_productie_a",
    "dm_10_productie_gereed_a",
    "dm_11_producten_naar_mag_gp_a",
    "dm_12_ontv_producten_pda_a",
    "dm_13_orderformulier_naar_ops_a",
    "dm_06_orderformulier_naar_pdt_b",
    "dm_07_ontv_orderformulier_pda_b",
    "dm_07_grondstoffen_halen_b",
    "dm_08_materiaaluitgifte_pda_b",
    "dm_09_start_productie_b",
    "dm_10_productie_gereed_b",
    "dm_11_producten_naar_mag_gp_b",
    "dm_12_ontv_producten_pda_b",
    "dm_13_orderformulier_naar_ops_b",
    "dm_06_orderformulier_naar_pdt_c",
    "dm_07_ontv_orderformulier_pda_c",
    "dm_07_grondstoffen_halen_c",
    "dm_08_materiaaluitgifte_pda_c",
    "dm_09_start_productie_c",
    "dm_10_productie_gereed_c",
    "dm_11_producten_naar_mag_gp_c",
    "dm_12_ontv_producten_pda_c",
    "dm_13_orderformulier_naar_ops_c",
    "dm_14_ontv_orderformulier_ops",
    "dm_15_orderformulier_naar_vkp",
    "dm_14_ontv_orderformulier_ops_terug",
    "dm_15_orderformulier_naar_vkp_terug",
    "dm_16_ontv_orderformulier_vkp",
    "dm_17_producten_halen",
    "dm_18_uitgifte_producten",
    "dm_19_ontvangst_producten_vkp",
    "dm_19_afleveren_producten",
    "dm_20_ontv_producten_klant",
    "dm_20_betaal_vkp",
    "dm_21_ontv_betaling",
    "dm_22_geld_naar_adm",
    "dm_22_ontvangst_geld_en_form",
    "dm_23_archiveren_formulier"
  ];

  const STEPS = [
    { id: "appointment_ok", lane: "operations", roleId: "opr", actionType: "appointment_scheduled", label: "Afspraak gepland bij Operations", action: "OK", minutes: 1 },
    { id: "opr_update_1", lane: "operations", roleId: "opr", actionType: "update_worklist", label: "Operations ziet werkzaamheden", action: "Nu bijwerken", minutes: 1 },
    { id: "catalog", lane: "operations", roleId: "opr", actionType: "catalog_select", label: "Catalogus: klant kiest toren", action: "Catalogus", minutes: 1 },
    { id: "register", lane: "operations", roleId: "opr", actionType: "register_order", label: "Aantal en levertijd registreren", action: "Order registreren", minutes: 1 },
    { id: "release_pd1", lane: "operations", roleId: "opr", actionType: "release_to_pd1", label: "Ordervrijgave naar Productie Afdeling 1", action: "Vrijgeven PD1", minutes: 1 },
    { id: "pd1_receive", lane: "pd1", roleId: "pd1", actionType: "confirm_order_receipt", label: "PD1 bevestigt orderontvangst", action: "Parafeer", minutes: 1 },
    { id: "pd1_materials", lane: "raw", roleId: "srm", actionType: "issue_materials", label: "Grondstoffen voor productiestap 1", action: "Geef uit", minutes: 2, materialStage: 1 },
    { id: "pd1_start", lane: "pd1", roleId: "pd1", actionType: "start_production", label: "PD1 start productie", action: "Start", minutes: 2, productionStage: 1 },
    { id: "pd1_done", lane: "pd1", roleId: "pd1", actionType: "complete_production_step", label: "PD1 meldt productiestap 1 gereed", action: "Gereed", minutes: 2, completeStage: 1 },
    { id: "ss1_check", lane: "ss1", roleId: "opr", actionType: "ss1_check", label: "Operations controleert SS1", action: "Controleer SS1", minutes: 1, bufferCheck: "ss1" },
    { id: "release_pd2", lane: "operations", roleId: "opr", actionType: "release_to_pd2", label: "Ordervrijgave naar Productie Afdeling 2", action: "Vrijgeven PD2", minutes: 1 },
    { id: "pd2_receive", lane: "pd2", roleId: "pd2", actionType: "confirm_order_receipt", label: "PD2 bevestigt orderontvangst", action: "Parafeer", minutes: 1 },
    { id: "pd2_materials", lane: "raw", roleId: "srm", actionType: "issue_materials", label: "Grondstoffen voor productiestap 2", action: "Geef uit", minutes: 2, materialStage: 2 },
    { id: "pd2_start", lane: "pd2", roleId: "pd2", actionType: "start_production", label: "PD2 start productie", action: "Start", minutes: 2, productionStage: 2 },
    { id: "pd2_done", lane: "pd2", roleId: "pd2", actionType: "complete_production_step", label: "PD2 meldt productiestap 2 gereed", action: "Gereed", minutes: 2, completeStage: 2 },
    { id: "ss2_check", lane: "ss2", roleId: "opr", actionType: "ss2_check", label: "Operations controleert SS2", action: "Controleer SS2", minutes: 1, bufferCheck: "ss2" },
    { id: "release_pd3", lane: "operations", roleId: "opr", actionType: "release_to_pd3", label: "Ordervrijgave naar Productie Afdeling 3", action: "Vrijgeven PD3", minutes: 1 },
    { id: "pd3_receive", lane: "pd3", roleId: "pd3", actionType: "confirm_order_receipt", label: "PD3 bevestigt orderontvangst", action: "Parafeer", minutes: 1 },
    { id: "pd3_materials", lane: "raw", roleId: "srm", actionType: "issue_materials", label: "Grondstoffen voor productiestap 3", action: "Geef uit", minutes: 2, materialStage: 3 },
    { id: "pd3_start", lane: "pd3", roleId: "pd3", actionType: "start_production", label: "PD3 start productie", action: "Start", minutes: 2, productionStage: 3 },
    { id: "pd3_done", lane: "pd3", roleId: "pd3", actionType: "complete_production_step", label: "PD3 meldt productiestap 3 gereed", action: "Gereed", minutes: 2, completeStage: 3 },
    { id: "release_customer", lane: "operations", roleId: "opr", actionType: "release_to_customer", label: "Operations geeft order vrij naar klant", action: "Vrijgeven klant", minutes: 1 },
    { id: "customer_accept", lane: "customer", roleId: "customer1", actionType: "customer_acceptance", label: "Klant accepteert order", action: "Parafeer", minutes: 1 },
    { id: "quality_control", lane: "finished", roleId: "mfp", actionType: "quality_control", label: "Kwaliteitscontrole door gereed product", action: "Controleer", minutes: 1 },
    { id: "opr_accepted", lane: "operations", roleId: "opr", actionType: "confirm_customer_accepted", label: "Operations ziet klantacceptatie", action: "Nu bijwerken", minutes: 1 },
    { id: "archive", lane: "archive", roleId: "opr", actionType: "archive_order", label: "Orderformulier naar archief", action: "Archiveer", minutes: 1 }
  ];

  const PRODUCTION_DEPARTMENT_IDS = Object.freeze(["A", "B", "C"]);
  const PARALLEL_DEPARTMENT_ROLES = Object.freeze({
    A: Object.freeze({ number: 1, roleId: "pd1", lane: "pd1" }),
    B: Object.freeze({ number: 2, roleId: "pd2", lane: "pd2" }),
    C: Object.freeze({ number: 3, roleId: "pd3", lane: "pd3" })
  });

  function parallelDepartmentForProduct(productId) {
    const productIndex = Math.max(0, productIds().indexOf(productId));
    return PRODUCTION_DEPARTMENT_IDS[productIndex % PRODUCTION_DEPARTMENT_IDS.length];
  }

  function productionRouteForOrder(orderNumber, processes = state.config.productionProcesses) {
    const normalized = window.LogisticsProcess?.normalizeProcesses(
      processes,
      state.config.gameType
    ) || ["parallel"];
    if (normalized.length === 2) {
      return orderNumber % 2 === 0 ? "parallel" : "sequential";
    }
    return normalized[0] || "sequential";
  }

  function parallelStepsForProduct(productId) {
    const departmentId = parallelDepartmentForProduct(productId);
    const department = PARALLEL_DEPARTMENT_ROLES[departmentId];
    const label = `Productieafdeling ${departmentId}`;
    return [
      ...STEPS.slice(0, 4),
      {
        id: `release_parallel_${departmentId.toLowerCase()}`,
        lane: "operations",
        roleId: "opr",
        actionType: `release_to_${department.roleId}`,
        label: `Ordervrijgave naar ${label}`,
        action: `Vrijgeven ${departmentId}`,
        minutes: 1
      },
      {
        id: `parallel_${departmentId.toLowerCase()}_receive`,
        lane: department.lane,
        roleId: department.roleId,
        actionType: "confirm_order_receipt",
        label: `${label} bevestigt de complete productorder`,
        action: "Parafeer",
        minutes: 1
      },
      {
        id: `parallel_${departmentId.toLowerCase()}_materials`,
        lane: "raw",
        roleId: "srm",
        actionType: "issue_materials",
        label: `Alle grondstoffen voor complete Toren ${productId}`,
        action: "Geef complete set uit",
        minutes: 2,
        materialStage: department.number,
        fullProductMaterials: true,
        productionDepartment: departmentId
      },
      {
        id: `parallel_${departmentId.toLowerCase()}_start`,
        lane: department.lane,
        roleId: department.roleId,
        actionType: "start_production",
        label: `${label} start de complete Toren ${productId}`,
        action: "Start complete productie",
        minutes: 3,
        productionStage: department.number,
        productionDepartment: departmentId
      },
      {
        id: `parallel_${departmentId.toLowerCase()}_done`,
        lane: department.lane,
        roleId: department.roleId,
        actionType: "complete_product",
        label: `${label} meldt de complete Toren ${productId} gereed`,
        action: "Toren gereedmelden",
        minutes: 4,
        completeStage: department.number,
        completeProduct: true,
        productionDepartment: departmentId
      },
      ...STEPS.slice(21)
    ];
  }

  function processStepsForOrder(productId, productionRoute) {
    return productionRoute === "parallel"
      ? parallelStepsForProduct(productId)
      : STEPS;
  }

  function createFinancialState() {
    const zeroByDepartment = () => Object.fromEntries(
      PRODUCTION_DEPARTMENT_IDS.map(id => [id, 0])
    );
    return {
      openingCash: 1000,
      cash: 1000,
      revenue: 0,
      costOfGoodsSold: 0,
      conversionCost: 0,
      materialIssues: 0,
      wipByDepartment: zeroByDepartment(),
      finishedGoodsByDepartment: zeroByDepartment(),
      materialCostByDepartment: zeroByDepartment(),
      conversionCostByDepartment: zeroByDepartment(),
      revenueByDepartment: zeroByDepartment(),
      opportunityCostByDepartment: zeroByDepartment(),
      wipByStage: { 1: 0, 2: 0, 3: 0 },
      materialCostByStage: { 1: 0, 2: 0, 3: 0 }
    };
  }

  const DISRUPTIONS = [
    { id: "forgot_update", label: "Rol vergeet Nu bijwerken", minutes: 3, cost: 5, roleId: "opr" },
    { id: "stockout", label: "Grondstoffen ontbreken", minutes: 4, cost: 9, roleId: "srm" },
    { id: "quality_rework", label: "Kwaliteitscontrole vraagt herwerk", minutes: 5, cost: 12, roleId: "mfp" },
    { id: "customer_pressure", label: "Klant wil kortere levertijd", minutes: 2, cost: 6, roleId: "customer1" }
  ];

  const ISOMETRIC_DEPARTMENT_DEFINITIONS = [
    {
      id: "inbound",
      title: "Magazijn Grondstoffen",
      shortTitle: "Grondstoffen",
      description: "Ontvangst, opslag en uitgifte van LEGO-grondstoffen voor de drie productiestappen.",
      kind: "warehouse",
      departmentColor: "raw",
      lanes: ["raw"],
      layout: { x: 1, y: 17, width: 3.5, depth: 3.2, height: 54 }
    },
    {
      id: "production_1",
      title: "Productieafdeling A",
      shortTitle: "Afdeling A",
      description: "Zelfstandige productieafdeling voor de productorder Toren A.",
      kind: "production",
      departmentColor: "production-a",
      productIds: ["A"],
      lanes: ["pd1", "ss1"],
      layout: { x: 5, y: 13, width: 3.5, depth: 3.2, height: 68 }
    },
    {
      id: "production_2",
      title: "Productieafdeling B",
      shortTitle: "Afdeling B",
      description: "Zelfstandige productieafdeling voor de productorder Toren B.",
      kind: "production",
      departmentColor: "production-b",
      productIds: ["B"],
      lanes: ["pd2", "ss2"],
      layout: { x: 9, y: 9, width: 3.5, depth: 3.2, height: 74 }
    },
    {
      id: "production_3",
      title: "Productieafdeling C",
      shortTitle: "Afdeling C",
      description: "Zelfstandige productieafdeling voor de productorder Toren C.",
      kind: "production",
      departmentColor: "production-c",
      productIds: ["C"],
      lanes: ["pd3"],
      layout: { x: 13, y: 5, width: 3.5, depth: 3.2, height: 82 }
    },
    {
      id: "quality",
      title: "Magazijn Gereed Product",
      shortTitle: "Gereed Product",
      description: "Ontvangst en controle van complete torens vóór uitlevering aan de klant.",
      kind: "warehouse",
      departmentColor: "finished",
      lanes: ["finished", "customer"],
      layout: { x: 17, y: 1, width: 3.5, depth: 3.2, height: 62 }
    },
    {
      id: "dispatch",
      title: "Klant / Uitlevering",
      shortTitle: "Klant",
      description: "Uitlevering van het gereed product aan de klant en administratieve afsluiting.",
      kind: "dispatch",
      departmentColor: "customer",
      lanes: ["archive"],
      layout: { x: 23, y: 12, width: 3.5, depth: 3.2, height: 56 }
    }
  ];

  const ISOMETRIC_DEPARTMENT_CONNECTIONS = [
    { from: "inbound", to: "production_1", kind: "material", fromOffset: { x: 68, y: -30 }, toOffset: { x: -68, y: -30 }, curveOffsetY: -54 },
    { from: "inbound", to: "production_2", kind: "material", fromOffset: { x: 70, y: 0 }, toOffset: { x: -70, y: 0 }, curveOffsetY: -8 },
    { from: "inbound", to: "production_3", kind: "material", fromOffset: { x: 68, y: 30 }, toOffset: { x: -68, y: 30 }, curveOffsetY: 48 },
    { from: "production_1", to: "quality", kind: "material", fromOffset: { x: 68, y: -30 }, toOffset: { x: -68, y: -30 }, curveOffsetY: -54 },
    { from: "production_2", to: "quality", kind: "material", fromOffset: { x: 70, y: 0 }, toOffset: { x: -70, y: 0 }, curveOffsetY: -8 },
    { from: "production_3", to: "quality", kind: "material", fromOffset: { x: 68, y: 30 }, toOffset: { x: -68, y: 30 }, curveOffsetY: 48 },
    { from: "quality", to: "dispatch", kind: "customer", fromOffset: { x: 24, y: 56 }, toOffset: { x: 0, y: -56 }, curveOffsetY: 32 }
  ];

  const FUNCTIONAL_ISOMETRIC_DEPARTMENT_DEFINITIONS = [
    {
      id: "inbound",
      title: "Inkomend Magazijn",
      shortTitle: "Inkomend Magazijn",
      description: "Ontvangst, opslag en seriële uitgifte van grondstoffen aan de functionele productieketen.",
      kind: "warehouse",
      departmentColor: "green",
      lanes: ["raw"],
      layout: { x: 1, y: 17, width: 3.5, depth: 3.2, height: 54 }
    },
    {
      id: "production_1",
      title: "Assemblage 1",
      shortTitle: "Assemblage 1",
      description: "Eerste functionele assemblagestap voor alle torensoorten.",
      kind: "production",
      departmentColor: "purple",
      lanes: ["pd1"],
      layout: { x: 5, y: 13, width: 3.5, depth: 3.2, height: 68 }
    },
    {
      id: "production_2",
      title: "Assemblage 2",
      shortTitle: "Assemblage 2",
      description: "Tweede functionele assemblagestap; ontvangt het halfproduct van Assemblage 1.",
      kind: "production",
      departmentColor: "purple",
      lanes: ["ss1", "pd2"],
      layout: { x: 9, y: 9, width: 3.5, depth: 3.2, height: 74 }
    },
    {
      id: "production_3",
      title: "Assemblage 3",
      shortTitle: "Assemblage 3",
      description: "Derde functionele assemblagestap; maakt het product gereed voor controle.",
      kind: "production",
      departmentColor: "purple",
      lanes: ["ss2", "pd3"],
      layout: { x: 13, y: 5, width: 3.5, depth: 3.2, height: 82 }
    },
    {
      id: "quality",
      title: "Kwaliteitscontrole",
      shortTitle: "Kwaliteitscontrole",
      description: "Controleert het complete product na de drie seriële assemblagestappen.",
      kind: "quality",
      departmentColor: "blue",
      lanes: ["finished", "customer"],
      layout: { x: 17, y: 1, width: 3.5, depth: 3.2, height: 62 }
    },
    {
      id: "dispatch",
      title: "Expeditie",
      shortTitle: "Expeditie",
      description: "Levert het gecontroleerde product uit en sluit de keten administratief af.",
      kind: "dispatch",
      departmentColor: "yellow",
      lanes: ["archive"],
      layout: { x: 23, y: 12, width: 3.5, depth: 3.2, height: 56 }
    }
  ];

  const FUNCTIONAL_ISOMETRIC_DEPARTMENT_CONNECTIONS = [
    { from: "inbound", to: "production_1", kind: "material" },
    { from: "production_1", to: "production_2", kind: "material" },
    { from: "production_2", to: "production_3", kind: "material" },
    { from: "production_3", to: "quality", kind: "material" },
    { from: "quality", to: "dispatch", kind: "customer", fromOffset: { x: 24, y: 56 }, toOffset: { x: 0, y: -56 }, curveOffsetY: 32 }
  ];

  const LOGISTICS_ORGANIZATION_VARIANTS = {
    product: {
      id: "product",
      title: "Productgerichte organisatie · LO-Game 3 en 4",
      departments: ISOMETRIC_DEPARTMENT_DEFINITIONS,
      connections: ISOMETRIC_DEPARTMENT_CONNECTIONS,
      legend: [
        { color: "raw", label: "Grondstoffen" },
        { color: "production-a", label: "Afdeling A" },
        { color: "production-b", label: "Afdeling B" },
        { color: "production-c", label: "Afdeling C" },
        { color: "finished", label: "Gereed Product" }
      ]
    },
    functional: {
      id: "functional",
      title: "Functionele ketenorganisatie · LO-Game 1, 2, 5, 6 en 7",
      departments: FUNCTIONAL_ISOMETRIC_DEPARTMENT_DEFINITIONS,
      connections: FUNCTIONAL_ISOMETRIC_DEPARTMENT_CONNECTIONS,
      legend: [
        { color: "green", label: "Magazijn" },
        { color: "purple", label: "Assemblage" },
        { color: "blue", label: "Kwaliteitscontrole" },
        { color: "yellow", label: "Expeditie" }
      ]
    }
  };

  const GAME_TYPE_PRESETS = Object.freeze({
    entrepreneurial: {
      label: "Entrepreneurial Game",
      description: "Vrije ondernemersvariant met geld, resultaatmeting, vrije prijzen en veel rolvrijheid.",
      config: {
        money: true,
        pnl: true,
        intermediateStock: true,
        opportunityCosts: true,
        roleFreedom: true,
        priceMode: "free",
        logisticsOrganization: "functional",
        productTypeCount: 3
      }
    },
    lo1: {
      label: "LO Game 1",
      description: "Basisvariant met één product, een functionele keten en zonder financiële besturing.",
      config: {
        money: false,
        pnl: false,
        intermediateStock: false,
        opportunityCosts: false,
        roleFreedom: false,
        priceMode: "fixed",
        logisticsOrganization: "functional",
        productTypeCount: 1
      }
    },
    lo2: {
      label: "LO Game 2",
      description: "Meerproductvariant in een functionele keten, nog zonder financiële besturing.",
      config: {
        money: false,
        pnl: false,
        intermediateStock: true,
        opportunityCosts: false,
        roleFreedom: false,
        priceMode: "fixed",
        logisticsOrganization: "functional",
        productTypeCount: 3
      }
    },
    lo3: {
      label: "LO Game 3",
      description: "Productgerichte organisatie met drie torensoorten en zonder geldstroom.",
      config: {
        money: false,
        pnl: false,
        intermediateStock: false,
        opportunityCosts: false,
        roleFreedom: false,
        priceMode: "fixed",
        logisticsOrganization: "product",
        productTypeCount: 3
      }
    },
    lo4: {
      label: "LO Game 4",
      description: "Productgerichte variant met geld, resultaatmeting en opportunity costs.",
      config: {
        money: true,
        pnl: true,
        intermediateStock: false,
        opportunityCosts: true,
        roleFreedom: false,
        priceMode: "fixed",
        logisticsOrganization: "product",
        productTypeCount: 3
      }
    },
    lo5: {
      label: "LO Game 5",
      description: "Financiële variant in de functionele keten, gericht op programmatisch produceren.",
      config: {
        money: true,
        pnl: true,
        intermediateStock: true,
        opportunityCosts: true,
        roleFreedom: false,
        priceMode: "fixed",
        logisticsOrganization: "functional",
        productTypeCount: 3
      }
    },
    lo6: {
      label: "LO Game 6",
      description: "Flexibele functionele keten met negen torensoorten, extra grondplaatkleuren en vrije kleurkeuze per laag.",
      config: {
        money: true,
        pnl: true,
        intermediateStock: true,
        opportunityCosts: true,
        roleFreedom: true,
        multipleColors: true,
        editableColorLayers: ["groundPlate", "layer1", "layer2", "layer3"],
        priceMode: "fixed",
        logisticsOrganization: "functional",
        productTypeCount: 9
      }
    },
    lo7: {
      label: "LO Game 7",
      description: "Uitgebreide flexibele keten met negen torensoorten, vrije prijzen en rolvrijheid.",
      config: {
        money: true,
        pnl: true,
        intermediateStock: true,
        opportunityCosts: true,
        roleFreedom: true,
        priceMode: "free",
        logisticsOrganization: "functional",
        productTypeCount: 9
      }
    },
    lo8: {
      label: "LO Game 8",
      description: "Ketenintegratie en expediteursfunctie (Freight Forwarder) met digitale sturing.",
      config: {
        money: true,
        pnl: true,
        intermediateStock: true,
        opportunityCosts: true,
        roleFreedom: true,
        priceMode: "free",
        logisticsOrganization: "functional",
        productTypeCount: 9
      }
    },
    le_training: {
      label: "LE-Training",
      description: "LEAN Operations management trainingsvariant met resultaatmeting en processturing.",
      config: {
        money: true,
        pnl: true,
        intermediateStock: false,
        opportunityCosts: true,
        roleFreedom: false,
        priceMode: "fixed",
        logisticsOrganization: "product",
        productTypeCount: 3
      }
    }
  });
  const MONEY_PRESET_GAMES = new Set([
    "entrepreneurial", "lo4", "lo5", "lo6", "lo7", "lo8", "le_training"
  ]);
  const REVENUE_BALANCE_PRESET_GAMES = new Set([
    "entrepreneurial", "lo5", "lo6", "lo7", "lo8", "le_training"
  ]);

  function financialDetailDefaults(gameType, money = true) {
    return {
      openingBalance: Boolean(money && MONEY_PRESET_GAMES.has(gameType)),
      revenueBalance: Boolean(money && REVENUE_BALANCE_PRESET_GAMES.has(gameType))
    };
  }

  function applyLogisticsProcessContract(gameType, config = state.config) {
    const processes = window.LogisticsProcess?.normalizeProcesses(
      config.productionProcesses,
      gameType
    );
    const profile = window.LogisticsProcess?.profileForProcesses(processes, gameType);
    if (!profile) return null;
    config.productionProcesses = processes;
    config.logisticsOrganization = profile.logisticsOrganization;
    if (processes.length === 1 && processes[0] === "parallel") {
      config.intermediateStock = false;
    }
    return profile;
  }

  const LOGISTICS_TUTORIAL_REQUIREMENTS = Object.freeze({
    blue_8: 2,
    yellow_4: 1,
    green_4: 1
  });

  const FINANCIAL_TUTORIAL_DISTRACTORS = Object.freeze([
    { partId: "blue_4", color: "blue", width: 2, depth: 2, label: "blauw 2×2-blok" },
    { partId: "yellow_8", color: "yellow", width: 4, depth: 2, label: "geel 2×4-blok" },
    { partId: "red_8", color: "red", width: 4, depth: 2, label: "rood 2×4-blok" },
    { partId: "white_4", color: "white", width: 2, depth: 2, label: "wit 2×2-blok" }
  ]);

  const LOGISTICS_TUTORIAL_DEPARTMENTS = [
    {
      id: "tutorial_warehouse_a",
      title: "Grondstoffenmagazijn A",
      shortTitle: "Magazijn A · Blauw",
      description: "Stelling A bevat de blauwe 2×4-bouwstenen voor de ophaalopdracht.",
      kind: "warehouse",
      departmentColor: "tutorial-blue",
      materialId: "blue_8",
      openRoof: true,
      stockPart: { color: "blue", width: 4, depth: 2, label: "blauw 2×4-blok" },
      distractorParts: [
        { id: "blue_4", color: "blue", width: 2, depth: 2, label: "blauw 2×2-blok" }
      ],
      layout: { x: 1, y: 4, width: 3.5, depth: 3.2, height: 58 }
    },
    {
      id: "tutorial_warehouse_b",
      title: "Grondstoffenmagazijn B",
      shortTitle: "Magazijn B · Geel",
      description: "Stelling B bevat het gele 2×2-blok voor Toren B.",
      kind: "warehouse",
      departmentColor: "tutorial-yellow",
      materialId: "yellow_4",
      openRoof: true,
      stockPart: { color: "yellow", width: 2, depth: 2, label: "geel 2×2-blok" },
      distractorParts: [
        { id: "yellow_8", color: "yellow", width: 4, depth: 2, label: "geel 2×4-blok" }
      ],
      layout: { x: 1, y: 10, width: 3.5, depth: 3.2, height: 64 }
    },
    {
      id: "tutorial_warehouse_c",
      title: "Grondstoffenmagazijn C",
      shortTitle: "Magazijn C · Groen",
      description: "Stelling C bevat het groene 2×2-topblok voor Toren B.",
      kind: "warehouse",
      departmentColor: "green",
      materialId: "green_4",
      openRoof: true,
      stockPart: { color: "green", width: 2, depth: 2, label: "groen 2×2-blok" },
      distractorParts: [
        { id: "green_8_wrong", color: "green", width: 4, depth: 2, label: "groen 2×4-blok" }
      ],
      layout: { x: 1, y: 16, width: 3.5, depth: 3.2, height: 70 }
    },
    {
      id: "tutorial_player_stock",
      title: "Productieafdeling B · materiaalontvangst",
      shortTitle: "Productie B",
      description: "Sleep de juiste blokken vanuit Magazijn Grondstoffen naar Productieafdeling B.",
      kind: "production",
      departmentColor: "tutorial-transit",
      openRoof: true,
      showDropLabel: false,
      emptyLabel: "ontvangstvak leeg",
      layout: { x: 8, y: 10, width: 3.8, depth: 3.4, height: 48 }
    },
    {
      id: "tutorial_assembly",
      title: "Bouwplek Productieafdeling B",
      shortTitle: "Bouwplek B",
      description: "De bouwplek blijft vergrendeld totdat Productieafdeling B de volledige materiaalset heeft ontvangen.",
      kind: "production",
      departmentColor: "production-a",
      layout: { x: 15, y: 10, width: 4, depth: 3.6, height: 76 }
    }
  ];

  const LOGISTICS_TUTORIAL_CONNECTIONS = [
    { from: "tutorial_warehouse_a", to: "tutorial_player_stock", kind: "material", curveOffsetY: -36 },
    { from: "tutorial_warehouse_b", to: "tutorial_player_stock", kind: "material" },
    { from: "tutorial_warehouse_c", to: "tutorial_player_stock", kind: "material", curveOffsetY: 36 },
    { from: "tutorial_player_stock", to: "tutorial_assembly", kind: "material", locked: true }
  ];

  const INTERNAL_LOGISTICS_TUTORIAL_DEPARTMENTS = [
    {
      id: "tutorial_production",
      title: "Productieafdeling B",
      shortTitle: "Productie B",
      description: "Productieafdeling B heeft zelfstandig de complete Toren B gebouwd.",
      kind: "production",
      departmentColor: "production-b",
      openRoof: true,
      emptyLabel: "productievak leeg",
      layout: { x: 4, y: 12, width: 4.2, depth: 3.8, height: 78 }
    },
    {
      id: "tutorial_next_department",
      title: "Magazijn Gereed Product",
      shortTitle: "Gereed Product",
      description: "Dit magazijn ontvangt de complete Toren B vanuit Productieafdeling B.",
      kind: "warehouse",
      departmentColor: "finished",
      openRoof: true,
      showDropLabel: false,
      emptyLabel: "wacht op Toren B",
      layout: { x: 15, y: 5, width: 4.2, depth: 3.8, height: 66 }
    }
  ];

  const INTERNAL_LOGISTICS_TUTORIAL_CONNECTIONS = [
    {
      from: "tutorial_production",
      to: "tutorial_next_department",
      kind: "material",
      highlight: true
    }
  ];

  const FINANCIAL_TUTORIAL_DEPARTMENTS = [
    {
      id: "tutorial_finance_warehouse",
      title: "Magazijn Grondstoffen",
      shortTitle: "Grondstoffen",
      description: "Hier worden de onderdelen tegen de actuele interne verrekenprijs uitgegeven.",
      kind: "warehouse",
      departmentColor: "raw",
      openRoof: true,
      compactStock: true,
      dragTargetLabel: "Productie B",
      emptyLabel: "materialen uitgegeven",
      layout: { x: 3, y: 13, width: 4.1, depth: 3.7, height: 70 }
    },
    {
      id: "tutorial_finance_production_a",
      title: "Productieafdeling A",
      shortTitle: "Productie A",
      description: "Parallelle afdeling voor complete Toren A-orders.",
      kind: "production",
      departmentColor: "production",
      openRoof: true,
      emptyLabel: "geen Toren A-order",
      layout: { x: 10, y: 16, width: 4.2, depth: 3.4, height: 66 }
    },
    {
      id: "tutorial_finance_production_b",
      title: "Productieafdeling B",
      shortTitle: "Productie B",
      description: "Deze parallelle afdeling bouwt zelfstandig de complete Toren B.",
      kind: "production",
      departmentColor: "production",
      openRoof: true,
      showDropLabel: false,
      emptyLabel: "wacht op onderdelen",
      layout: { x: 10, y: 10, width: 4.2, depth: 3.4, height: 68 }
    },
    {
      id: "tutorial_finance_production_c",
      title: "Productieafdeling C",
      shortTitle: "Productie C",
      description: "Parallelle afdeling voor complete Toren C-orders.",
      kind: "production",
      departmentColor: "production",
      openRoof: true,
      emptyLabel: "geen Toren C-order",
      layout: { x: 10, y: 4, width: 4.2, depth: 3.4, height: 66 }
    },
    {
      id: "tutorial_finance_finished",
      title: "Magazijn Gereed Product",
      shortTitle: "Gereed Product",
      description: "Ontvang hier de complete Toren B vanuit de parallelle productieafdeling.",
      kind: "warehouse",
      departmentColor: "finished",
      openRoof: true,
      showDropLabel: false,
      emptyLabel: "wacht op complete toren",
      layout: { x: 17, y: 10, width: 4.2, depth: 3.8, height: 68 }
    },
    {
      id: "tutorial_finance_dispatch",
      title: "Expeditie",
      shortTitle: "Expeditie",
      description: "Lever Toren B hier aan de klant om de verkoopopbrengst te ontvangen.",
      kind: "dispatch",
      departmentColor: "yellow",
      openRoof: true,
      showDropLabel: false,
      emptyLabel: "wacht op levering",
      layout: { x: 23, y: 5, width: 4.2, depth: 3.8, height: 62 }
    }
  ];

  const FINANCIAL_TUTORIAL_CONNECTIONS = [
    {
      from: "tutorial_finance_warehouse",
      to: "tutorial_finance_production_a",
      kind: "material",
      locked: true
    },
    {
      from: "tutorial_finance_warehouse",
      to: "tutorial_finance_production_b",
      kind: "material",
      highlight: true
    },
    {
      from: "tutorial_finance_warehouse",
      to: "tutorial_finance_production_c",
      kind: "material",
      locked: true
    },
    {
      from: "tutorial_finance_production_a",
      to: "tutorial_finance_finished",
      kind: "material",
      locked: true
    },
    {
      from: "tutorial_finance_production_b",
      to: "tutorial_finance_finished",
      kind: "material",
      locked: true
    },
    {
      from: "tutorial_finance_production_c",
      to: "tutorial_finance_finished",
      kind: "material",
      locked: true
    },
    {
      from: "tutorial_finance_finished",
      to: "tutorial_finance_dispatch",
      kind: "customer",
      locked: true
    }
  ];

  const state = {
    sessionId: "",
    clockMinutes: 600,
    orders: [],
    selectedOrderId: null,
    orderCounter: 7,
    inventory: {},
    ss1: {},
    ss2: {},
    finishedGoods: {},
    purchaseCost: 0,
    opportunityCost: 0,
    financial: createFinancialState(),
    assignedRoleId: null,
    gameSessionRunning: false,
    gameSessionDifficulty: "normal",
    customProducts: loadCustomProducts(),
    appView: "player",
    managerTab: "session",
    attention: {
      mode: "task",
      timer: null,
      autoOpenedProcess: false
    },
    interactionBuffer: [],
    contractEventBuffer: [],
    tutorialDismissed: false,
    tutorialCompleted: false,
    tutorialPaused: false,
    tutorialStage: "builder",
    selectedLogisticsDepartmentId: "inbound",
    logisticsTutorial: {
      active: false,
      phase: "locked",
      warehouseStock: { blue_8: 0, yellow_4: 0, green_4: 0 },
      playerStock: { blue_8: 0, yellow_4: 0, green_4: 0 },
      assemblyStock: { blue_8: 0, yellow_4: 0, green_4: 0 },
      semiFinished: { production: 0, nextDepartment: 0 },
      finance: {
        enabled: false,
        moneyEnabled: true,
        pnlEnabled: true,
        openingBalance: 0,
        balance: 0,
        purchaseCost: 0,
        revenue: 0,
        margin: 0,
        picked: { blue_8: 0, yellow_4: 0, green_4: 0 },
        delivered: false,
        mutation: null,
        flash: ""
      },
      feedback: ""
    },
    config: {
      playMode: "physical",
      gameType: "lo4",
      money: true,
      pnl: true,
      openingBalance: true,
      revenueBalance: false,
      intermediateStock: true,
      opportunityCosts: true,
      roleFreedom: false,
      multipleColors: false,
      editableColorLayers: [],
      customerOrderMode: "required",
      priceMode: "fixed",
      productionProcesses: ["parallel"],
      logisticsOrganization: "product",
      productTypeCount: MIN_PRODUCT_TYPES,
      visibleLogisticsDepartments: ISOMETRIC_DEPARTMENT_DEFINITIONS.map(department => department.id),
      processView: "graph"
    }
  };

  const els = {
    openOrdersValue: document.getElementById("openOrdersValue"),
    throughputValue: document.getElementById("throughputValue"),
    cashValue: document.getElementById("cashValue"),
    profitValue: document.getElementById("profitValue"),
    lateValue: document.getElementById("lateValue"),
    clockValue: document.getElementById("clockValue"),
    eventCountValue: document.getElementById("eventCountValue"),
    productSelect: document.getElementById("productSelect"),
    quantityInput: document.getElementById("quantityInput"),
    priceInput: document.getElementById("priceInput"),
    dueInput: document.getElementById("dueInput"),
    orderForm: document.getElementById("orderForm"),
    orderPreview: document.getElementById("orderPreview"),
    legoBuilderMount: document.getElementById("legoBuilderMount"),
    laneGrid: document.getElementById("laneGrid"),
    inventoryGrid: document.getElementById("inventoryGrid"),
    stockSignal: document.getElementById("stockSignal"),
    eventLog: document.getElementById("eventLog"),
    dataModelButton: document.getElementById("dataModelButton"),
    dataModelPanel: document.getElementById("dataModelPanel"),
    dataModelGrid: document.getElementById("dataModelGrid"),
    dataModelCount: document.getElementById("dataModelCount"),
    processGraphViewButton: document.getElementById("processGraphViewButton"),
    processSequenceViewButton: document.getElementById("processSequenceViewButton"),
    processSwimlaneViewButton: document.getElementById("processSwimlaneViewButton"),
    processIsometricViewButton: document.getElementById("processIsometricViewButton"),
    exportButton: document.getElementById("exportButton"),
    resetButton: document.getElementById("resetButton"),
    tutorialExitButton: document.getElementById("tutorialExitButton"),
    tutorialResumeButton: document.getElementById("tutorialResumeButton"),
    gameTypeSelect: document.getElementById("gameTypeSelect"),
    gameTypeDescription: document.getElementById("gameTypeDescription"),
    moneyToggle: document.getElementById("moneyToggle"),
    openingBalanceToggle: document.getElementById("openingBalanceToggle"),
    revenueBalanceToggle: document.getElementById("revenueBalanceToggle"),
    pnlToggle: document.getElementById("pnlToggle"),
    intermediateToggle: document.getElementById("intermediateToggle"),
    opportunityToggle: document.getElementById("opportunityToggle"),
    roleFreedomToggle: document.getElementById("roleFreedomToggle"),
    priceModeSelect: document.getElementById("priceModeSelect"),
    parallelProductionToggle: document.getElementById("parallelProductionToggle"),
    sequentialProductionToggle: document.getElementById("sequentialProductionToggle"),
    hybridProductionTooltip: document.getElementById("hybridProductionTooltip"),
    productTypeCountInput: document.getElementById("productTypeCountInput"),
    playerViewButton: document.getElementById("playerViewButton"),
    managerViewButton: document.getElementById("managerViewButton"),
    playerWorkbench: document.getElementById("playerWorkbench"),
    managerWorkbench: document.getElementById("managerWorkbench"),
    logisticsGameMount: document.getElementById("logisticsGameMount"),
    towerEditorMount: document.getElementById("towerEditorMount"),
    playerTaskPanel: document.getElementById("playerTaskPanel"),
    playerWaitingPanel: document.getElementById("playerWaitingPanel"),
    playerRoleToken: document.getElementById("playerRoleToken"),
    playerFormTitle: document.getElementById("playerFormTitle"),
    playerFormStatus: document.getElementById("playerFormStatus"),
    playerQueueSummary: document.getElementById("playerQueueSummary"),
    playerFormMount: document.getElementById("playerFormMount"),
    playerFormConfirmation: document.getElementById("playerFormConfirmation"),
    playerFormConfirmInput: document.getElementById("playerFormConfirmInput"),
    playerCompleteActionButton: document.getElementById("playerCompleteActionButton"),
    playerWaitingMessage: document.getElementById("playerWaitingMessage"),
    playerWaitingClock: document.getElementById("playerWaitingClock"),
    playerProcessMount: document.getElementById("playerProcessMount"),
    attentionModeBanner: document.getElementById("attentionModeBanner"),
    attentionModeIcon: document.getElementById("attentionModeIcon"),
    attentionModeTitle: document.getElementById("attentionModeTitle"),
    attentionModeMessage: document.getElementById("attentionModeMessage")
  };

  const appDisplayMode = window.matchMedia("(display-mode: standalone)");
  const iosStandalone = Boolean(window.navigator.standalone);
  document.documentElement.classList.toggle("standalone-app", appDisplayMode.matches || iosStandalone);

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function roleById(roleId) {
    return ROLES.find(role => role.id === roleId) || ROLES[0];
  }

  function partById(partId) {
    return PARTS.find(part => part.id === partId);
  }

  function productIds() {
    return Object.keys(PRODUCTS);
  }

  function emptyProductStock() {
    return Object.fromEntries(productIds().map(productId => [productId, 0]));
  }

  function partIdForColor(color, wide = false) {
    const preferred = wide ? `${color}_8` : `${color}_4`;
    if (partById(preferred)) return preferred;
    return `${color}_4`;
  }

  function mergeRecipe(...recipes) {
    return recipes.reduce((merged, recipe) => {
      Object.entries(recipe).forEach(([partId, amount]) => {
        merged[partId] = (merged[partId] || 0) + amount;
      });
      return merged;
    }, {});
  }

  function makeTowerVisual(blueprint) {
    const lower = partIdForColor(blueprint.lower);
    const middle = blueprint.middleSize === "2x2"
      ? partIdForColor(blueprint.middle)
      : partIdForColor(blueprint.middle, true);
    return [
      [partIdForColor(blueprint.upper)],
      [middle],
      [lower, lower],
      ["base_green"]
    ];
  }

  function makeGeneratedProduct(index) {
    const id = PRODUCT_IDS[index];
    const blueprint = TOWER_BLUEPRINTS[index];
    const lower = partIdForColor(blueprint.lower);
    const middle = blueprint.middleSize === "2x2"
      ? partIdForColor(blueprint.middle)
      : partIdForColor(blueprint.middle, true);
    const upper = partIdForColor(blueprint.upper);
    const stages = [
      { department: 1, output: "ss1", recipe: mergeRecipe({ base_green: 1 }, { [lower]: 2 }) },
      { department: 2, input: "ss1", output: "ss2", recipe: { [middle]: 1 } },
      { department: 3, input: "ss2", output: "finished", recipe: { [upper]: 1 } }
    ];
    const materialCost = stages.reduce((sum, stage) => {
      return sum + Object.entries(stage.recipe).reduce((inner, [partId, amount]) => {
        return inner + partById(partId).price * amount;
      }, 0);
    }, 0);
    return {
      id,
      name: `Toren ${id}`,
      towerBlueprint: blueprint,
      price: materialCost * 3 + 25 + index * 3,
      towerSequence: stages.flatMap(stage => (
        Object.entries(stage.recipe).flatMap(([partId, amount]) => Array(amount).fill(partId))
      )).filter(partId => partId !== "base_green"),
      stages,
      visual: makeTowerVisual(blueprint)
    };
  }

  function rebuildProducts(count = MIN_PRODUCT_TYPES) {
    const productCount = Math.max(MIN_PRODUCT_TYPES, Math.min(MAX_PRODUCT_TYPES, Number(count) || MIN_PRODUCT_TYPES));
    const standardProducts = Array.from({ length: productCount }, (_, index) => {
        const id = PRODUCT_IDS[index];
        return BASE_PRODUCTS[id] || makeGeneratedProduct(index);
      });
    PRODUCTS = Object.fromEntries(
      [...standardProducts, ...state.customProducts].map(product => [product.id, product])
    );
  }

  function loadCustomProducts() {
    try {
      const stored = JSON.parse(localStorage.getItem(CUSTOM_PRODUCTS_STORAGE) || "[]");
      if (!Array.isArray(stored)) return [];
      return stored.flatMap(item => {
        try {
          return [makeCustomProduct(item, item.id)];
        } catch {
          return [];
        }
      });
    } catch {
      return [];
    }
  }

  function saveCustomProducts() {
    localStorage.setItem(CUSTOM_PRODUCTS_STORAGE, JSON.stringify(
      state.customProducts.map(product => ({
        id: product.id,
        name: product.name,
        price: product.price,
        towerSequence: product.towerSequence,
        groundPlate: { ...product.groundPlate }
      }))
    ));
  }

  function recipeFromSequence(sequence) {
    return sequence.reduce((recipe, partId) => {
      recipe[partId] = (recipe[partId] || 0) + 1;
      return recipe;
    }, {});
  }

  function makeCustomProduct(draft, existingId = null) {
    const sequence = Array.isArray(draft?.towerSequence)
      ? draft.towerSequence.filter(partId => partId !== "base_green" && partById(partId))
      : [];
    const firstPart = partById(sequence[0]);
    const foundationCount = firstPart?.width === "narrow" ? 4 : 2;
    const foundationUsesOneFormat = sequence
      .slice(0, foundationCount)
      .every(partId => partById(partId)?.width === firstPart?.width);
    if (sequence.length !== foundationCount + 2 || !foundationUsesOneFormat) {
      throw new Error(
        "Een eigen toren heeft een volle eerste laag en is precies 3 lagen hoog."
      );
    }
    const name = String(draft.name || "").trim().slice(0, 48);
    if (!name) throw new Error("Geef de toren een productnaam.");
    const price = Math.max(1, Math.min(9999, Math.round(Number(draft.price) || 0)));
    const requestedGroundPlateColor = String(draft.groundPlate?.color || "green");
    const groundPlate = {
      color: GROUND_PLATE_COLORS.has(requestedGroundPlateColor)
        ? requestedGroundPlateColor
        : "green",
      width: 6,
      depth: 6
    };
    const firstBreak = Math.ceil(sequence.length / 3);
    const secondBreak = Math.ceil(sequence.length * 2 / 3);
    const stageSequences = [
      sequence.slice(0, firstBreak),
      sequence.slice(firstBreak, secondBreak),
      sequence.slice(secondBreak)
    ];
    const firstRecipe = { base_green: 1, ...recipeFromSequence(stageSequences[0]) };
    const id = existingId || `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    return {
      id,
      name,
      price,
      custom: true,
      towerSequence: sequence,
      groundPlate,
      stages: [
        { department: 1, output: "ss1", recipe: firstRecipe },
        { department: 2, input: "ss1", output: "ss2", recipe: recipeFromSequence(stageSequences[1]) },
        { department: 3, input: "ss2", output: "finished", recipe: recipeFromSequence(stageSequences[2]) }
      ],
      visual: [
        ...sequence.slice().reverse().map(partId => [partId]),
        ["base_green"]
      ]
    };
  }

  function registerCustomProduct(draft) {
    let product;
    try {
      product = makeCustomProduct(draft);
    } catch (error) {
      window.alert(error.message);
      return null;
    }
    state.customProducts.push(product);
    saveCustomProducts();
    PRODUCTS[product.id] = product;
    window.LegoBuilder?.registerProduct(product);
    state.ss1[product.id] = 0;
    state.ss2[product.id] = 0;
    state.finishedGoods[product.id] = 0;
    productOptions();
    els.productSelect.value = product.id;
    window.LegoBuilder?.setProduct(product.id);
    dispatchInteraction({
      actionType: "add_product_to_assortment",
      learningObjectID: "tower_editor",
      result: "added",
      objectRole: "product_configuration",
      role: "Game Master",
      productId: product.id,
      productName: product.name,
      towerSequence: [...product.towerSequence],
      groundPlate: { ...product.groundPlate }
    });
    renderAll();
    return product;
  }

  function removeCustomProduct(productId) {
    const product = state.customProducts.find(item => item.id === productId);
    if (!product) return false;
    if (state.orders.some(order => !order.done && order.productId === productId)) {
      window.alert("Deze toren hoort bij een actieve order en kan pas daarna worden verwijderd.");
      return false;
    }
    state.customProducts = state.customProducts.filter(item => item.id !== productId);
    saveCustomProducts();
    delete PRODUCTS[productId];
    delete state.ss1[productId];
    delete state.ss2[productId];
    delete state.finishedGoods[productId];
    window.LegoBuilder?.unregisterProduct(productId);
    productOptions();
    if (!PRODUCTS[els.productSelect.value]) {
      els.productSelect.value = Object.keys(PRODUCTS)[0];
    }
    dispatchInteraction({
      actionType: "remove_product_from_assortment",
      learningObjectID: "tower_editor",
      result: "removed",
      objectRole: "product_configuration",
      role: "Game Master",
      productId,
      productName: product.name
    });
    renderAll();
    return true;
  }

  function productById(productId) {
    return PRODUCTS[productId] || Object.values(PRODUCTS)[0];
  }

  function formatClock(minutes) {
    const hours = Math.floor(minutes / 60) % 24;
    const mins = minutes % 60;
    return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
  }

  function formatMoney(value) {
    const sign = value < 0 ? "-" : "";
    return `${sign}EUR ${Math.abs(Math.round(value))}`;
  }

  function recipeForStage(productId, stageNumber, quantity) {
    const stage = productById(productId).stages[stageNumber - 1];
    return Object.fromEntries(
      Object.entries(stage.recipe).map(([partId, amount]) => [partId, amount * quantity])
    );
  }

  function recipeCost(productId, quantity) {
    return productById(productId).stages.reduce((sum, stage) => {
      return sum + Object.entries(stage.recipe).reduce((inner, [partId, amount]) => {
        return inner + partById(partId).price * amount * quantity;
      }, 0);
    }, 0);
  }

  function fullProductRecipe(productId, quantity) {
    const product = productById(productId);
    return product.stages.reduce((recipe, stage) => {
      Object.entries(stage.recipe).forEach(([partId, amount]) => {
        recipe[partId] = (recipe[partId] || 0) + amount * quantity;
      });
      return recipe;
    }, {});
  }

  function recipeForOrderStep(order, step) {
    return step.fullProductMaterials
      ? fullProductRecipe(order.productId, order.quantity)
      : recipeForStage(order.productId, step.materialStage, order.quantity);
  }

  function materialValue(recipe) {
    return Object.entries(recipe).reduce(
      (sum, [partId, amount]) => sum + partById(partId).price * amount,
      0
    );
  }

  function selectedOrder() {
    return state.orders.find(order => order.id === state.selectedOrderId) || null;
  }

  function stepRole(order) {
    if (!order) return null;
    const step = currentStep(order);
    return roleById(step.roleId === "customer1" ? order.customerRoleId : step.roleId);
  }

  function playerAssignment() {
    const openOrders = activeOrders();
    if (!openOrders.length) return null;
    const selected = selectedOrder();
    if (!state.assignedRoleId) return selected && !selected.done ? selected : openOrders[0];
    if (selected && !selected.done && stepRole(selected)?.id === state.assignedRoleId) return selected;
    return openOrders.find(order => stepRole(order)?.id === state.assignedRoleId) || null;
  }

  function syncWorkbenchVisibility(view = state.appView) {
    const nextView = view === "manager" ? "manager" : "player";
    const tutorialFocused = document.body.classList.contains("tutorial-focus");
    if (els.playerWorkbench) {
      els.playerWorkbench.hidden = tutorialFocused || nextView !== "player";
      els.playerWorkbench.style.display = "";
    }
    if (els.managerWorkbench) {
      els.managerWorkbench.hidden = tutorialFocused ? false : nextView !== "manager";
      els.managerWorkbench.style.display = "";
    }
  }

  function setAppView(view, dispatch = true) {
    const nextView = view === "manager" ? "manager" : "player";
    state.appView = nextView;
    document.body.dataset.appView = nextView;
    if (nextView === "manager") {
      document.body.classList.remove("tutorial-focus", "tutorial-stage-builder", "tutorial-stage-logistics");
      if (els.tutorialExitButton) els.tutorialExitButton.hidden = true;
    }
    syncWorkbenchVisibility(nextView);
    document.querySelectorAll("button[data-app-view], a[data-app-view]").forEach(button => {
      if (!button) return;
      const active = button.dataset.appView === nextView;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    sessionStorage.setItem("learngame.om.appView", nextView);
    if (nextView === "player") renderPlayerView();
    if (nextView === "manager") setManagerTab(state.managerTab, false);
    if (dispatch) {
      dispatchInteraction({
        actionType: "change_game_view",
        result: nextView,
        objectRole: "navigation",
        role: nextView === "manager" ? "Game Master" : "Speler"
      });
      renderMetrics();
      renderEvents();
    }
  }

  function setManagerTab(tab, dispatch = true) {
    const allowed = new Set(["session", "tower-editor", "inventory", "events", "process"]);
    const nextTab = allowed.has(tab) ? tab : "session";
    state.managerTab = nextTab;
    document.querySelectorAll("[data-manager-tab]").forEach(button => {
      const active = button.dataset.managerTab === nextTab;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-selected", String(active));
      button.tabIndex = active ? 0 : -1;
    });
    document.querySelectorAll("[data-manager-panel]").forEach(panel => {
      const active = panel.dataset.managerPanel === nextTab;
      panel.classList.toggle("is-active", active);
      panel.hidden = !active;
      panel.style.display = "";
    });
    sessionStorage.setItem("learngame.om.managerTab", nextTab);
    if (nextTab === "process") renderDataModel(true);
    if (dispatch) {
      dispatchInteraction({
        actionType: "change_manager_dashboard_tab",
        result: nextTab,
        objectRole: "navigation",
        role: "Game Master"
      });
    }
  }

  function activeOrders() {
    return state.orders.filter(order => !order.done);
  }

  function currentStep(order) {
    const processSteps = order.processSteps || processStepsForOrder(
      order.productId,
      order.productionRoute || "sequential"
    );
    return processSteps[order.stepIndex] || processSteps[processSteps.length - 1];
  }

  function resetInventory() {
    state.inventory = {};
    PARTS.forEach(part => {
      state.inventory[part.id] = part.stock;
    });
  }

  function dispatchInteraction(event = {}) {
    const learningObjectID = event.learningObjectID || event.stage || event.screen || event.partId || event.productType || LEARNING_OBJECT_ID;
    const record = {
      personID: event.personID || PERSON_ID,
      learningObjectID,
      learningBoxID: event.learningBoxID || LEARNING_OBJECT_ID,
      sessionID: state.sessionId,
      timestamp: event.timestamp || new Date().toISOString(),
      simulatedMinute: state.clockMinutes,
      version: "ICG2-v2",
      actionType: event.actionType || "interaction",
      ...event
    };
    state.interactionBuffer.push(record);
    const contractEvent = toInteractionEventV1(record, state.interactionBuffer.length);
    state.contractEventBuffer.push(contractEvent);
    if (window.parent !== window && !window.__LEERPRET_PREVIEW_BRIDGE__) {
      const targetOrigin = document.referrer ? new URL(document.referrer).origin : "*";
      window.parent.postMessage({
        type: "leerpret-preview-events",
        events: [record],
        contract_events: [contractEvent],
        total: state.interactionBuffer.length
      }, targetOrigin);
    }
    return record;
  }

  function toInteractionEventV1(record, sequence) {
    const knownKeys = new Set([
      "personID", "learningObjectID", "learningBoxID", "sessionID", "timestamp",
      "actionType", "result", "objectRole", "stage", "strategy", "durationMs"
    ]);
    const attributes = Object.fromEntries(
      Object.entries(record).filter(([key, value]) => !knownKeys.has(key) && value !== undefined)
    );
    const actionType = String(record.actionType || "interaction")
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, "_");

    return {
      specversion: "1.0",
      type: `nl.leerpret.interaction.${actionType}.v1`,
      id: `${record.sessionID || state.sessionId}:${String(sequence).padStart(6, "0")}`,
      source: "urn:leerpret:leerbox:learngame-operations-management",
      time: record.timestamp,
      subject: String(record.learningObjectID),
      datacontenttype: "application/json",
      correlation_id: record.sessionID || state.sessionId,
      causation_id: null,
      privacy: {
        classification: "pseudonymous",
        actor_id_kind: "pseudonym",
        retention_class: "research"
      },
      data: {
        event_version: 1,
        leerbox_id: record.learningBoxID,
        leerbox_version: "ICG2-v2",
        session_id: record.sessionID || state.sessionId,
        actor_id: record.personID || null,
        learning_object_id: String(record.learningObjectID),
        action_type: record.actionType,
        result: record.result || null,
        object_role: record.objectRole || null,
        stage: record.stage === undefined || record.stage === null ? null : String(record.stage),
        strategy: record.strategy || null,
        duration_ms: Number.isInteger(record.durationMs) && record.durationMs >= 0 ? record.durationMs : null,
        markers: [],
        attributes
      }
    };
  }

  function addClock(minutes) {
    state.clockMinutes += Math.max(0, Math.round(minutes));
  }

  function setAttentionBanner(title, message, icon = "◎", alert = false) {
    if (!els.attentionModeBanner) return;
    els.attentionModeTitle.textContent = title;
    els.attentionModeMessage.textContent = message;
    els.attentionModeIcon.textContent = icon;
    els.attentionModeBanner.hidden = false;
    els.attentionModeBanner.classList.toggle("is-alert", alert);
  }

  function showAssignment(order) {
    if (state.attention.timer) {
      clearTimeout(state.attention.timer);
      state.attention.timer = null;
    }
    state.attention.mode = "task";
    document.body.classList.remove("system-perspective");
    if (state.attention.autoOpenedProcess) {
      els.dataModelPanel.classList.remove("visible");
      els.dataModelGrid.innerHTML = "";
      state.attention.autoOpenedProcess = false;
    }
    if (!order || order.done) return;
    const step = currentStep(order);
    const roleId = step.roleId === "customer1" ? order.customerRoleId : step.roleId;
    const role = roleById(roleId);
    setAttentionBanner(
      "Nieuw formulier beschikbaar",
      `${role.token} · ${step.action}: ${step.label}`,
      "!",
      true
    );
    dispatchInteraction({
      actionType: "assignment_attention_alert",
      orderId: order.id,
      stage: step.id,
      role: role.title,
      roleId: role.id,
      result: "shown",
      objectRole: "attention"
    });
    setTimeout(() => {
      if (state.attention.mode === "task" && els.attentionModeBanner) {
        els.attentionModeBanner.hidden = true;
      }
    }, 4200);
    requestAnimationFrame(() => {
      els.playerTaskPanel?.scrollIntoView({ block: "center", behavior: "smooth" });
    });
    renderPlayerView();
  }

  function enterSystemPerspective(order) {
    if (document.body.classList.contains("tutorial-focus")) return;
    state.attention.mode = "system";
    state.config.processView = "isometric";
    document.body.classList.add("system-perspective");
    els.dataModelPanel.classList.add("visible");
    state.attention.autoOpenedProcess = true;
    setAttentionBanner(
      "Wachttijd = kijktijd",
      "Je formulier is verwerkt. Volg live hoe goederen en informatie door de hele keten bewegen.",
      "◎",
      false
    );
    renderDataModel(true);
    renderPlayerView();
    dispatchInteraction({
      actionType: "enter_system_perspective",
      orderId: order?.id,
      result: "observing",
      objectRole: "orientation",
      role: "Lerende"
    });
    if (state.attention.timer) clearTimeout(state.attention.timer);
    if (order && !order.done) {
      state.attention.timer = setTimeout(() => {
        state.attention.timer = null;
        showAssignment(order);
        renderAll();
      }, 2400);
    }
  }

  function makeOrder(productId, quantity, unitPrice, dueMinutes) {
    state.orderCounter += 1;
    const customerNumber = ((state.orderCounter - 1) % 4) + 1;
    const customerRoleId = `customer${customerNumber}`;
    const productionRoute = productionRouteForOrder(state.orderCounter);
    const productionDepartment = productionRoute === "parallel"
      ? parallelDepartmentForProduct(productId)
      : null;
    const order = {
      id: `order-${String(state.orderCounter).padStart(3, "0")}`,
      productId,
      quantity,
      unitPrice,
      customerRoleId,
      acceptedAt: state.clockMinutes,
      dueAt: state.clockMinutes + dueMinutes,
      productionRoute,
      productionDepartment,
      processSteps: processStepsForOrder(productId, productionRoute).map(step => ({ ...step })),
      stepIndex: 0,
      stageMaterialsIssued: { 1: false, 2: false, 3: false },
      status: "active",
      lastIssue: "",
      done: false,
      late: false,
      priority: false,
      materialCost: recipeCost(productId, quantity),
      conversionCost: 0,
      bookedMaterialCost: 0,
      stageFinancialCost: { 1: 0, 2: 0, 3: 0 },
      builtQuantity: 0,
      builtTowers: [],
      buildValidated: false,
      history: []
    };
    if (productionRoute === "parallel" && state.config.opportunityCosts) {
      const unusedCapacityCost = quantity * 2;
      PRODUCTION_DEPARTMENT_IDS
        .filter(departmentId => departmentId !== productionDepartment)
        .forEach(departmentId => {
          state.financial.opportunityCostByDepartment[departmentId] += unusedCapacityCost;
          state.opportunityCost += unusedCapacityCost;
        });
    }
    state.orders.push(order);
    state.selectedOrderId = order.id;
    window.LegoBuilder?.setProduct(productId);
    dispatchInteraction({
      actionType: "customer_order_request",
      orderId: order.id,
      productType: productId,
      quantity,
      unitPrice,
      totalAmount: unitPrice * quantity,
      dueMinutes,
      role: roleById(customerRoleId).title,
      roleId: customerRoleId,
      result: "success",
      objectRole: "order_flow",
      productionRoute,
      productionDepartment,
      screen: "Ik wil een order plaatsen"
    });
    addClock(1);
    renderAll();
    showAssignment(order);
  }

  function missingMaterials(order, step) {
    const recipe = recipeForOrderStep(order, step);
    return Object.entries(recipe)
      .map(([partId, amount]) => ({
        partId,
        amount,
        available: state.inventory[partId] || 0,
        missing: Math.max(0, amount - (state.inventory[partId] || 0))
      }))
      .filter(item => item.missing > 0);
  }

  function blockOrder(order, step, role, reason, actionType = "blocked") {
    order.status = "blocked";
    order.lastIssue = reason;
    addClock(1);
    dispatchInteraction({
      actionType,
      orderId: order.id,
      productType: order.productId,
      quantity: order.quantity,
      role: role.title,
      roleId: role.id,
      stage: step.id,
      stageLabel: step.label,
      result: "blocked",
      objectRole: "friction",
      reason
    });
  }

  function maybeRoleDeviation(order, step, role) {
    if (!state.config.roleFreedom || Math.random() > 0.20 || order.done) return;
    const expectedRole = role.title;
    const otherRoles = ROLES.filter(candidate => candidate.id !== role.id);
    const actual = otherRoles[Math.floor(Math.random() * otherRoles.length)];
    const cost = state.config.opportunityCosts ? 2 : 0;
    state.opportunityCost += cost;
    dispatchInteraction({
      actionType: "role_deviation",
      orderId: order.id,
      productType: order.productId,
      role: actual.title,
      roleId: actual.id,
      expectedRole,
      expectedRoleId: role.id,
      stage: step.id,
      result: "disruptive",
      objectRole: "friction",
      opportunityCost: cost
    });
  }

  function issueMaterials(order, step, role) {
    const stageNumber = step.materialStage;
    const missing = missingMaterials(order, step);
    if (missing.length) {
      const text = missing.map(item => `${partById(item.partId).name}: ${item.missing}`).join(", ");
      blockOrder(order, step, role, `Tekort ${text}`, "stockout");
      return false;
    }
    const recipe = recipeForOrderStep(order, step);
    Object.entries(recipe).forEach(([partId, amount]) => {
      state.inventory[partId] -= amount;
    });
    const issuedValue = materialValue(recipe);
    order.stageFinancialCost[stageNumber] = (
      Number(order.stageFinancialCost[stageNumber]) || 0
    ) + issuedValue;
    order.bookedMaterialCost += issuedValue;
    state.financial.materialIssues += issuedValue;
    if (order.productionRoute === "parallel") {
      const departmentId = order.productionDepartment;
      state.financial.wipByDepartment[departmentId] += issuedValue;
      state.financial.materialCostByDepartment[departmentId] += issuedValue;
    } else {
      state.financial.wipByStage[stageNumber] += issuedValue;
      state.financial.materialCostByStage[stageNumber] += issuedValue;
      const departmentId = PRODUCTION_DEPARTMENT_IDS[stageNumber - 1];
      state.financial.materialCostByDepartment[departmentId] += issuedValue;
    }
    order.stageMaterialsIssued[stageNumber] = true;
    return true;
  }

  function checkBuffer(order, step, role) {
    if (!state.config.intermediateStock) return true;
    const buffer = step.bufferCheck;
    if ((state[buffer][order.productId] || 0) >= order.quantity) return true;
    blockOrder(order, step, role, `${buffer.toUpperCase()} bevat nog geen halfproduct`, "buffer_missing");
    return false;
  }

  function completeProductionStage(order, step) {
    const stageNumber = step.completeStage;
    const conversionCost = order.quantity * 2;
    const departmentId = step.productionDepartment
      || PRODUCTION_DEPARTMENT_IDS[stageNumber - 1];
    order.conversionCost += conversionCost;
    state.financial.conversionCost += conversionCost;
    state.financial.conversionCostByDepartment[departmentId] += conversionCost;
    if (state.config.money) {
      state.financial.cash -= conversionCost;
    }

    if (step.completeProduct) {
      state.financial.wipByDepartment[departmentId] += conversionCost;
      const finishedValue = state.financial.wipByDepartment[departmentId];
      state.financial.wipByDepartment[departmentId] = 0;
      state.financial.finishedGoodsByDepartment[departmentId] += finishedValue;
      state.finishedGoods[order.productId] += order.quantity;
      return;
    }

    const product = productById(order.productId);
    const stage = product.stages[stageNumber - 1];
    state.financial.wipByStage[stageNumber] += conversionCost;
    if (stageNumber > 1) {
      state.financial.wipByStage[stageNumber] += state.financial.wipByStage[stageNumber - 1];
      state.financial.wipByStage[stageNumber - 1] = 0;
    }
    if (stageNumber === 3) {
      const finishedValue = state.financial.wipByStage[3];
      state.financial.wipByStage[3] = 0;
      state.financial.finishedGoodsByDepartment.C += finishedValue;
    }

    if (stage.input) {
      state[stage.input][order.productId] = Math.max(0, state[stage.input][order.productId] - order.quantity);
    }
    const outputStore = stage.output === "finished" ? state.finishedGoods : state[stage.output];
    outputStore[order.productId] += order.quantity;
  }

  function advanceSelectedOrder() {
    let order = selectedOrder();
    if (!order) {
      order = activeOrders()[0] || null;
      if (order) state.selectedOrderId = order.id;
    }
    if (!order || order.done) {
      renderAll();
      return;
    }

    const step = currentStep(order);
    const roleId = step.roleId === "customer1" ? order.customerRoleId : step.roleId;
    const role = roleById(roleId);

    if (step.materialStage && !issueMaterials(order, step, role)) {
      renderAll();
      return;
    }
    if (step.bufferCheck && !checkBuffer(order, step, role)) {
      renderAll();
      return;
    }
    if (step.productionStage && !order.stageMaterialsIssued[step.productionStage]) {
      blockOrder(order, step, role, `Productiestap ${step.productionStage} mist grondstoffen`, "materials_not_issued");
      renderAll();
      return;
    }

    addClock(step.minutes);
    order.status = "active";
    order.lastIssue = "";
    if (step.completeStage) {
      completeProductionStage(order, step);
    }
    if (step.id === "quality_control" && (state.finishedGoods[order.productId] || 0) < order.quantity) {
      blockOrder(order, step, role, "Gereed product ontbreekt bij MFP", "finished_goods_missing");
      renderAll();
      return;
    }
    if (step.id === "archive") {
      order.done = true;
      order.status = "done";
      order.late = state.clockMinutes > order.dueAt;
      if (order.late && state.config.opportunityCosts) {
        state.opportunityCost += 6 * order.quantity;
      }
      const departmentId = order.productionDepartment || "C";
      const totalProductCost = order.bookedMaterialCost + order.conversionCost;
      const revenue = state.config.money ? order.unitPrice * order.quantity : 0;
      state.finishedGoods[order.productId] = Math.max(
        0,
        state.finishedGoods[order.productId] - order.quantity
      );
      state.financial.finishedGoodsByDepartment[departmentId] = Math.max(
        0,
        state.financial.finishedGoodsByDepartment[departmentId] - totalProductCost
      );
      state.financial.revenue += revenue;
      state.financial.revenueByDepartment[departmentId] += revenue;
      state.financial.costOfGoodsSold += state.config.pnl ? totalProductCost : 0;
      state.financial.cash += revenue;
    }

    const result = order.done ? "complete" : "success";
    dispatchInteraction({
      actionType: step.actionType,
      orderId: order.id,
      productType: order.productId,
      quantity: order.quantity,
      role: role.title,
      roleId: role.id,
      stage: step.id,
      stageLabel: step.label,
      actionLabel: step.action,
      result,
      objectRole: order.done ? "success" : "order_flow",
      dueAt: order.dueAt,
      late: order.late,
      productionRoute: order.productionRoute,
      productionDepartment: order.productionDepartment
    });
    order.history.push({ minute: state.clockMinutes, label: step.label, result });
    if (!order.done) {
      order.stepIndex += 1;
    }
    maybeRoleDeviation(order, step, role);
    maybeAutomaticDisruption(order);
    renderAll();
    enterSystemPerspective(order);
  }

  function applyDisruption(order, disruption, automatic = false) {
    if (!order || order.done) return;
    const role = roleById(disruption.roleId);
    addClock(disruption.minutes);
    const cost = state.config.opportunityCosts ? disruption.cost : 0;
    state.opportunityCost += cost;
    order.status = "blocked";
    order.lastIssue = disruption.label;
    if (disruption.id === "quality_rework") {
      const processSteps = order.processSteps || STEPS;
      const qualityIndex = processSteps.findIndex(step => step.id === "quality_control");
      if (qualityIndex >= 0 && order.stepIndex > qualityIndex) {
        order.stepIndex = qualityIndex;
      }
    }
    dispatchInteraction({
      actionType: "disruption",
      orderId: order.id,
      productType: order.productId,
      role: role.title,
      roleId: role.id,
      disruptionType: disruption.id,
      result: cost ? "opportunity_cost" : "delayed",
      objectRole: "friction",
      automatic,
      delayMinutes: disruption.minutes,
      opportunityCost: cost
    });
    renderAll();
  }

  function maybeAutomaticDisruption(order) {
    if (!state.config.opportunityCosts || order.status === "blocked" || order.done) return;
    if (Math.random() > 0.06) return;
    applyDisruption(order, DISRUPTIONS[Math.floor(Math.random() * DISRUPTIONS.length)], true);
  }

  function triggerDisruption() {
    let order = selectedOrder() || activeOrders()[0] || null;
    if (!order) return;
    state.selectedOrderId = order.id;
    applyDisruption(order, DISRUPTIONS[Math.floor(Math.random() * DISRUPTIONS.length)], false);
  }

  function purchaseMaterials(partId, quantity) {
    const part = partById(partId);
    const cost = part.price * quantity;
    state.inventory[partId] += quantity;
    state.purchaseCost += state.config.pnl ? cost : 0;
    state.financial.cash -= state.config.money ? cost : 0;
    addClock(2);
    dispatchInteraction({
      actionType: "purchase_materials",
      partId,
      learningObjectID: partId,
      role: "Magazijn Grondstoffen",
      roleId: "srm",
      quantity,
      amount: cost,
      result: "recovered",
      objectRole: "recovery",
      strategy: "inkoopformulier"
    });
    const order = selectedOrder();
    if (order && order.status === "blocked") {
      order.status = "active";
      order.lastIssue = "";
    }
    renderAll();
  }

  function productOptions() {
    const selectedValue = els.productSelect.value;
    els.productSelect.innerHTML = Object.values(PRODUCTS)
      .map(product => `<option value="${product.id}">${product.name}</option>`)
      .join("");
    if (PRODUCTS[selectedValue]) {
      els.productSelect.value = selectedValue;
    }
  }

  function updatePriceInput() {
    const product = productById(els.productSelect.value);
    const fixed = state.config.priceMode === "fixed";
    els.priceInput.value = product ? String(product.price) : "0";
    els.priceInput.disabled = fixed;
  }

  function orderLane(order) {
    if (order.done) return "archive";
    return currentStep(order).lane;
  }

  function orderPercent(order) {
    if (order.done) return 100;
    const processSteps = order.processSteps || processStepsForOrder(
      order.productId,
      order.productionRoute || "sequential"
    );
    return Math.round((order.stepIndex / processSteps.length) * 100);
  }

  function renderTower(productId) {
    const product = productById(productId);
    if (window.LegoTowerRenderer) {
      if (product.towerSequence) {
        return window.LegoTowerRenderer.renderSequence(
          product.towerSequence,
          product.name,
          "tower-mini-3d",
          product.groundPlate?.color || "green"
        );
      }
      return window.LegoTowerRenderer.render(
        productId,
        product.name,
        product.towerBlueprint,
        "tower-mini-3d",
        product.groundPlate?.color || "green"
      );
    }
    return `<div class="tower-mini" aria-label="${escapeHtml(product.name)}">` +
      product.visual.map(row => {
        return `<div class="tower-row">` + row.map(partId => {
          const part = partById(partId);
          const wide = part.width === "wide" ? " wide" : "";
          return `<span class="brick ${part.color}${wide}" title="${escapeHtml(part.name)}"></span>`;
        }).join("") + `</div>`;
      }).join("") +
      `</div>`;
  }

  function renderTowerLarge(productId) {
    const product = productById(productId);
    if (window.LegoTowerRenderer) {
      if (product.towerSequence) {
        return window.LegoTowerRenderer.renderSequence(
          product.towerSequence,
          product.name,
          "tower-large",
          product.groundPlate?.color || "green"
        );
      }
      return window.LegoTowerRenderer.render(
        productId,
        product.name,
        product.towerBlueprint,
        "tower-large",
        product.groundPlate?.color || "green"
      );
    }
    return renderTower(productId);
  }

  function renderPart(part) {
    if (window.LegoTowerRenderer) {
      return window.LegoTowerRenderer.renderPart(part, part.name);
    }
    const wide = part.width === "wide" ? " wide" : "";
    return `<span class="brick ${part.color}${wide}" title="${escapeHtml(part.name)}"></span>`;
  }

  function renderOrderPreview() {
    const product = productById(els.productSelect.value) || Object.values(PRODUCTS)[0];
    const quantity = Math.max(1, Number(els.quantityInput.value || 1));
    const unitPrice = state.config.priceMode === "fixed"
      ? product.price
      : Math.max(0, Number(els.priceInput.value || product.price));
    els.orderPreview.innerHTML = `
      <div>
        <p class="eyebrow">Ordervoorbeeld</p>
        <h3>${escapeHtml(product.name)}</h3>
        <div class="order-preview-meta">${quantity} stuks | ${formatMoney(unitPrice)} p/st | ${formatMoney(unitPrice * quantity)}</div>
      </div>
      ${renderTowerLarge(product.id)}
    `;
  }

  function orderColor(order) {
    if (order.status === "blocked") return "var(--red)";
    if (order.done) return "var(--green)";
    if (order.priority) return "var(--purple)";
    const palette = ["var(--blue)", "var(--yellow)", "var(--green)", "var(--red)", "var(--purple)"];
    const index = Math.max(0, productIds().indexOf(order.productId));
    return palette[index % palette.length];
  }

  function renderLanes() {
    const selectedId = state.selectedOrderId;
    els.laneGrid.innerHTML = LANES.map(lane => {
      const laneOrders = state.orders.filter(order => orderLane(order) === lane.id);
      const cards = laneOrders.map(order => {
        const product = productById(order.productId);
        const step = currentStep(order);
        const roleId = step.roleId === "customer1" ? order.customerRoleId : step.roleId;
        const role = roleById(roleId);
        const classes = [
          "order-card",
          order.id === selectedId ? "selected" : "",
          order.status === "blocked" ? "blocked" : "",
          order.done ? "done" : ""
        ].filter(Boolean).join(" ");
        return `
          <article class="${classes}" data-order-id="${order.id}" style="border-left-color: ${orderColor(order)}">
            <div class="order-title-row">
              <div>
                <h3 class="order-title">${escapeHtml(order.id)} ${escapeHtml(product.name)}</h3>
                <div class="order-meta">${order.quantity} stuks | ${escapeHtml(role.token)} | ${formatClock(order.dueAt)}</div>
              </div>
              ${renderTower(order.productId)}
            </div>
            <div class="order-meta">${escapeHtml(step.action)}: ${escapeHtml(step.label)}</div>
            ${order.lastIssue ? `<div class="order-meta">${escapeHtml(order.lastIssue)}</div>` : ""}
            <div class="progress-track"><div class="progress-fill" style="width: ${orderPercent(order)}%"></div></div>
          </article>
        `;
      }).join("");
      return `
        <section class="lane">
          <div class="lane-head">
            <h3 class="lane-title">${escapeHtml(lane.title)}</h3>
            <div class="lane-count">${laneOrders.length} | ${escapeHtml(lane.subtitle)}</div>
          </div>
          <div class="lane-body">${cards}</div>
        </section>
      `;
    }).join("");

    els.laneGrid.querySelectorAll(".order-card").forEach(card => {
      card.addEventListener("click", () => {
        state.selectedOrderId = card.dataset.orderId;
        dispatchInteraction({
          actionType: "select_order",
          orderId: state.selectedOrderId,
          result: "success",
          objectRole: "order_flow",
          role: "Speler"
        });
        renderAll();
      });
    });
  }

  function playerFormType(step, role) {
    if (step.materialStage || role.id === "srm") return "Materiaaluitgifteformulier";
    if (role.id.startsWith("pd")) return "Productieorderformulier";
    if (role.id.startsWith("customer")) return "Klantenorderformulier";
    if (role.id === "mfp") return "Ontvangst gereed product";
    return "Orderbegeleidingsformulier";
  }

  function renderPlayerForm(order) {
    const step = currentStep(order);
    const role = stepRole(order);
    const product = productById(order.productId);
    const history = order.history.slice(-4);
    const formType = playerFormType(step, role);
    els.playerRoleToken.textContent = role.token;
    els.playerFormTitle.textContent = formType;
    els.playerFormStatus.textContent = `${role.title} · actuele opdracht`;
    els.playerQueueSummary.textContent = `${activeOrders().length} actief`;
    const roleTools = role.id === "srm"
      ? `
        <section class="player-role-tools" aria-label="Inkoop voor Magazijn Grondstoffen">
          <div>
            <p class="eyebrow">Rolhandeling</p>
            <h3>Materiaal inkopen</h3>
          </div>
          <form class="purchase-form" data-player-purchase-form>
            <label>
              <span>Inkoop</span>
              <select name="partId">
                ${PARTS.map(part => `<option value="${part.id}">${part.name} - EUR ${part.price}</option>`).join("")}
              </select>
            </label>
            <label>
              <span>Aantal</span>
              <input name="quantity" type="number" min="1" max="50" value="6">
            </label>
            <button class="secondary-button" type="submit">
              <span class="button-icon">$</span>
              <span>Koop</span>
            </button>
          </form>
        </section>
      `
      : role.id === "opr"
        ? `
          <section class="player-role-tools" aria-label="Procesbesturing voor Operations Manager">
            <div>
              <p class="eyebrow">Rolhandeling</p>
              <h3>Procesbesturing</h3>
            </div>
            <button class="danger-button" type="button" data-player-disruption>
              <span class="button-icon">!</span>
              <span>Verstoring toevoegen</span>
            </button>
          </section>
        `
        : "";
    els.playerFormMount.innerHTML = `
      <article class="digital-work-form" aria-label="${escapeHtml(formType)} voor ${escapeHtml(order.id)}">
        <header class="digital-form-heading">
          <div>
            <span>Ordernr.</span>
            <strong>${escapeHtml(order.id)}</strong>
          </div>
          <div class="digital-form-version">digitale versie 4</div>
        </header>
        <div class="digital-form-facts">
          <div><span>Producttype</span><strong>${escapeHtml(product.id)}</strong></div>
          <div><span>Hoeveelheid</span><strong>${order.quantity}</strong></div>
          <div><span>Prijs</span><strong>${state.config.money ? formatMoney(order.unitPrice) : "—"}</strong></div>
          <div><span>Totaalbedrag</span><strong>${state.config.money ? formatMoney(order.totalAmount) : "—"}</strong></div>
          <div><span>Order geaccepteerd</span><strong>${formatClock(order.acceptedAt)}</strong></div>
          <div><span>Afgesproken levering</span><strong>${formatClock(order.dueAt)}</strong></div>
        </div>
        <section class="digital-form-action">
          <span class="digital-form-step">${order.stepIndex + 1}</span>
          <div>
            <small>${escapeHtml(step.action)}</small>
            <h3>${escapeHtml(step.label)}</h3>
            <p>Uit te voeren door <strong>${escapeHtml(role.title)}</strong>.</p>
            ${order.lastIssue ? `<p class="digital-form-issue">${escapeHtml(order.lastIssue)}</p>` : ""}
          </div>
          <div class="digital-form-product">${renderTowerLarge(product.id)}</div>
        </section>
        <footer class="digital-form-history">
          <strong>Procesparaaf</strong>
          ${history.length
            ? history.map(item => {
                const moment = Number.isFinite(Number(item.minute))
                  ? Number(item.minute)
                  : Number(item.at || state.clockMinutes);
                return `<span><b>${formatClock(moment)}</b>${escapeHtml(item.label || item.step || "Handeling verwerkt")}</span>`;
              }).join("")
            : "<span>Nog geen eerdere handelingen op dit formulier.</span>"}
        </footer>
      </article>
      ${roleTools}
    `;
    els.playerFormConfirmation.hidden = false;
    els.playerFormConfirmInput.checked = false;
    els.playerCompleteActionButton.disabled = true;
    els.playerCompleteActionButton.textContent = `${step.action} en stuur door`;
  }

  function renderPlayerWaiting() {
    const assignedRole = state.assignedRoleId ? roleById(state.assignedRoleId) : null;
    const openCount = activeOrders().length;
    els.playerWaitingClock.textContent = formatClock(state.clockMinutes);
    els.playerWaitingMessage.textContent = !state.gameSessionRunning
      ? "De rolhandelingen verschijnen hier zodra de gamesessie is gestart."
      : assignedRole
      ? openCount
        ? `Er is nog geen formulier voor ${assignedRole.title}. Kijk live mee totdat jouw rol weer aan de beurt is.`
        : `Er is nog geen actieve order. Zodra er werk voor ${assignedRole.title} ontstaat, verschijnt het formulier vanzelf.`
      : openCount
        ? "Het volgende formulier wordt voorbereid. Volg intussen de goederen- en informatiestroom."
        : "Er is nog geen actieve order. Vanuit Beheer kan voorlopig een spelsessie worden klaargezet.";
    if (!window.IsometricLogisticsView) {
      els.playerProcessMount.innerHTML = "<p>De processimulatie kon niet worden geladen.</p>";
      return;
    }
    window.IsometricLogisticsView.mount(els.playerProcessMount, isometricScene());
  }

  function simulationRoleId(roleId) {
    if (!roleId) return null;
    if (roleId.startsWith("customer")) return "customer";
    return {
      opr: "operations",
      operations: "operations",
      srm: "srm",
      pd1: "pd1",
      pd2: "pd2",
      pd3: "pd3",
      mfp: "ssf",
      ssf: "ssf"
    }[roleId] || null;
  }

  const STANDALONE_SIMULATION_DEPARTMENTS = [
    {
      id: "customer",
      roleId: "customer",
      title: "Klant",
      shortTitle: "Klant",
      description: "Genereert klantorders en bepaalt aantal en gevraagde levertijd.",
      kind: "dispatch",
      departmentColor: "customer",
      layout: { x: 1, y: 5, width: 3.5, depth: 3.2, height: 54 }
    },
    {
      id: "operations",
      roleId: "operations",
      title: "Operations",
      shortTitle: "Operations",
      description: "Registreert orders en geeft de werkzaamheden vrij aan de logistieke keten.",
      kind: "production",
      departmentColor: "blue",
      layout: { x: 6, y: 3, width: 3.5, depth: 3.2, height: 64 }
    },
    {
      id: "srm",
      roleId: "srm",
      title: "Magazijn Grondstoffen",
      shortTitle: "Grondstoffen",
      description: "Verzamelt en verstrekt de benodigde LEGO-onderdelen.",
      kind: "warehouse",
      departmentColor: "raw",
      openRoof: true,
      compactStock: true,
      layout: { x: 11, y: 1, width: 3.8, depth: 3.4, height: 62 }
    },
    {
      id: "pd1",
      roleId: "pd1",
      title: "Productie-afdeling 1",
      shortTitle: "PD1",
      description: "Bouwt de grondplaat en eerste torenlaag.",
      kind: "production",
      departmentColor: "production-a",
      openRoof: true,
      layout: { x: 5, y: 13, width: 3.8, depth: 3.4, height: 72 }
    },
    {
      id: "pd2",
      roleId: "pd2",
      title: "Productie-afdeling 2",
      shortTitle: "PD2",
      description: "Bouwt de tweede laag en controleert Subassembly 1.",
      kind: "production",
      departmentColor: "production-b",
      openRoof: true,
      layout: { x: 11, y: 11, width: 3.8, depth: 3.4, height: 78 }
    },
    {
      id: "pd3",
      roleId: "pd3",
      title: "Productie-afdeling 3",
      shortTitle: "PD3",
      description: "Bouwt de bovenste laag en meldt de toren gereed.",
      kind: "production",
      departmentColor: "production-c",
      openRoof: true,
      layout: { x: 17, y: 9, width: 3.8, depth: 3.4, height: 84 }
    },
    {
      id: "ssf",
      roleId: "ssf",
      title: "Magazijn Gereed Product",
      shortTitle: "SSF",
      description: "Controleert, boekt en levert complete torens uit.",
      kind: "warehouse",
      departmentColor: "finished",
      openRoof: true,
      layout: { x: 23, y: 7, width: 3.8, depth: 3.4, height: 66 }
    }
  ];

  const STANDALONE_SIMULATION_CONNECTIONS = [
    { from: "customer", to: "operations", kind: "customer" },
    { from: "operations", to: "srm", kind: "material" },
    { from: "srm", to: "pd1", kind: "material" },
    { from: "pd1", to: "pd2", kind: "material" },
    { from: "pd2", to: "pd3", kind: "material" },
    { from: "pd3", to: "ssf", kind: "material" }
  ];

  function simulationStateLabel(runtime) {
    return {
      IDLE: "Wacht op input",
      PROCESSING: "Verwerkt order",
      WAITING_FOR_NEXT: "Wacht op overdracht",
      AWAITING_PLAYER: "Wacht op speler"
    }[runtime?.state] || "Onbekend";
  }

  function simulationDepartmentStatus(runtime) {
    if (runtime?.incident) return "blocked";
    if (runtime?.state === "AWAITING_PLAYER") return "attention";
    if (runtime?.state === "PROCESSING" || runtime?.state === "WAITING_FOR_NEXT") return "active";
    if (runtime?.queue?.length) return "attention";
    return "idle";
  }

  function simulationPartialSequence(product, roleId, order = null) {
    if (!product?.stages) return product?.towerSequence || [];
    if (
      order?.productionRoute === "parallel"
      && roleId === order.productionDepartment
    ) {
      return [...(product.towerSequence || [])];
    }
    const stageRoles = ["pd1", "pd2", "pd3"];
    const stageIndex = stageRoles.indexOf(roleId);
    if (roleId === "ssf") return [...(product.towerSequence || [])];
    if (stageIndex < 0) return [];
    return stageRoles.slice(0, stageIndex + 1).flatMap(stageRole => (
      Object.entries(product.stages[stageRole] || {}).flatMap(([partId, amount]) => (
        partId === "base_green" ? [] : Array(Number(amount) || 0).fill(partId)
      ))
    ));
  }

  function simulationStockVisuals(snapshot, order) {
    const product = snapshot.products?.[order?.productId];
    if (!product?.stages) return [];
    const required = {};
    Object.values(product.stages).forEach(recipe => {
      Object.entries(recipe).forEach(([partId, amount]) => {
        if (partId === "base_green") return;
        required[partId] = (required[partId] || 0) + Number(amount || 0) * Number(order.quantity || 1);
      });
    });
    return Object.entries(required).map(([partId, count]) => {
      const part = partById(partId);
      return {
        partId,
        count,
        color: part.color,
        width: part.width === "wide" ? 4 : 2,
        depth: 2,
        label: part.name
      };
    });
  }

  function standaloneLogisticsScene(snapshot) {
    const orderById = new Map(snapshot.orders.map(order => [order.id, order]));
    const activeRole = snapshot.roleFlow.find(roleId => (
      snapshot.roleRuntime[roleId]?.state !== "IDLE"
    ));
    const knownIds = new Set(STANDALONE_SIMULATION_DEPARTMENTS.map(item => item.id));
    if (!knownIds.has(standaloneSelectedDepartmentId)) {
      standaloneSelectedDepartmentId = activeRole || snapshot.humanRoleId || "operations";
    }
    const parallelEnabled = snapshot.productionProcesses?.includes("parallel");
    const sequentialEnabled = snapshot.productionProcesses?.includes("sequential");
    const departments = STANDALONE_SIMULATION_DEPARTMENTS.map(baseDefinition => {
      const productionIndex = ["pd1", "pd2", "pd3"].indexOf(baseDefinition.roleId);
      const definition = parallelEnabled && productionIndex >= 0
        ? {
            ...baseDefinition,
            title: `Productieafdeling ${PRODUCTION_DEPARTMENT_IDS[productionIndex]}`,
            shortTitle: `Productie ${PRODUCTION_DEPARTMENT_IDS[productionIndex]}`,
            description: `Bouwt zelfstandig een complete Toren ${PRODUCTION_DEPARTMENT_IDS[productionIndex]}.`
          }
        : baseDefinition;
      const runtime = snapshot.roleRuntime[definition.roleId];
      const orderIds = Array.from(new Set([
        runtime.activeOrderId,
        ...(runtime.queue || [])
      ].filter(Boolean)));
      const orders = orderIds.map(orderId => orderById.get(orderId)).filter(Boolean);
      const activeOrder = orderById.get(runtime.activeOrderId);
      const activeProduct = snapshot.products?.[activeOrder?.productId];
      const latestEvent = snapshot.feed.find(item => (
        !activeOrder || item.orderId === activeOrder.id
      ));
      const partialSequence = simulationPartialSequence(activeProduct, definition.roleId, activeOrder);
      const showProduct = ["pd1", "pd2", "pd3", "ssf"].includes(definition.roleId)
        && partialSequence.length;
      return {
        ...definition,
        status: simulationDepartmentStatus(runtime),
        badgeValue: orders.length,
        badgeLabel: `${orders.length} orders in behandeling`,
        primaryMetric: `${simulationStateLabel(runtime)} · ${orders.length} order${orders.length === 1 ? "" : "s"}`,
        orders: orders.map(order => ({
          id: order.id,
          product: `${order.quantity}× ${order.productName}`,
          stage: simulationStateLabel(runtime)
        })),
        stockVisuals: definition.roleId === "srm"
          ? simulationStockVisuals(snapshot, activeOrder)
          : [],
        cargoVisual: showProduct ? {
          kind: "tower",
          cargoId: activeOrder.id,
          productId: activeOrder.productId,
          label: `${activeOrder.productName} · ${activeOrder.id}`,
          towerSequence: partialSequence,
          groundPlateColor: activeProduct?.groundPlate?.color || "green",
          draggable: false
        } : null,
        facts: [
          { label: "Simulatiestatus", value: simulationStateLabel(runtime) },
          { label: "Actieve order", value: runtime.activeOrderId || "Geen" },
          { label: "Wachtrij", value: runtime.queue.length },
          { label: "Laatste event", value: latestEvent?.message || "Nog geen event" }
        ],
        feedback: runtime.incident ? {
          kind: "error",
          text: `${runtime.incident.label}: ${runtime.incident.message}`
        } : null
      };
    });
    const configuredConnections = parallelEnabled && !sequentialEnabled
      ? [
          { from: "customer", to: "operations", kind: "customer" },
          { from: "operations", to: "srm", kind: "material" },
          { from: "srm", to: "pd1", kind: "material" },
          { from: "srm", to: "pd2", kind: "material" },
          { from: "srm", to: "pd3", kind: "material" },
          { from: "pd1", to: "ssf", kind: "material" },
          { from: "pd2", to: "ssf", kind: "material" },
          { from: "pd3", to: "ssf", kind: "material" }
        ]
      : parallelEnabled && sequentialEnabled
        ? [
            ...STANDALONE_SIMULATION_CONNECTIONS,
            { from: "srm", to: "pd2", kind: "material" },
            { from: "srm", to: "pd3", kind: "material" },
            { from: "pd1", to: "ssf", kind: "material" },
            { from: "pd2", to: "ssf", kind: "material" }
          ]
        : STANDALONE_SIMULATION_CONNECTIONS;
    const connections = configuredConnections.map(connection => {
      const sourceRuntime = snapshot.roleRuntime[connection.from];
      const targetRuntime = snapshot.roleRuntime[connection.to];
      return {
        ...connection,
        highlight: sourceRuntime?.state === "WAITING_FOR_NEXT"
          || targetRuntime?.state === "PROCESSING"
          || targetRuntime?.state === "AWAITING_PLAYER"
      };
    });
    return {
      title: parallelEnabled && sequentialEnabled
        ? "Live simulatie · Hybride productiestroom"
        : parallelEnabled
          ? "Live simulatie · Parallelle productorganisatie"
          : "Live simulatie · Sequentiële productieketen",
      selectedDepartmentId: standaloneSelectedDepartmentId,
      legend: [
        { color: "customer", label: "Klantorder" },
        { color: "raw", label: "Grondstoffen" },
        { color: "production-a", label: "Productie" },
        { color: "finished", label: "Gereed product" }
      ],
      departments,
      connections
    };
  }

  function standaloneSimulationProducts() {
    return Object.fromEntries(
      Object.values(PRODUCTS).map(product => {
        const blueprint = product.towerBlueprint || {};
        return [product.id, {
          id: product.id,
          name: product.name,
          price: product.price,
          towerSequence: [...(product.towerSequence || [])],
          groundPlate: {
            color: product.groundPlate?.color || "green",
            width: 6,
            depth: 6
          },
          colors: [
            blueprint.lower || "yellow",
            blueprint.middle || "red",
            blueprint.upper || "white"
          ],
          stages: {
            pd1: { ...(product.stages?.[0]?.recipe || {}) },
            pd2: { ...(product.stages?.[1]?.recipe || {}) },
            pd3: { ...(product.stages?.[2]?.recipe || {}) }
          }
        }];
      })
    );
  }

  function initStandaloneLogisticsGame() {
    if (!window.LogisticsGameUI || !els.logisticsGameMount) return;
    logisticsGameController = window.LogisticsGameUI.mount(els.logisticsGameMount, {
      engineOptions: { products: standaloneSimulationProducts() },
      renderProcessFlow: (target, snapshot) => {
        if (!window.IsometricLogisticsView) return;
        const renderScene = () => {
          window.IsometricLogisticsView.mount(target, standaloneLogisticsScene(snapshot), {
            onDepartmentSelect: departmentId => {
              standaloneSelectedDepartmentId = departmentId;
              renderScene();
            }
          });
        };
        renderScene();
      }
    });
    logisticsGameController.engine.subscribe(event => {
      const trackedEvents = new Set([
        "order-created",
        "incident",
        "player-action-required",
        "player-action-completed",
        "order-delivered"
      ]);
      if (!trackedEvents.has(event.type)) return;
      dispatchInteraction({
        actionType: `simulation_${event.type.replace(/-/g, "_")}`,
        result: "success",
        objectRole: "standalone_logistics_engine",
        role: state.assignedRoleId ? roleById(state.assignedRoleId).title : "Speler",
        humanRoleId: event.snapshot.humanRoleId,
        activeOrderCount: event.snapshot.orders.filter(order => order.status !== "DELIVERED").length
      });
    });
  }

  function startStandaloneLogisticsGame(
    difficultyLevel = state.gameSessionDifficulty,
    sessionGameConfig = null
  ) {
    if (!logisticsGameController) initStandaloneLogisticsGame();
    if (!logisticsGameController) return;
    logisticsGameController.engine.products = standaloneSimulationProducts();
    logisticsGameController.engine.setBehaviorPatterns(
      state.config.gameType === "entrepreneurial"
        ? window.EntrepreneurshipAgentPatterns
        : null
    );
    logisticsGameController.engine.setDifficulty(difficultyLevel);
    const customerOrderMode = sessionGameConfig
      ? (sessionGameConfig.customer_order_mode === "free" ? "free" : "required")
      : state.config.customerOrderMode;
    const playMode = sessionGameConfig?.play_mode === "digital" ? "digital" : "physical";
    state.config.customerOrderMode = customerOrderMode;
    state.config.playMode = playMode;
    logisticsGameController.engine.setCustomerOrderMode(customerOrderMode);
    logisticsGameController.engine.setPlayMode(playMode);
    logisticsGameController.engine.setProductionProcesses(state.config.productionProcesses);
    const humanRoleId = simulationRoleId(state.assignedRoleId);
    logisticsGameController.start({
      humanRoleId,
      customerOrderMode,
      playMode,
      productionProcesses: state.config.productionProcesses
    });
    if (document.body.classList.contains("tutorial-focus")) {
      logisticsGameController.pause();
    } else {
      els.logisticsGameMount.hidden = false;
    }
  }

  function renderPlayerView() {
    if (!els.playerWorkbench) return;
    const standaloneGameActive = Boolean(
      state.gameSessionRunning
      && logisticsGameController?.engine?.started
      && !document.body.classList.contains("tutorial-focus")
    );
    if (els.logisticsGameMount) els.logisticsGameMount.hidden = !standaloneGameActive;
    if (standaloneGameActive) {
      els.playerTaskPanel.hidden = true;
      els.playerWaitingPanel.hidden = true;
      return;
    }
    const order = playerAssignment();
    const sessionAllowsRoleActions = state.gameSessionRunning || document.body.classList.contains("tutorial-focus");
    if (!sessionAllowsRoleActions) {
      els.playerTaskPanel.hidden = true;
      els.playerWaitingPanel.hidden = true;
      return;
    }
    const taskVisible = sessionAllowsRoleActions && Boolean(order) && state.attention.mode === "task";
    els.playerTaskPanel.hidden = !taskVisible;
    els.playerWaitingPanel.hidden = taskVisible;
    if (taskVisible) {
      if (state.selectedOrderId !== order.id) state.selectedOrderId = order.id;
      renderPlayerForm(order);
      return;
    }
    renderPlayerWaiting();
  }

  function renderInventory() {
    const rawInventoryValue = PARTS.reduce(
      (sum, part) => sum + (state.inventory[part.id] || 0) * part.price,
      0
    );
    const parallelWorkInProgress = state.config.productionProcesses.includes("parallel")
      ? Object.values(state.financial.wipByDepartment).reduce((sum, value) => sum + value, 0)
      : 0;
    const sequentialWorkInProgress = state.config.productionProcesses.includes("sequential")
      ? Object.values(state.financial.wipByStage).reduce((sum, value) => sum + value, 0)
      : 0;
    const workInProgressValue = parallelWorkInProgress + sequentialWorkInProgress;
    const finishedGoodsValue = Object.values(state.financial.finishedGoodsByDepartment)
      .reduce((sum, value) => sum + value, 0);
    const opportunityCosts = Object.values(state.financial.opportunityCostByDepartment)
      .reduce((sum, value) => sum + value, 0);
    const result = state.financial.revenue
      - state.financial.costOfGoodsSold
      - opportunityCosts;
    const cashValue = state.config.money ? state.financial.cash : 0;
    const totalAssets = cashValue
      + rawInventoryValue
      + workInProgressValue
      + finishedGoodsValue;
    const items = [
      state.config.money && state.config.openingBalance ? `
        <article class="inventory-item financial-overview-card" data-financial-overview="balance">
          <div>
            <h3 class="inventory-name">Balans</h3>
            <div class="inventory-meta">
              Activa: liquide middelen ${formatMoney(cashValue)} ·
              grondstoffen ${formatMoney(rawInventoryValue)} ·
              OHW ${formatMoney(workInProgressValue)} ·
              gereed product ${formatMoney(finishedGoodsValue)}
            </div>
            <div class="inventory-meta">
              Passiva: eigen vermogen ${formatMoney(totalAssets)} · vreemd vermogen ${formatMoney(0)}
            </div>
          </div>
          <strong class="inventory-count">${formatMoney(totalAssets)}</strong>
        </article>
      ` : "",
      `
        <article class="inventory-item financial-overview-card" data-financial-overview="profit-loss">
          <div>
            <h3 class="inventory-name">Winst- en verliesrekening</h3>
            <div class="inventory-meta">
              Omzet ${formatMoney(state.financial.revenue)} ·
              kostprijs omzet ${formatMoney(state.financial.costOfGoodsSold)} ·
              opportunity costs ${formatMoney(opportunityCosts)}
            </div>
          </div>
          <strong class="inventory-count">${state.config.pnl ? formatMoney(result) : "W&R uit"}</strong>
        </article>
      `
    ].filter(Boolean);

    if (state.config.money && state.config.revenueBalance) {
      const otherCashMovements = state.financial.cash
        - state.financial.openingCash
        - state.financial.revenue;
      items.push(`
        <article class="inventory-item financial-overview-card"
                 data-financial-overview="revenue-balance">
          <div>
            <h3 class="inventory-name">Omzetbalans</h3>
            <div class="inventory-meta">
              Beginstand ${formatMoney(state.financial.openingCash)} Â·
              omzet ${formatMoney(state.financial.revenue)} Â·
              overige kasmutaties ${formatMoney(otherCashMovements)}
            </div>
            <div class="inventory-meta">
              Controle: beginstand + omzet + overige mutaties = eindsaldo.
            </div>
          </div>
          <strong class="inventory-count">${formatMoney(state.financial.cash)}</strong>
        </article>
      `);
    }

    if (state.config.money && (state.config.openingBalance || state.config.revenueBalance)) {
      const liquidityEffect = state.financial.cash - state.financial.openingCash;
      const advice = state.config.revenueBalance
        ? `Omzet ${formatMoney(state.financial.revenue)} verandert de liquiditeitspositie samen met overige kasmutaties. Het netto-effect sinds de opening is ${formatMoney(liquidityEffect)}.`
        : `De openingsbalans start met ${formatMoney(state.financial.openingCash)} liquide middelen. Dit is de beschikbare financiÃ«le ruimte voor inkoop, productie en verstoringen.`;
      items.push(`
        <article class="inventory-item financial-advisor-card"
                 data-financial-advisor>
          <div>
            <h3 class="inventory-name">Adviseur Â· financiÃ«le impact</h3>
            <div class="inventory-meta">${advice}</div>
          </div>
          <strong class="inventory-count">Advies</strong>
        </article>
      `);
    }

    if (state.config.productionProcesses.includes("parallel")) {
      PRODUCTION_DEPARTMENT_IDS.forEach(departmentId => {
        items.push(`
          <article class="inventory-item production-finance-card"
                   data-production-finance="${departmentId}">
            <div>
              <h3 class="inventory-name">Productieafdeling ${departmentId}</h3>
              <div class="inventory-meta">
                Materiaal ${formatMoney(state.financial.materialCostByDepartment[departmentId])} ·
                conversie ${formatMoney(state.financial.conversionCostByDepartment[departmentId])} ·
                OHW ${formatMoney(state.financial.wipByDepartment[departmentId])} ·
                gereed ${formatMoney(state.financial.finishedGoodsByDepartment[departmentId])}
              </div>
              <div class="inventory-meta">
                Omzet ${formatMoney(state.financial.revenueByDepartment[departmentId])} ·
                opportunity costs ${formatMoney(state.financial.opportunityCostByDepartment[departmentId])}
              </div>
            </div>
            <strong class="inventory-count">${departmentId}</strong>
          </article>
        `);
      });
    }

    if (state.config.productionProcesses.includes("sequential")) {
      [1, 2, 3].forEach(stageNumber => {
        items.push(`
          <article class="inventory-item production-finance-card"
                   data-production-stage-finance="${stageNumber}">
            <div>
              <h3 class="inventory-name">Laag ${stageNumber} · Productieafdeling ${stageNumber}</h3>
              <div class="inventory-meta">
                Materiaal laag ${formatMoney(state.financial.materialCostByStage[stageNumber])} ·
                cumulatief OHW ${formatMoney(state.financial.wipByStage[stageNumber])}
              </div>
            </div>
            <strong class="inventory-count">L${stageNumber}</strong>
          </article>
        `);
      });
    }

    PARTS.forEach(part => {
      const count = state.inventory[part.id] || 0;
      const low = count <= part.reorder;
      items.push(`
        <article class="inventory-item${low ? " low" : ""}">
          ${renderPart(part)}
          <div>
            <h3 class="inventory-name">${escapeHtml(part.name)}</h3>
            <div class="inventory-meta">inkoop EUR ${part.price} | signaal ${part.reorder}</div>
          </div>
          <strong class="inventory-count">${count}</strong>
        </article>
      `);
    });

    Object.values(PRODUCTS).forEach(product => {
      items.push(`
        <article class="inventory-item">
          ${renderTower(product.id)}
          <div>
            <h3 class="inventory-name">${
              state.config.productionProcesses.length === 1
                && state.config.productionProcesses[0] === "parallel"
                ? `Afdeling ${parallelDepartmentForProduct(product.id)} / gereed ${escapeHtml(product.id)}`
                : `SS1 / SS2 / gereed ${escapeHtml(product.id)}`
            }</h3>
            <div class="inventory-meta">${
              state.config.productionProcesses.length === 1
                && state.config.productionProcesses[0] === "parallel"
                ? `${state.finishedGoods[product.id]} complete torens`
                : `${state.ss1[product.id]} / ${state.ss2[product.id]} / ${state.finishedGoods[product.id]}`
            }</div>
          </div>
          <strong class="inventory-count">${state.finishedGoods[product.id]}</strong>
        </article>
      `);
    });
    els.inventoryGrid.innerHTML = items.join("");
    const lowCount = PARTS.filter(part => (state.inventory[part.id] || 0) <= part.reorder).length;
    els.stockSignal.textContent = lowCount ? `${lowCount} laag` : "OK";
    els.stockSignal.classList.toggle("low", lowCount > 0);
  }

  function renderMetrics() {
    const input = state.orders.filter(order => !order.done && order.stepIndex <= 3).length;
    const busy = state.orders.filter(order => !order.done && order.stepIndex > 3).length;
    const done = state.orders.filter(order => order.done).length;
    const late = state.orders.filter(order => order.late).length;
    els.openOrdersValue.textContent = String(input);
    els.throughputValue.textContent = String(busy);
    els.cashValue.textContent = String(done);
    els.profitValue.textContent = String(late);
    els.lateValue.textContent = String(state.interactionBuffer.length);
    els.clockValue.textContent = formatClock(state.clockMinutes);
    els.eventCountValue.textContent = String(state.interactionBuffer.length);
  }

  function renderEvents() {
    const recent = [...state.interactionBuffer].slice(-26).reverse();
    els.eventLog.innerHTML = recent.map(event => {
      const resultClass = String(event.result || "").toLowerCase();
      const label = event.stageLabel || event.screen || event.actionType;
      return `
        <div class="event-row">
          <span class="event-time">${formatClock(event.simulatedMinute || 0)}</span>
          <span class="event-action">${escapeHtml(label)}${event.orderId ? ` | ${escapeHtml(event.orderId)}` : ""}</span>
          <span class="event-result ${escapeHtml(resultClass)}">${escapeHtml(event.result || "open")}</span>
        </div>
      `;
    }).join("");
  }

  function renderDataModel(force = false) {
    const panelIsVisible = els.dataModelPanel.classList.contains("visible");
    if (!force && !panelIsVisible) return;

    const isIsometric = state.config.processView === "isometric";
    els.dataModelCount.textContent = String(
      isIsometric
        ? state.config.visibleLogisticsDepartments.length
        : DATA_MODEL_LEARNING_OBJECTS.length
    );
    els.processGraphViewButton.classList.toggle("active", state.config.processView === "graph");
    els.processSequenceViewButton.classList.toggle("active", state.config.processView === "sequence");
    els.processSwimlaneViewButton.classList.toggle("active", state.config.processView === "swimlane");
    els.processIsometricViewButton.classList.toggle("active", isIsometric);

    if (isIsometric) {
      renderIsometricLogisticsView();
      return;
    }

    els.dataModelGrid.innerHTML = renderOrderProcessView();

    els.dataModelGrid.querySelectorAll(".data-model-node").forEach(node => {
      const canvas = node.closest(".data-model-canvas");
      const emphasizeConnectedEdges = () => {
        if (!canvas?.classList.contains("swimlane-canvas")) return;
        canvas.classList.add("has-edge-focus");
        canvas.querySelectorAll(".swimlane-edge").forEach(edge => {
          edge.classList.toggle(
            "is-related",
            edge.dataset.edgeSource === node.dataset.modelObjectId
              || edge.dataset.edgeTarget === node.dataset.modelObjectId
          );
        });
      };
      const clearConnectedEdges = () => {
        if (!canvas?.classList.contains("swimlane-canvas")) return;
        canvas.classList.remove("has-edge-focus");
        canvas.querySelectorAll(".swimlane-edge.is-related").forEach(edge => {
          edge.classList.remove("is-related");
        });
      };
      node.addEventListener("mouseenter", emphasizeConnectedEdges);
      node.addEventListener("mouseleave", clearConnectedEdges);
      node.addEventListener("focus", emphasizeConnectedEdges);
      node.addEventListener("blur", clearConnectedEdges);
      node.addEventListener("click", () => {
        dispatchInteraction({
          learningObjectID: node.dataset.modelObjectId,
          actionType: "inspect_data_model_object",
          objectRole: "orientation",
          result: "success",
          role: "Spelkern"
        });
        renderEvents();
        renderMetrics();
      });
    });
  }

  function orderSnapshotForDepartment(order) {
    const step = currentStep(order);
    return {
      id: order.id,
      product: `${order.quantity}× ${productById(order.productId).name}`,
      stage: step.label,
      status: order.done ? "done" : order.status
    };
  }

  function ordersForDepartment(definition) {
    return state.orders
      .filter(order => {
        if (definition.id === "dispatch") return order.done || currentStep(order).lane === "archive";
        if (definition.productIds) {
          const productionLanes = ["pd1", "ss1", "pd2", "ss2", "pd3"];
          return (
            !order.done
            && definition.productIds.includes(order.productId)
            && productionLanes.includes(currentStep(order).lane)
          );
        }
        return !order.done && definition.lanes.includes(currentStep(order).lane);
      })
      .map(orderSnapshotForDepartment);
  }

  function departmentStatus(definition, orders) {
    if (orders.some(order => order.status === "blocked")) return "blocked";
    if (definition.id === "inbound") {
      const lowParts = PARTS.filter(part => (state.inventory[part.id] || 0) <= part.reorder).length;
      if (lowParts > 0) return "attention";
    }
    if (orders.length > 0) return "active";
    if (definition.id === "dispatch" && state.orders.some(order => order.done)) return "complete";
    return "idle";
  }

  function sumProductStock(store) {
    return productIds().reduce((sum, productId) => sum + (store[productId] || 0), 0);
  }

  function departmentFacts(definition, orders) {
    if (definition.id === "inbound") {
      const total = PARTS.reduce((sum, part) => sum + (state.inventory[part.id] || 0), 0);
      const lowParts = PARTS.filter(part => (state.inventory[part.id] || 0) <= part.reorder).length;
      return {
        primaryMetric: `${total} onderdelen`,
        facts: [
          { label: "Totale grondstofvoorraad", value: total },
          { label: "Onder minimumsignaal", value: lowParts },
          { label: "Materiaaluitgiftes actief", value: orders.length }
        ]
      };
    }
    if (definition.id.startsWith("production_") && !definition.productIds) {
      const stageNumber = Number(definition.id.split("_")[1]) || 1;
      const departmentId = PRODUCTION_DEPARTMENT_IDS[stageNumber - 1];
      return {
        primaryMetric: `${orders.length} lopend`,
        facts: [
          { label: "Lopende orders", value: orders.length },
          { label: "Processtap", value: definition.shortTitle },
          { label: "Organisatie", value: "Functionele keten" },
          { label: "Materiaalwaarde laag", value: formatMoney(state.financial.materialCostByStage[stageNumber]) },
          { label: "Conversiekosten afdeling", value: formatMoney(state.financial.conversionCostByDepartment[departmentId]) },
          { label: "Cumulatief OHW", value: formatMoney(state.financial.wipByStage[stageNumber]) }
        ]
      };
    }
    if (definition.id === "production_1") {
      return {
        primaryMetric: `${orders.length} × Toren A`,
        facts: [
          { label: "Lopende productorders", value: orders.length },
          { label: "Product", value: "Toren A" },
          { label: "Afdeling", value: "A" },
          { label: "OHW", value: formatMoney(state.financial.wipByDepartment.A) },
          { label: "Gereed product", value: formatMoney(state.financial.finishedGoodsByDepartment.A) },
          { label: "Omzet", value: formatMoney(state.financial.revenueByDepartment.A) },
          { label: "Opportunity costs", value: formatMoney(state.financial.opportunityCostByDepartment.A) }
        ]
      };
    }
    if (definition.id === "production_2") {
      return {
        primaryMetric: `${orders.length} × Toren B`,
        facts: [
          { label: "Lopende productorders", value: orders.length },
          { label: "Product", value: "Toren B" },
          { label: "Afdeling", value: "B" },
          { label: "OHW", value: formatMoney(state.financial.wipByDepartment.B) },
          { label: "Gereed product", value: formatMoney(state.financial.finishedGoodsByDepartment.B) },
          { label: "Omzet", value: formatMoney(state.financial.revenueByDepartment.B) },
          { label: "Opportunity costs", value: formatMoney(state.financial.opportunityCostByDepartment.B) }
        ]
      };
    }
    if (definition.id === "production_3") {
      return {
        primaryMetric: `${orders.length} × Toren C`,
        facts: [
          { label: "Lopende productorders", value: orders.length },
          { label: "Product", value: "Toren C" },
          { label: "Afdeling", value: "C" },
          { label: "OHW", value: formatMoney(state.financial.wipByDepartment.C) },
          { label: "Gereed product", value: formatMoney(state.financial.finishedGoodsByDepartment.C) },
          { label: "Omzet", value: formatMoney(state.financial.revenueByDepartment.C) },
          { label: "Opportunity costs", value: formatMoney(state.financial.opportunityCostByDepartment.C) }
        ]
      };
    }
    if (definition.id === "quality") {
      return {
        primaryMetric: `${sumProductStock(state.finishedGoods)} gereed`,
        facts: [
          { label: "Te controleren orders", value: orders.length },
          { label: "Gereed-productvoorraad", value: sumProductStock(state.finishedGoods) },
          {
            label: "Voorraadwaarde",
            value: formatMoney(
              Object.values(state.financial.finishedGoodsByDepartment)
                .reduce((sum, value) => sum + value, 0)
            )
          },
          { label: "Kwaliteitsrol", value: "MFP" }
        ]
      };
    }
    const completed = state.orders.filter(order => order.done).length;
    return {
      primaryMetric: `${completed} uitgeleverd`,
      facts: [
        { label: "Afgeronde orders", value: completed },
        { label: "Lopende overdrachten", value: orders.filter(order => order.status !== "done").length },
        { label: "Archiefstatus", value: completed ? "Bijgewerkt" : "Leeg" }
      ]
    };
  }

  function tutorialStockTotal(stock) {
    return Object.values(stock).reduce((sum, amount) => sum + Number(amount || 0), 0);
  }

  function tutorialCollectedCount() {
    return tutorialStockTotal(state.logisticsTutorial.playerStock)
      + tutorialStockTotal(state.logisticsTutorial.assemblyStock);
  }

  function tutorialRequirementsComplete() {
    return Object.entries(LOGISTICS_TUTORIAL_REQUIREMENTS).every(
      ([partId, required]) => (state.logisticsTutorial.playerStock[partId] || 0) >= required
    );
  }

  function resetLogisticsTutorial() {
    state.logisticsTutorial.active = false;
    state.logisticsTutorial.phase = "locked";
    state.logisticsTutorial.warehouseStock = { blue_8: 0, yellow_4: 0, green_4: 0 };
    state.logisticsTutorial.playerStock = { blue_8: 0, yellow_4: 0, green_4: 0 };
    state.logisticsTutorial.assemblyStock = { blue_8: 0, yellow_4: 0, green_4: 0 };
    state.logisticsTutorial.semiFinished = { production: 0, nextDepartment: 0 };
    state.logisticsTutorial.finance = {
      enabled: false,
      moneyEnabled: Boolean(state.config.money),
      pnlEnabled: Boolean(state.config.pnl),
      openingBalance: 0,
      balance: 0,
      purchaseCost: 0,
      revenue: 0,
      margin: 0,
      picked: { blue_8: 0, yellow_4: 0, green_4: 0 },
      delivered: false,
      mutation: null,
      flash: ""
    };
    state.logisticsTutorial.feedback = "";
  }

  function setTutorialFocus(stage = "builder") {
    state.tutorialDismissed = false;
    logisticsGameController?.pause();
    setManagerTab(stage === "logistics" ? "process" : "session", false);
    state.tutorialStage = stage;
    state.tutorialPaused = false;
    document.body.classList.add("tutorial-focus");
    document.body.classList.toggle("tutorial-stage-builder", stage === "builder");
    document.body.classList.toggle("tutorial-stage-logistics", stage === "logistics");
    syncWorkbenchVisibility(state.appView);
    if (els.tutorialExitButton) els.tutorialExitButton.hidden = false;
    document.querySelectorAll("[data-tutorial-launch]").forEach(button => {
      button.hidden = true;
    });
  }

  function leaveTutorialFocus() {
    document.body.classList.remove(
      "tutorial-focus",
      "tutorial-stage-builder",
      "tutorial-stage-logistics"
    );
    const activeView = sessionStorage.getItem("learngame.om.appView") || state.appView || "player";
    setAppView(activeView, false);
    if (state.gameSessionRunning) logisticsGameController?.resume();
    if (els.tutorialExitButton) els.tutorialExitButton.hidden = true;
    updateTutorialResumeButton();
  }

  function updateTutorialResumeButton() {
    const isFocus = document.body.classList.contains("tutorial-focus");
    const label = state.tutorialCompleted ? "Tutorial opnieuw" : "Tutorial hervatten";
    document.querySelectorAll("[data-tutorial-launch]").forEach(button => {
      button.hidden = isFocus;
      if (!isFocus) {
        button.style.display = "";
        const labelNode = button.querySelector("[data-tutorial-label]")
          || button.querySelector("span:last-child");
        if (labelNode) labelNode.textContent = label;
        button.title = state.tutorialCompleted
          ? "Tutorial opnieuw starten vanaf Stap 1"
          : "Tutorial hervatten waar je bent gestopt";
      }
    });
  }

  let lastTutorialStateUpdateTimestamp = 0;

  function launchTutorial() {
    if (document.body.classList.contains("tutorial-focus")) return true;
    if (state.tutorialPaused || state.tutorialCompleted) return resumeTutorial();
    lastTutorialStateUpdateTimestamp = Date.now();
    try {
      localStorage.removeItem("learngame.om.tutorialCompleted");
      localStorage.removeItem("learngame.om.tutorialDismissed");
    } catch (e) {}
    syncTutorialStateToBackend(false, false);
    state.tutorialCompleted = false;
    state.tutorialDismissed = false;
    state.tutorialPaused = false;
    state.tutorialStage = "builder";
    resetLogisticsTutorial();
    window.LegoBuilder?.restartTutorial();
    setTutorialFocus("builder");
    updateTutorialResumeButton();
    dispatchInteraction({
      actionType: "restart_onboarding_tutorial",
      learningObjectID: "self_starting_tutorial",
      objectRole: "onboarding",
      role: "Lerende",
      result: "restarted",
      step: 1
    });
    dispatchInteraction({
      actionType: "resume_onboarding_tutorial",
      learningObjectID: "self_starting_tutorial",
      objectRole: "onboarding",
      role: "Lerende",
      result: "resumed",
      step: 1
    });
    renderAll();
    els.legoBuilderMount?.scrollIntoView({ behavior: "smooth", block: "start" });
    return true;
  }

  async function syncTutorialStateToBackend(completed, dismissed) {
    const apiBase = (window.LeerpretAuth?.getSession?.().apiBase || "").replace(/\/+$/, "");
    if (!apiBase) return;
    try {
      await fetch(`${apiBase}/v1/player/tutorial-state`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: Boolean(completed), dismissed: Boolean(dismissed) })
      });
    } catch (e) {
      console.warn("Could not sync tutorial state to backend:", e);
    }
  }

  async function checkBackendTutorialState() {
    const requestStartTime = Date.now();
    const apiBase = (window.LeerpretAuth?.getSession?.().apiBase || "").replace(/\/+$/, "");
    if (!apiBase) return;
    try {
      const res = await fetch(`${apiBase}/v1/player/tutorial-state`, {
        method: "GET",
        credentials: "include"
      });
      if (res.ok) {
        const data = await res.json();
        if (requestStartTime < lastTutorialStateUpdateTimestamp || document.body.classList.contains("tutorial-focus")) {
          return;
        }
        if (data.completed || data.dismissed) {
          state.tutorialCompleted = Boolean(data.completed);
          state.tutorialDismissed = Boolean(data.dismissed);
          try {
            if (data.completed) localStorage.setItem("learngame.om.tutorialCompleted", "true");
            if (data.dismissed) localStorage.setItem("learngame.om.tutorialDismissed", "true");
          } catch (e) {}
          leaveTutorialFocus();
          updateTutorialResumeButton();
        }
      }
    } catch (e) {
      console.warn("Could not fetch tutorial state from backend:", e);
    }
  }

  function pauseTutorial() {
    if (state.tutorialDismissed || state.tutorialCompleted) return false;
    const phase = state.logisticsTutorial.phase;
    state.tutorialDismissed = true;
    state.tutorialPaused = true;
    state.logisticsTutorial.active = false;
    try {
      localStorage.setItem("learngame.om.tutorialDismissed", "true");
    } catch (e) {}
    syncTutorialStateToBackend(state.tutorialCompleted, true);
    leaveTutorialFocus();
    updateTutorialResumeButton();
    dispatchInteraction({
      actionType: "pause_onboarding_tutorial",
      learningObjectID: "self_starting_tutorial",
      objectRole: "onboarding",
      role: "Lerende",
      result: "paused",
      phase,
      stage: state.tutorialStage
    });
    renderAll();
    window.scrollTo({ top: 0, behavior: "smooth" });
    return true;
  }

  function resumeTutorial() {
    lastTutorialStateUpdateTimestamp = Date.now();
    try {
      localStorage.removeItem("learngame.om.tutorialCompleted");
      localStorage.removeItem("learngame.om.tutorialDismissed");
    } catch (e) {}
    syncTutorialStateToBackend(false, false);
    const wasCompleted = state.tutorialCompleted;
    state.tutorialCompleted = false;
    state.tutorialDismissed = false;
    state.tutorialPaused = false;

    if (wasCompleted) {
      state.tutorialStage = "builder";
      resetLogisticsTutorial();
      window.LegoBuilder?.restartTutorial();
      setTutorialFocus("builder");
      dispatchInteraction({
        actionType: "restart_onboarding_tutorial",
        learningObjectID: "self_starting_tutorial",
        objectRole: "onboarding",
        role: "Lerende",
        result: "restarted",
        step: 1
      });
      renderAll();
      els.legoBuilderMount?.scrollIntoView({ behavior: "smooth", block: "start" });
      return true;
    }

    if (state.tutorialStage === "logistics") {
      state.logisticsTutorial.active = true;
      state.config.processView = "isometric";
      els.dataModelPanel.classList.add("visible");
      setTutorialFocus("logistics");
      renderAll();
      els.dataModelPanel.scrollIntoView({ behavior: "smooth", block: "start" });
    } else if (state.tutorialStage === "finance") {
      startFinancialTutorial();
    } else {
      setTutorialFocus("builder");
      renderAll();
      els.legoBuilderMount?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    updateTutorialResumeButton();
    dispatchInteraction({
      actionType: "resume_onboarding_tutorial",
      learningObjectID: "self_starting_tutorial",
      objectRole: "onboarding",
      role: "Lerende",
      result: "resumed",
      phase: state.logisticsTutorial.phase,
      stage: state.tutorialStage
    });
    return true;
  }

  function endTutorial({ completed = false } = {}) {
    const phase = state.logisticsTutorial.phase;
    state.tutorialDismissed = true;
    state.tutorialCompleted = completed;
    state.tutorialPaused = false;
    state.logisticsTutorial.active = false;
    state.logisticsTutorial.phase = completed ? "tutorial_complete" : "tutorial_skipped";
    state.selectedLogisticsDepartmentId = "inbound";
    try {
      localStorage.setItem("learngame.om.tutorialDismissed", "true");
      if (completed) {
        localStorage.setItem("learngame.om.tutorialCompleted", "true");
      }
    } catch (e) {}
    syncTutorialStateToBackend(completed, true);
    els.dataModelPanel.classList.remove("visible");
    leaveTutorialFocus();
    updateTutorialResumeButton();
    dispatchInteraction({
      actionType: completed ? "complete_onboarding_tutorial" : "end_onboarding_tutorial",
      learningObjectID: "self_starting_tutorial",
      objectRole: "onboarding",
      role: "Lerende",
      result: completed ? "completed" : "skipped",
      phase
    });
    renderAll();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function startLogisticsTutorial(force = false) {
    if (state.logisticsTutorial.active && !force) {
      els.dataModelPanel.classList.add("visible");
      state.config.processView = "isometric";
      renderDataModel(true);
      els.dataModelPanel.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    state.logisticsTutorial.active = true;
    setTutorialFocus("logistics");
    state.logisticsTutorial.phase = "collecting";
    state.logisticsTutorial.warehouseStock = {
      blue_8: state.inventory.blue_8 || 0,
      yellow_4: state.inventory.yellow_4 || 0,
      green_4: state.inventory.green_4 || 0
    };
    state.logisticsTutorial.playerStock = { blue_8: 0, yellow_4: 0, green_4: 0 };
    state.logisticsTutorial.assemblyStock = { blue_8: 0, yellow_4: 0, green_4: 0 };
    state.logisticsTutorial.feedback = "Sleep de juiste blokken vanuit de open magazijnen naar de Bouwvoorraad. Let goed op het formaat.";
    state.selectedLogisticsDepartmentId = "tutorial_warehouse_a";
    state.config.processView = "isometric";
    els.dataModelPanel.classList.add("visible");
    dispatchInteraction({
      actionType: "start_logistics_tutorial_step",
      learningObjectID: "tutorial_step_2_warehouse_inventory",
      objectRole: "onboarding",
      role: "Lerende",
      result: "started",
      step: 2
    });
    renderAll();
    els.dataModelPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function collectTutorialMaterial(departmentId) {
    const definition = LOGISTICS_TUTORIAL_DEPARTMENTS.find(item => item.id === departmentId);
    const partId = definition?.materialId;
    if (!partId || state.logisticsTutorial.phase !== "collecting") return false;
    state.selectedLogisticsDepartmentId = departmentId;
    const required = LOGISTICS_TUTORIAL_REQUIREMENTS[partId] || 0;
    const collected = state.logisticsTutorial.playerStock[partId] || 0;
    if (collected >= required) {
      state.logisticsTutorial.feedback = `${definition.shortTitle} is voor deze opdracht compleet.`;
      renderDataModel(true);
      return false;
    }
    if ((state.logisticsTutorial.warehouseStock[partId] || 0) <= 0) {
      state.logisticsTutorial.feedback = `${definition.shortTitle} heeft onvoldoende voorraad.`;
      renderDataModel(true);
      return false;
    }
    state.logisticsTutorial.warehouseStock[partId] -= 1;
    state.logisticsTutorial.playerStock[partId] = collected + 1;
    state.inventory[partId] = Math.max(0, (state.inventory[partId] || 0) - 1);
    const ready = tutorialRequirementsComplete();
    if (ready) {
      state.logisticsTutorial.phase = "ready";
      state.logisticsTutorial.feedback = "Alle juiste blokken zijn bij Productieafdeling B aangekomen.";
      state.selectedLogisticsDepartmentId = "tutorial_player_stock";
    } else {
      const remainingLabels = {
        blue_8: "blauw 2×4",
        yellow_4: "geel 2×2",
        green_4: "groen 2×2"
      };
      const remaining = Object.entries(LOGISTICS_TUTORIAL_REQUIREMENTS)
        .map(([requiredPartId, amount]) => ({
          label: remainingLabels[requiredPartId],
          amount: Math.max(0, amount - (state.logisticsTutorial.playerStock[requiredPartId] || 0))
        }))
        .filter(item => item.amount > 0)
        .map(item => `${item.amount}× ${item.label}`);
      state.logisticsTutorial.feedback = `Nog ophalen: ${remaining.join(", ")}.`;
    }
    dispatchInteraction({
      actionType: "collect_tutorial_material",
      learningObjectID: `tutorial_stock_${partId}`,
      objectRole: "warehouse_pick",
      role: "Lerende",
      result: "success",
      departmentId,
      partId,
      warehouseRemaining: state.logisticsTutorial.warehouseStock[partId],
      playerStock: state.logisticsTutorial.playerStock[partId]
    });
    renderAll();
    if (ready) {
      window.setTimeout(() => {
        if (state.logisticsTutorial.phase === "ready" && !state.tutorialPaused) {
          transferTutorialStockToAssembly();
        }
      }, 1100);
    }
    return true;
  }

  function dropTutorialMaterial({ sourceDepartmentId, targetDepartmentId, partId } = {}) {
    if (
      state.logisticsTutorial.phase !== "collecting"
      || targetDepartmentId !== "tutorial_player_stock"
    ) {
      return false;
    }
    const definition = LOGISTICS_TUTORIAL_DEPARTMENTS.find(
      item => item.id === sourceDepartmentId
    );
    if (!definition?.materialId) return false;
    state.selectedLogisticsDepartmentId = sourceDepartmentId;
    if (partId !== definition.materialId) {
      const distractor = definition.distractorParts?.find(part => part.id === partId);
      const wrongPart = distractor
        ? distractor.label
        : "dit blok";
      state.logisticsTutorial.feedback = `${wrongPart} hoort niet bij deze ophaalopdracht. Leg het terug en vergelijk kleur én aantal noppen met Toren B.`;
      dispatchInteraction({
        actionType: "reject_tutorial_material_drop",
        learningObjectID: `tutorial_stock_${partId}`,
        objectRole: "warehouse_sorting",
        role: "Lerende",
        result: "incorrect",
        sourceDepartmentId,
        targetDepartmentId,
        partId,
        reason: "wrong_brick_type"
      });
      return false;
    }
    return collectTutorialMaterial(sourceDepartmentId);
  }

  function transferTutorialStockToAssembly() {
    if (state.logisticsTutorial.phase !== "ready" || !tutorialRequirementsComplete()) {
      state.logisticsTutorial.feedback = "De bouwplek van Productieafdeling B blijft vergrendeld totdat de materiaalset compleet is.";
      renderDataModel(true);
      return false;
    }
    state.logisticsTutorial.assemblyStock = { ...state.logisticsTutorial.playerStock };
    state.logisticsTutorial.playerStock = { blue_8: 0, yellow_4: 0, green_4: 0 };
    state.logisticsTutorial.phase = "complete";
    state.logisticsTutorial.feedback = "Voorraad afgeleverd. Ga terug naar de bouwafdeling en zet Toren B in elkaar.";
    window.LegoBuilder?.setStockTutorialInventory(state.logisticsTutorial.assemblyStock);
    setTutorialFocus("builder");
    dispatchInteraction({
      actionType: "complete_logistics_tutorial_step",
      learningObjectID: "tutorial_step_2_warehouse_inventory",
      objectRole: "onboarding",
      role: "Lerende",
      result: "success",
      step: 2,
      assemblyStock: { ...state.logisticsTutorial.assemblyStock }
    });
    renderAll();
    els.legoBuilderMount?.scrollIntoView({ behavior: "smooth", block: "start" });
    return true;
  }

  function startInternalLogisticsTutorial() {
    state.logisticsTutorial.active = true;
    setTutorialFocus("logistics");
    state.logisticsTutorial.phase = "internal_ready";
    state.logisticsTutorial.semiFinished = { production: 1, nextDepartment: 0 };
    state.logisticsTutorial.feedback = "Productieafdeling B heeft Toren B compleet gebouwd. Sleep de toren naar Magazijn Gereed Product.";
    state.selectedLogisticsDepartmentId = "tutorial_production";
    state.config.processView = "isometric";
    els.dataModelPanel.classList.add("visible");
    dispatchInteraction({
      actionType: "start_internal_logistics_tutorial_step",
      learningObjectID: "tutorial_step_3_internal_logistics",
      objectRole: "onboarding",
      role: "Lerende",
      result: "started",
      step: 3,
      productId: "B"
    });
    renderAll();
    els.dataModelPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function transferTutorialSemiFinished() {
    if (
      state.logisticsTutorial.phase !== "internal_ready"
      || state.logisticsTutorial.semiFinished.production < 1
    ) {
      return false;
    }
    state.logisticsTutorial.semiFinished.production = 0;
    state.logisticsTutorial.semiFinished.nextDepartment = 1;
    state.logisticsTutorial.phase = "internal_complete";
    state.logisticsTutorial.feedback = "Interne logistiek voltooid: de complete Toren B is ontvangen door Magazijn Gereed Product.";
    state.selectedLogisticsDepartmentId = "tutorial_next_department";
    dispatchInteraction({
      actionType: "complete_internal_logistics_tutorial_step",
      learningObjectID: "tutorial_step_3_internal_logistics",
      objectRole: "internal_transport",
      role: "Lerende",
      result: "success",
      step: 3,
      productId: "B",
      fromDepartment: "Productie",
      toDepartment: "Gereed Product",
      quantity: 1
    });
    renderAll();
    window.setTimeout(() => {
      if (state.logisticsTutorial.phase === "internal_complete" && !state.tutorialPaused) {
        finishInternalLogisticsTutorial();
      }
    }, 1250);
    return true;
  }

  function dropTutorialSemiFinished({
    sourceDepartmentId,
    targetDepartmentId,
    cargoId
  } = {}) {
    if (
      state.logisticsTutorial.phase !== "internal_ready"
      || sourceDepartmentId !== "tutorial_production"
      || targetDepartmentId !== "tutorial_next_department"
      || cargoId !== "tower_b_semi_finished"
    ) {
      state.logisticsTutorial.feedback = "Sleep de complete Toren B vanuit Productieafdeling B naar Magazijn Gereed Product.";
      return false;
    }
    return transferTutorialSemiFinished();
  }

  function finishInternalLogisticsTutorial() {
    if (state.logisticsTutorial.phase !== "internal_complete") return false;
    window.LegoBuilder?.setInternalLogisticsComplete(true);
    startFinancialTutorial();
    return true;
  }

  function financialTutorialProduct() {
    return productById("B");
  }

  function financialTutorialSalePrice() {
    const product = financialTutorialProduct();
    if (state.config.priceMode !== "fixed" && els.productSelect.value === "B") {
      return Math.max(0, Number(els.priceInput.value || product.price));
    }
    return product.price;
  }

  function financialTutorialMaterialTotal() {
    return Object.entries(LOGISTICS_TUTORIAL_REQUIREMENTS).reduce(
      (sum, [partId, quantity]) => sum + partById(partId).price * quantity,
      0
    );
  }

  function financialTutorialPickedTotal() {
    return tutorialStockTotal(state.logisticsTutorial.finance.picked);
  }

  function financialTutorialMaterialsComplete() {
    return Object.entries(LOGISTICS_TUTORIAL_REQUIREMENTS).every(
      ([partId, required]) => (state.logisticsTutorial.finance.picked[partId] || 0) >= required
    );
  }

  function showFinancialMutation(departmentId, amount) {
    const finance = state.logisticsTutorial.finance;
    if (!finance.moneyEnabled || !amount) return;
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    finance.mutation = { id, departmentId, amount };
    finance.flash = amount > 0 ? "credit" : "debit";
    window.setTimeout(() => {
      if (state.logisticsTutorial.finance.mutation?.id !== id) return;
      state.logisticsTutorial.finance.mutation = null;
      state.logisticsTutorial.finance.flash = "";
      renderDataModel(true);
    }, 1050);
  }

  function startFinancialTutorial() {
    const finance = state.logisticsTutorial.finance;
    const salePrice = financialTutorialSalePrice();
    finance.enabled = true;
    finance.moneyEnabled = Boolean(state.config.money);
    finance.pnlEnabled = Boolean(state.config.pnl);
    finance.openingBalance = finance.moneyEnabled ? Math.max(salePrice * 2, financialTutorialMaterialTotal() * 4) : 0;
    finance.balance = finance.openingBalance;
    finance.purchaseCost = 0;
    finance.revenue = 0;
    finance.margin = 0;
    finance.picked = { blue_8: 0, yellow_4: 0, green_4: 0 };
    finance.delivered = false;
    finance.mutation = null;
    finance.flash = "";
    state.logisticsTutorial.active = true;
    state.logisticsTutorial.phase = "financial_purchase";
    state.logisticsTutorial.feedback = finance.moneyEnabled
      ? "Voltooi de order en let op de financiële mutaties bij inkoop en verkoop."
      : "Geld staat uit in de Game Master-instellingen. Doorloop de order zonder financiële mutaties.";
    state.selectedLogisticsDepartmentId = "tutorial_finance_warehouse";
    state.config.processView = "isometric";
    setTutorialFocus("logistics");
    els.dataModelPanel.classList.add("visible");
    dispatchInteraction({
      actionType: "start_financial_tutorial_step",
      learningObjectID: "tutorial_step_4_financial_transaction",
      objectRole: "onboarding",
      role: "Lerende",
      result: "started",
      step: 4,
      productId: "B",
      moneyEnabled: finance.moneyEnabled,
      pnlEnabled: finance.pnlEnabled,
      openingBalance: finance.openingBalance,
      configuredSalePrice: salePrice,
      configuredMaterialCost: financialTutorialMaterialTotal()
    });
    renderAll();
    els.dataModelPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function dropFinancialTutorialMaterial({
    sourceDepartmentId,
    targetDepartmentId,
    partId
  } = {}) {
    const tutorial = state.logisticsTutorial;
    const finance = tutorial.finance;
    if (
      tutorial.phase !== "financial_purchase"
      || sourceDepartmentId !== "tutorial_finance_warehouse"
      || targetDepartmentId !== "tutorial_finance_production_b"
    ) return false;
    if (!(partId in LOGISTICS_TUTORIAL_REQUIREMENTS)) {
      const distractor = FINANCIAL_TUTORIAL_DISTRACTORS.find(part => part.partId === partId);
      tutorial.feedback = `${distractor?.label || "Dit blok"} staat niet op de stuklijst van Toren B en wordt daarom niet financieel geboekt.`;
      dispatchInteraction({
        actionType: "reject_financial_tutorial_material",
        learningObjectID: `tutorial_finance_${partId}`,
        objectRole: "financial_material_selection",
        role: "Lerende",
        result: "incorrect",
        step: 4,
        partId,
        reason: "not_in_tower_b_bill_of_materials"
      });
      return false;
    }

    const required = LOGISTICS_TUTORIAL_REQUIREMENTS[partId];
    const picked = finance.picked[partId] || 0;
    if (picked >= required) return false;
    finance.picked[partId] = picked + 1;
    const cost = finance.moneyEnabled ? partById(partId).price : 0;
    finance.purchaseCost += cost;
    finance.balance -= cost;
    state.purchaseCost += state.config.pnl ? cost : 0;
    state.selectedLogisticsDepartmentId = "tutorial_finance_production_b";
    showFinancialMutation("tutorial_finance_warehouse", -cost);

    const complete = financialTutorialMaterialsComplete();
    if (complete) {
      tutorial.phase = "financial_production_ready";
      tutorial.feedback = "Productieafdeling B heeft de complete toren gebouwd. Sleep Toren B naar Magazijn Gereed Product.";
    } else {
      tutorial.feedback = "De afschrijving is verwerkt. Haal ook de overige onderdelen op.";
    }
    dispatchInteraction({
      actionType: "tutorial_financial_material_issue",
      learningObjectID: `tutorial_finance_${partId}`,
      objectRole: "internal_settlement",
      role: "Lerende",
      result: "success",
      step: 4,
      partId,
      amount: cost,
      balance: finance.balance,
      moneyEnabled: finance.moneyEnabled
    });
    renderAll();
    return true;
  }

  function transferFinancialTutorialProduct({
    sourceDepartmentId,
    targetDepartmentId,
    cargoId
  } = {}) {
    const tutorial = state.logisticsTutorial;
    if (
      tutorial.phase !== "financial_production_ready"
      || sourceDepartmentId !== "tutorial_finance_production_b"
      || targetDepartmentId !== "tutorial_finance_finished"
      || cargoId !== "tower_b_customer_order"
    ) return false;

    tutorial.phase = "financial_sale_ready";
    tutorial.feedback = "Toren B is als gereed product ontvangen. Sleep de toren nu naar Expeditie.";
    state.selectedLogisticsDepartmentId = "tutorial_finance_finished";
    dispatchInteraction({
      actionType: "tutorial_financial_finished_goods_receipt",
      learningObjectID: "tutorial_finance_tower_b_finished",
      objectRole: "finished_goods_transfer",
      role: "Lerende",
      result: "success",
      step: 4,
      productId: "B",
      productionDepartment: "B",
      workInProgress: state.logisticsTutorial.finance.purchaseCost
    });
    renderAll();
    return true;
  }

  function dropFinancialTutorialCargo(payload = {}) {
    return transferFinancialTutorialProduct(payload)
      || deliverFinancialTutorialOrder(payload);
  }

  function deliverFinancialTutorialOrder({
    sourceDepartmentId,
    targetDepartmentId,
    cargoId
  } = {}) {
    const tutorial = state.logisticsTutorial;
    const finance = tutorial.finance;
    if (
      tutorial.phase !== "financial_sale_ready"
      || sourceDepartmentId !== "tutorial_finance_finished"
      || targetDepartmentId !== "tutorial_finance_dispatch"
      || cargoId !== "tower_b_customer_order"
    ) return false;

    const revenue = finance.moneyEnabled ? financialTutorialSalePrice() : 0;
    finance.revenue = revenue;
    finance.balance += revenue;
    finance.margin = revenue - finance.purchaseCost;
    finance.delivered = true;
    tutorial.phase = "financial_complete";
    tutorial.feedback = finance.moneyEnabled
      ? "Verkoop ontvangen. Bekijk de marge en ga daarna door naar de meesterproef."
      : "Order geleverd. Geld stond uit, daarom zijn geen bedragen geboekt.";
    state.selectedLogisticsDepartmentId = "tutorial_finance_dispatch";
    showFinancialMutation("tutorial_finance_dispatch", revenue);
    dispatchInteraction({
      actionType: "complete_financial_tutorial_transaction",
      learningObjectID: "tutorial_step_4_financial_transaction",
      objectRole: "sale",
      role: "Lerende",
      result: "success",
      step: 4,
      productId: "B",
      purchaseCost: finance.purchaseCost,
      revenue: finance.revenue,
      margin: finance.margin,
      closingBalance: finance.balance,
      moneyEnabled: finance.moneyEnabled
    });
    renderAll();
    return true;
  }

  function finishFinancialTutorial() {
    if (state.logisticsTutorial.phase !== "financial_complete") return false;
    dispatchInteraction({
      actionType: "start_tutorial_mastery_trial",
      learningObjectID: "tutorial_step_5_mastery",
      objectRole: "onboarding",
      role: "Lerende",
      result: "started",
      step: 5
    });
    endTutorial({ completed: true });
    return true;
  }

  function financialTutorialScene() {
    const tutorial = state.logisticsTutorial;
    const finance = tutorial.finance;
    const materialsComplete = financialTutorialMaterialsComplete();
    const delivered = tutorial.phase === "financial_complete";
    const pickedTotal = financialTutorialPickedTotal();
    const remainingTotal = Object.values(LOGISTICS_TUTORIAL_REQUIREMENTS).reduce(
      (sum, amount) => sum + amount,
      0
    ) - pickedTotal;
    const partVisuals = {
      blue_8: { color: "blue", width: 4, depth: 2, label: "blauw 2×4-blok" },
      yellow_4: { color: "yellow", width: 2, depth: 2, label: "geel 2×2-blok" },
      green_4: { color: "green", width: 2, depth: 2, label: "groen 2×2-blok" }
    };
    const departments = FINANCIAL_TUTORIAL_DEPARTMENTS.map(definition => {
      if (definition.id === "tutorial_finance_warehouse") {
        return {
          ...definition,
          orders: [],
          stockVisuals: [
            ...Object.entries(LOGISTICS_TUTORIAL_REQUIREMENTS).map(([partId, required]) => ({
              ...partVisuals[partId],
              partId,
              count: Math.max(0, required - (finance.picked[partId] || 0)),
              draggable: tutorial.phase === "financial_purchase"
            })),
            ...FINANCIAL_TUTORIAL_DISTRACTORS.map(part => ({
              ...part,
              count: 1,
              draggable: tutorial.phase === "financial_purchase"
            }))
          ],
          status: remainingTotal ? "active" : "complete",
          badgeValue: remainingTotal,
          badgeLabel: `${remainingTotal} onderdelen nog uit te geven`,
          primaryMetric: `${remainingTotal} onderdelen beschikbaar`,
          facts: [
            { label: "Onderdelen nog uitgeven", value: remainingTotal },
            { label: "Verrekenprijs", value: finance.moneyEnabled ? formatMoney(financialTutorialMaterialTotal()) : "Geld uit" }
          ]
        };
      }
      if (definition.id.startsWith("tutorial_finance_production_")) {
        const isProductionB = definition.id === "tutorial_finance_production_b";
        const productionReady = tutorial.phase === "financial_production_ready";
        return {
          ...definition,
          orders: [],
          stockVisuals: isProductionB && !materialsComplete
            ? Object.entries(finance.picked).map(([partId, count]) => ({
                ...partVisuals[partId],
                partId,
                count,
                draggable: false
              }))
            : [],
          cargoVisual: isProductionB && productionReady
            ? {
                kind: "tower",
                cargoId: "tower_b_customer_order",
                productId: "B",
                label: "Complete Toren B",
                draggable: true
              }
            : null,
          acceptsStockDrop: isProductionB && tutorial.phase === "financial_purchase",
          status: isProductionB ? (materialsComplete ? "complete" : "active") : "idle",
          highlight: isProductionB && (
            tutorial.phase === "financial_purchase"
            || tutorial.phase === "financial_production_ready"
          ),
          badgeValue: isProductionB ? (materialsComplete ? 1 : pickedTotal) : 0,
          badgeLabel: isProductionB
            ? (materialsComplete ? "1 complete Toren B" : `${pickedTotal}/4 onderdelen ontvangen`)
            : "Geen actieve order",
          primaryMetric: isProductionB
            ? (materialsComplete ? "Toren B compleet" : `${pickedTotal}/4 onderdelen`)
            : "Capaciteit beschikbaar",
          facts: [
            { label: "OHW", value: isProductionB && finance.moneyEnabled ? formatMoney(finance.purchaseCost) : formatMoney(0) },
            { label: "Complete producten", value: isProductionB && materialsComplete ? 1 : 0 }
          ]
        };
      }
      if (definition.id === "tutorial_finance_finished") {
        const inFinishedGoods = tutorial.phase === "financial_sale_ready";
        return {
          ...definition,
          orders: [],
          stockVisuals: [],
          cargoVisual: inFinishedGoods
            ? {
                kind: "tower",
                cargoId: "tower_b_customer_order",
                productId: "B",
                label: "Toren B voor de klant",
                draggable: true
              }
            : null,
          acceptsCargoDrop: tutorial.phase === "financial_production_ready",
          status: inFinishedGoods || delivered ? "complete" : "idle",
          highlight: tutorial.phase === "financial_production_ready",
          badgeValue: inFinishedGoods ? 1 : 0,
          badgeLabel: inFinishedGoods ? "1 verkoopklare Toren B" : "Nog geen gereed product",
          primaryMetric: inFinishedGoods ? "Toren B verkoopklaar" : "Wacht op productie",
          facts: [
            { label: "Gereed product", value: inFinishedGoods ? 1 : 0 },
            { label: "Voorraadwaarde", value: inFinishedGoods && finance.moneyEnabled ? formatMoney(finance.purchaseCost) : formatMoney(0) }
          ]
        };
      }
      return {
        ...definition,
        orders: [],
        cargoVisual: delivered
          ? {
              kind: "tower",
              cargoId: "tower_b_customer_order",
              productId: "B",
              label: "geleverde Toren B",
              draggable: false
            }
          : null,
        acceptsCargoDrop: tutorial.phase === "financial_sale_ready",
        status: delivered ? "complete" : materialsComplete ? "active" : "idle",
        highlight: tutorial.phase === "financial_sale_ready",
        locked: !materialsComplete,
        badgeValue: delivered ? 1 : 0,
        badgeLabel: delivered ? "1 order geleverd" : "Nog geen levering",
        primaryMetric: delivered ? "Verkoop ontvangen" : "Wacht op Toren B",
        facts: [
          { label: "Order", value: "Toren B" },
          { label: "Opbrengst", value: finance.moneyEnabled ? formatMoney(finance.revenue) : "Geld uit" }
        ]
      };
    });

    return {
      title: "Tutorial · Financieel & Transactie",
      legend: [
        { color: "raw", label: "Magazijn Grondstoffen" },
        { color: "production", label: "Parallelle productie A / B / C" },
        { color: "finished", label: "Gereed Product" },
        { color: "yellow", label: "Expeditie" }
      ],
      selectedDepartmentId: state.selectedLogisticsDepartmentId,
      departments,
      connections: FINANCIAL_TUTORIAL_CONNECTIONS.map(connection => (
        connection.to === "tutorial_finance_dispatch"
          ? {
              ...connection,
              locked: tutorial.phase !== "financial_sale_ready",
              highlight: tutorial.phase === "financial_sale_ready"
            }
          : connection.from === "tutorial_finance_production_b"
            ? {
                ...connection,
                locked: tutorial.phase !== "financial_production_ready",
                highlight: tutorial.phase === "financial_production_ready"
              }
            : {
                ...connection,
                highlight: connection.to === "tutorial_finance_production_b"
                  && tutorial.phase === "financial_purchase"
              }
      )),
      finance: {
        active: true,
        moneyEnabled: finance.moneyEnabled,
        pnlEnabled: finance.pnlEnabled,
        openingBalance: finance.openingBalance,
        balance: finance.balance,
        purchaseCost: finance.purchaseCost,
        revenue: finance.revenue,
        margin: finance.margin,
        flash: finance.flash,
        mutation: finance.mutation,
        departments: [
          { id: "A", workInProgress: 0, finishedGoods: 0 },
          {
            id: "B",
            workInProgress: tutorial.phase === "financial_purchase" || tutorial.phase === "financial_production_ready"
              ? finance.purchaseCost
              : 0,
            finishedGoods: tutorial.phase === "financial_sale_ready" ? finance.purchaseCost : 0
          },
          { id: "C", workInProgress: 0, finishedGoods: 0 }
        ],
        complete: delivered,
        nextLabel: "Naar Stap 5"
      },
      tutorial: {
        active: true,
        visualOnly: false,
        stepLabel: "4 / 5",
        eyebrow: "Self-starting tutorial · stap 4",
        title: "Financieel & Transactie",
        instruction: finance.moneyEnabled
          ? "Kies in Magazijn Grondstoffen alleen de vier onderdelen van Toren B. Bouw de complete toren parallel in Productie B en lever via Gereed Product aan Expeditie."
          : "Kies in het magazijn alleen de vier onderdelen van Toren B. De Game Master heeft spelen met geld uitgeschakeld.",
        feedback: tutorial.feedback,
        status: tutorial.phase,
        collected: delivered ? 2 : materialsComplete ? 1 : 0,
        required: 2
      }
    };
  }

  function internalLogisticsTutorialScene() {
    const tutorial = state.logisticsTutorial;
    const completed = tutorial.phase === "internal_complete";
    const productionAmount = tutorial.semiFinished.production;
    const nextDepartmentAmount = tutorial.semiFinished.nextDepartment;
    const departments = INTERNAL_LOGISTICS_TUTORIAL_DEPARTMENTS.map(definition => {
      if (definition.id === "tutorial_production") {
        return {
          ...definition,
          orders: [],
          cargoVisual: completed
            ? null
            : {
                kind: "tower",
                cargoId: "tower_b_semi_finished",
                productId: "B",
                label: "gebouwde Toren B",
                draggable: true
              },
          status: completed ? "idle" : "active",
          badgeValue: productionAmount,
          badgeLabel: `${productionAmount} complete Toren B bij Productie`,
          primaryMetric: productionAmount ? "1 complete Toren B gereed" : "Transport vertrokken",
          facts: [
            { label: "Product", value: "Toren B" },
            { label: "Complete producten aanwezig", value: productionAmount },
            { label: "Transportstatus", value: completed ? "Doorgestuurd" : "Wacht op overdracht" }
          ],
          feedback: completed
            ? { kind: "success", text: "De complete Toren B heeft Productieafdeling B verlaten." }
            : { kind: "info", text: "Pak Toren B vast en sleep hem naar Magazijn Gereed Product." }
        };
      }
      return {
        ...definition,
        orders: [],
        cargoVisual: completed
          ? {
              kind: "tower",
              cargoId: "tower_b_semi_finished",
              productId: "B",
              label: "ontvangen Toren B",
              draggable: false
            }
          : null,
        acceptsCargoDrop: !completed,
        status: completed ? "complete" : "idle",
        badgeValue: nextDepartmentAmount,
        badgeLabel: `${nextDepartmentAmount} complete Toren B ontvangen`,
        primaryMetric: completed ? "1 complete Toren B ontvangen" : "Wacht op intern transport",
        locked: false,
        highlight: !completed,
        facts: [
          { label: "Product", value: completed ? "Toren B" : "Nog niet ontvangen" },
          { label: "Complete producten ontvangen", value: nextDepartmentAmount },
          { label: "Ontvangststatus", value: completed ? "Bevestigd" : "Onderweg na overdracht" }
        ],
        feedback: completed
          ? { kind: "success", text: "Ontvangst bevestigd. Stap 3 is voltooid." }
          : { kind: "info", text: "Zet de complete Toren B eerst vanuit Productieafdeling B door." },
        action: completed
          ? { label: "Ga verder naar de volgende opdracht", disabled: false }
          : null
      };
    });
    return {
      title: "Tutorial · Interne Logistiek",
      legend: [
        { color: "production-b", label: "Productie" },
        { color: "finished", label: "Magazijn Gereed Product" }
      ],
      selectedDepartmentId: state.selectedLogisticsDepartmentId,
      departments,
      connections: INTERNAL_LOGISTICS_TUTORIAL_CONNECTIONS.map(connection => ({
        ...connection,
        highlight: !completed
      })),
      tutorial: {
        active: true,
        visualOnly: true,
        stepLabel: "3 / 5",
        towerSequence: ["blue_8", "blue_8", "yellow_4", "green_4"],
        eyebrow: "Self-starting tutorial · stap 3",
        title: "Interne Logistiek",
        instruction: "Pak de complete Toren B in Productieafdeling B vast en sleep hem naar Magazijn Gereed Product.",
        feedback: tutorial.feedback,
        status: tutorial.phase,
        collected: completed ? 1 : 0,
        required: 1
      }
    };
  }

  function logisticsTutorialScene() {
    const tutorial = state.logisticsTutorial;
    const playerTotal = tutorialStockTotal(tutorial.playerStock);
    const assemblyTotal = tutorialStockTotal(tutorial.assemblyStock);
    const phaseReady = tutorial.phase === "ready";
    const phaseComplete = tutorial.phase === "complete";
    const departments = LOGISTICS_TUTORIAL_DEPARTMENTS
      .filter(definition => definition.id !== "tutorial_assembly")
      .map(definition => {
      const base = {
        ...definition,
        orders: [],
        status: phaseComplete && definition.id === "tutorial_assembly" ? "complete" : "idle"
      };
      if (definition.materialId) {
        const partId = definition.materialId;
        const required = LOGISTICS_TUTORIAL_REQUIREMENTS[partId];
        const picked = tutorial.playerStock[partId] || tutorial.assemblyStock[partId] || 0;
        const remaining = tutorial.warehouseStock[partId] || 0;
        const partLabels = {
          blue_8: { assignment: "blauwe 2×4-blokken", action: "blauw 2×4-blok" },
          yellow_4: { assignment: "geel 2×2-blok", action: "geel 2×2-blok" },
          green_4: { assignment: "groen 2×2-blok", action: "groen 2×2-blok" }
        };
        const partLabel = partLabels[partId];
        return {
          ...base,
          stockVisuals: [
            {
              ...definition.stockPart,
              partId,
              count: Math.max(0, required - picked),
              draggable: picked < required && tutorial.phase === "collecting"
            },
            ...definition.distractorParts.map(distractor => ({
              ...distractor,
              partId: distractor.id,
              count: 1,
              draggable: tutorial.phase === "collecting"
            }))
          ],
          badgeValue: remaining,
          badgeLabel: `${remaining} op voorraad`,
          primaryMetric: `${remaining} in stelling · ${picked}/${required} opgehaald`,
          facts: [
            { label: "Magazijnvoorraad", value: remaining },
            { label: "Opdracht", value: `${required}× ${partLabel.assignment}` },
            { label: "Al opgehaald", value: picked }
          ],
          feedback: picked >= required
            ? { kind: "success", text: "Benodigde hoeveelheid is opgehaald." }
            : { kind: "info", text: `Zoek tussen de verschillende kleuren en formaten naar ${partLabel.action}.` }
        };
      }
      if (definition.id === "tutorial_player_stock") {
        return {
          ...base,
          stockVisuals: [
            {
              partId: "blue_8",
              color: "blue",
              width: 4,
              depth: 2,
              label: "blauw 2×4-blok",
              count: tutorial.playerStock.blue_8,
              draggable: false
            },
            {
              partId: "yellow_4",
              color: "yellow",
              width: 2,
              depth: 2,
              label: "geel 2×2-blok",
              count: tutorial.playerStock.yellow_4,
              draggable: false
            },
            {
              partId: "green_4",
              color: "green",
              width: 2,
              depth: 2,
              label: "groen 2×2-blok",
              count: tutorial.playerStock.green_4,
              draggable: false
            }
          ],
          acceptsStockDrop: tutorial.phase === "collecting",
          highlight: tutorial.phase === "collecting",
          badgeValue: playerTotal,
          badgeLabel: `${playerTotal} in bouwvoorraad`,
          primaryMetric: `${playerTotal}/4 verzameld`,
          facts: [
            { label: "Blauw 2×4", value: tutorial.playerStock.blue_8 },
            { label: "Geel 2×2", value: tutorial.playerStock.yellow_4 },
            { label: "Groen 2×2", value: tutorial.playerStock.green_4 },
            { label: "Status", value: phaseReady ? "Compleet" : phaseComplete ? "Overgedragen" : "Verzamelen" }
          ],
          feedback: phaseReady
            ? { kind: "success", text: "De ophaalopdracht is compleet." }
            : null,
          action: phaseReady
            ? { label: "Ga met deze blokken bouwen", disabled: false }
            : null
        };
      }
      return {
        ...base,
        badgeValue: assemblyTotal,
        badgeLabel: `${assemblyTotal} op bouwplek B`,
        primaryMetric: phaseComplete ? "Voorraad ontvangen" : phaseReady ? "Klaar voor ontvangst" : "Vergrendeld",
        locked: tutorial.phase === "collecting",
        highlight: phaseReady,
        facts: [
          { label: "Bouwvoorraad ontvangen", value: assemblyTotal },
          { label: "Toegang", value: phaseComplete ? "Vrij" : phaseReady ? "Beschikbaar" : "Vergrendeld" },
          { label: "Volgende stap", value: phaseComplete ? "Bouwen" : "Voorraad compleet maken" }
        ],
        feedback: phaseReady
          ? { kind: "success", text: "Voorraad compleet. De bouwplek van Productie B is nu beschikbaar." }
          : {
              kind: phaseComplete ? "success" : "info",
              text: phaseComplete
                ? "Alle materialen zijn overgedragen."
                : "Verzamel eerst alle vier onderdelen voor Toren B."
            },
        action: phaseReady
          ? { label: "Verplaats 4 onderdelen naar Bouwplek B", disabled: false }
          : null
      };
      });
    return {
      title: "Tutorial · Magazijn & Voorraad",
      legend: [
        { color: "tutorial-blue", label: "Magazijn A · blauw" },
        { color: "tutorial-yellow", label: "Magazijn B · geel" },
        { color: "green", label: "Magazijn C · groen" },
        { color: "tutorial-transit", label: "Productieafdeling B" }
      ],
      selectedDepartmentId: state.selectedLogisticsDepartmentId,
      departments,
      connections: LOGISTICS_TUTORIAL_CONNECTIONS.map(connection => (
        connection.to === "tutorial_assembly"
          ? {
              ...connection,
              locked: tutorial.phase === "collecting",
              highlight: phaseReady
            }
          : connection
      )),
      tutorial: {
        active: true,
        visualOnly: true,
        stepLabel: "2 / 5",
        towerSequence: ["blue_8", "blue_8", "yellow_4", "green_4"],
        eyebrow: "Self-starting tutorial · stap 2",
        title: "Magazijn & Voorraad (Logistieke basis)",
        instruction: "Sleep vanuit Magazijn Grondstoffen naar Productieafdeling B: 2× blauw 2×4, 1× geel 2×2 en 1× groen 2×2. Productie B bouwt hiermee zelfstandig de complete toren.",
        feedback: tutorial.feedback,
        status: tutorial.phase,
        collected: tutorialCollectedCount(),
        required: 4
      }
    };
  }

  function isometricScene() {
    if (
      state.logisticsTutorial.active
      && state.logisticsTutorial.phase.startsWith("financial_")
    ) {
      return financialTutorialScene();
    }
    if (
      state.logisticsTutorial.active
      && state.logisticsTutorial.phase.startsWith("internal_")
    ) {
      return internalLogisticsTutorialScene();
    }
    if (state.logisticsTutorial.active) return logisticsTutorialScene();
    const organization = LOGISTICS_ORGANIZATION_VARIANTS[state.config.logisticsOrganization]
      || LOGISTICS_ORGANIZATION_VARIANTS.product;
    const processProfile = window.LogisticsProcess?.profileForProcesses(
      state.config.productionProcesses,
      state.config.gameType
    ) || null;
    const visible = new Set(state.config.visibleLogisticsDepartments);
    return {
      title: organization.title,
      legend: organization.legend,
      organizationId: organization.id,
      processProfile,
      selectedDepartmentId: state.selectedLogisticsDepartmentId,
      departments: organization.departments
        .filter(definition => visible.has(definition.id))
        .map(definition => {
          const orders = ordersForDepartment(definition);
          const metrics = departmentFacts(definition, orders);
          return {
            ...definition,
            ...metrics,
            orders,
            status: departmentStatus(definition, orders)
          };
        }),
      connections: organization.connections
    };
  }

  function renderIsometricLogisticsView() {
    if (!window.IsometricLogisticsView) {
      els.dataModelGrid.innerHTML = "<p>De isometrische renderer kon niet worden geladen.</p>";
      return;
    }
    window.IsometricLogisticsView.mount(els.dataModelGrid, isometricScene(), {
      onDepartmentSelect: departmentId => {
        state.selectedLogisticsDepartmentId = departmentId;
        if (
          state.logisticsTutorial.active
          && departmentId === "tutorial_assembly"
          && state.logisticsTutorial.phase === "collecting"
        ) {
          state.logisticsTutorial.feedback = "De bouwplek van Productie B is nog vergrendeld: verzamel eerst alle vier onderdelen.";
        }
        dispatchInteraction({
          learningObjectID: `logistics_department_${departmentId}`,
          actionType: "inspect_logistics_department",
          objectRole: "logistics_zone",
          result: "success",
          role: "Spelkern",
          departmentId,
          logisticsOrganization: state.config.logisticsOrganization
        });
        renderDataModel(true);
        renderMetrics();
        renderEvents();
      },
      onDepartmentAction: departmentId => {
        if (!state.logisticsTutorial.active) return;
        if (
          departmentId === "tutorial_finance_dispatch"
          && state.logisticsTutorial.phase === "financial_complete"
        ) {
          finishFinancialTutorial();
          return;
        }
        if (
          departmentId === "tutorial_next_department"
          && state.logisticsTutorial.phase === "internal_complete"
        ) {
          finishInternalLogisticsTutorial();
          return;
        }
        if (
          departmentId === "tutorial_player_stock"
          && state.logisticsTutorial.phase === "ready"
        ) {
          transferTutorialStockToAssembly();
          return;
        }
        if (departmentId === "tutorial_assembly") {
          transferTutorialStockToAssembly();
          return;
        }
        collectTutorialMaterial(departmentId);
      },
      onStockDrop: payload => state.logisticsTutorial.phase.startsWith("financial_")
        ? dropFinancialTutorialMaterial(payload)
        : dropTutorialMaterial(payload),
      onCargoDrop: payload => state.logisticsTutorial.phase.startsWith("financial_")
        ? dropFinancialTutorialCargo(payload)
        : dropTutorialSemiFinished(payload),
      onFinanceAction: action => {
        if (action === "next" && state.logisticsTutorial.phase === "financial_complete") {
          finishFinancialTutorial();
        }
      }
    });
  }

  function renderOrderProcessView() {
    if (state.config.processView === "sequence") return renderOrderProcessSequence();
    if (state.config.processView === "swimlane") return renderOrderProcessSwimlane();
    return renderDataModelGraph();
  }

  function dataModelObjectById(id) {
    return DATA_MODEL_LEARNING_OBJECTS.find(item => item.id === id);
  }

  function renderDataModelGraph() {
    const laneWidth = 230;
    const nodeHeight = 82;
    const nodeGap = 26;
    const laneGap = 26;
    const topOffset = 46;
    const laneIndex = Object.fromEntries(DATA_MODEL_GROUPS.map((group, index) => [group.id, index]));
    const laneCounts = Object.fromEntries(DATA_MODEL_GROUPS.map(group => [group.id, 0]));
    const positions = {};

    DATA_MODEL_LEARNING_OBJECTS.forEach(item => {
      const x = laneIndex[item.groupId] * (laneWidth + laneGap);
      const y = topOffset + laneCounts[item.groupId] * (nodeHeight + nodeGap);
      laneCounts[item.groupId] += 1;
      positions[item.id] = { x, y, width: laneWidth, height: nodeHeight };
    });

    const graphWidth = DATA_MODEL_GROUPS.length * laneWidth + (DATA_MODEL_GROUPS.length - 1) * laneGap;
    const graphHeight = Math.max(...Object.values(laneCounts)) * (nodeHeight + nodeGap) + topOffset + 20;
    const headers = DATA_MODEL_GROUPS.map(group => {
      const x = laneIndex[group.id] * (laneWidth + laneGap);
      return `<div class="data-model-lane-title" style="left:${x}px;top:0;width:${laneWidth}px">${escapeHtml(group.title)}</div>`;
    }).join("");
    const edges = DATA_MODEL_EDGES.map(([sourceId, targetId]) => {
      const source = positions[sourceId];
      const target = positions[targetId];
      if (!source || !target) return "";
      const sx = source.x + source.width;
      const sy = source.y + source.height / 2;
      const tx = target.x;
      const ty = target.y + target.height / 2;
      const mid = Math.max(34, Math.abs(tx - sx) / 2);
      const path = `M ${sx} ${sy} C ${sx + mid} ${sy}, ${tx - mid} ${ty}, ${tx} ${ty}`;
      return `<path class="data-model-edge" d="${path}"></path>`;
    }).join("");
    const nodes = DATA_MODEL_LEARNING_OBJECTS.map(item => {
      const position = positions[item.id];
      const mappedSteps = item.mapsTo.map(step => `<span>${escapeHtml(step)}</span>`).join("");
      const colorClass = `source-${dataModelColor(item)}`;
      return `
        <article class="data-model-node ${colorClass}" data-model-object-id="${escapeHtml(item.id)}" style="left:${position.x}px;top:${position.y}px;width:${laneWidth}px;height:${nodeHeight}px">
          <div class="data-model-number">${escapeHtml(item.modelNumber)}</div>
          <div>
            <h3>${escapeHtml(item.label)}</h3>
            <div class="data-model-meta">${escapeHtml(item.role)} | ${escapeHtml(item.from)} -> ${escapeHtml(item.to)}</div>
            <div class="data-model-tags">${mappedSteps}</div>
          </div>
        </article>
      `;
    }).join("");

    return `
      <div class="data-model-canvas" style="width:${graphWidth}px;height:${graphHeight}px">
        ${headers}
        <svg class="data-model-edges" viewBox="0 0 ${graphWidth} ${graphHeight}" aria-hidden="true">
          <defs>
            <marker id="dataModelArrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z"></path>
            </marker>
          </defs>
          ${edges}
        </svg>
        ${nodes}
      </div>
    `;
  }

  function renderOrderProcessSequence() {
    const nodeWidth = 216;
    const nodeHeight = 82;
    const columnGap = 26;
    const rowGap = 58;
    const topOffset = 12;
    const columns = 8;
    const rowStride = nodeHeight + rowGap;
    const colStride = nodeWidth + columnGap;
    const positions = {};
    const orderedItems = ORDER_PROCESS_SEQUENCE.map(dataModelObjectById).filter(Boolean);

    orderedItems.forEach((item, index) => {
      const row = Math.floor(index / columns);
      const offset = index % columns;
      const leftToRight = row % 2 === 0;
      const col = leftToRight ? offset : columns - 1 - offset;
      positions[item.id] = {
        x: col * colStride,
        y: topOffset + row * rowStride,
        width: nodeWidth,
        height: nodeHeight
      };
    });

    const sequenceWidth = columns * nodeWidth + (columns - 1) * columnGap;
    const sequenceHeight = Math.ceil(orderedItems.length / columns) * rowStride + topOffset;
    const edges = orderedItems.slice(0, -1).map((item, index) => {
      const next = orderedItems[index + 1];
      const source = positions[item.id];
      const target = positions[next.id];
      const sameRow = Math.abs(source.y - target.y) < 4;
      const sx = source.x < target.x ? source.x + source.width : source.x;
      const sy = source.y + source.height / 2;
      const tx = source.x < target.x ? target.x : target.x + target.width;
      const ty = target.y + target.height / 2;
      const path = sameRow
        ? `M ${sx} ${sy} L ${tx} ${ty}`
        : `M ${sx} ${sy} C ${sx} ${sy + rowGap / 2}, ${tx} ${ty - rowGap / 2}, ${tx} ${ty}`;
      return `<path class="data-model-edge sequence-edge" d="${path}"></path>`;
    }).join("");
    const nodes = orderedItems.map((item, index) => {
      const position = positions[item.id];
      const colorClass = `source-${dataModelColor(item)}`;
      return `
        <article class="data-model-node sequence-node ${colorClass}" data-model-object-id="${escapeHtml(item.id)}" style="left:${position.x}px;top:${position.y}px;width:${nodeWidth}px;height:${nodeHeight}px">
          <div class="data-model-number">${escapeHtml(item.modelNumber)}</div>
          <div>
            <h3>${String(index + 1).padStart(2, "0")} | ${escapeHtml(item.label)}</h3>
            <div class="data-model-meta">${escapeHtml(item.role)} | ${escapeHtml(item.from)} -> ${escapeHtml(item.to)}</div>
          </div>
        </article>
      `;
    }).join("");

    return `
      <div class="data-model-canvas sequence-canvas" style="width:${sequenceWidth}px;height:${sequenceHeight}px">
        <svg class="data-model-edges" viewBox="0 0 ${sequenceWidth} ${sequenceHeight}" aria-hidden="true">
          <defs>
            <marker id="dataModelArrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z"></path>
            </marker>
          </defs>
          ${edges}
        </svg>
        ${nodes}
      </div>
    `;
  }

  function renderOrderProcessSwimlane() {
    const laneWidth = 230;
    const nodeHeight = 82;
    const laneGap = 26;
    const rowGap = 32;
    const headerHeight = 42;
    const topOffset = 8;
    const laneIndex = Object.fromEntries(DATA_MODEL_GROUPS.map((group, index) => [group.id, index]));
    const positions = {};
    const orderedItems = ORDER_PROCESS_SEQUENCE.map(dataModelObjectById).filter(Boolean);

    orderedItems.forEach((item, index) => {
      positions[item.id] = {
        x: laneIndex[item.groupId] * (laneWidth + laneGap),
        y: topOffset + index * (nodeHeight + rowGap),
        width: laneWidth,
        height: nodeHeight
      };
    });

    const swimlaneWidth = DATA_MODEL_GROUPS.length * laneWidth + (DATA_MODEL_GROUPS.length - 1) * laneGap;
    const swimlaneHeight = topOffset + orderedItems.length * (nodeHeight + rowGap);
    const headers = DATA_MODEL_GROUPS.map(group => {
      const x = laneIndex[group.id] * (laneWidth + laneGap);
      return `<div class="data-model-lane-title swimlane-title" style="left:${x}px;top:0;width:${laneWidth}px">${escapeHtml(group.title)}</div>`;
    }).join("");
    const laneBands = DATA_MODEL_GROUPS.map(group => {
      const x = laneIndex[group.id] * (laneWidth + laneGap);
      return `<div class="swimlane-band" style="left:${x}px;top:0;width:${laneWidth}px;height:${swimlaneHeight}px"></div>`;
    }).join("");
    const edges = orderedItems.slice(0, -1).map((item, index) => {
      const next = orderedItems[index + 1];
      const source = positions[item.id];
      const target = positions[next.id];
      const sameLane = Math.abs(source.x - target.x) < 4;
      const sx = source.x + source.width / 2;
      const sy = source.y + source.height;
      const tx = target.x + target.width / 2;
      const ty = target.y;
      const routeY = sy + (ty - sy) / 2;
      const path = sameLane
        ? `M ${sx} ${sy} L ${tx} ${ty}`
        : `M ${sx} ${sy} V ${routeY} H ${tx} V ${ty}`;
      return `<path class="data-model-edge swimlane-edge"
                    data-edge-source="${escapeHtml(item.id)}"
                    data-edge-target="${escapeHtml(next.id)}"
                    d="${path}"></path>`;
    }).join("");
    const nodes = orderedItems.map((item, index) => {
      const position = positions[item.id];
      const colorClass = `source-${dataModelColor(item)}`;
      return `
        <article class="data-model-node swimlane-node ${colorClass}" data-model-object-id="${escapeHtml(item.id)}"
                 tabindex="0"
                 style="left:${position.x}px;top:${position.y}px;width:${laneWidth}px;height:${nodeHeight}px">
          <div class="data-model-number">${escapeHtml(item.modelNumber)}</div>
          <div>
            <h3>${String(index + 1).padStart(2, "0")} | ${escapeHtml(item.label)}</h3>
            <div class="data-model-meta">${escapeHtml(item.role)} | ${escapeHtml(item.from)} -> ${escapeHtml(item.to)}</div>
          </div>
        </article>
      `;
    }).join("");

    return `
      <div class="swimlane-scroll-content" style="width:${swimlaneWidth}px">
        <div class="swimlane-sticky-header" style="width:${swimlaneWidth}px;height:${headerHeight}px">
          ${headers}
        </div>
        <div class="data-model-canvas swimlane-canvas" style="width:${swimlaneWidth}px;height:${swimlaneHeight}px">
          ${laneBands}
          <svg class="data-model-edges" viewBox="0 0 ${swimlaneWidth} ${swimlaneHeight}" aria-hidden="true">
            <defs>
              <marker id="dataModelArrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z"></path>
              </marker>
            </defs>
            ${edges}
          </svg>
          ${nodes}
        </div>
      </div>
    `;
  }

  function dataModelColor(item) {
    if (item.groupId === "customers" || item.groupId === "raw_warehouse" || item.groupId === "purchase") return "green";
    if (item.groupId === "production_a" || item.groupId === "production_b" || item.groupId === "production_c") return "purple";
    if (item.groupId === "sales") return "yellow";
    if (item.groupId === "administration" || item.groupId === "finished_warehouse") return "blue";
    return "red";
  }

  function dataModelObjectSnapshot(item) {
    return { ...item, sourceColor: dataModelColor(item), mapsTo: [...item.mapsTo] };
  }


  function renderAll() {
    renderMetrics();
    renderLanes();
    renderInventory();
    renderEvents();
    renderDataModel(false);
    updatePriceInput();
    renderOrderPreview();
    renderPlayerView();
  }

  function initLegoBuilder() {
    if (!window.LegoBuilder || !els.legoBuilderMount) return;
    state.customProducts.forEach(product => window.LegoBuilder.registerProduct(product));
    window.LegoBuilder.mount(els.legoBuilderMount, {
      onEvent: (actionType, data = {}) => {
        dispatchInteraction({
          actionType,
          learningObjectID: "interactive_lego_tower_builder",
          objectRole: "lego_build",
          role: "Productiemedewerker",
          ...data,
          result: data.result || "success"
        });
        renderEvents();
        renderMetrics();
        if (actionType === "complete_lego_tutorial") {
          window.LegoBuilder?.prepareStockTutorial("B");
          startLogisticsTutorial();
        }
        if (actionType === "restart_lego_tutorial") {
          resetLogisticsTutorial();
        }
        if (actionType === "complete_stock_tutorial_build") {
          startInternalLogisticsTutorial();
        }
        if (
          actionType === "start_lego_build"
          && state.logisticsTutorial.phase === "complete"
        ) {
          state.logisticsTutorial.active = false;
          state.selectedLogisticsDepartmentId = "inbound";
          renderDataModel(true);
        }
      },
      onTutorialNextRequested: () => startLogisticsTutorial(),
      onDelivered: delivery => {
        if (!delivery.correct) return;
        const selected = selectedOrder();
        const order = selected?.productId === delivery.productId
          ? selected
          : [...state.orders].reverse().find(candidate => !candidate.done && candidate.productId === delivery.productId);
        if (order) {
          order.builtQuantity = Math.min(order.quantity, Number(order.builtQuantity || 0) + 1);
          order.builtTowers = Array.isArray(order.builtTowers) ? order.builtTowers : [];
          order.builtTowers.push(delivery.bricks.map(brick => ({ ...brick })));
          order.buildValidated = order.builtQuantity >= order.quantity;
          order.history.push({
            step: order.buildValidated ? "lego_order_batch_validated" : "lego_tower_validated",
            at: state.clockMinutes,
            productId: delivery.productId,
            builtQuantity: order.builtQuantity,
            orderQuantity: order.quantity
          });
          if (!order.buildValidated) {
            window.LegoBuilder?.prepareNextBatchTower?.(
              delivery.productId,
              order.builtQuantity,
              order.quantity
            );
          }
        }
        renderAll();
      }
    });
  }

  function initTowerEditor() {
    if (!window.TowerEditor || !els.towerEditorMount) return;
    window.TowerEditor.mount(els.towerEditorMount, {
      parts: PARTS,
      products: Object.values(PRODUCTS),
      colorConfiguration: {
        multipleColors: state.config.multipleColors,
        editableColorLayers: [...state.config.editableColorLayers]
      },
      onAdd: registerCustomProduct,
      onDelete: removeCustomProduct
    });
  }

  const ALL_LO_GAME_ROLES = [
    { id: "customer", label: "Klant", category: "Extern" },
    { id: "logistics_manager", label: "Logistiek Manager", category: "Management" },
    { id: "raw_warehouse", label: "Magazijn Grondstoffen", category: "Magazijn" },
    { id: "production_1", label: "Productie Afdeling 1 (Stap 1)", category: "F-org" },
    { id: "production_2", label: "Productie Afdeling 2 (Stap 2)", category: "F-org" },
    { id: "production_3", label: "Productie Afdeling 3 (Stap 3)", category: "F-org" },
    { id: "production_a", label: "Afdeling Toren A", category: "P-org" },
    { id: "production_b", label: "Afdeling Toren B", category: "P-org" },
    { id: "production_c", label: "Afdeling Toren C", category: "P-org" },
    { id: "finished_warehouse", label: "Magazijn Gereed Product", category: "Magazijn" },
    { id: "sales", label: "Verkoop / Sales Director", category: "Commercie" },
    { id: "finance", label: "Financiële Admin", category: "Financiën" },
    { id: "supplier", label: "Leverancier Grondstoffen", category: "Extern" },
    { id: "transporter", label: "Transporteur / Freight Forwarder", category: "Logistiek" }
  ];

  const PRESET_ROLE_IDS = {
    lo1: ["customer", "logistics_manager", "raw_warehouse", "production_1", "production_2", "production_3", "finished_warehouse"],
    lo2: ["customer", "logistics_manager", "raw_warehouse", "production_1", "production_2", "production_3", "finished_warehouse"],
    lo3: ["customer", "logistics_manager", "raw_warehouse", "production_a", "production_b", "production_c", "finished_warehouse"],
    lo4: ["customer", "logistics_manager", "sales", "finance", "raw_warehouse", "production_a", "production_b", "production_c", "finished_warehouse"],
    lo5: ["customer", "sales", "finance", "logistics_manager", "raw_warehouse", "production_1", "production_2", "production_3", "finished_warehouse", "supplier"],
    lo6: ["customer", "sales", "finance", "logistics_manager", "raw_warehouse", "production_1", "production_2", "production_3", "finished_warehouse", "supplier", "transporter"],
    lo7: ["customer", "sales", "finance", "logistics_manager", "raw_warehouse", "production_1", "production_2", "production_3", "finished_warehouse", "supplier", "transporter"],
    lo8: ["customer", "sales", "finance", "logistics_manager", "raw_warehouse", "production_1", "production_2", "production_3", "finished_warehouse", "supplier", "transporter"],
    le_training: ["customer", "logistics_manager", "sales", "finance", "raw_warehouse", "production_a", "production_b", "production_c", "finished_warehouse"],
    entrepreneurial: ["customer", "sales", "supplier", "finance", "logistics_manager"]
  };

  function renderGameComparisonMatrices() {
    const settingsTable = document.getElementById("gameSettingsMatrixTable");
    const rolesTable = document.getElementById("gameRolesMatrixTable");
    if (!settingsTable || !rolesTable) return;

    const gameIds = ["lo1", "lo2", "lo3", "lo4", "lo5", "lo6", "lo7"];
    const settingsByGame = Object.fromEntries(gameIds.map(gameId => {
      const stored = window.GameConfigurationStore?.getConfiguration(gameId)?.settings;
      const preset = GAME_TYPE_PRESETS[gameId]?.config || {};
      return [gameId, stored || {
        game_type: gameId,
        money: preset.money,
        pnl: preset.pnl,
        intermediate_stock: preset.intermediateStock,
        opportunity_costs: preset.opportunityCosts,
        role_freedom: preset.roleFreedom,
        multiple_colors: Boolean(preset.multipleColors),
        editable_color_layers: preset.editableColorLayers || [],
        price_mode: preset.priceMode,
        production_processes: window.LogisticsProcess?.defaultProcessesForGame(gameId) || [],
        logistics_organization: preset.logisticsOrganization,
        product_type_count: preset.productTypeCount,
        customer_order_mode: gameId === "lo7" ? "free" : "required",
        enabled_roles: PRESET_ROLE_IDS[gameId]
      }];
    }));
    const yesNo = value => value
      ? '<span class="badge-on" aria-label="Aan">✅</span>'
      : '<span class="badge-excluded" aria-label="Uit">❌</span>';
    const text = value => escapeHtml(String(value));
    const header = `
      <thead><tr>
        <th scope="col">Optie</th>
        ${gameIds.map((_, index) => `<th scope="col">Game ${index + 1}</th>`).join("")}
      </tr></thead>
    `;
    const settingsRows = [
      ["Parallelle productie", config => config.production_processes?.includes("parallel"), "bool"],
      ["Sequentiële productie", config => config.production_processes?.includes("sequential"), "bool"],
      ["Productgerichte organisatie", config => config.logistics_organization === "product", "bool"],
      ["Functionele organisatie", config => config.logistics_organization === "functional", "bool"],
      ["Tussenvoorraad", config => config.intermediate_stock, "bool"],
      ["Geld", config => config.money, "bool"],
      ["Winst/verlies", config => config.pnl, "bool"],
      ["Opportunity costs", config => config.opportunity_costs, "bool"],
      ["Rolvrijheid", config => config.role_freedom, "bool"],
      ["Meerdere kleuren", config => config.multiple_colors, "bool"],
      ["Grondplaatkleur vrij", config => config.editable_color_layers?.includes("groundPlate"), "bool"],
      ["Kleur laag 1 vrij", config => config.editable_color_layers?.includes("layer1"), "bool"],
      ["Kleur laag 2 vrij", config => config.editable_color_layers?.includes("layer2"), "bool"],
      ["Kleur laag 3 vrij", config => config.editable_color_layers?.includes("layer3"), "bool"],
      ["Vrije verkoopprijs", config => config.price_mode === "free", "bool"],
      ["Vrije klantorder", config => config.customer_order_mode === "free", "bool"],
      ["Aantal torensoorten", config => config.product_type_count, "text"]
    ];
    settingsTable.innerHTML = `
      <caption>Automatisch opgebouwd uit de ingebouwde gamepresets.</caption>
      ${header}
      <tbody>
        ${settingsRows.map(([label, read, type]) => `
          <tr>
            <th scope="row">${text(label)}</th>
            ${gameIds.map(gameId => {
              const value = read(settingsByGame[gameId]);
              return `<td>${type === "bool" ? yesNo(Boolean(value)) : text(value)}</td>`;
            }).join("")}
          </tr>
        `).join("")}
      </tbody>
    `;

    rolesTable.innerHTML = `
      <caption>Rollen per ingebouwde gamepreset; aantallen kunnen binnen de sessie worden verdeeld.</caption>
      ${header.replace("Optie", "Rol")}
      <tbody>
        ${ALL_LO_GAME_ROLES.map(role => `
          <tr>
            <th scope="row">${text(role.label)}</th>
            ${gameIds.map(gameId => {
              const activeRoles = settingsByGame[gameId].enabled_roles || PRESET_ROLE_IDS[gameId] || [];
              return `<td>${yesNo(activeRoles.includes(role.id))}</td>`;
            }).join("")}
          </tr>
        `).join("")}
      </tbody>
    `;
  }

  function getActiveRoles(gameType) {
    if (state.config.enabledRoles && Array.isArray(state.config.enabledRoles)) {
      return state.config.enabledRoles;
    }
    return PRESET_ROLE_IDS[gameType] || PRESET_ROLE_IDS.lo4;
  }

  function updateRolePreview(gameType) {
    const roleBadgeList = document.getElementById("roleBadgeList");
    const roleCountBadge = document.getElementById("roleCountBadge");
    const roleSelectorGrid = document.getElementById("roleSelectorGrid");
    if (!roleBadgeList || !roleCountBadge) return;

    const activeRoleIds = getActiveRoles(gameType);
    roleCountBadge.textContent = `👥 ${activeRoleIds.length} rollen actief`;

    roleBadgeList.innerHTML = ALL_LO_GAME_ROLES.map(role => {
      const isActive = activeRoleIds.includes(role.id);
      return `<span class="role-chip ${isActive ? '' : 'is-inactive'}">${isActive ? '✅' : '❌'} ${role.label}</span>`;
    }).join("");

    if (roleSelectorGrid) {
      roleSelectorGrid.innerHTML = ALL_LO_GAME_ROLES.map(role => {
        const isChecked = activeRoleIds.includes(role.id);
        return `
          <label class="role-option-field">
            <input type="checkbox" data-role-id="${role.id}" ${isChecked ? 'checked' : ''}>
            <span>${role.label}</span>
            <span class="role-option-category">${role.category}</span>
          </label>
        `;
      }).join("");

      roleSelectorGrid.querySelectorAll("input[data-role-id]").forEach(input => {
        input.addEventListener("change", () => {
          const roleId = input.dataset.roleId;
          let currentRoles = [...getActiveRoles(state.config.gameType)];
          if (input.checked) {
            if (!currentRoles.includes(roleId)) currentRoles.push(roleId);
          } else {
            currentRoles = currentRoles.filter(r => r !== roleId);
          }
          state.config.enabledRoles = currentRoles;
          updateRolePreview(state.config.gameType);
          syncConfigFromControls(true);
        });
      });
    }
  }

  function populateGameTypeSelect(selectedConfigId = "lo4") {
    if (!els.gameTypeSelect) return;
    if (!window.GameConfigurationStore) {
      els.gameTypeSelect.value = selectedConfigId;
      return;
    }
    const presets = window.GameConfigurationStore.getPresets();
    const customConfigs = window.GameConfigurationStore.getCustomConfigurations();

    let html = `<optgroup label="🔒 Ingebouwde Presets">`;
    presets.forEach(p => {
      html += `<option value="${p.config_id}" ${p.config_id === selectedConfigId ? "selected" : ""}>${escapeHtml(p.name)}</option>`;
    });
    html += `</optgroup>`;

    if (customConfigs.length > 0) {
      html += `<optgroup label="💾 Mijn Opgeslagen Scenario's">`;
      customConfigs.forEach(c => {
        html += `<option value="${c.config_id}" ${c.config_id === selectedConfigId ? "selected" : ""}>💾 ${escapeHtml(c.name)}</option>`;
      });
      html += `</optgroup>`;
    }

    if (selectedConfigId === "custom_draft") {
      html += `<optgroup label="⚙️ Aangepast Scenario">`;
      html += `<option value="custom_draft" selected>⚙️ Aangepast scenario (Nog niet opgeslagen)</option>`;
      html += `</optgroup>`;
    }

    els.gameTypeSelect.innerHTML = html;

    const deleteConfigButton = document.getElementById("deleteConfigButton");
    const currentConfig = window.GameConfigurationStore.getConfiguration(selectedConfigId);
    if (deleteConfigButton) {
      deleteConfigButton.style.display = (currentConfig && !currentConfig.is_preset && selectedConfigId !== "custom_draft") ? "inline-flex" : "none";
    }
  }

  function loadGameConfiguration(configId, dispatch = true) {
    if (configId === "custom_draft") return true;
    if (!window.GameConfigurationStore) {
      return applyGameTypePreset(configId, dispatch);
    }
    const configObj = window.GameConfigurationStore.getConfiguration(configId);
    if (!configObj) return false;

    const settings = configObj.settings || {};
    const productTypeCount = settings.product_type_count || 3;
    const productTypeCountChanged = state.config.productTypeCount !== productTypeCount;

    state.config.currentConfigId = configObj.config_id;
    state.config.currentConfigName = configObj.name;
    state.config.gameType = settings.game_type || configId;
    state.config.money = Boolean(settings.money);
    state.config.pnl = Boolean(settings.pnl);
    state.config.openingBalance = state.config.money && Boolean(settings.opening_balance_enabled);
    state.config.revenueBalance = state.config.money && Boolean(settings.revenue_balance_enabled);
    state.config.intermediateStock = Boolean(settings.intermediate_stock);
    state.config.opportunityCosts = Boolean(settings.opportunity_costs);
    state.config.roleFreedom = Boolean(settings.role_freedom);
    state.config.multipleColors = Boolean(settings.multiple_colors);
    state.config.editableColorLayers = state.config.multipleColors
      ? normalizeEditableColorLayers(settings.editable_color_layers)
      : [];
    state.config.priceMode = settings.price_mode || "fixed";
    state.config.productionProcesses = window.LogisticsProcess?.normalizeProcesses(
      settings.production_processes,
      state.config.gameType
    ) || ["parallel"];
    state.config.logisticsOrganization = settings.logistics_organization || "product";
    applyLogisticsProcessContract(state.config.gameType);
    state.config.productTypeCount = productTypeCount;
    state.config.customerOrderMode = settings.customer_order_mode || "required";
    state.config.enabledRoles = Array.isArray(settings.enabled_roles)
      ? [...settings.enabled_roles]
      : [...(PRESET_ROLE_IDS[state.config.gameType] || PRESET_ROLE_IDS.lo4)];

    const organization = LOGISTICS_ORGANIZATION_VARIANTS[state.config.logisticsOrganization]
      || LOGISTICS_ORGANIZATION_VARIANTS.product;
    state.config.visibleLogisticsDepartments = organization.departments.map(department => department.id);
    state.selectedLogisticsDepartmentId = state.config.visibleLogisticsDepartments[0] || null;

    populateGameTypeSelect(configObj.config_id);
    syncConfigControls();
    if (productTypeCountChanged) {
      applyProductTypeCount(false);
    }

    const saveConfigButton = document.getElementById("saveConfigButton");
    if (saveConfigButton) {
      saveConfigButton.classList.remove("is-highlighted");
    }

    if (dispatch) {
      dispatchInteraction({
        actionType: "load_game_configuration",
        learningObjectID: "configuration_preset_or_custom",
        result: "success",
        objectRole: "configuration",
        role: "Game Master",
        configId: configObj.config_id,
        configName: configObj.name,
        isPreset: configObj.is_preset,
        config: { ...state.config }
      });
    }
    renderDataModel(true);
    renderAll();
    return true;
  }

  function syncConfigControls() {
    if (state.config.currentConfigId && els.gameTypeSelect) {
      populateGameTypeSelect(state.config.currentConfigId);
    } else if (els.gameTypeSelect) {
      els.gameTypeSelect.value = state.config.gameType;
    }
    els.moneyToggle.checked = state.config.money;
    els.pnlToggle.checked = state.config.pnl;
    if (!state.config.money) {
      state.config.openingBalance = false;
      state.config.revenueBalance = false;
    }
    if (els.openingBalanceToggle) {
      els.openingBalanceToggle.checked = state.config.openingBalance;
      els.openingBalanceToggle.disabled = !state.config.money;
    }
    if (els.revenueBalanceToggle) {
      els.revenueBalanceToggle.checked = state.config.revenueBalance;
      els.revenueBalanceToggle.disabled = !state.config.money;
    }
    applyLogisticsProcessContract(state.config.gameType);
    const parallelOnly = state.config.productionProcesses.length === 1
      && state.config.productionProcesses[0] === "parallel";
    if (parallelOnly) {
      state.config.intermediateStock = false;
    }
    if (els.intermediateToggle) {
      els.intermediateToggle.checked = state.config.intermediateStock;
      els.intermediateToggle.disabled = parallelOnly;
    }
    els.opportunityToggle.checked = state.config.opportunityCosts;
    els.roleFreedomToggle.checked = state.config.roleFreedom;
    window.TowerEditor?.setColorConfiguration({
      multipleColors: state.config.multipleColors,
      editableColorLayers: [...state.config.editableColorLayers]
    });
    els.priceModeSelect.value = state.config.priceMode;
    els.parallelProductionToggle.checked = state.config.productionProcesses.includes("parallel");
    els.sequentialProductionToggle.checked = state.config.productionProcesses.includes("sequential");
    els.hybridProductionTooltip.hidden = state.config.productionProcesses.length !== 2;
    els.productTypeCountInput.value = String(state.config.productTypeCount);
    const configDesc = window.GameConfigurationStore
      ? window.GameConfigurationStore.getConfiguration(state.config.currentConfigId || state.config.gameType)?.description
      : GAME_TYPE_PRESETS[state.config.gameType]?.description;
    els.gameTypeDescription.textContent = configDesc || GAME_TYPE_PRESETS[state.config.gameType]?.description || "";
    updateRolePreview(state.config.gameType);
  }

  function applyGameTypePreset(gameType, dispatch = true) {
    const preset = GAME_TYPE_PRESETS[gameType];
    if (!preset) return false;

    const productTypeCountChanged = state.config.productTypeCount !== preset.config.productTypeCount;
    const financialDetails = financialDetailDefaults(gameType, preset.config.money);
    Object.assign(state.config, preset.config, financialDetails, {
      gameType,
      multipleColors: Boolean(preset.config.multipleColors),
      editableColorLayers: normalizeEditableColorLayers(preset.config.editableColorLayers),
      productionProcesses: window.LogisticsProcess?.defaultProcessesForGame(gameType) || ["parallel"],
      enabledRoles: [...(PRESET_ROLE_IDS[gameType] || PRESET_ROLE_IDS.lo4)],
      customerOrderMode: gameType === "entrepreneurial" || gameType === "lo7" || gameType === "lo8" ? "free" : "required"
    });
    applyLogisticsProcessContract(gameType);
    const organization = LOGISTICS_ORGANIZATION_VARIANTS[state.config.logisticsOrganization];
    state.config.visibleLogisticsDepartments = organization.departments.map(department => department.id);
    state.selectedLogisticsDepartmentId = state.config.visibleLogisticsDepartments[0] || null;
    syncConfigControls();
    if (productTypeCountChanged) {
      applyProductTypeCount(false);
    }

    if (dispatch) {
      dispatchInteraction({
        actionType: "apply_game_type_preset",
        learningObjectID: "configuration_game_type",
        result: "success",
        objectRole: "configuration",
        role: "Game Master",
        gameType,
        gameTypeLabel: preset.label,
        config: { ...state.config }
      });
    }
    renderDataModel(true);
    renderAll();
    return true;
  }

  function applyGameSessionConfig(config = {}) {
    const gameType = GAME_TYPE_PRESETS[config.game_type] ? config.game_type : "lo4";
    const preset = GAME_TYPE_PRESETS[gameType];
    const productTypeCount = Math.max(
      MIN_PRODUCT_TYPES,
      Math.min(MAX_PRODUCT_TYPES, Number(config.product_type_count) || preset.config.productTypeCount)
    );
    const productTypeCountChanged = state.config.productTypeCount !== productTypeCount;
    Object.assign(state.config, preset.config, {
      playMode: config.play_mode === "digital" ? "digital" : "physical",
      gameType,
      money: config.money ?? preset.config.money,
      pnl: config.pnl ?? preset.config.pnl,
      openingBalance: Boolean(
        (config.money ?? preset.config.money)
        && (config.opening_balance_enabled
          ?? financialDetailDefaults(gameType, preset.config.money).openingBalance)
      ),
      revenueBalance: Boolean(
        (config.money ?? preset.config.money)
        && (config.revenue_balance_enabled
          ?? financialDetailDefaults(gameType, preset.config.money).revenueBalance)
      ),
      intermediateStock: config.intermediate_stock ?? preset.config.intermediateStock,
      opportunityCosts: config.opportunity_costs ?? preset.config.opportunityCosts,
      roleFreedom: config.role_freedom ?? preset.config.roleFreedom,
      multipleColors: config.multiple_colors ?? Boolean(preset.config.multipleColors),
      editableColorLayers: normalizeEditableColorLayers(
        config.editable_color_layers ?? preset.config.editableColorLayers
      ),
      customerOrderMode: config.customer_order_mode === "free" ? "free" : "required",
      priceMode: config.price_mode || preset.config.priceMode,
      productionProcesses: window.LogisticsProcess?.normalizeProcesses(
        config.production_processes,
        gameType
      ) || ["parallel"],
      logisticsOrganization: config.logistics_organization || preset.config.logisticsOrganization,
      productTypeCount
    });
    if (!state.config.multipleColors) {
      state.config.editableColorLayers = [];
    }
    applyLogisticsProcessContract(gameType);
    const organization = LOGISTICS_ORGANIZATION_VARIANTS[state.config.logisticsOrganization]
      || LOGISTICS_ORGANIZATION_VARIANTS.product;
    state.config.visibleLogisticsDepartments = organization.departments.map(department => department.id);
    state.selectedLogisticsDepartmentId = state.config.visibleLogisticsDepartments[0] || null;
    syncConfigControls();
    if (productTypeCountChanged) applyProductTypeCount(false);
    logisticsGameController?.engine?.setCustomerOrderMode(state.config.customerOrderMode);
    renderDataModel(true);
  }

  function syncConfigFromControls(dispatch = true) {
    state.config.money = els.moneyToggle.checked;
    state.config.pnl = els.pnlToggle.checked;
    state.config.openingBalance = state.config.money
      && Boolean(els.openingBalanceToggle?.checked);
    state.config.revenueBalance = state.config.money
      && Boolean(els.revenueBalanceToggle?.checked);
    if (els.openingBalanceToggle) {
      els.openingBalanceToggle.checked = state.config.openingBalance;
      els.openingBalanceToggle.disabled = !state.config.money;
    }
    if (els.revenueBalanceToggle) {
      els.revenueBalanceToggle.checked = state.config.revenueBalance;
      els.revenueBalanceToggle.disabled = !state.config.money;
    }
    const requestedProcesses = [
      els.parallelProductionToggle.checked ? "parallel" : null,
      els.sequentialProductionToggle.checked ? "sequential" : null
    ].filter(Boolean);
    state.config.productionProcesses = window.LogisticsProcess?.normalizeProcesses(
      requestedProcesses,
      state.config.gameType
    ) || ["parallel"];
    applyLogisticsProcessContract(state.config.gameType);
    els.parallelProductionToggle.checked = state.config.productionProcesses.includes("parallel");
    els.sequentialProductionToggle.checked = state.config.productionProcesses.includes("sequential");
    els.hybridProductionTooltip.hidden = state.config.productionProcesses.length !== 2;
    const parallelOnly = state.config.productionProcesses.length === 1
      && state.config.productionProcesses[0] === "parallel";
    if (parallelOnly) {
      state.config.intermediateStock = false;
      if (els.intermediateToggle) {
        els.intermediateToggle.checked = false;
        els.intermediateToggle.disabled = true;
      }
    } else {
      if (els.intermediateToggle) {
        els.intermediateToggle.disabled = false;
        state.config.intermediateStock = els.intermediateToggle.checked;
      }
    }
    state.config.opportunityCosts = els.opportunityToggle.checked;
    state.config.roleFreedom = els.roleFreedomToggle.checked;
    window.TowerEditor?.setColorConfiguration({
      multipleColors: state.config.multipleColors,
      editableColorLayers: [...state.config.editableColorLayers]
    });
    state.config.priceMode = els.priceModeSelect.value;
    state.config.productTypeCount = Math.max(
      MIN_PRODUCT_TYPES,
      Math.min(MAX_PRODUCT_TYPES, Number(els.productTypeCountInput.value) || 3)
    );

    const activeRoles = getActiveRoles(state.config.gameType);
    const currentSettings = {
      game_type: state.config.gameType,
      money: state.config.money,
      pnl: state.config.pnl,
      opening_balance_enabled: state.config.openingBalance,
      revenue_balance_enabled: state.config.revenueBalance,
      intermediate_stock: state.config.intermediateStock,
      opportunity_costs: state.config.opportunityCosts,
      role_freedom: state.config.roleFreedom,
      multiple_colors: state.config.multipleColors,
      editable_color_layers: [...state.config.editableColorLayers],
      price_mode: state.config.priceMode,
      production_processes: [...state.config.productionProcesses],
      logistics_organization: state.config.logisticsOrganization,
      product_type_count: state.config.productTypeCount,
      customer_order_mode: state.config.customerOrderMode || "required",
      enabled_roles: activeRoles
    };

    const saveConfigButton = document.getElementById("saveConfigButton");

    if (window.GameConfigurationStore) {
      const match = window.GameConfigurationStore.findMatchingConfiguration(currentSettings);
      if (match) {
        state.config.currentConfigId = match.config_id;
        state.config.currentConfigName = match.name;
        state.config.gameType = match.settings.game_type || match.config_id;
        populateGameTypeSelect(match.config_id);
        if (els.gameTypeDescription) {
          els.gameTypeDescription.textContent = match.description;
        }
        if (saveConfigButton) {
          saveConfigButton.classList.remove("is-highlighted");
        }
      } else {
        state.config.currentConfigId = "custom_draft";
        state.config.currentConfigName = "Aangepast scenario";
        populateGameTypeSelect("custom_draft");
        if (els.gameTypeDescription) {
          els.gameTypeDescription.textContent = "⚠️ Aangepast scenario op basis van jouw gekozen instellingen en rollen. Klik op 'Opslaan als...' om dit scenario op te slaan.";
        }
        if (saveConfigButton) {
          saveConfigButton.classList.add("is-highlighted");
        }
      }
    }

    if (dispatch) {
      dispatchInteraction({
        actionType: "change_configuration",
        result: "success",
        objectRole: "configuration",
        role: "Spelkern",
        config: { ...state.config }
      });
    }
    renderAll();
  }

  function resetProductStores() {
    state.ss1 = emptyProductStock();
    state.ss2 = emptyProductStock();
    state.finishedGoods = emptyProductStock();
    state.financial = createFinancialState();
  }

  function applyProductTypeCount(dispatch = true) {
    const count = Math.max(
      MIN_PRODUCT_TYPES,
      Math.min(MAX_PRODUCT_TYPES, Number(els.productTypeCountInput.value) || MIN_PRODUCT_TYPES)
    );
    state.config.productTypeCount = count;
    els.productTypeCountInput.value = String(count);
    rebuildProducts(count);
    productOptions();
    window.TowerEditor?.setProducts(Object.values(PRODUCTS));
    window.LegoBuilder?.setProduct(els.productSelect.value);
    updatePriceInput();
    state.orders = [];
    state.selectedOrderId = null;
    resetProductStores();
    if (dispatch) {
      dispatchInteraction({
        actionType: "change_tower_type_count",
        learningObjectID: "configuration_tower_types",
        result: "success",
        objectRole: "configuration",
        role: "Spelkern",
        productTypeCount: count,
        productTypes: productIds()
      });
    }
    renderAll();
  }

  async function exportEvents() {
    const payload = JSON.stringify({
      events: state.interactionBuffer,
      contract_events: state.contractEventBuffer
    }, null, 2);
    try {
      await navigator.clipboard.writeText(payload);
      dispatchInteraction({
        actionType: "export_events",
        result: "success",
        objectRole: "measurement",
        role: "Spelkern"
      });
    } catch (error) {
      dispatchInteraction({
        actionType: "export_events",
        result: "blocked",
        objectRole: "measurement",
        role: "Spelkern",
        reason: "clipboard_unavailable"
      });
      window.prompt("Eventbuffer", payload);
    }
    renderAll();
  }

  function resetState() {
    if (state.attention.timer) clearTimeout(state.attention.timer);
    state.attention = { mode: "task", timer: null, autoOpenedProcess: false };
    document.body.classList.remove("system-perspective");
    if (els.attentionModeBanner) els.attentionModeBanner.hidden = true;
    rebuildProducts(state.config.productTypeCount);
    state.sessionId = `icg2-v2-${Date.now().toString(36)}`;
    state.clockMinutes = 600;
    state.orders = [];
    state.selectedOrderId = null;
    state.orderCounter = 7;
    resetProductStores();
    state.purchaseCost = 0;
    state.opportunityCost = 0;
    state.financial = createFinancialState();
    state.interactionBuffer.length = 0;
    state.contractEventBuffer.length = 0;

    let isCompleted = false;
    let isDismissed = false;
    try {
      isCompleted = localStorage.getItem("learngame.om.tutorialCompleted") === "true";
      isDismissed = localStorage.getItem("learngame.om.tutorialDismissed") === "true";
    } catch (e) {}

    state.tutorialCompleted = isCompleted;
    state.tutorialDismissed = isCompleted || isDismissed;
    state.tutorialPaused = false;
    state.tutorialStage = "builder";
    resetInventory();
    resetLogisticsTutorial();

    if (state.tutorialCompleted || state.tutorialDismissed) {
      leaveTutorialFocus();
      updateTutorialResumeButton();
    } else {
      window.LegoBuilder?.restartTutorial();
      setTutorialFocus("builder");
    }

    dispatchInteraction({
      actionType: "setup_roles",
      result: "success",
      objectRole: "configuration",
      role: "Spelkern",
      loginFlow: "qr_code_per_role_language_account_game_code",
      roles: ROLES.map(role => ({ id: role.id, token: role.token, title: role.title }))
    });
    renderAll();
  }

  function wireEvents() {
    window.addEventListener("learngame-session-state", event => {
      state.gameSessionRunning = Boolean(event.detail?.running);
      state.gameSessionDifficulty = event.detail?.session?.difficulty_level || "normal";
      if (event.detail?.session?.game_config) {
        applyGameSessionConfig(event.detail.session.game_config);
      }
      if (!state.gameSessionRunning) {
        state.attention.mode = "task";
        logisticsGameController?.stop();
      }
      renderPlayerView();
    });
    window.addEventListener("learngame-session-started", event => {
      const session = event.detail?.session;
      if (!session?.session_id) return;
      state.gameSessionRunning = true;
      state.sessionId = session.session_id;
      const member = session.members?.find(item => item.member_id === session.current_member_id);
      if (member?.assigned_role_id) state.assignedRoleId = member.assigned_role_id;
      state.gameSessionDifficulty = session.difficulty_level || "normal";
      if (session.game_config) applyGameSessionConfig(session.game_config);
      startStandaloneLogisticsGame(state.gameSessionDifficulty, session.game_config);
      dispatchInteraction({
        actionType: "start_game_session",
        result: session.virtual_agents?.length ? "agents_activated" : "all_players_present",
        objectRole: "game_session",
        role: session.is_game_master ? "Game Master" : "Speler",
        difficultyLevel: state.gameSessionDifficulty,
        virtualAgentRoles: (session.virtual_agents || []).map(agent => agent.role_id)
      });
      renderAll();
    });
    window.addEventListener("leerpret-auth-session", event => {
      if (event.detail?.authenticated) {
        checkBackendTutorialState();
      }
    });
    window.addEventListener("behavior-profile-completed", event => {
      const receipt = event.detail?.receipt || {};
      const tutorialState = receipt.tutorial_state;
      if (
        tutorialState
        && (tutorialState.completed || tutorialState.dismissed)
        && !document.body.classList.contains("tutorial-focus")
      ) {
        state.tutorialCompleted = Boolean(tutorialState.completed);
        state.tutorialDismissed = Boolean(tutorialState.dismissed);
        try {
          if (tutorialState.completed) localStorage.setItem("learngame.om.tutorialCompleted", "true");
          if (tutorialState.dismissed) localStorage.setItem("learngame.om.tutorialDismissed", "true");
        } catch (e) {}
        leaveTutorialFocus();
        updateTutorialResumeButton();
      }
      const analysis = receipt.analysis || {};
      const recommendation = analysis.profile?.recommended_role || analysis.profile?.recommendedRole;
      if (!recommendation?.id) return;
      state.assignedRoleId = recommendation.id;
      dispatchInteraction({
        actionType: "assign_role_from_behavior_profile",
        roleId: recommendation.id,
        role: recommendation.title,
        result: "matched",
        objectRole: "role_assignment",
        matchPercent: recommendation.match,
        reliability: analysis.reliability
      });
      renderAll();
    });
    document.querySelectorAll("button[data-app-view], a[data-app-view]").forEach(button => {
      button.addEventListener("click", () => setAppView(button.dataset.appView));
    });
    document.querySelectorAll("[data-manager-tab]").forEach(button => {
      button.addEventListener("click", () => setManagerTab(button.dataset.managerTab));
    });
    document.querySelectorAll("[data-tutorial-launch]").forEach(button => {
      button.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        launchTutorial();
      });
    });
    els.playerFormConfirmInput?.addEventListener("change", () => {
      els.playerCompleteActionButton.disabled = !els.playerFormConfirmInput.checked;
    });
    els.playerCompleteActionButton?.addEventListener("click", () => {
      if (!els.playerFormConfirmInput.checked) return;
      if (!state.gameSessionRunning && !document.body.classList.contains("tutorial-focus")) return;
      advanceSelectedOrder();
    });
    els.orderForm.addEventListener("submit", event => {
      event.preventDefault();
      const productId = els.productSelect.value;
      const product = productById(productId);
      const quantity = Math.max(1, Number(els.quantityInput.value || 1));
      const unitPrice = state.config.priceMode === "fixed"
        ? product.price
        : Math.max(0, Number(els.priceInput.value || product.price));
      const dueMinutes = Math.max(2, Number(els.dueInput.value || 7));
      makeOrder(productId, quantity, unitPrice, dueMinutes);
    });
    els.playerFormMount.addEventListener("submit", event => {
      const purchaseForm = event.target.closest("[data-player-purchase-form]");
      if (!purchaseForm || !state.gameSessionRunning || state.assignedRoleId !== "srm") return;
      event.preventDefault();
      const formData = new FormData(purchaseForm);
      purchaseMaterials(
        String(formData.get("partId") || ""),
        Math.max(1, Number(formData.get("quantity") || 1))
      );
    });
    els.playerFormMount.addEventListener("click", event => {
      const disruptionButton = event.target.closest("[data-player-disruption]");
      if (!disruptionButton || !state.gameSessionRunning || state.assignedRoleId !== "opr") return;
      triggerDisruption();
    });
    els.dataModelButton.addEventListener("click", () => {
      setAppView("manager", false);
      setManagerTab("process", false);
      els.dataModelPanel.classList.add("visible");
      renderDataModel(true);
      dispatchInteraction({
        actionType: "toggle_order_process_model_view",
        learningObjectID: "orderproces_datamodel_eerste_concept",
        result: "opened",
        objectRole: "orientation",
        role: "Spelkern"
      });
      renderMetrics();
      renderEvents();
    });
    els.processGraphViewButton.addEventListener("click", () => setProcessView("graph"));
    els.processSequenceViewButton.addEventListener("click", () => setProcessView("sequence"));
    els.processSwimlaneViewButton.addEventListener("click", () => setProcessView("swimlane"));
    els.processIsometricViewButton.addEventListener("click", () => setProcessView("isometric"));
    els.exportButton.addEventListener("click", exportEvents);
    els.resetButton.addEventListener("click", resetState);
    els.tutorialExitButton?.addEventListener("click", pauseTutorial);
    els.gameTypeSelect.addEventListener("change", () => {
      const val = els.gameTypeSelect.value;
      if (val === "custom_draft") return;
      loadGameConfiguration(val, true);
    });

    const saveConfigButton = document.getElementById("saveConfigButton");
    const deleteConfigButton = document.getElementById("deleteConfigButton");
    const saveConfigDialog = document.getElementById("saveConfigDialog");
    const saveConfigForm = document.getElementById("saveConfigForm");
    const cancelSaveConfigButton = document.getElementById("cancelSaveConfigButton");

    saveConfigButton?.addEventListener("click", () => {
      const defaultName = state.config.currentConfigName
        ? `${state.config.currentConfigName} (Aangepast)`
        : `Mijn Scenario ${new Date().toLocaleDateString()}`;
      document.getElementById("configSaveNameInput").value = defaultName;
      document.getElementById("configSaveDescInput").value = "";
      saveConfigDialog?.showModal();
    });

    cancelSaveConfigButton?.addEventListener("click", () => {
      saveConfigDialog?.close();
    });

    saveConfigForm?.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = document.getElementById("configSaveNameInput").value.trim();
      const description = document.getElementById("configSaveDescInput").value.trim();
      if (!name) return;

      const activeRoles = getActiveRoles(state.config.gameType);
      const settings = {
        game_type: state.config.gameType,
        money: state.config.money,
        pnl: state.config.pnl,
        opening_balance_enabled: state.config.openingBalance,
        revenue_balance_enabled: state.config.revenueBalance,
        intermediate_stock: state.config.intermediateStock,
        opportunity_costs: state.config.opportunityCosts,
        role_freedom: state.config.roleFreedom,
        multiple_colors: state.config.multipleColors,
        editable_color_layers: [...state.config.editableColorLayers],
        price_mode: state.config.priceMode,
        production_processes: [...state.config.productionProcesses],
        logistics_organization: state.config.logisticsOrganization,
        product_type_count: state.config.productTypeCount,
        customer_order_mode: state.config.customerOrderMode || "required",
        enabled_roles: activeRoles
      };

      const newConfig = window.GameConfigurationStore.saveConfiguration({
        name,
        description,
        baseTemplate: state.config.gameType,
        settings
      });

      saveConfigDialog?.close();
      loadGameConfiguration(newConfig.config_id, true);
    });

    deleteConfigButton?.addEventListener("click", () => {
      const currentId = state.config.currentConfigId;
      if (!currentId) return;
      const config = window.GameConfigurationStore.getConfiguration(currentId);
      if (config && !config.is_preset) {
        if (window.confirm(`Weet je zeker dat je het opgeslagen scenario "${config.name}" wilt verwijderen?`)) {
          window.GameConfigurationStore.deleteCustomConfiguration(currentId);
          loadGameConfiguration("lo4", true);
        }
      }
    });

    [
      els.moneyToggle,
      els.pnlToggle,
      els.openingBalanceToggle,
      els.revenueBalanceToggle,
      els.intermediateToggle,
      els.opportunityToggle,
      els.roleFreedomToggle,
      els.priceModeSelect
    ].filter(Boolean).forEach(control => control.addEventListener("change", () => syncConfigFromControls(true)));
    els.productSelect.addEventListener("change", () => {
      updatePriceInput();
      renderOrderPreview();
      window.LegoBuilder?.setProduct(els.productSelect.value);
    });
    els.productTypeCountInput.addEventListener("change", () => applyProductTypeCount(true));
    [els.parallelProductionToggle, els.sequentialProductionToggle].forEach(control => {
      control.addEventListener("change", () => syncConfigFromControls(true));
    });
    els.quantityInput.addEventListener("input", renderOrderPreview);
    els.priceInput.addEventListener("input", renderOrderPreview);
  }

  function setProcessView(view) {
    state.config.processView = view;
    dispatchInteraction({
      actionType: "change_order_process_view",
      learningObjectID: "orderproces_datamodel_eerste_concept",
      result: view,
      objectRole: "orientation",
      role: "Spelkern"
    });
    renderDataModel(true);
    renderMetrics();
    renderEvents();
  }

  function setVisibleLogisticsDepartments(departmentIds) {
    const knownIds = new Set(
      Object.values(LOGISTICS_ORGANIZATION_VARIANTS)
        .flatMap(variant => variant.departments.map(department => department.id))
    );
    const requestedIds = Array.isArray(departmentIds) ? departmentIds : [];
    const visibleIds = Array.from(new Set(requestedIds)).filter(id => knownIds.has(id));
    state.config.visibleLogisticsDepartments = visibleIds;
    if (!visibleIds.includes(state.selectedLogisticsDepartmentId)) {
      state.selectedLogisticsDepartmentId = visibleIds[0] || null;
    }
    renderDataModel(true);
  }

  function setLogisticsOrganizationVariant(variantId) {
    if (!LOGISTICS_ORGANIZATION_VARIANTS[variantId]) return false;
    state.config.productionProcesses = [
      variantId === "product" ? "parallel" : "sequential"
    ];
    state.config.logisticsOrganization = variantId;
    syncConfigControls();
    state.config.visibleLogisticsDepartments = LOGISTICS_ORGANIZATION_VARIANTS[variantId]
      .departments.map(department => department.id);
    state.selectedLogisticsDepartmentId = state.config.visibleLogisticsDepartments[0] || null;
    dispatchInteraction({
      actionType: "change_logistics_organization",
      learningObjectID: "configuration_logistics_organization",
      result: variantId,
      objectRole: "configuration",
      role: "Game Master"
    });
    renderDataModel(true);
    renderMetrics();
    renderEvents();
    return true;
  }

  function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) return;
    if (!/^https?:$/.test(location.protocol)) return;
    if (!window.isSecureContext && location.hostname !== "localhost" && location.hostname !== "127.0.0.1") return;

    navigator.serviceWorker.register("service-worker.js").then(registration => {
      registration.update();
      if (registration.waiting) {
        registration.waiting.postMessage({ type: "SKIP_WAITING" });
      }
    }).catch(error => {
      console.info("Service worker niet geregistreerd:", error);
    });
  }

  function applyInitialRoute() {
    if (location.hash === "#tutorialStep4") {
      startFinancialTutorial();
      return;
    }
    if (location.hash === "#tutorialStep2") {
      window.LegoBuilder?.prepareStockTutorial("B");
      startLogisticsTutorial(true);
      return;
    }
    if (location.hash === "#isometricLogistics") {
      state.config.processView = "isometric";
      els.dataModelPanel.classList.add("visible");
      renderDataModel(true);
      return;
    }

    if (location.hash === "#dataModelPanel") {
      els.dataModelPanel.classList.add("visible");
      renderDataModel(true);
      return;
    }

    if (location.hash === "#orderForm") {
      els.orderForm.scrollIntoView({ block: "center" });
    }
  }

  function initControls() {
    try {
      if (localStorage.getItem("learngame.om.tutorialCompleted") === "true") {
        state.tutorialCompleted = true;
        state.tutorialDismissed = true;
      } else if (localStorage.getItem("learngame.om.tutorialDismissed") === "true") {
        state.tutorialDismissed = true;
      }
    } catch (e) {}
    rebuildProducts(state.config.productTypeCount);
    productOptions();
    els.quantityInput.value = "3";
    els.dueInput.value = "7";
    els.productTypeCountInput.min = String(MIN_PRODUCT_TYPES);
    els.productTypeCountInput.max = String(MAX_PRODUCT_TYPES);
    syncConfigControls();
    const storedManagerTab = sessionStorage.getItem("learngame.om.managerTab");
    state.managerTab = storedManagerTab === "core" ? "session" : storedManagerTab || "session";
    state.appView = sessionStorage.getItem("learngame.om.appView") || "player";
    setAppView(state.appView, false);
    updatePriceInput();
    updateTutorialResumeButton();
  }

  window.LEARNGameOMSimulator = {
    dispatchInteraction,
    getInteractionBuffer: () => [...state.interactionBuffer],
    getContractEventBuffer: () => [...state.contractEventBuffer],
    clearInteractionBuffer: () => {
      state.interactionBuffer.length = 0;
      state.contractEventBuffer.length = 0;
      renderAll();
    },
    getStateSnapshot: () => ({
      sessionId: state.sessionId,
      version: "ICG2-v2",
      appView: state.appView,
      managerTab: state.managerTab,
      assignedRoleId: state.assignedRoleId,
      attentionMode: state.attention.mode,
      clockMinutes: state.clockMinutes,
      config: { ...state.config },
      standaloneLogisticsGame: logisticsGameController?.engine?.snapshot() || null,
      roles: ROLES.map(role => ({ ...role })),
      dataModelLearningObjects: DATA_MODEL_LEARNING_OBJECTS.map(dataModelObjectSnapshot),
      inventory: { ...state.inventory },
      ss1: { ...state.ss1 },
      ss2: { ...state.ss2 },
      finishedGoods: { ...state.finishedGoods },
      purchaseCost: state.purchaseCost,
      opportunityCost: state.opportunityCost,
      financial: {
        ...state.financial,
        wipByDepartment: { ...state.financial.wipByDepartment },
        finishedGoodsByDepartment: { ...state.financial.finishedGoodsByDepartment },
        materialCostByDepartment: { ...state.financial.materialCostByDepartment },
        conversionCostByDepartment: { ...state.financial.conversionCostByDepartment },
        revenueByDepartment: { ...state.financial.revenueByDepartment },
        opportunityCostByDepartment: { ...state.financial.opportunityCostByDepartment },
        wipByStage: { ...state.financial.wipByStage },
        materialCostByStage: { ...state.financial.materialCostByStage }
      },
      tutorialDismissed: state.tutorialDismissed,
      tutorialCompleted: state.tutorialCompleted,
      tutorialPaused: state.tutorialPaused,
      tutorialStage: state.tutorialStage,
      logisticsTutorial: {
        ...state.logisticsTutorial,
        warehouseStock: { ...state.logisticsTutorial.warehouseStock },
        playerStock: { ...state.logisticsTutorial.playerStock },
        assemblyStock: { ...state.logisticsTutorial.assemblyStock },
        semiFinished: { ...state.logisticsTutorial.semiFinished },
        finance: {
          ...state.logisticsTutorial.finance,
          picked: { ...state.logisticsTutorial.finance.picked },
          mutation: state.logisticsTutorial.finance.mutation
            ? { ...state.logisticsTutorial.finance.mutation }
            : null
        }
      },
      orders: state.orders.map(order => ({
        ...order,
        processSteps: (order.processSteps || []).map(step => ({ ...step })),
        stageMaterialsIssued: { ...order.stageMaterialsIssued },
        stageFinancialCost: { ...order.stageFinancialCost },
        history: order.history.map(item => ({ ...item }))
      }))
    }),
    getDataModelLearningObjects: () => DATA_MODEL_LEARNING_OBJECTS.map(dataModelObjectSnapshot),
    getLogisticsDepartments: () => isometricScene().departments.map(department => ({ ...department })),
    getLegoBuilderSnapshot: () => window.LegoBuilder?.getSnapshot() || null,
    beginOnboardingTutorial: () => {
      if (location.hash === "#tutorialStep4") {
        startFinancialTutorial();
        return;
      }
      if (location.hash === "#tutorialStep2") {
        window.LegoBuilder?.prepareStockTutorial("B");
        startLogisticsTutorial(true);
        return;
      }
      if (state.tutorialCompleted || state.tutorialDismissed) {
        leaveTutorialFocus();
        updateTutorialResumeButton();
        return;
      }
      state.tutorialDismissed = false;
      state.tutorialCompleted = false;
      state.tutorialPaused = false;
      setTutorialFocus("builder");
      window.LegoBuilder?.restartTutorial();
      renderAll();
    },
    startLogisticsTutorial,
    collectTutorialMaterial,
    dropTutorialMaterial,
    transferTutorialStockToAssembly,
    startInternalLogisticsTutorial,
    transferTutorialSemiFinished,
    dropTutorialSemiFinished,
    finishInternalLogisticsTutorial,
    startFinancialTutorial,
    dropFinancialTutorialMaterial,
    transferFinancialTutorialProduct,
    deliverFinancialTutorialOrder,
    finishFinancialTutorial,
    pauseTutorial,
    resumeTutorial,
    launchTutorial,
    endTutorial,
    setAppView,
    setManagerTab,
    setVisibleLogisticsDepartments,
    setLogisticsOrganizationVariant,
    applyGameTypePreset,
    createOrder: makeOrder,
    advanceSelectedOrder,
    purchaseMaterials,
    triggerDisruption
  };

  // Bind this essential escape/restart action before initializing the heavier
  // game views. It must remain usable even if a renderer fails during startup.
  document.addEventListener("click", event => {
    const appViewButton = event.target.closest("button[data-app-view], a[data-app-view]");
    if (appViewButton && appViewButton.dataset.appView) {
      event.preventDefault();
      setAppView(appViewButton.dataset.appView);
      return;
    }
    const managerTabButton = event.target.closest("[data-manager-tab]");
    if (managerTabButton && managerTabButton.dataset.managerTab) {
      event.preventDefault();
      setManagerTab(managerTabButton.dataset.managerTab);
      return;
    }
    const button = event.target.closest("[data-tutorial-launch]");
    if (!button || button.disabled) return;
    event.preventDefault();
    launchTutorial();
  });

  initControls();
  initLegoBuilder();
  initTowerEditor();
  initStandaloneLogisticsGame();
  wireEvents();
  registerServiceWorker();
  resetState();
  applyInitialRoute();
})();
