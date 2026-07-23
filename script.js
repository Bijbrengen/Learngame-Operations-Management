(() => {
  const LEARNING_OBJECT_ID = "leerbox-learngame-operations-management";
  const PERSON_ID = `person-${Math.random().toString(36).slice(2, 8)}`;

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
  const MIN_PRODUCT_TYPES = 3;
  const MAX_PRODUCT_TYPES = TOWER_BLUEPRINTS.length;
  let PRODUCTS = {};

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
    interactionBuffer: [],
    contractEventBuffer: [],
    selectedLogisticsDepartmentId: "inbound",
    config: {
      money: true,
      pnl: true,
      intermediateStock: true,
      opportunityCosts: true,
      roleFreedom: false,
      priceMode: "fixed",
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
    selectedOrderBox: document.getElementById("selectedOrderBox"),
    advanceButton: document.getElementById("advanceButton"),
    disruptionButton: document.getElementById("disruptionButton"),
    purchaseForm: document.getElementById("purchaseForm"),
    purchasePartSelect: document.getElementById("purchasePartSelect"),
    purchaseQuantityInput: document.getElementById("purchaseQuantityInput"),
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
    moneyToggle: document.getElementById("moneyToggle"),
    pnlToggle: document.getElementById("pnlToggle"),
    intermediateToggle: document.getElementById("intermediateToggle"),
    opportunityToggle: document.getElementById("opportunityToggle"),
    roleFreedomToggle: document.getElementById("roleFreedomToggle"),
    priceModeSelect: document.getElementById("priceModeSelect"),
    logisticsOrganizationSelect: document.getElementById("logisticsOrganizationSelect"),
    productTypeCountInput: document.getElementById("productTypeCountInput")
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
      stages,
      visual: makeTowerVisual(blueprint)
    };
  }

  function rebuildProducts(count = MIN_PRODUCT_TYPES) {
    const productCount = Math.max(MIN_PRODUCT_TYPES, Math.min(MAX_PRODUCT_TYPES, Number(count) || MIN_PRODUCT_TYPES));
    PRODUCTS = Object.fromEntries(
      Array.from({ length: productCount }, (_, index) => {
        const id = PRODUCT_IDS[index];
        return [id, BASE_PRODUCTS[id] || makeGeneratedProduct(index)];
      })
    );
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

  function selectedOrder() {
    return state.orders.find(order => order.id === state.selectedOrderId) || null;
  }

  function activeOrders() {
    return state.orders.filter(order => !order.done);
  }

  function currentStep(order) {
    return STEPS[order.stepIndex] || STEPS[STEPS.length - 1];
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

  function makeOrder(productId, quantity, unitPrice, dueMinutes) {
    state.orderCounter += 1;
    const customerNumber = ((state.orderCounter - 1) % 4) + 1;
    const customerRoleId = `customer${customerNumber}`;
    const order = {
      id: `order-${String(state.orderCounter).padStart(3, "0")}`,
      productId,
      quantity,
      unitPrice,
      customerRoleId,
      acceptedAt: state.clockMinutes,
      dueAt: state.clockMinutes + dueMinutes,
      stepIndex: 0,
      stageMaterialsIssued: { 1: false, 2: false, 3: false },
      status: "active",
      lastIssue: "",
      done: false,
      late: false,
      priority: false,
      materialCost: recipeCost(productId, quantity),
      history: []
    };
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
      screen: "Ik wil een order plaatsen"
    });
    addClock(1);
    renderAll();
  }

  function missingMaterials(order, stageNumber) {
    const recipe = recipeForStage(order.productId, stageNumber, order.quantity);
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
    const missing = missingMaterials(order, stageNumber);
    if (missing.length) {
      const text = missing.map(item => `${partById(item.partId).name}: ${item.missing}`).join(", ");
      blockOrder(order, step, role, `Tekort ${text}`, "stockout");
      return false;
    }
    const recipe = recipeForStage(order.productId, stageNumber, order.quantity);
    Object.entries(recipe).forEach(([partId, amount]) => {
      state.inventory[partId] -= amount;
    });
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

  function completeProductionStage(order, stageNumber) {
    const product = productById(order.productId);
    const stage = product.stages[stageNumber - 1];
    if (!state.config.intermediateStock) return;
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
      completeProductionStage(order, step.completeStage);
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
      late: order.late
    });
    order.history.push({ minute: state.clockMinutes, label: step.label, result });
    if (!order.done) {
      order.stepIndex += 1;
    }
    maybeRoleDeviation(order, step, role);
    maybeAutomaticDisruption(order);
    renderAll();
  }

  function applyDisruption(order, disruption, automatic = false) {
    if (!order || order.done) return;
    const role = roleById(disruption.roleId);
    addClock(disruption.minutes);
    const cost = state.config.opportunityCosts ? disruption.cost : 0;
    state.opportunityCost += cost;
    order.status = "blocked";
    order.lastIssue = disruption.label;
    if (disruption.id === "quality_rework" && order.stepIndex > 18) {
      order.stepIndex = 19;
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

  function purchaseOptions() {
    els.purchasePartSelect.innerHTML = PARTS
      .map(part => `<option value="${part.id}">${part.name} - EUR ${part.price}</option>`)
      .join("");
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
    return Math.round((order.stepIndex / STEPS.length) * 100);
  }

  function renderTower(productId) {
    const product = productById(productId);
    if (window.LegoTowerRenderer) {
      return window.LegoTowerRenderer.render(productId, product.name, product.towerBlueprint, "tower-mini-3d");
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
      return window.LegoTowerRenderer.render(productId, product.name, product.towerBlueprint, "tower-large");
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

  function renderSelectedOrder() {
    const order = selectedOrder();
    if (!order) {
      els.selectedOrderBox.className = "selected-order ready";
      els.selectedOrderBox.innerHTML =
        `<strong>Klant 1</strong>\n` +
        `Ik wil een order plaatsen.\n` +
        `Kies product, aantal en levertijd bovenin.`;
      els.advanceButton.disabled = true;
      return;
    }
    const step = currentStep(order);
    const roleId = step.roleId === "customer1" ? order.customerRoleId : step.roleId;
    const role = roleById(roleId);
    els.selectedOrderBox.className = `selected-order${order.status === "blocked" ? "" : " ready"}`;
    els.selectedOrderBox.innerHTML =
      `<strong>${escapeHtml(role.token)} | ${escapeHtml(role.title)}</strong>\n` +
      `${escapeHtml(order.id)} | ${escapeHtml(productById(order.productId).name)} | ${order.quantity} stuks\n` +
      `${escapeHtml(step.action)}\n` +
      `${escapeHtml(step.label)}\n` +
      `Levering ${formatClock(order.dueAt)}${order.lastIssue ? `\n${escapeHtml(order.lastIssue)}` : ""}`;
    els.advanceButton.disabled = order.done;
  }

  function renderInventory() {
    const items = PARTS.map(part => {
      const count = state.inventory[part.id] || 0;
      const low = count <= part.reorder;
      return `
        <article class="inventory-item${low ? " low" : ""}">
          ${renderPart(part)}
          <div>
            <h3 class="inventory-name">${escapeHtml(part.name)}</h3>
            <div class="inventory-meta">inkoop EUR ${part.price} | signaal ${part.reorder}</div>
          </div>
          <strong class="inventory-count">${count}</strong>
        </article>
      `;
    });

    Object.values(PRODUCTS).forEach(product => {
      items.push(`
        <article class="inventory-item">
          ${renderTower(product.id)}
          <div>
            <h3 class="inventory-name">SS1 / SS2 / gereed ${escapeHtml(product.id)}</h3>
            <div class="inventory-meta">${state.ss1[product.id]} / ${state.ss2[product.id]} / ${state.finishedGoods[product.id]}</div>
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
      return {
        primaryMetric: `${orders.length} lopend`,
        facts: [
          { label: "Lopende orders", value: orders.length },
          { label: "Processtap", value: definition.shortTitle },
          { label: "Organisatie", value: "Functionele keten" }
        ]
      };
    }
    if (definition.id === "production_1") {
      return {
        primaryMetric: `${orders.length} × Toren A`,
        facts: [
          { label: "Lopende productorders", value: orders.length },
          { label: "Product", value: "Toren A" },
          { label: "Afdeling", value: "A" }
        ]
      };
    }
    if (definition.id === "production_2") {
      return {
        primaryMetric: `${orders.length} × Toren B`,
        facts: [
          { label: "Lopende productorders", value: orders.length },
          { label: "Product", value: "Toren B" },
          { label: "Afdeling", value: "B" }
        ]
      };
    }
    if (definition.id === "production_3") {
      return {
        primaryMetric: `${orders.length} × Toren C`,
        facts: [
          { label: "Lopende productorders", value: orders.length },
          { label: "Product", value: "Toren C" },
          { label: "Afdeling", value: "C" }
        ]
      };
    }
    if (definition.id === "quality") {
      return {
        primaryMetric: `${sumProductStock(state.finishedGoods)} gereed`,
        facts: [
          { label: "Te controleren orders", value: orders.length },
          { label: "Gereed-productvoorraad", value: sumProductStock(state.finishedGoods) },
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

  function isometricScene() {
    const organization = LOGISTICS_ORGANIZATION_VARIANTS[state.config.logisticsOrganization]
      || LOGISTICS_ORGANIZATION_VARIANTS.product;
    const visible = new Set(state.config.visibleLogisticsDepartments);
    return {
      title: organization.title,
      legend: organization.legend,
      organizationId: organization.id,
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
    const topOffset = 50;
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
      return `<div class="swimlane-band" style="left:${x}px;top:${topOffset - 8}px;width:${laneWidth}px;height:${swimlaneHeight - topOffset + 8}px"></div>`;
    }).join("");
    const edges = orderedItems.slice(0, -1).map((item, index) => {
      const next = orderedItems[index + 1];
      const source = positions[item.id];
      const target = positions[next.id];
      const sameLane = Math.abs(source.x - target.x) < 4;
      const sx = sameLane ? source.x + source.width / 2 : (source.x < target.x ? source.x + source.width : source.x);
      const sy = source.y + source.height;
      const tx = sameLane ? target.x + target.width / 2 : (source.x < target.x ? target.x : target.x + target.width);
      const ty = target.y;
      const path = sameLane
        ? `M ${sx} ${sy} L ${tx} ${ty}`
        : `M ${sx} ${sy} C ${sx} ${sy + rowGap}, ${tx} ${ty - rowGap}, ${tx} ${ty}`;
      return `<path class="data-model-edge swimlane-edge" d="${path}"></path>`;
    }).join("");
    const nodes = orderedItems.map((item, index) => {
      const position = positions[item.id];
      const colorClass = `source-${dataModelColor(item)}`;
      return `
        <article class="data-model-node swimlane-node ${colorClass}" data-model-object-id="${escapeHtml(item.id)}" style="left:${position.x}px;top:${position.y}px;width:${laneWidth}px;height:${nodeHeight}px">
          <div class="data-model-number">${escapeHtml(item.modelNumber)}</div>
          <div>
            <h3>${String(index + 1).padStart(2, "0")} | ${escapeHtml(item.label)}</h3>
            <div class="data-model-meta">${escapeHtml(item.role)} | ${escapeHtml(item.from)} -> ${escapeHtml(item.to)}</div>
          </div>
        </article>
      `;
    }).join("");

    return `
      <div class="data-model-canvas swimlane-canvas" style="width:${swimlaneWidth}px;height:${swimlaneHeight}px">
        ${laneBands}
        ${headers}
        <svg class="data-model-edges" viewBox="0 0 ${swimlaneWidth} ${swimlaneHeight}" aria-hidden="true">
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
    renderSelectedOrder();
    renderInventory();
    renderEvents();
    renderDataModel(false);
    updatePriceInput();
    renderOrderPreview();
  }

  function initLegoBuilder() {
    if (!window.LegoBuilder || !els.legoBuilderMount) return;
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
      },
      onDelivered: delivery => {
        if (!delivery.correct) return;
        const selected = selectedOrder();
        const order = selected?.productId === delivery.productId
          ? selected
          : [...state.orders].reverse().find(candidate => !candidate.done && candidate.productId === delivery.productId);
        if (order) {
          order.buildValidated = true;
          order.builtBricks = delivery.bricks.map(brick => ({ ...brick }));
          order.history.push({
            step: "lego_build_validated",
            at: state.clockMinutes,
            productId: delivery.productId
          });
        }
        renderAll();
      }
    });
  }

  function syncConfigFromControls(dispatch = true) {
    state.config.money = els.moneyToggle.checked;
    state.config.pnl = els.pnlToggle.checked;
    state.config.intermediateStock = els.intermediateToggle.checked;
    state.config.opportunityCosts = els.opportunityToggle.checked;
    state.config.roleFreedom = els.roleFreedomToggle.checked;
    state.config.priceMode = els.priceModeSelect.value;
    state.config.logisticsOrganization = els.logisticsOrganizationSelect.value;
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
    rebuildProducts(state.config.productTypeCount);
    state.sessionId = `icg2-v2-${Date.now().toString(36)}`;
    state.clockMinutes = 600;
    state.orders = [];
    state.selectedOrderId = null;
    state.orderCounter = 7;
    resetProductStores();
    state.purchaseCost = 0;
    state.opportunityCost = 0;
    state.interactionBuffer.length = 0;
    state.contractEventBuffer.length = 0;
    resetInventory();
    window.LegoBuilder?.restartTutorial();
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
    els.purchaseForm.addEventListener("submit", event => {
      event.preventDefault();
      purchaseMaterials(els.purchasePartSelect.value, Math.max(1, Number(els.purchaseQuantityInput.value || 1)));
    });
    els.advanceButton.addEventListener("click", advanceSelectedOrder);
    els.disruptionButton.addEventListener("click", triggerDisruption);
    els.dataModelButton.addEventListener("click", () => {
      els.dataModelPanel.classList.toggle("visible");
      if (els.dataModelPanel.classList.contains("visible")) {
        renderDataModel(true);
      } else {
        els.dataModelGrid.innerHTML = "";
      }
      dispatchInteraction({
        actionType: "toggle_order_process_model_view",
        learningObjectID: "orderproces_datamodel_eerste_concept",
        result: els.dataModelPanel.classList.contains("visible") ? "opened" : "closed",
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
    [
      els.moneyToggle,
      els.pnlToggle,
      els.intermediateToggle,
      els.opportunityToggle,
      els.roleFreedomToggle,
      els.priceModeSelect
    ].forEach(control => control.addEventListener("change", () => syncConfigFromControls(true)));
    els.productSelect.addEventListener("change", () => {
      updatePriceInput();
      renderOrderPreview();
      window.LegoBuilder?.setProduct(els.productSelect.value);
    });
    els.productTypeCountInput.addEventListener("change", () => applyProductTypeCount(true));
    els.logisticsOrganizationSelect.addEventListener("change", () => {
      setLogisticsOrganizationVariant(els.logisticsOrganizationSelect.value);
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
    state.config.logisticsOrganization = variantId;
    els.logisticsOrganizationSelect.value = variantId;
    state.selectedLogisticsDepartmentId = state.config.visibleLogisticsDepartments.includes("inbound")
      ? "inbound"
      : state.config.visibleLogisticsDepartments[0] || null;
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

    navigator.serviceWorker.register("service-worker.js").catch(error => {
      console.info("Service worker niet geregistreerd:", error);
    });
  }

  function applyInitialRoute() {
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
    rebuildProducts(state.config.productTypeCount);
    productOptions();
    purchaseOptions();
    els.quantityInput.value = "3";
    els.dueInput.value = "7";
    els.moneyToggle.checked = state.config.money;
    els.pnlToggle.checked = state.config.pnl;
    els.intermediateToggle.checked = state.config.intermediateStock;
    els.opportunityToggle.checked = state.config.opportunityCosts;
    els.roleFreedomToggle.checked = state.config.roleFreedom;
    els.priceModeSelect.value = state.config.priceMode;
    els.logisticsOrganizationSelect.value = state.config.logisticsOrganization;
    els.productTypeCountInput.min = String(MIN_PRODUCT_TYPES);
    els.productTypeCountInput.max = String(MAX_PRODUCT_TYPES);
    els.productTypeCountInput.value = String(state.config.productTypeCount);
    updatePriceInput();
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
      clockMinutes: state.clockMinutes,
      config: { ...state.config },
      roles: ROLES.map(role => ({ ...role })),
      dataModelLearningObjects: DATA_MODEL_LEARNING_OBJECTS.map(dataModelObjectSnapshot),
      inventory: { ...state.inventory },
      ss1: { ...state.ss1 },
      ss2: { ...state.ss2 },
      finishedGoods: { ...state.finishedGoods },
      purchaseCost: state.purchaseCost,
      opportunityCost: state.opportunityCost,
      orders: state.orders.map(order => ({ ...order }))
    }),
    getDataModelLearningObjects: () => DATA_MODEL_LEARNING_OBJECTS.map(dataModelObjectSnapshot),
    getLogisticsDepartments: () => isometricScene().departments.map(department => ({ ...department })),
    getLegoBuilderSnapshot: () => window.LegoBuilder?.getSnapshot() || null,
    setVisibleLogisticsDepartments,
    setLogisticsOrganizationVariant,
    createOrder: makeOrder,
    advanceSelectedOrder,
    purchaseMaterials,
    triggerDisruption
  };

  initControls();
  initLegoBuilder();
  wireEvents();
  registerServiceWorker();
  resetState();
  applyInitialRoute();
})();
