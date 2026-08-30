(() => {
  const LEARNING_BOX_ID = "learngame-operations-management";
  const LEARNING_OBJECT_ID = "lom.interface";
  const PERSON_ID_STORAGE = "learngame.om.personId.v1";
  const INTERACTION_OUTBOX_STORAGE = "learngame.om.interactionOutbox.v1";
  const INTERACTION_OUTBOX_ITEM_PREFIX = "learngame.om.interactionOutbox.v2:";
  const volatileInteractionOutbox = new Map();
  function randomIdentifier(prefix) {
    return `${prefix}-${globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`}`;
  }
  function loadFallbackPersonId() {
    try {
      const stored = localStorage.getItem(PERSON_ID_STORAGE);
      if (stored) return stored;
      const created = randomIdentifier("lom-person");
      localStorage.setItem(PERSON_ID_STORAGE, created);
      return created;
    } catch {
      return randomIdentifier("lom-person");
    }
  }
  const fallbackPersonId = loadFallbackPersonId();
  let measurementPersonId = fallbackPersonId;
  let interactionSequence = 0;
  let outboxFlushPromise = null;
  let outboxRetryTimer = null;
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
  const CONFIGURATION_HELP = Object.freeze({
    "session-access": {
      title: "Toegang tot de sessie",
      mechanical: "Bepaalt of spelers de sessie kunnen zien en of zij een gamecode nodig hebben om deel te nemen.",
      learning: "Laat de spelleider kiezen tussen een besloten oefenomgeving en een laagdrempelige, open instroom.",
      basis: "Praktische sessie-inrichting; dit is geen afzonderlijke LO-Game-leerlaag."
    },
    difficulty: {
      title: "Moeilijkheidsgraad",
      mechanical: "Verandert de aanvraagdruk, foutkans en reactietijd van gesimuleerde rollen.",
      learning: "Maakt zichtbaar hoe een proces reageert op systeemdruk en ruis. Fouten zijn hier bewust leermomenten: in een simulatie kunnen spelers de gevolgen ervaren zonder de verstrekkende gevolgen van de werkelijkheid.",
      basis: "LE-boek: leren van fouten in een veilige spelsimulatie."
    },
    "play-mode": {
      title: "Spelmodus",
      mechanical: "Fysiek gebruikt echte LEGO en registreert de administratie; digitaal laat bouwen en transport volledig op het scherm plaatsvinden.",
      learning: "Bepaalt of de nadruk ligt op tastbare samenwerking aan tafel of op digitale informatiestromen, ordertraceerbaarheid en directe terugkoppeling.",
      basis: "LE-boek: LO-Game 7 maakt informatie- en financiële stromen digitaal en traceerbaar."
    },
    "game-type": {
      title: "Gametype",
      mechanical: "Laadt een samenhangende preset van spelregels, rollen en procesinstellingen.",
      learning: "De LO-Games vormen een opbouwende reeks waarin telkens andere organisatiefouten en kenmerken zichtbaar worden: van kwaliteit en effectiviteit naar efficiency, flexibiliteit en digitale besturing.",
      basis: "LE-boek: de spelvarianten zijn ontwikkeld als een stapsgewijze ‘hiërarchie van fouten’."
    },
    "organization-model": {
      title: "Organisatievorm",
      mechanical: "Kiest tussen afdelingen binnen één bedrijf, zelfstandige ondernemingen in een marktketen en een budgetgedreven school/leertraject. In het schoolmodel staan de blokjes voor leerinhoud die per schooljaar aan het traject wordt toegevoegd.",
      learning: "De gewone LO-Games richten zich op gezamenlijke procesoptimalisatie. De Entrepreneurship Game draait om concurrentie en strategische samenwerking. LE-Training behandelt leerlingdoorstroom als een parallel én sequentieel onderwijsproces met budgetuitputting in plaats van gewone verkoopomzet.",
      basis: "LE-boek: LE-Training simuleert een school als budgetorganisatie; leerlingen doorlopen jaarlagen en krijgen per jaarlaag leerinhoud toegevoegd."
    },
    "funding-incentive": {
      title: "Bekostigingsprikkel",
      mechanical: "Legt in de sessie en runtime vast of keuzes worden beoordeeld vanuit onderwijskwaliteit, een balans tussen kwaliteit en budget, of leerlingvolume, verblijfsduur en ondersteuningsbekostiging.",
      learning: "Maakt de mogelijke spanning zichtbaar tussen het inhoudelijke doel—een leerling goed en tijdig laten doorstromen—en een financieringssysteem waarin langer verblijf of extra ondersteuning ook extra middelen kan opleveren. Dit is een simulatieprikkel, geen oordeel dat vertraging altijd financieel gunstig is.",
      basis: "LE-boek: LE-Training is ontwikkeld rond het lumpsumprobleem en toont budgetuitputting en de financiële gevolgen van keuzes in real time."
    },
    money: {
      title: "Geld en marges",
      mechanical: "Voegt kosten, opbrengsten, geldstromen en marges toe aan de logistieke handelingen.",
      learning: "Maakt in LO-Game 4 zichtbaar dat de zeer effectieve productorganisatie van versie 3 niet automatisch efficiënt is. Een rustige afdeling kan met weinig werk toch een hoge marge maken, terwijl drukte niet vanzelf waarde betekent. Onderbenutting, overbelasting en gemiste dekkingsbijdragen worden zichtbaar; versie 4 stelt de diagnose, terwijl de herinrichting pas in versie 5 volgt.",
      basis: "LE-boek: LO-Game 3 is de effectieve P-organisatie; LO-Game 4 voegt geldstromen en opportunity costs toe om haar inefficiëntie zichtbaar te maken."
    },
    pnl: {
      title: "Winst en verlies",
      mechanical: "Verrekent opbrengsten met materiaal-, productie- en andere geregistreerde kosten.",
      learning: "Maakt zichtbaar dat omzet, geld in kas en winst verschillende dingen zijn. Spelers ervaren waarom kostprijzen, de waarde van halffabricaten en een verlies-en-winstrekening nodig zijn om de organisatie te beoordelen.",
      basis: "LE-boek: LO-Game 4 koppelt de productie-ervaring aan kostprijsbepaling en financiële verslaggeving."
    },
    "intermediate-stock": {
      title: "Tussenvoorraad",
      mechanical: "Halffabricaten worden tussen productiestappen opgeslagen in plaats van direct doorgegeven.",
      learning: "Maakt wachtrijen en afhankelijkheden tussen deelbewerkingen zichtbaar. Een oplopende voorraad vóór een afdeling kan het knelpunt in de keten aanwijzen; zonder buffers neemt de directe afstemmingsdruk toe.",
      basis: "LE-boek: de functionele organisatie gebruikt tussenvoorraad 1 en 2; voorraad vóór de zwakste schakel signaleert het knelpunt."
    },
    "opportunity-costs": {
      title: "Opportunity costs",
      mechanical: "Registreert de gemiste opbrengst van capaciteit of keuzes die niet voor het beste alternatief zijn ingezet.",
      learning: "Maakt gemiste dekkingsbijdragen zichtbaar. In de productorganisatie kunnen afdelingen A en C weinig werk hebben terwijl B overbelast is; de organisatie verdient dan minder doordat beschikbare capaciteit niet voor de gevraagde toren wordt ingezet.",
      basis: "LE-boek: LO-Game 4 gebruikt opportunity costs als drijvende kracht voor herinrichting naar een functionele organisatie."
    },
    "role-freedom": {
      title: "Rolvrijheid",
      mechanical: "Spelers mogen buiten de vaste bevoegdheden en taken van hun toegewezen rol handelen.",
      learning: "Laat onderzoeken wanneer initiatief de keten helpt en wanneer rolvermenging verantwoordelijkheid vertroebelt. Vaste rollen maken juist ervaarbaar waarom specialisten hun eigen deelproces beheren en management het geheel coördineert.",
      basis: "LE-boek: rolverantwoordelijkheid, arbeidsdeling en de grenzen tussen management en technische uitvoering."
    },
    "production-planning": {
      title: "Productieplanning",
      mechanical: "Toont het productieplan, controleert beschikbare grondstoffen en vergelijkt gepland met werkelijk gereed.",
      learning: "Laat ervaren dat een organisatie volgens een globaal plan moet werken én moet bijsturen wanneer de werkelijkheid afwijkt. Het ondersteunt gesprekken over MRP, push/pull, JIT en produceren op voorraad.",
      basis: "LE-boek: LO-Game 5 gaat van ordergestuurd naar plangestuurd en maakt planning en aanpassen ervaarbaar."
    },
    "opening-balance": {
      title: "Openingsbalans",
      mechanical: "Geeft de organisatie een financiële beginpositie voordat de eerste order wordt uitgevoerd.",
      learning: "Laat zien welke bezittingen, schulden en liquide middelen vóór de eerste order beschikbaar zijn en waarom een winstgevend bedrijf toch te weinig geld kan hebben om door te werken.",
      basis: "LE-boek: balans, resultaat en liquiditeit zijn verschillende maar samenhangende perspectieven."
    },
    "revenue-balance": {
      title: "Omzetbalans",
      mechanical: "Vergelijkt omzet met de financiële begin- en eindpositie van de sessie.",
      learning: "Maakt het verschil zichtbaar tussen verkopen, kasbewegingen en het uiteindelijke financiële resultaat. Liquiditeit is voor het voortbestaan cruciaal, ook wanneer er op papier winst is.",
      basis: "LE-boek: de ontwikkeling van de geldstroom wordt vaak onderschat, maar is voor de ondernemer essentieel."
    },
    "color-freedom": {
      title: "Kleurvrijheid",
      mechanical: "Laat spelers zelf kleuren kiezen voor de grondplaat en geselecteerde torenlagen.",
      learning: "Laat zien hoe ver een specifieke klantwens de productie binnendringt. Meer kleurkeuze verhoogt flexibiliteit en mogelijke dekkingsbijdrage, maar veroorzaakt ook extra materiaal-, informatie- en afstemmingsdruk.",
      basis: "LE-boek: LO-Game 6 visualiseert flexibiliteit en het klantorderontkoppelpunt met klantspecifieke kleuren."
    },
    "customer-order": {
      title: "Klantorder",
      mechanical: "Bij een vrije order kiest de klant toren en aantal; bij een verplichte order bepaalt de spelvariant de vraag.",
      learning: "Een vrije order maakt de grilligheid en specificiteit van klantwensen ervaarbaar. Een verplichte order houdt de vraag beheerst, zodat de werking van de gekozen organisatievorm duidelijker te vergelijken is.",
      basis: "LE-boek: ordergestuurde productie en het klantorderontkoppelpunt bepalen waar klantvraag de keten beïnvloedt."
    },
    price: {
      title: "Prijs",
      mechanical: "Een vaste prijs staat vooraf vast; een vrije prijs kan tijdens de game worden bepaald of onderhandeld.",
      learning: "Maakt zichtbaar hoe prijs, vraag en dekkingsbijdrage samenhangen. Een lagere prijs kan de vraag sterk verhogen; klantspecifieke producten kunnen juist een hogere prijs en marge opleveren.",
      basis: "LE-boek: LO-Game 4 laat prijsdaling en volumegroei zien; LO-Game 6 koppelt maatwerk aan een hogere dekkingsbijdrage."
    },
    "parallel-production": {
      title: "Parallelle productie",
      mechanical: "Afdelingen maken complete producten naast elkaar, met een eigen productstroom per afdeling.",
      learning: "Dit is in LO-Game 3 de meest effectieve organisatievorm. LO-Game 4 verandert die structuur niet, maar maakt financieel zichtbaar dat ongelijke vraag tot onderbenutting bij A en C en overbelasting bij B leidt.",
      basis: "LE-boek: LO-Game 3 toont effectiviteit; LO-Game 4 toont waarom diezelfde P-organisatie niet de efficiëntste is."
    },
    "sequential-production": {
      title: "Sequentiële productie",
      mechanical: "Een product doorloopt achtereenvolgens meerdere gespecialiseerde afdelingen.",
      learning: "De functionele organisatie benut gespecialiseerde capaciteit voor alle gevraagde torens en kan daardoor efficiënter zijn. Tegelijk worden overdrachten, tussenvoorraden en het knelpunt van de hele keten zichtbaar.",
      basis: "LE-boek: LO-Game 5 zet drie deelbewerkingen in serie en benut capaciteit die in de P-organisatie ongebruikt bleef."
    },
    "product-types": {
      title: "Aantal torensoorten",
      mechanical: "Bepaalt hoeveel verschillende productvarianten klanten kunnen vragen en de keten moet verwerken.",
      learning: "Meer varianten vergroten keuze en flexibiliteit, maar veroorzaken meer omstellingen, langere doorlooptijden en complexere informatie- en materiaalstromen.",
      basis: "LE-boek: de stap van één naar meerdere torens introduceert omsteltijd; extra varianten en kleuren vergroten de turbulentie."
    }
  });

  function configurationHelpDialog() {
    let dialog = document.getElementById("configurationHelpDialog");
    if (dialog) return dialog;
    dialog = document.createElement("dialog");
    dialog.id = "configurationHelpDialog";
    dialog.className = "configuration-help-dialog";
    dialog.setAttribute("aria-labelledby", "configurationHelpTitle");
    dialog.innerHTML = `
      <form method="dialog" class="configuration-help-card">
        <div class="configuration-help-head">
          <p class="eyebrow">Effect van deze instelling</p>
          <button type="submit" class="configuration-help-close" aria-label="Uitleg sluiten">×</button>
        </div>
        <h2 id="configurationHelpTitle"></h2>
        <section>
          <h3>Direct effect</h3>
          <p data-config-help-mechanical></p>
        </section>
        <section>
          <h3>Systeem- en leereffect</h3>
          <p data-config-help-learning></p>
        </section>
        <p class="configuration-help-basis" data-config-help-basis></p>
      </form>
    `;
    dialog.addEventListener("click", event => {
      if (event.target === dialog) dialog.close();
    });
    document.body.append(dialog);
    return dialog;
  }

  function openConfigurationHelp(helpId) {
    const help = CONFIGURATION_HELP[helpId];
    if (!help) return;
    const dialog = configurationHelpDialog();
    dialog.querySelector("#configurationHelpTitle").textContent = help.title;
    dialog.querySelector("[data-config-help-mechanical]").textContent = help.mechanical;
    dialog.querySelector("[data-config-help-learning]").textContent = help.learning;
    dialog.querySelector("[data-config-help-basis]").textContent = help.basis || "";
    if (dialog.open) dialog.close();
    dialog.showModal();
  }

  function enhanceConfigurationHelp(root = document) {
    const candidates = [];
    if (root.nodeType === Node.ELEMENT_NODE && root.matches("[data-config-help]")) candidates.push(root);
    root.querySelectorAll?.("[data-config-help]").forEach(element => candidates.push(element));
    candidates.forEach(element => {
      const help = CONFIGURATION_HELP[element.dataset.configHelp];
      if (!help || element.querySelector(":scope > .configuration-help-button")) return;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "configuration-help-button";
      button.textContent = "i";
      button.setAttribute("aria-label", `Uitleg over ${help.title}`);
      button.title = `Wat is het effect van ${help.title.toLowerCase()}?`;
      button.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        openConfigurationHelp(element.dataset.configHelp);
      });
      element.append(button);
    });
  }

  function initConfigurationHelp() {
    configurationHelpDialog();
    enhanceConfigurationHelp();
    new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) enhanceConfigurationHelp(node);
        });
      });
    }).observe(document.body, { childList: true, subtree: true });
  }

  function normalizeEditableColorLayers(value) {
    if (!Array.isArray(value)) return [];
    return [...new Set(value)].filter(layerId => COLOR_LAYER_IDS.includes(layerId));
  }

  function variantRulesFor(gameType) {
    return window.GameConfigurationStore?.getVariantRules(gameType) || {
      productTypeCountEditable: true,
      fixedProductTypeCount: null,
      colorModeEditable: true,
      defaultHasSupplier: null
    };
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
    { id: "mfp", token: "MFP", lane: "finished", title: "Magazijn Gereed Product" },
    { id: "customer", token: "KL", lane: "customer", title: "Klant" },
    { id: "logistics_manager", token: "LM", lane: "operations", title: "Logistiek Manager" },
    { id: "raw_warehouse", token: "MG", lane: "raw", title: "Magazijn Grondstoffen" },
    { id: "production_1", token: "P1", lane: "pd1", title: "Productie Afdeling 1" },
    { id: "production_2", token: "P2", lane: "pd2", title: "Productie Afdeling 2" },
    { id: "production_3", token: "P3", lane: "pd3", title: "Productie Afdeling 3" },
    { id: "production_a", token: "PA", lane: "pd1", title: "Afdeling Toren A" },
    { id: "production_b", token: "PB", lane: "pd2", title: "Afdeling Toren B" },
    { id: "production_c", token: "PC", lane: "pd3", title: "Afdeling Toren C" },
    { id: "finished_warehouse", token: "GP", lane: "finished", title: "Magazijn Gereed Product" },
    { id: "sales", token: "SA", lane: "operations", title: "Verkoop / Sales Director" },
    { id: "finance", token: "FI", lane: "operations", title: "Financiële Administratie" },
    { id: "supplier", token: "LE", lane: "raw", title: "Leverancier Grondstoffen" },
    { id: "transporter", token: "TR", lane: "archive", title: "Transporteur / Freight Forwarder" }
  ];

  const RUNTIME_ROLE_ALIASES = Object.freeze({
    customer: "customer1",
    logistics_manager: "opr",
    raw_warehouse: "srm",
    production_1: "pd1",
    production_2: "pd2",
    production_3: "pd3",
    production_a: "pd1",
    production_b: "pd2",
    production_c: "pd3",
    finished_warehouse: "mfp"
  });

  const PARTS = [
    { id: "base_green", name: "groene 6x6 grondplaten", price: 5, color: "green", width: "plate", stock: 8, reorder: 3, blokId: "element.ground-plate.6x6.green", blokFile: "elements/element_grondplaat_6x6_groen.blok" },
    { id: "blue_8", name: "blauwe 2x4 blokken", price: 4, color: "blue", width: "wide", stock: 14, reorder: 4, blokId: "element.brick.2x4.blue", blokFile: "elements/element_blok_2x4_blauw.blok" },
    { id: "blue_4", name: "blauwe 2x2 blokken", price: 2, color: "blue", width: "narrow", stock: 14, reorder: 4, blokId: "element.brick.2x2.blue", blokFile: "elements/element_blok_2x2_blauw.blok" },
    { id: "white_8", name: "witte 2x4 blokken", price: 3, color: "white", width: "wide", stock: 12, reorder: 4, blokId: "element.brick.2x4.white", blokFile: "elements/element_blok_2x4_wit.blok" },
    { id: "white_4", name: "witte 2x2 blokken", price: 1, color: "white", width: "narrow", stock: 16, reorder: 5, blokId: "element.brick.2x2.white", blokFile: "elements/element_blok_2x2_wit.blok" },
    { id: "red_8", name: "rode 2x4 blokken", price: 4, color: "red", width: "wide", stock: 10, reorder: 3, blokId: "element.brick.2x4", blokFile: "elements/element_blok_2x4.blok" },
    { id: "red_4", name: "rode 2x2 blokken", price: 2, color: "red", width: "narrow", stock: 12, reorder: 4, blokId: "element.brick.2x2", blokFile: "elements/element_blok_2x2.blok" },
    { id: "yellow_8", name: "gele 2x4 blokken", price: 4, color: "yellow", width: "wide", stock: 10, reorder: 3, blokId: "element.brick.2x4.yellow", blokFile: "elements/element_blok_2x4_geel.blok" },
    { id: "yellow_4", name: "gele 2x2 blokken", price: 2, color: "yellow", width: "narrow", stock: 12, reorder: 4, blokId: "element.brick.2x2.yellow", blokFile: "elements/element_blok_2x2_geel.blok" },
    { id: "green_4", name: "groene 2x2 blokken", price: 2, color: "green", width: "narrow", stock: 12, reorder: 4, blokId: "element.brick.2x2.green", blokFile: "elements/element_blok_2x2_groen.blok" }
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
  let standaloneDepartmentDetailOpen = false;
  let topDepartmentDetailId = null;

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

  const ISOMETRIC_DEPARTMENT_LAYOUTS = Object.freeze({
    inbound: Object.freeze({ x: 1, y: 21, width: 3.5, depth: 3.2, height: 54 }),
    production_1: Object.freeze({ x: 6, y: 16, width: 3.5, depth: 3.2, height: 68 }),
    production_2: Object.freeze({ x: 11, y: 11, width: 3.5, depth: 3.2, height: 74 }),
    production_3: Object.freeze({ x: 16, y: 6, width: 3.5, depth: 3.2, height: 82 }),
    quality: Object.freeze({ x: 21, y: 1, width: 3.5, depth: 3.2, height: 62 }),
    dispatch: Object.freeze({ x: 27, y: 13, width: 3.5, depth: 3.2, height: 56 })
  });

  const ISOMETRIC_DEPARTMENT_DEFINITIONS = [
    {
      id: "inbound",
      title: "Magazijn Grondstoffen",
      shortTitle: "Grondstoffen",
      description: "Ontvangst, opslag en uitgifte van LEGO-grondstoffen voor de drie productiestappen.",
      kind: "warehouse",
      departmentModel: "warehouse",
      departmentColor: "raw",
      lanes: ["raw"],
      layout: ISOMETRIC_DEPARTMENT_LAYOUTS.inbound
    },
    {
      id: "production_1",
      title: "Productieafdeling A",
      shortTitle: "Afdeling A",
      description: "Zelfstandige productieafdeling voor de productorder Toren A.",
      kind: "production",
      departmentModel: "factory",
      departmentColor: "production-a",
      productIds: ["A"],
      lanes: ["pd1", "ss1"],
      layout: ISOMETRIC_DEPARTMENT_LAYOUTS.production_1
    },
    {
      id: "production_2",
      title: "Productieafdeling B",
      shortTitle: "Afdeling B",
      description: "Zelfstandige productieafdeling voor de productorder Toren B.",
      kind: "production",
      departmentModel: "factory",
      departmentColor: "production-b",
      productIds: ["B"],
      lanes: ["pd2", "ss2"],
      layout: ISOMETRIC_DEPARTMENT_LAYOUTS.production_2
    },
    {
      id: "production_3",
      title: "Productieafdeling C",
      shortTitle: "Afdeling C",
      description: "Zelfstandige productieafdeling voor de productorder Toren C.",
      kind: "production",
      departmentModel: "factory",
      departmentColor: "production-c",
      productIds: ["C"],
      lanes: ["pd3"],
      layout: ISOMETRIC_DEPARTMENT_LAYOUTS.production_3
    },
    {
      id: "quality",
      title: "Magazijn Gereed Product",
      shortTitle: "Gereed Product",
      description: "Ontvangst en controle van complete torens vóór uitlevering aan de klant.",
      kind: "warehouse",
      departmentModel: "warehouse",
      departmentColor: "finished",
      lanes: ["finished", "customer"],
      layout: ISOMETRIC_DEPARTMENT_LAYOUTS.quality
    },
    {
      id: "dispatch",
      title: "Klant / Uitlevering",
      shortTitle: "Klant",
      description: "Uitlevering van het gereed product aan de klant en administratieve afsluiting.",
      kind: "dispatch",
      departmentModel: "store",
      departmentColor: "customer",
      lanes: ["archive"],
      layout: ISOMETRIC_DEPARTMENT_LAYOUTS.dispatch
    }
  ];

  const CUSTOMER_DISPATCH_CONNECTION = Object.freeze({
    from: "quality",
    to: "dispatch",
    kind: "customer",
    fromOffset: Object.freeze({ x: 24, y: 56 }),
    toOffset: Object.freeze({ x: 0, y: -56 }),
    curveOffsetY: 32
  });

  const ISOMETRIC_DEPARTMENT_CONNECTIONS = [
    { from: "inbound", to: "production_1", kind: "material", fromOffset: { x: 68, y: -30 }, toOffset: { x: -68, y: -30 }, curveOffsetY: -54 },
    { from: "inbound", to: "production_2", kind: "material", fromOffset: { x: 70, y: 0 }, toOffset: { x: -70, y: 0 }, curveOffsetY: -8 },
    { from: "inbound", to: "production_3", kind: "material", fromOffset: { x: 68, y: 30 }, toOffset: { x: -68, y: 30 }, curveOffsetY: 48 },
    { from: "production_1", to: "quality", kind: "material", fromOffset: { x: 68, y: -30 }, toOffset: { x: -68, y: -30 }, curveOffsetY: -54 },
    { from: "production_2", to: "quality", kind: "material", fromOffset: { x: 70, y: 0 }, toOffset: { x: -70, y: 0 }, curveOffsetY: -8 },
    { from: "production_3", to: "quality", kind: "material", fromOffset: { x: 68, y: 30 }, toOffset: { x: -68, y: 30 }, curveOffsetY: 48 },
    CUSTOMER_DISPATCH_CONNECTION
  ];

  const FUNCTIONAL_ISOMETRIC_DEPARTMENT_DEFINITIONS = [
    {
      id: "inbound",
      title: "Inkomend Magazijn",
      shortTitle: "Inkomend Magazijn",
      description: "Ontvangst, opslag en seriële uitgifte van grondstoffen aan de functionele productieketen.",
      kind: "warehouse",
      departmentModel: "warehouse",
      departmentColor: "green",
      lanes: ["raw"],
      layout: ISOMETRIC_DEPARTMENT_LAYOUTS.inbound
    },
    {
      id: "production_1",
      title: "Assemblage 1",
      shortTitle: "Assemblage 1",
      description: "Eerste functionele assemblagestap voor alle torensoorten.",
      kind: "production",
      departmentModel: "factory",
      departmentColor: "purple",
      lanes: ["pd1"],
      layout: ISOMETRIC_DEPARTMENT_LAYOUTS.production_1
    },
    {
      id: "production_2",
      title: "Assemblage 2",
      shortTitle: "Assemblage 2",
      description: "Tweede functionele assemblagestap; ontvangt het halfproduct van Assemblage 1.",
      kind: "production",
      departmentColor: "purple",
      lanes: ["ss1", "pd2"],
      departmentModel: "factory",
      layout: ISOMETRIC_DEPARTMENT_LAYOUTS.production_2
    },
    {
      id: "production_3",
      title: "Assemblage 3",
      shortTitle: "Assemblage 3",
      description: "Derde functionele assemblagestap; maakt het product gereed voor controle.",
      kind: "production",
      departmentColor: "purple",
      lanes: ["ss2", "pd3"],
      departmentModel: "factory",
      layout: ISOMETRIC_DEPARTMENT_LAYOUTS.production_3
    },
    {
      id: "quality",
      title: "Kwaliteitscontrole",
      shortTitle: "Kwaliteitscontrole",
      description: "Controleert het complete product na de drie seriële assemblagestappen.",
      kind: "quality",
      departmentModel: "office",
      departmentColor: "blue",
      lanes: ["finished", "customer"],
      layout: ISOMETRIC_DEPARTMENT_LAYOUTS.quality
    },
    {
      id: "dispatch",
      title: "Expeditie",
      shortTitle: "Expeditie",
      description: "Levert het gecontroleerde product uit en sluit de keten administratief af.",
      kind: "dispatch",
      departmentModel: "warehouse",
      departmentColor: "yellow",
      lanes: ["archive"],
      layout: ISOMETRIC_DEPARTMENT_LAYOUTS.dispatch
    }
  ];

  const FUNCTIONAL_ISOMETRIC_DEPARTMENT_CONNECTIONS = [
    { from: "inbound", to: "production_1", kind: "material" },
    { from: "production_1", to: "production_2", kind: "material" },
    { from: "production_2", to: "production_3", kind: "material" },
    { from: "production_3", to: "quality", kind: "material" },
    CUSTOMER_DISPATCH_CONNECTION
  ];

  // De Entrepreneurship-opstelling projecteert de drie historische
  // ondernemingsfamilies op alle zeven speelbare runtime-stations. Dit is een
  // configuratievoorbeeld; de gewone LO-opstellingen blijven ongewijzigd.
  const ENTREPRENEURIAL_ISOMETRIC_DEPARTMENT_DEFINITIONS = [
    {
      id: "operations",
      title: "Handelaar · Order & verkoop",
      shortTitle: "Handelaar",
      description: "Ontvangt klantorders, verkoopt en regisseert de zelfstandige ondernemingsketen.",
      kind: "operations",
      departmentModel: "office",
      departmentColor: "blue",
      lanes: [],
      layout: { x: 0, y: 18, width: 3, depth: 2.8, height: 54 }
    },
    {
      ...FUNCTIONAL_ISOMETRIC_DEPARTMENT_DEFINITIONS[0],
      title: "Grondstofbedrijf · Materialen",
      shortTitle: "Grondstofbedrijf",
      description: "Koopt de losse grondstoffen in en zet per order een materiaalwagen klaar.",
      layout: { x: 3.5, y: 14.5, width: 3, depth: 2.8, height: 56 }
    },
    ...FUNCTIONAL_ISOMETRIC_DEPARTMENT_DEFINITIONS.slice(1, 4).map((definition, index) => ({
      ...definition,
      title: `Producent · Torenbouw ${index + 1}`,
      shortTitle: `Bouwstap ${index + 1}`,
      description: `Zelfstandige producent voor torenbouwstap ${index + 1}.`,
      layout: { x: 7 + index * 3.5, y: 11 - index * 3.5, width: 3, depth: 2.8, height: 64 + index * 6 }
    })),
    {
      ...FUNCTIONAL_ISOMETRIC_DEPARTMENT_DEFINITIONS[4],
      title: "Handelaar · Gereed product",
      shortTitle: "Gereed product",
      description: "Neemt complete torens over en maakt ze gereed voor verkoop en uitlevering.",
      departmentModel: "warehouse",
      layout: { x: 17.5, y: 0.5, width: 3, depth: 2.8, height: 62 }
    },
    {
      ...FUNCTIONAL_ISOMETRIC_DEPARTMENT_DEFINITIONS[5],
      title: "Klant · Order & ontvangst",
      shortTitle: "Klant",
      description: "Plaatst de order en ontvangt de uitgeleverde torens.",
      departmentModel: "store",
      layout: { x: 22, y: 10, width: 3, depth: 2.8, height: 54 }
    }
  ];

  const ENTREPRENEURIAL_ISOMETRIC_DEPARTMENT_CONNECTIONS = [
    { from: "operations", to: "inbound", kind: "material" },
    { from: "inbound", to: "production_1", kind: "material" },
    { from: "production_1", to: "production_2", kind: "material" },
    { from: "production_2", to: "production_3", kind: "material" },
    { from: "production_3", to: "quality", kind: "material" },
    { from: "quality", to: "dispatch", kind: "customer" }
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

  const ENTREPRENEURIAL_ISOMETRIC_ORGANIZATION = Object.freeze({
    id: "entrepreneurial",
    title: "Entrepreneurship · zelfstandige ondernemingen",
    departments: ENTREPRENEURIAL_ISOMETRIC_DEPARTMENT_DEFINITIONS,
    connections: ENTREPRENEURIAL_ISOMETRIC_DEPARTMENT_CONNECTIONS,
    legend: [
      { color: "green", label: "Grondstofbedrijf" },
      { color: "purple", label: "Producent" },
      { color: "blue", label: "Handelaar" },
      { color: "yellow", label: "Klant" }
    ]
  });

  function isometricOrganizationFor(organizationModel, logisticsOrganization) {
    if (organizationModel === "independent_enterprises") {
      return ENTREPRENEURIAL_ISOMETRIC_ORGANIZATION;
    }
    return LOGISTICS_ORGANIZATION_VARIANTS[logisticsOrganization]
      || LOGISTICS_ORGANIZATION_VARIANTS.product;
  }

  const GAME_TYPE_PRESETS = {
    entrepreneurial: {
      label: "Entrepreneurial Game",
      description: "Vrije markt met zelfstandige ondernemingen die inkopen, produceren, verkopen, concurreren en strategisch samenwerken.",
      config: {
        money: true,
        pnl: true,
        intermediateStock: true,
        opportunityCosts: true,
        roleFreedom: true,
        organizationModel: "independent_enterprises",
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
      description: "De meest effectieve productgerichte organisatie; zonder geldstroom is de inefficiënte capaciteitsinzet nog niet zichtbaar.",
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
      description: "Dezelfde effectieve productorganisatie als versie 3, nu met geld en opportunity costs die laten zien dat zij niet de efficiëntste is.",
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
      description: "Functionele herinrichting die de in versie 4 zichtbaar gemaakte inefficiëntie probeert te verbeteren.",
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
      description: "School als budgetgedreven leertraject: leerinhouden lopen parallel per jaarlaag en leerlingen stromen sequentieel door.",
      config: {
        money: true,
        pnl: true,
        intermediateStock: false,
        opportunityCosts: true,
        roleFreedom: false,
        organizationModel: "school_learning_path",
        fundingIncentive: "financing",
        multipleColors: true,
        editableColorLayers: ["groundPlate", "layer1", "layer2", "layer3"],
        priceMode: "fixed",
        logisticsOrganization: "product",
        productTypeCount: 3
      }
    }
  };
  const MONEY_PRESET_GAMES = new Set([
    "entrepreneurial", "lo4", "lo5", "lo6", "lo7", "lo8", "le_training"
  ]);
  const REVENUE_BALANCE_PRESET_GAMES = new Set([
    "entrepreneurial", "lo5", "lo6", "lo7", "lo8", "le_training"
  ]);
  const PRODUCTION_PLANNING_PRESET_GAMES = new Set(["lo5", "lo6", "lo7", "lo8"]);

  function runtimeConfigFromStoredSettings(settings = {}) {
    return {
      money: Boolean(settings.money),
      pnl: Boolean(settings.pnl),
      intermediateStock: Boolean(settings.intermediate_stock),
      opportunityCosts: Boolean(settings.opportunity_costs),
      roleFreedom: Boolean(settings.role_freedom),
      organizationModel: settings.organization_model,
      fundingIncentive: settings.funding_incentive,
      multipleColors: Boolean(settings.multiple_colors),
      editableColorLayers: settings.editable_color_layers || [],
      priceMode: settings.price_mode || "fixed",
      logisticsOrganization: settings.logistics_organization || "functional",
      productTypeCount: Number(settings.product_type_count) || 3,
      playMode: settings.play_mode === "digital" ? "digital" : "physical",
      customerOrderMode: settings.customer_order_mode || "required",
      hasSupplier: Boolean(settings.has_supplier)
    };
  }

  window.GameVariantHistory?.derived.forEach(definition => {
    const stored = window.GameConfigurationStore?.getConfiguration(definition.id);
    const base = GAME_TYPE_PRESETS[definition.basePreset];
    if (!base || GAME_TYPE_PRESETS[definition.id]) return;
    GAME_TYPE_PRESETS[definition.id] = {
      label: definition.label,
      description: stored?.description || definition.development,
      config: {
        ...base.config,
        ...runtimeConfigFromStoredSettings(stored?.settings || definition.settings)
      }
    };
    if (GAME_TYPE_PRESETS[definition.id].config.money) MONEY_PRESET_GAMES.add(definition.id);
    if (GAME_TYPE_PRESETS[definition.id].config.pnl) REVENUE_BALANCE_PRESET_GAMES.add(definition.id);
    if (["lo5b", "lo7_digital", "lo9"].includes(definition.id)) {
      PRODUCTION_PLANNING_PRESET_GAMES.add(definition.id);
    }
  });
  Object.freeze(GAME_TYPE_PRESETS);

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
      departmentModel: "warehouse",
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
      departmentModel: "warehouse",
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
      departmentModel: "warehouse",
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
      departmentModel: "factory",
      departmentColor: "tutorial-transit",
      openRoof: true,
      showDropLabel: false,
      layout: { x: 8, y: 10, width: 3.8, depth: 3.4, height: 48 }
    },
    {
      id: "tutorial_assembly",
      title: "Bouwplek Productieafdeling B",
      shortTitle: "Bouwplek B",
      description: "De bouwplek blijft vergrendeld totdat Productieafdeling B de volledige materiaalset heeft ontvangen.",
      kind: "production",
      departmentModel: "factory",
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
      departmentModel: "factory",
      departmentColor: "production-b",
      openRoof: true,
      layout: { x: 4, y: 12, width: 4.2, depth: 3.8, height: 78 }
    },
    {
      id: "tutorial_next_department",
      title: "Magazijn Gereed Product",
      shortTitle: "Gereed Product",
      description: "Dit magazijn ontvangt de complete Toren B vanuit Productieafdeling B.",
      kind: "warehouse",
      departmentModel: "warehouse",
      departmentColor: "finished",
      openRoof: true,
      showDropLabel: false,
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
      departmentModel: "warehouse",
      departmentColor: "raw",
      openRoof: true,
      compactStock: true,
      dragTargetLabel: "Productie B",
      layout: { x: 3, y: 13, width: 4.1, depth: 3.7, height: 70 }
    },
    {
      id: "tutorial_finance_production_a",
      title: "Productieafdeling A",
      shortTitle: "Productie A",
      description: "Parallelle afdeling voor complete Toren A-orders.",
      kind: "production",
      departmentModel: "factory",
      departmentColor: "production",
      openRoof: true,
      layout: { x: 10, y: 16, width: 4.2, depth: 3.4, height: 66 }
    },
    {
      id: "tutorial_finance_production_b",
      title: "Productieafdeling B",
      shortTitle: "Productie B",
      description: "Deze parallelle afdeling bouwt zelfstandig de complete Toren B.",
      kind: "production",
      departmentModel: "factory",
      departmentColor: "production",
      openRoof: true,
      showDropLabel: false,
      layout: { x: 10, y: 10, width: 4.2, depth: 3.4, height: 68 }
    },
    {
      id: "tutorial_finance_production_c",
      title: "Productieafdeling C",
      shortTitle: "Productie C",
      description: "Parallelle afdeling voor complete Toren C-orders.",
      kind: "production",
      departmentModel: "factory",
      departmentColor: "production",
      openRoof: true,
      layout: { x: 10, y: 4, width: 4.2, depth: 3.4, height: 66 }
    },
    {
      id: "tutorial_finance_finished",
      title: "Magazijn Gereed Product",
      shortTitle: "Gereed Product",
      description: "Ontvang hier de complete Toren B vanuit de parallelle productieafdeling.",
      kind: "warehouse",
      departmentModel: "warehouse",
      departmentColor: "finished",
      openRoof: true,
      showDropLabel: false,
      layout: { x: 17, y: 10, width: 4.2, depth: 3.8, height: 68 }
    },
    {
      id: "tutorial_finance_dispatch",
      title: "Expeditie",
      shortTitle: "Expeditie",
      description: "Lever Toren B hier aan de klant om de verkoopopbrengst te ontvangen.",
      kind: "dispatch",
      departmentModel: "warehouse",
      departmentColor: "yellow",
      openRoof: true,
      showDropLabel: false,
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
    gameSessionExists: false,
    gameSessionRunning: false,
    gameSessionDifficulty: "normal",
    customProducts: loadCustomProducts(),
    appView: "player",
    managerTab: "session",
    insightsTab: "overview",
    towerTab: "builder",
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
    productionPlan: {
      quantities: { A: 0, B: 0, C: 0 },
      saved: false,
      updatedAt: null
    },
    advisorOpen: false,
    config: {
      playMode: "physical",
      gameType: "lo4",
      money: true,
      pnl: true,
      openingBalance: true,
      revenueBalance: false,
      productionPlanning: false,
      intermediateStock: true,
      opportunityCosts: true,
      roleFreedom: false,
      organizationModel: "single_enterprise",
      fundingIncentive: "balanced",
      multipleColors: false,
      editableColorLayers: [],
      hasSupplier: true,
      currencyMode: "single",
      baseCurrency: "EUR",
      enabledCurrencies: ["EUR"],
      exchangeRates: { EUR: 1 },
      customerOrderMode: "required",
      priceMode: "fixed",
      productionProcesses: ["parallel"],
      logisticsOrganization: "product",
      productTypeCount: 3,
      visibleLogisticsDepartments: ISOMETRIC_DEPARTMENT_DEFINITIONS.map(department => department.id),
      processView: "graph"
    }
  };

  const els = {
    lateValue: document.getElementById("lateValue"),
    liveEventCountValue: document.getElementById("liveEventCountValue"),
    liveEventsControl: document.querySelector(".top-live-events-control"),
    liveEventsToggle: document.getElementById("liveEventsToggle"),
    liveEventsPopover: document.getElementById("topLiveEventsPopover"),
    liveEventsClose: document.getElementById("topLiveEventsClose"),
    topDepartmentDetailLayer: document.getElementById("topDepartmentDetailLayer"),
    eventsControl: document.querySelector(".top-events-control"),
    eventsToggle: document.getElementById("eventsToggle"),
    eventsPopover: document.getElementById("topEventsPopover"),
    eventsClose: document.getElementById("topEventsClose"),
    topPeopleButton: document.getElementById("topPeopleButton"),
    topAgentsButton: document.getElementById("topAgentsButton"),
    metricStrip: document.querySelector(".metric-strip"),
    hudComplexity: document.getElementById("hudComplexity"),
    hudComplexityValue: document.getElementById("hudComplexityValue"),
    hudEfficiency: document.getElementById("hudEfficiency"),
    hudEfficiencyValue: document.getElementById("hudEfficiencyValue"),
    hudWaiting: document.getElementById("hudWaiting"),
    hudWaitingValue: document.getElementById("hudWaitingValue"),
    hudWip: document.getElementById("hudWip"),
    hudWipValue: document.getElementById("hudWipValue"),
    hudBullwhip: document.getElementById("hudBullwhip"),
    hudBullwhipValue: document.getElementById("hudBullwhipValue"),
    hudOpportunityCost: document.getElementById("hudOpportunityCost"),
    hudOpportunityCostValue: document.getElementById("hudOpportunityCostValue"),
    nextLevelChallenge: document.getElementById("nextLevelChallenge"),
    nextLevelChallengeTitle: document.getElementById("nextLevelChallengeTitle"),
    nextLevelChallengeText: document.getElementById("nextLevelChallengeText"),
    nextLevelChallengeButton: document.getElementById("nextLevelChallengeButton"),
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
    balanceSheetContent: document.getElementById("balanceSheetContent"),
    incomeStatementContent: document.getElementById("incomeStatementContent"),
    stockSignal: document.getElementById("stockSignal"),
    gameAdvisorButton: document.getElementById("gameAdvisorButton"),
    gameAdvisorBadge: document.getElementById("gameAdvisorBadge"),
    gameAdvisorPanel: document.getElementById("gameAdvisorPanel"),
    gameAdvisorCloseButton: document.getElementById("gameAdvisorCloseButton"),
    gameAdvisorContent: document.getElementById("gameAdvisorContent"),
    chapter9InsightsSubtitle: document.getElementById("chapter9InsightsSubtitle"),
    chapter9VariantContrast: document.getElementById("chapter9VariantContrast"),
    chapter9LiveIndicators: document.getElementById("chapter9LiveIndicators"),
    chapter9RoleActivity: document.getElementById("chapter9RoleActivity"),
    chapter9CurrentInsightCards: document.getElementById("chapter9CurrentInsightCards"),
    chapter9LibraryButton: document.getElementById("chapter9LibraryButton"),
    chapter9LibraryDialog: document.getElementById("chapter9LibraryDialog"),
    chapter9VariantSelect: document.getElementById("chapter9VariantSelect"),
    chapter9LibrarySummary: document.getElementById("chapter9LibrarySummary"),
    chapter9LibraryInsights: document.getElementById("chapter9LibraryInsights"),
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
    menuExportButton: document.getElementById("menuExportButton"),
    resetButton: document.getElementById("resetButton"),
    tutorialExitButton: document.getElementById("tutorialExitButton"),
    tutorialResumeButton: document.getElementById("tutorialResumeButton"),
    gameTypeSelect: document.getElementById("gameTypeSelect"),
    gameTypeDescription: document.getElementById("gameTypeDescription"),
    moneyToggle: document.getElementById("moneyToggle"),
    openingBalanceToggle: document.getElementById("openingBalanceToggle"),
    revenueBalanceToggle: document.getElementById("revenueBalanceToggle"),
    productionPlanningToggle: document.getElementById("productionPlanningToggle"),
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
    playerWorkbench: document.getElementById("playerWorkbench"),
    managerWorkbench: document.getElementById("managerWorkbench"),
    logisticsGameMount: document.getElementById("logisticsGameMount"),
    towerEditorMount: document.getElementById("towerEditorMount"),
    towerTutorialGuide: document.getElementById("towerTutorialGuide"),
    towerTutorialInstruction: document.getElementById("towerTutorialInstruction"),
    towerTutorialCompleteButton: document.getElementById("towerTutorialCompleteButton"),
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

  function runtimeRoleId(roleId) {
    return RUNTIME_ROLE_ALIASES[roleId] || roleId;
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

  function gridArea(size, fallback = 4) {
    const match = String(size || "").match(/(\d+)\s*(?:x|\u00d7)\s*(\d+)/i);
    return match ? Number(match[1]) * Number(match[2]) : fallback;
  }

  function partIdForColor(color, size = "2x2") {
    const preferred = `${color}_${gridArea(size)}`;
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

  function resolveGeneratedTower(blueprint) {
    return Object.freeze({
      lower: partIdForColor(blueprint.lower),
      middle: partIdForColor(blueprint.middle, blueprint.middleSize),
      upper: partIdForColor(blueprint.upper)
    });
  }

  function makeTowerVisual(parts) {
    return [
      [parts.upper],
      [parts.middle],
      [parts.lower, parts.lower],
      ["base_green"]
    ];
  }

  function makeGeneratedProduct(index) {
    const id = PRODUCT_IDS[index];
    const blueprint = TOWER_BLUEPRINTS[index];
    const parts = resolveGeneratedTower(blueprint);
    const stages = [
      { department: 1, output: "ss1", recipe: mergeRecipe({ base_green: 1 }, { [parts.lower]: 2 }) },
      { department: 2, input: "ss1", output: "ss2", recipe: { [parts.middle]: 1 } },
      { department: 3, input: "ss2", output: "finished", recipe: { [parts.upper]: 1 } }
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
      visual: makeTowerVisual(parts)
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

  function builderProductCore() {
    const core = window.LeerpretSDK?.components?.["lego-builder"]?.logic;
    if (
      !core?.analyzeTowerSequence
      || !core?.countRecipeParts
      || !core?.partitionSequenceEvenly
      || !core?.BASE_PIECES
    ) {
      throw new Error("De centrale LeerpretSDK-productbouwkern is niet volledig geladen.");
    }
    return core;
  }

  function spatialProductCore() {
    const core = window.LeerpretSDK?.components?.["lego-spatial"];
    if (!core?.positiveGridInteger) {
      throw new Error("De centrale LeerpretSDK-gridgeometrie is niet volledig geladen.");
    }
    return core;
  }

  function makeCustomProduct(draft, existingId = null) {
    const sequence = Array.isArray(draft?.towerSequence)
      ? draft.towerSequence.filter(partId => partId !== "base_green" && partById(partId))
      : [];
    const core = builderProductCore();
    const groundPlateWidth = spatialProductCore().positiveGridInteger(draft?.groundPlate?.width, 6);
    const groundPlateDepth = spatialProductCore().positiveGridInteger(draft?.groundPlate?.depth, 6);
    if (!core.analyzeTowerSequence(core.BASE_PIECES, sequence, {
      board: { width: groundPlateWidth, depth: groundPlateDepth }
    })) {
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
      width: groundPlateWidth,
      depth: groundPlateDepth,
      blokId: String(draft.groundPlate?.blokId || `element.ground-plate.${groundPlateWidth}x${groundPlateDepth}.${requestedGroundPlateColor.replaceAll("_", "-")}`),
      blokFile: String(draft.groundPlate?.blokFile || "elements/element_grondplaat_6x6_groen.blok")
    };
    const stageSequences = core.partitionSequenceEvenly(sequence, 3);
    const firstRecipe = { base_green: 1, ...core.countRecipeParts(stageSequences[0]) };
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
        { department: 2, input: "ss1", output: "ss2", recipe: core.countRecipeParts(stageSequences[1]) },
        { department: 3, input: "ss2", output: "finished", recipe: core.countRecipeParts(stageSequences[2]) }
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
    if (
      state.tutorialStage === "tower"
      && state.logisticsTutorial.phase === "tower_design"
    ) {
      state.logisticsTutorial.phase = "tower_assortment_complete";
      setTowerTab("assortment", false);
      updateTowerTutorialGuide(true, product);
      dispatchInteraction({
        actionType: "complete_tutorial_product_design",
        learningObjectID: "tutorial_step_5_product_assortment",
        objectRole: "product_configuration",
        role: "Lerende",
        result: "completed",
        step: 5,
        productId: product.id,
        productName: product.name
      });
    }
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
    const baseCurrency = state.config.baseCurrency || "EUR";
    const baseAmount = Math.abs(Math.round(value));
    const base = `${sign}${baseCurrency} ${baseAmount}`;
    if (state.config.currencyMode !== "multiple") return base;
    const conversions = (state.config.enabledCurrencies || [])
      .filter(code => code !== baseCurrency)
      .map(code => {
        const rate = Number(state.config.exchangeRates?.[code] || 1);
        return `${sign}${code} ${(baseAmount * rate).toFixed(2)}`;
      });
    return conversions.length ? `${base} · ${conversions.join(" · ")}` : base;
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
    const assignedRuntimeRoleId = runtimeRoleId(state.assignedRoleId);
    if (selected && !selected.done && stepRole(selected)?.id === assignedRuntimeRoleId) return selected;
    return openOrders.find(order => stepRole(order)?.id === assignedRuntimeRoleId) || null;
  }

  function syncWorkbenchVisibility(view = state.appView) {
    const nextView = view === "manager" && gameManagementSupportedOnDevice()
      ? "manager"
      : "player";
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
    const nextView = view === "manager" && gameManagementSupportedOnDevice()
      ? "manager"
      : "player";
    state.appView = nextView;
    document.body.dataset.appView = nextView;
    if (nextView === "manager") {
      document.body.classList.remove("tutorial-focus", "tutorial-stage-builder", "tutorial-stage-logistics", "tutorial-stage-tower");
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
    syncGlobalMenu();
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
    if (!gameManagementSupportedOnDevice()) {
      state.managerTab = "session";
      sessionStorage.setItem("learngame.om.managerTab", "session");
      return;
    }
    const allowed = new Set([
      "session",
      "layout",
      "digital-twin",
      "history",
      "roles",
      "game-presets",
      "role-presets",
      "tower-editor",
      "inventory",
      "balance-sheet",
      "income-statement",
      "process",
      "insights"
    ]);
    const nextTab = allowed.has(tab) ? tab : "session";
    state.managerTab = nextTab;
    const gameTabs = new Set([
      "session",
      "layout",
      "digital-twin",
      "history",
      "roles",
      "game-presets",
      "role-presets",
      "process",
      "inventory",
      "balance-sheet",
      "income-statement"
    ]);
    const menuMode = gameTabs.has(nextTab)
      ? "game"
      : nextTab === "insights"
        ? "insights"
        : nextTab === "tower-editor"
          ? "towers"
          : "none";
    document.querySelectorAll("[data-manager-menu]").forEach(menu => {
      menu.hidden = menu.dataset.managerMenu !== menuMode;
    });
    if (els.managerWorkbench) {
      els.managerWorkbench.dataset.managerMenuMode = menuMode;
      els.managerWorkbench.dataset.activeManagerTab = nextTab;
    }
    document.querySelectorAll("button[data-manager-tab]").forEach(button => {
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
    if (nextTab === "insights") setInsightsTab(state.insightsTab, false);
    if (nextTab === "tower-editor") setTowerTab(state.towerTab, false);
    syncGlobalMenu();
    if (dispatch) {
      dispatchInteraction({
        actionType: "change_manager_dashboard_tab",
        result: nextTab,
        objectRole: "navigation",
        role: "Game Master"
      });
    }
  }

  function setInsightsTab(tab, dispatch = true) {
    const nextTab = new Set(["overview", "roles", "debrief"]).has(tab) ? tab : "overview";
    state.insightsTab = nextTab;
    document.querySelectorAll("[data-insights-tab]").forEach(button => {
      const active = button.dataset.insightsTab === nextTab;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    document.querySelectorAll("[data-insights-panel]").forEach(panel => {
      panel.hidden = panel.dataset.insightsPanel !== nextTab;
    });
    sessionStorage.setItem("learngame.om.insightsTab", nextTab);
    if (dispatch) {
      dispatchInteraction({
        actionType: "change_insights_view",
        result: nextTab,
        objectRole: "navigation",
        role: "Game Master"
      });
    }
  }

  function setTowerTab(tab, dispatch = true) {
    const nextTab = tab === "assortment" ? "assortment" : "builder";
    state.towerTab = nextTab;
    document.querySelectorAll("[data-tower-tab]").forEach(button => {
      const active = button.dataset.towerTab === nextTab;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    window.TowerEditor?.setView?.(nextTab);
    const title = document.getElementById("towerEditorTitle");
    const eyebrow = document.querySelector("#towerEditorPanel .section-head .eyebrow");
    if (title) title.textContent = nextTab === "builder"
      ? "Ontwerp een nieuwe LEGO-toren"
      : "Bekijk het productassortiment";
    if (eyebrow) eyebrow.textContent = nextTab === "builder" ? "Toreneditor" : "Productassortiment";
    sessionStorage.setItem("learngame.om.towerTab", nextTab);
    if (dispatch) {
      dispatchInteraction({
        actionType: "change_tower_view",
        result: nextTab,
        objectRole: "navigation",
        role: "Game Master"
      });
    }
  }

  function syncGlobalMenu() {
    const gameTabs = new Set([
      "session",
      "layout",
      "digital-twin",
      "history",
      "roles",
      "game-presets",
      "role-presets",
      "process",
      "inventory"
    ]);
    document.querySelectorAll("[data-main-menu-tab]").forEach(button => {
      const tab = button.dataset.mainMenuTab;
      const current = state.appView === "manager" && (
        tab === state.managerTab
        || (tab === "session" && gameTabs.has(state.managerTab))
      );
      button.classList.toggle("is-current", current);
      if (button.closest(".app-view-switcher")) {
        button.setAttribute("aria-current", current ? "page" : "false");
      }
    });
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
      personID: event.personID || measurementPersonId,
      learningObjectID,
      learningBoxID: event.learningBoxID || LEARNING_BOX_ID,
      sessionID: state.sessionId,
      timestamp: event.timestamp || new Date().toISOString(),
      simulatedMinute: state.clockMinutes,
      version: "ICG2-v2",
      actionType: event.actionType || "interaction",
      ...event
    };
    interactionSequence += 1;
    record.eventID = event.eventID || [
      record.sessionID || "no-session",
      record.personID,
      String(interactionSequence).padStart(6, "0"),
      randomIdentifier("event")
    ].join(":");
    state.interactionBuffer.push(record);
    const contractEvent = toInteractionEventV1(record, state.interactionBuffer.length);
    state.contractEventBuffer.push(contractEvent);
    enqueueInteraction(record);
    void flushInteractionOutbox();
    if (window.parent !== window && !window.__LEERPRET_PREVIEW_BRIDGE__) {
      const targetOrigin = document.referrer ? new URL(document.referrer).origin : "*";
      window.parent.postMessage({
        type: "leerpret-preview-events",
        events: [record],
        contract_events: [contractEvent],
        total: state.interactionBuffer.length
      }, targetOrigin);
    }
    renderChapter9Insights();
    if (els.eventsToggle?.getAttribute("aria-expanded") === "true") renderEvents();
    return record;
  }

  function toInteractionEventV1(record, sequence) {
    const knownKeys = new Set([
      "personID", "learningObjectID", "learningBoxID", "sessionID", "timestamp",
      "actionType", "result", "objectRole", "stage", "strategy", "durationMs",
      "eventID", "deliveryStatus", "deliveryError"
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
      id: record.eventID || `${record.sessionID || state.sessionId}:${record.personID}:${String(sequence).padStart(6, "0")}`,
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
                ${PARTS.map(part => `<option value="${part.id}">${part.name} - ${formatMoney(part.price)}</option>`).join("")}
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
    return window.LOMRuntimeRoles?.stationId(roleId) || null;
  }

  const STANDALONE_SIMULATION_DEPARTMENTS = [
    {
      id: "customer",
      roleId: "customer",
      title: "Klant",
      shortTitle: "Klant",
      description: "Genereert klantorders en bepaalt aantal en gevraagde levertijd.",
      kind: "dispatch",
      departmentModel: "store",
      departmentColor: "customer",
      labelPosition: "above",
      layout: { x: 1, y: 5, width: 3.5, depth: 3.2, height: 54 }
    },
    {
      id: "operations",
      roleId: "operations",
      title: "Operations",
      shortTitle: "Operations",
      description: "Registreert orders en geeft de werkzaamheden vrij aan de logistieke keten.",
      kind: "production",
      departmentModel: "office",
      departmentColor: "blue",
      labelPosition: "above",
      layout: { x: 8, y: 2, width: 3.5, depth: 3.2, height: 64 }
    },
    {
      id: "srm",
      roleId: "srm",
      title: "Magazijn Grondstoffen",
      shortTitle: "Grondstoffen",
      description: "Verzamelt en verstrekt de benodigde LEGO-onderdelen.",
      kind: "warehouse",
      departmentModel: "warehouse",
      departmentColor: "raw",
      openRoof: true,
      compactStock: true,
      labelPosition: "above",
      layout: { x: 15, y: -1, width: 3.8, depth: 3.4, height: 62 }
    },
    {
      id: "pd1",
      roleId: "pd1",
      title: "Productie-afdeling 1",
      shortTitle: "PD1",
      description: "Bouwt de grondplaat en eerste torenlaag.",
      kind: "production",
      departmentModel: "factory",
      departmentColor: "production-a",
      openRoof: true,
      layout: { x: 4, y: 18, width: 3.8, depth: 3.4, height: 72 }
    },
    {
      id: "pd2",
      roleId: "pd2",
      title: "Productie-afdeling 2",
      shortTitle: "PD2",
      description: "Bouwt de tweede laag en controleert Subassembly 1.",
      kind: "production",
      departmentModel: "factory",
      departmentColor: "production-b",
      openRoof: true,
      layout: { x: 11, y: 15, width: 3.8, depth: 3.4, height: 78 }
    },
    {
      id: "pd3",
      roleId: "pd3",
      title: "Productie-afdeling 3",
      shortTitle: "PD3",
      description: "Bouwt de bovenste laag en meldt de toren gereed.",
      kind: "production",
      departmentModel: "factory",
      departmentColor: "production-c",
      openRoof: true,
      layout: { x: 18, y: 12, width: 3.8, depth: 3.4, height: 84 }
    },
    {
      id: "ssf",
      roleId: "ssf",
      title: "Magazijn Gereed Product",
      shortTitle: "SSF",
      description: "Controleert, boekt en levert complete torens uit.",
      kind: "warehouse",
      departmentModel: "warehouse",
      departmentColor: "finished",
      openRoof: true,
      layout: { x: 25, y: 9, width: 3.8, depth: 3.4, height: 66 }
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

  function simulationMaterialCartParts(snapshot, order, requiredParts = null) {
    const product = snapshot.products?.[order?.productId];
    if (!product?.stages && !requiredParts) return [];
    const required = requiredParts && typeof requiredParts === "object"
      ? { ...requiredParts }
      : Object.values(product.stages).reduce((allParts, recipe) => {
          Object.entries(recipe).forEach(([partId, amount]) => {
            allParts[partId] = (allParts[partId] || 0)
              + Number(amount || 0) * Number(order.quantity || 1);
          });
          return allParts;
        }, {});
    return Object.entries(required).map(([partId, count]) => {
      const part = partById(partId);
      return {
        partId,
        count: Math.max(0, Number(count || 0)),
        color: part.color,
        width: partId === "base_green" ? 6 : 2,
        depth: partId === "base_green" ? 6 : part.width === "wide" ? 4 : 2,
        isPlate: partId === "base_green",
        label: part.name
      };
    });
  }

  function simulationOrderDeliveryLabel(order) {
    const dueAt = Number(order?.dueAt);
    if (!Number.isFinite(dueAt)) return "Te plannen";
    const remainingMinutes = Math.max(0, Math.ceil((dueAt - Date.now()) / 60000));
    return remainingMinutes > 0 ? `Nog ${remainingMinutes} min` : "Nu leveren";
  }

  function standaloneLogisticsScene(snapshot, transferContext = null) {
    const orderById = new Map(snapshot.orders.map(order => [order.id, order]));
    const activeTransfer = transferContext?.mode === "player-transfer"
      ? transferContext.transfer
      : null;
    const activeRole = snapshot.roleFlow.find(roleId => (
      snapshot.roleRuntime[roleId]?.state !== "IDLE"
    ));
    const knownIds = new Set(STANDALONE_SIMULATION_DEPARTMENTS.map(item => item.id));
    if (!knownIds.has(standaloneSelectedDepartmentId)) {
      standaloneSelectedDepartmentId = activeRole || snapshot.humanRoleId || "operations";
    }
    const parallelEnabled = snapshot.productionProcesses?.includes("parallel");
    const sequentialEnabled = snapshot.productionProcesses?.includes("sequential");
    let departments = STANDALONE_SIMULATION_DEPARTMENTS.map(baseDefinition => {
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
      const isTransferSourceRole = Boolean(
        activeTransfer && definition.roleId === activeTransfer.sourceRoleId
      );
      const activeOrder = isTransferSourceRole
        ? orderById.get(activeTransfer.orderId) || transferContext?.task?.order || null
        : orderById.get(runtime.activeOrderId) || orders[0] || null;
      const activeProduct = snapshot.products?.[activeOrder?.productId]
        || (isTransferSourceRole ? transferContext?.task?.product : null);
      const latestEvent = snapshot.feed.find(item => (
        !activeOrder || item.orderId === activeOrder.id
      ));
      const partialSequence = simulationPartialSequence(activeProduct, definition.roleId, activeOrder);
      const isTransferSource = Boolean(
        isTransferSourceRole
        && activeOrder?.id === activeTransfer.orderId
      );
      const isTransferTarget = Boolean(
        activeTransfer
        && definition.roleId === activeTransfer.targetRoleId
      );
      const isMaterialCart = Boolean(
        isTransferSource
        && activeTransfer.cargoKind === "material_kits"
      );
      const isOrderDocument = Boolean(
        (isTransferSource && activeTransfer.cargoKind === "order_information")
        || (
          !activeTransfer
          && activeOrder
          && ["customer", "operations"].includes(definition.roleId)
        )
      );
      const cargoSequence = isOrderDocument
        ? [...(activeProduct?.towerSequence || [])]
        : !isMaterialCart && partialSequence.length
        ? partialSequence
        : !isMaterialCart && isTransferSource
          ? [...(activeProduct?.towerSequence || [])]
          : [];
      const showCargo = Boolean(
        activeProduct
        && (isOrderDocument || isMaterialCart || cargoSequence.length)
        && (
          isOrderDocument
          || ["pd1", "pd2", "pd3", "ssf"].includes(definition.roleId)
          || isTransferSource
        )
      );
      return {
        ...definition,
        openRoof: definition.openRoof || isTransferSource || isTransferTarget,
        acceptsCargoDrop: isTransferTarget,
        dropLabel: isTransferTarget ? "ZET HIER NEER" : undefined,
        dropAriaLabel: isTransferTarget
          ? activeTransfer.cargoKind === "order_information"
            ? `Zet het bestelformulier voor order ${activeTransfer.orderId} neer in ${definition.title}`
            : activeTransfer.cargoKind === "material_kits"
              ? `Zet de materiaalwagen met losse onderdelen voor ${activeTransfer.quantity} ${activeTransfer.quantity === 1 ? "toren" : "torens"} neer in ${definition.title}`
              : `Zet de complete batch met ${activeTransfer.quantity} ${activeTransfer.quantity === 1 ? "toren" : "torens"} neer in ${definition.title}`
          : undefined,
        status: simulationDepartmentStatus(runtime),
        badgeValue: orders.length,
        badgeLabel: `${orders.length} orders in behandeling`,
        primaryMetric: `${simulationStateLabel(runtime)} · ${orders.length} order${orders.length === 1 ? "" : "s"}`,
        orders: orders.map(order => ({
          id: order.id,
          product: `${order.quantity}× ${order.productName}`,
          stage: simulationStateLabel(runtime)
        })),
        stockVisuals: definition.roleId === "srm" && !isMaterialCart
          ? simulationStockVisuals(snapshot, activeOrder)
          : [],
        cargoVisual: showCargo ? {
          kind: isOrderDocument ? "order_document" : isMaterialCart ? "material_cart" : "tower",
          cargoKind: activeTransfer?.cargoKind || (isOrderDocument ? "order_information" : "tower_batch"),
          cargoId: activeOrder.id,
          productId: activeOrder.productId,
          label: isOrderDocument
            ? `Bestelformulier ${activeOrder.id}`
            : isMaterialCart
              ? `Materiaalwagen voor ${activeOrder.productName} · ${activeOrder.id}`
              : `${activeOrder.productName} · ${activeOrder.id}`,
          order: isOrderDocument ? {
            id: activeOrder.id,
            customerLabel: activeOrder.customer || "Klant",
            productId: activeOrder.productId,
            productLabel: activeOrder.productName || activeProduct?.name || `Toren ${activeOrder.productId}`,
            quantity: Number(activeOrder.quantity || 1),
            deliveryLabel: simulationOrderDeliveryLabel(activeOrder)
          } : null,
          preview: isOrderDocument ? {
            kind: "tower",
            sequence: [...(activeProduct?.towerSequence || [])],
            groundPlate: {
              color: activeProduct?.groundPlate?.color || "green",
              widthStuds: spatialProductCore().positiveGridInteger(activeProduct?.groundPlate?.width, 6),
              depthStuds: spatialProductCore().positiveGridInteger(activeProduct?.groundPlate?.depth, 6)
            }
          } : null,
          towerSequence: cargoSequence,
          parts: isMaterialCart
            ? simulationMaterialCartParts(
                snapshot,
                activeOrder,
                transferContext?.selectedParts
              )
            : [],
          groundPlateColor: activeProduct?.groundPlate?.color || "green",
          groundPlateWidth: spatialProductCore().positiveGridInteger(activeProduct?.groundPlate?.width, 6),
          groundPlateDepth: spatialProductCore().positiveGridInteger(activeProduct?.groundPlate?.depth, 6),
          quantity: Number(activeOrder.quantity || 1),
          displayScale: isTransferSource
            ? Number(activeOrder.quantity || 1) === 1
              ? 0.7
              : Number(activeOrder.quantity || 1) === 2
                ? 0.58
                : 0.48
            : undefined,
          draggable: Boolean(isTransferSource && transferContext?.batchReady)
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
    if (activeTransfer) {
      const focusedLayouts = {
        [activeTransfer.sourceRoleId]: { x: 1, y: 5, width: 4.4, depth: 3.8, height: 70 },
        [activeTransfer.targetRoleId]: { x: 10, y: 1, width: 4.4, depth: 3.8, height: 70 }
      };
      departments = departments
        .filter(department => (
          department.roleId === activeTransfer.sourceRoleId
          || department.roleId === activeTransfer.targetRoleId
        ))
        .map(department => ({
          ...department,
          layout: focusedLayouts[department.roleId],
          forceSelectedRender: true,
          hideMetric: false
        }));
    }
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
    const connections = (activeTransfer
      ? [{
          from: activeTransfer.sourceRoleId,
          to: activeTransfer.targetRoleId,
          kind: activeTransfer.cargoKind === "order_information" ? "customer" : "material",
          highlight: true
        }]
      : configuredConnections).map(connection => {
      const sourceRuntime = snapshot.roleRuntime[connection.from];
      const targetRuntime = snapshot.roleRuntime[connection.to];
      return {
        ...connection,
        highlight: connection.highlight
          || sourceRuntime?.state === "WAITING_FOR_NEXT"
          || targetRuntime?.state === "PROCESSING"
          || targetRuntime?.state === "AWAITING_PLAYER"
      };
    });
    return {
      title: activeTransfer
        ? activeTransfer.cargoKind === "order_information"
          ? `Bestelformulier ${activeTransfer.orderId} · sleep naar de volgende afdeling`
          : activeTransfer.cargoKind === "material_kits"
            ? `Materiaalwagen voor ${activeTransfer.quantity}× ${orderById.get(activeTransfer.orderId)?.productName || "toren"} · sleep naar de volgende afdeling`
            : `${activeTransfer.quantity}× ${orderById.get(activeTransfer.orderId)?.productName || "toren"} · sleep naar de volgende afdeling`
        : parallelEnabled && sequentialEnabled
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
            width: spatialProductCore().positiveGridInteger(product.groundPlate?.width, 6),
            depth: spatialProductCore().positiveGridInteger(product.groundPlate?.depth, 6)
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
      renderProcessFlow: (target, snapshot, interaction = null) => {
        if (!window.IsometricLogisticsView) return;
        const renderScene = () => {
          const scene = standaloneLogisticsScene(snapshot, interaction);
          if (!standaloneDepartmentDetailOpen) scene.selectedDepartmentId = null;
          window.IsometricLogisticsView.mount(target, scene, {
            centerDepartments: true,
            departmentDetailMode: interaction?.mode === "player-transfer" ? "none" : "popup",
            onCargoDrop: payload => interaction?.onCargoDrop?.(payload) ?? false,
            onDragStateChange: active => interaction?.onDragStateChange?.(active),
            onDepartmentSelect: departmentId => {
              if (interaction?.mode === "player-transfer") return;
              standaloneSelectedDepartmentId = departmentId;
              standaloneDepartmentDetailOpen = true;
              renderScene();
            },
            onDepartmentClose: () => {
              standaloneDepartmentDetailOpen = false;
              renderScene();
            }
          });
        };
        renderScene();
      }
    });
    logisticsGameController.engine.subscribe(event => {
      if (event.snapshot) renderMetrics();
      const trackedEvents = new Set([
        "order-created",
        "incident",
        "player-action-required",
        "player-action-completed",
        "order-transferred",
        "order-delivered"
      ]);
      if (!trackedEvents.has(event.type)) return;
      // In een gedeelde sessie registreert de controller de rolgebonden
      // servercommandos hieronder met de member-id van de werkelijke actor.
      // Generieke engine-events zouden ze anders ten onrechte aan de
      // controller toeschrijven.
      if (window.LOMMultiplayerRuntime?.getState?.().sessionId) return;
      const transfer = event.detail?.transfer || {};
      dispatchInteraction({
        actionType: `simulation_${event.type.replace(/-/g, "_")}`,
        result: "success",
        objectRole: "standalone_logistics_engine",
        role: state.assignedRoleId ? roleById(state.assignedRoleId).title : "Speler",
        humanRoleId: event.snapshot.humanRoleId,
        activeOrderCount: event.snapshot.orders.filter(order => order.status !== "DELIVERED").length,
        batchId: transfer.batchId || null,
        orderId: transfer.orderId || null,
        productType: transfer.productId || null,
        completedQuantity: transfer.quantity || null,
        sourceRoleId: transfer.sourceRoleId || null,
        targetRoleId: transfer.targetRoleId || null,
        cargoKind: transfer.cargoKind || null,
        atomicTransfer: transfer.atomicTransfer ?? null,
        finalDelivery: transfer.finalDelivery ?? null
      });
    });
  }

  function startStandaloneLogisticsGame(
    difficultyLevel = state.gameSessionDifficulty,
    sessionGameConfig = null,
    runtimeOptions = {}
  ) {
    if (!logisticsGameController) initStandaloneLogisticsGame();
    if (!logisticsGameController) return;
    logisticsGameController.engine.products = standaloneSimulationProducts();
    logisticsGameController.engine.setBehaviorPatterns(
      state.config.organizationModel === "independent_enterprises"
        ? window.EntrepreneurshipAgentPatterns
        : null
    );
    logisticsGameController.engine.setDifficulty(difficultyLevel);
    const customerOrderMode = sessionGameConfig
      ? (sessionGameConfig.customer_order_mode === "free" ? "free" : "required")
      : state.config.customerOrderMode;
    const playMode = sessionGameConfig?.play_mode === "digital" ? "digital" : "physical";
    const organizationModel = ["independent_enterprises", "school_learning_path"].includes(
      sessionGameConfig?.organization_model
    ) ? sessionGameConfig.organization_model : state.config.organizationModel;
    const fundingIncentive = ["quality", "balanced", "financing"].includes(
      sessionGameConfig?.funding_incentive
    ) ? sessionGameConfig.funding_incentive : state.config.fundingIncentive;
    state.config.customerOrderMode = customerOrderMode;
    state.config.organizationModel = organizationModel;
    state.config.fundingIncentive = fundingIncentive;
    state.config.playMode = playMode;
    standaloneDepartmentDetailOpen = false;
    logisticsGameController.engine.setCustomerOrderMode(customerOrderMode);
    logisticsGameController.engine.setOrganizationModel(organizationModel);
    logisticsGameController.engine.setFundingIncentive(fundingIncentive);
    logisticsGameController.engine.setPlayMode(playMode);
    logisticsGameController.engine.setProductionProcesses(state.config.productionProcesses);
    const humanRoleId = simulationRoleId(state.assignedRoleId);
    const humanRoleIds = Array.isArray(runtimeOptions.humanRoleIds)
      ? [...new Set(runtimeOptions.humanRoleIds.map(simulationRoleId).filter(Boolean))]
      : (humanRoleId ? [humanRoleId] : []);
    logisticsGameController.start({
      humanRoleId,
      humanRoleIds,
      customerOrderMode,
      gameType: state.config.gameType,
      organizationModel,
      fundingIncentive,
      playMode,
      productionProcesses: state.config.productionProcesses,
      intermediateStock: state.config.intermediateStock,
      enabledRoles: [...state.config.enabledRoles]
    });
    if (runtimeOptions.runLoop === false) {
      logisticsGameController.engine.loop.stop();
    }
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

  function validateProductionPlan(quantities = state.productionPlan.quantities) {
    const normalized = Object.fromEntries(
      ["A", "B", "C"].map(productId => [
        productId,
        Math.max(0, Math.floor(Number(quantities[productId]) || 0))
      ])
    );
    const requirements = Object.fromEntries(PARTS.map(part => [part.id, 0]));
    Object.entries(normalized).forEach(([productId, quantity]) => {
      const recipe = fullProductRecipe(productId, quantity);
      Object.entries(recipe).forEach(([partId, required]) => {
        requirements[partId] = (requirements[partId] || 0) + required;
      });
    });
    const shortages = PARTS
      .filter(part => requirements[part.id] > Number(state.inventory[part.id] || 0))
      .map(part => part.name);
    const total = Object.values(normalized).reduce((sum, value) => sum + value, 0);
    return {
      normalized,
      total,
      requirements,
      shortages,
      valid: total > 0 && shortages.length === 0
    };
  }

  function financialStatementSnapshot() {
    if (!state.gameSessionExists) {
      return {
        cash: 0,
        rawInventory: 0,
        workInProgress: 0,
        finishedGoods: 0,
        totalAssets: 0,
        liabilities: 0,
        openingEquity: 0,
        accountingResult: 0,
        totalEquity: 0,
        totalLiabilitiesAndEquity: 0,
        revenue: 0,
        costOfGoodsSold: 0,
        opportunityCosts: 0,
        economicResult: 0,
        departmentAssets: [],
        departmentResults: []
      };
    }
    const rawInventory = PARTS.reduce(
      (sum, part) => sum + (Number(state.inventory[part.id]) || 0) * part.price,
      0
    );
    const openingInventory = PARTS.reduce(
      (sum, part) => sum + (Number(part.stock) || 0) * part.price,
      0
    );
    const parallelWip = state.config.productionProcesses.includes("parallel")
      ? Object.values(state.financial.wipByDepartment).reduce((sum, value) => sum + value, 0)
      : 0;
    const sequentialWip = state.config.productionProcesses.includes("sequential")
      ? Object.values(state.financial.wipByStage).reduce((sum, value) => sum + value, 0)
      : 0;
    const workInProgress = parallelWip + sequentialWip;
    const finishedGoods = Object.values(state.financial.finishedGoodsByDepartment)
      .reduce((sum, value) => sum + value, 0);
    const cash = state.config.money ? state.financial.cash : 0;
    const totalAssets = cash + rawInventory + workInProgress + finishedGoods;
    const liabilities = 0;
    const openingEquity = state.financial.openingCash + openingInventory;
    const completedProductCost = state.orders
      .filter(order => order.done)
      .reduce(
        (sum, order) => sum
          + (Number(order.bookedMaterialCost) || 0)
          + (Number(order.conversionCost) || 0),
        0
      );
    const costOfGoodsSold = Math.max(
      Number(state.financial.costOfGoodsSold) || 0,
      completedProductCost
    );
    const accountingResult = state.financial.revenue - costOfGoodsSold;
    const totalEquity = openingEquity + accountingResult;
    const opportunityCosts = state.config.opportunityCosts
      ? Math.max(0, Number(state.opportunityCost) || 0)
      : 0;
    const departmentAssets = PRODUCTION_DEPARTMENT_IDS.map(departmentId => ({
      id: departmentId,
      workInProgress: Number(state.financial.wipByDepartment[departmentId]) || 0,
      finishedGoods: Number(state.financial.finishedGoodsByDepartment[departmentId]) || 0
    }));
    const departmentResults = PRODUCTION_DEPARTMENT_IDS.map(departmentId => {
      const departmentCostOfGoodsSold = state.orders
        .filter(order => order.done && (order.productionDepartment || "C") === departmentId)
        .reduce(
          (sum, order) => sum
            + (Number(order.bookedMaterialCost) || 0)
            + (Number(order.conversionCost) || 0),
          0
        );
      const departmentRevenue = Number(
        state.financial.revenueByDepartment[departmentId]
      ) || 0;
      return {
        id: departmentId,
        revenue: departmentRevenue,
        costOfGoodsSold: departmentCostOfGoodsSold,
        result: departmentRevenue - departmentCostOfGoodsSold,
        opportunityCosts: Number(
          state.financial.opportunityCostByDepartment[departmentId]
        ) || 0
      };
    });
    return {
      cash,
      rawInventory,
      workInProgress,
      finishedGoods,
      totalAssets,
      liabilities,
      openingEquity,
      accountingResult,
      totalEquity,
      totalLiabilitiesAndEquity: liabilities + totalEquity,
      revenue: state.financial.revenue,
      costOfGoodsSold,
      opportunityCosts,
      economicResult: accountingResult - opportunityCosts,
      departmentAssets,
      departmentResults
    };
  }

  function financialStatementRows(rows) {
    return rows.map(row => `
      <tr class="${row.className || ""}">
        <th scope="row">${escapeHtml(row.label)}</th>
        <td>${formatMoney(row.value)}</td>
      </tr>
    `).join("");
  }

  function renderFinancialStatements() {
    if (!els.balanceSheetContent || !els.incomeStatementContent) return;
    if (state.gameSessionExists && !state.config.money) {
      const disabled = `
        <div class="financial-statement-empty">
          <strong>Financiële registratie staat uit</strong>
          <p>Schakel Geld inschakelen in bij de game-instellingen om deze staat op te bouwen.</p>
        </div>
      `;
      els.balanceSheetContent.innerHTML = disabled;
      els.incomeStatementContent.innerHTML = disabled;
      return;
    }
    const values = financialStatementSnapshot();
    const balanceDifference = values.totalAssets - values.totalLiabilitiesAndEquity;
    const fictionalBalanceNotice = !state.gameSessionExists
      ? `<p class="financial-statement-status">
          Fictieve nulbalans &middot; er is nog geen gamesessie.
        </p>`
      : "";
    const fictionalIncomeNotice = !state.gameSessionExists
      ? `<p class="financial-statement-status">
          Fictieve nul-verliesrekening &middot; er is nog geen gamesessie.
        </p>`
      : "";
    const cashReconciliation = state.gameSessionExists
      && state.config.revenueBalance
      ? `
        <section class="financial-statement-support">
          <h3>Mutatie liquide middelen</h3>
          <table>
            <tbody>
              ${financialStatementRows([
                { label: "Beginstand liquide middelen", value: state.financial.openingCash },
                { label: "Ontvangsten uit omzet", value: state.financial.revenue },
                {
                  label: "Overige kasmutaties",
                  value: state.financial.cash
                    - state.financial.openingCash
                    - state.financial.revenue
                },
                { label: "Eindstand liquide middelen", value: values.cash, className: "is-total" }
              ])}
            </tbody>
          </table>
        </section>
      `
      : "";
    const departmentAssets = state.gameSessionExists
      && state.config.productionProcesses.includes("parallel")
      ? `
        <section class="financial-statement-support">
          <h3>Specificatie productievoorraden</h3>
          <table class="financial-multi-column-table">
            <thead>
              <tr>
                <th scope="col">Afdeling</th>
                <th scope="col">OHW</th>
                <th scope="col">Gereed product</th>
                <th scope="col">Totaal</th>
              </tr>
            </thead>
            <tbody>
              ${values.departmentAssets.map(department => `
                <tr>
                  <th scope="row">Productieafdeling ${department.id}</th>
                  <td>${formatMoney(department.workInProgress)}</td>
                  <td>${formatMoney(department.finishedGoods)}</td>
                  <td>${formatMoney(
                    department.workInProgress + department.finishedGoods
                  )}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
          <p>Materiaal- en conversiekosten blijven geactiveerd zolang de toren nog niet is geleverd.</p>
        </section>
      `
      : "";
    els.balanceSheetContent.innerHTML = `
      ${fictionalBalanceNotice}
      <div class="financial-statement-columns">
        <section>
          <h3>Activa</h3>
          <table>
            <tbody>
              ${financialStatementRows([
                { label: "Liquide middelen", value: values.cash },
                { label: "Voorraad grondstoffen", value: values.rawInventory },
                { label: "Onderhanden werk", value: values.workInProgress },
                { label: "Voorraad gereed product", value: values.finishedGoods },
                { label: "Totaal activa", value: values.totalAssets, className: "is-total" }
              ])}
            </tbody>
          </table>
        </section>
        <section>
          <h3>Passiva</h3>
          <table>
            <tbody>
              ${financialStatementRows([
                { label: "Beginvermogen", value: values.openingEquity },
                { label: "Resultaat lopende periode", value: values.accountingResult },
                { label: "Totaal eigen vermogen", value: values.totalEquity, className: "is-subtotal" },
                { label: "Vreemd vermogen", value: values.liabilities },
                {
                  label: "Totaal passiva",
                  value: values.totalLiabilitiesAndEquity,
                  className: "is-total"
                }
              ])}
            </tbody>
          </table>
        </section>
      </div>
      <p class="financial-balance-check ${Math.abs(balanceDifference) < 0.01 ? "is-balanced" : "is-unbalanced"}">
        Balanscontrole: activa ${formatMoney(values.totalAssets)} =
        passiva ${formatMoney(values.totalLiabilitiesAndEquity)}.
      </p>
      <div class="financial-statement-support-grid">
        ${cashReconciliation}
        ${departmentAssets}
      </div>
    `;
    if (state.gameSessionExists && !state.config.pnl) {
      els.incomeStatementContent.innerHTML = `
        <div class="financial-statement-empty">
          <strong>Verliesrekening staat uit</strong>
          <p>Schakel Verlies- en winstrekening in bij de game-instellingen om kostprijs en resultaat te boeken.</p>
        </div>
      `;
      return;
    }
    const departmentResults = state.gameSessionExists
      && state.config.productionProcesses.includes("parallel")
      ? `
        <section class="financial-statement-support">
          <h3>Resultaatspecificatie per productieafdeling</h3>
          <table class="financial-multi-column-table">
            <thead>
              <tr>
                <th scope="col">Afdeling</th>
                <th scope="col">Omzet</th>
                <th scope="col">Kostprijs omzet</th>
                <th scope="col">Resultaat</th>
              </tr>
            </thead>
            <tbody>
              ${values.departmentResults.map(department => `
                <tr>
                  <th scope="row">Productieafdeling ${department.id}</th>
                  <td>${formatMoney(department.revenue)}</td>
                  <td>${formatMoney(-department.costOfGoodsSold)}</td>
                  <td>${formatMoney(department.result)}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </section>
      `
      : "";
    els.incomeStatementContent.innerHTML = `
      ${fictionalIncomeNotice}
      <section class="income-statement-sheet">
        <table>
          <tbody>
            ${financialStatementRows([
              { label: "Omzet", value: values.revenue },
              { label: "Kostprijs van de omzet", value: -values.costOfGoodsSold },
              { label: "Boekhoudkundig resultaat", value: values.accountingResult, className: "is-total" }
            ])}
          </tbody>
        </table>
        <div class="management-reconciliation">
          <p class="eyebrow">Bedrijfseconomische aanvulling</p>
          <p>Opportunity costs zijn geen geboekte kosten en staan daarom buiten de formele verliesrekening.</p>
          <table>
            <tbody>
              ${financialStatementRows([
                { label: "Boekhoudkundig resultaat", value: values.accountingResult },
                { label: "Opportunity costs (niet geboekt)", value: -values.opportunityCosts },
                { label: "Economisch resultaat", value: values.economicResult, className: "is-total" }
              ])}
            </tbody>
          </table>
        </div>
      </section>
      ${departmentResults}
    `;
  }

  function renderInventory() {
    const items = [];

    if (state.config.productionPlanning) {
      const validation = validateProductionPlan();
      const planTotal = validation.total;
      const actualTotal = ["A", "B", "C"]
        .reduce((sum, productId) => sum + Number(state.finishedGoods[productId] || 0), 0);
      const planStatus = state.productionPlan.saved && validation.valid
        ? `Planning opgeslagen · ${planTotal} gepland · ${actualTotal} gereed`
        : validation.shortages.length
          ? `Planning niet haalbaar: onvoldoende ${validation.shortages.join(", ")}.`
          : "Vul minimaal één geplande toren in en sla de planning op.";
      items.unshift(`
        <article class="inventory-item production-planning-card" data-production-planning>
          <div>
            <p class="eyebrow">Production Planning &amp; Scheduling</p>
            <h3 class="inventory-name">Productieplan A / B / C</h3>
            <div class="production-plan-fields">
              ${["A", "B", "C"].map(productId => `
                <label>
                  <span>Toren ${productId}</span>
                  <input type="number" min="0" step="1"
                         value="${Number(state.productionPlan.quantities[productId] || 0)}"
                         data-plan-product="${productId}">
                  <small>Gereed: ${Number(state.finishedGoods[productId] || 0)}</small>
                </label>
              `).join("")}
            </div>
            <p class="inventory-meta" data-production-plan-status>${planStatus}</p>
            <button type="button" class="primary-button compact-button"
                    data-save-production-plan>Productieplan opslaan</button>
          </div>
          <strong class="inventory-count">${actualTotal}/${planTotal}</strong>
        </article>
      `);
    }

    PARTS.forEach(part => {
      const count = state.inventory[part.id] || 0;
      const low = count <= part.reorder;
      items.push(`
        <article class="inventory-item${low ? " low" : ""}">
          ${renderPart(part)}
          <div>
            <h3 class="inventory-name">${escapeHtml(part.name)}</h3>
            <div class="inventory-meta">inkoop ${formatMoney(part.price)} | signaal ${part.reorder}</div>
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

  function advisorInsights() {
    const insights = [];
    const activeOrders = state.orders.filter(order => !order.done);
    const qualityProblems = activeOrders.filter(order => (
      String(order.lastIssue || "").toLowerCase().includes("kwaliteit")
    )).length;
    const lowStockCount = PARTS.filter(part => (state.inventory[part.id] || 0) <= part.reorder).length;
    const planTotal = Object.values(state.productionPlan.quantities)
      .reduce((sum, value) => sum + Number(value || 0), 0);

    if (!state.config.productionPlanning) {
      insights.push({
        type: activeOrders.length > 1 ? "warning" : "tip",
        title: "Hebben jullie gedacht aan productieplanning?",
        text: "Maak vooraf een plan voor toren A, B en C en vergelijk de werkelijke productie met het programma.",
        action: "planning"
      });
    } else if (!state.productionPlan.saved || planTotal <= 0) {
      insights.push({
        type: "warning",
        title: "Het productieplan is nog niet compleet",
        text: "Plan minimaal één toren en sla het plan op voordat je de voortgang beoordeelt."
      });
    }
    if (lowStockCount >= 2) {
      insights.push({
        type: "warning",
        title: "Voorraad vraagt aandacht",
        text: `${lowStockCount} grondstoffen zitten op of onder het bestelpunt. Controleer of het productieplan haalbaar is.`
      });
    }
    if (qualityProblems > 0) {
      insights.push({
        type: "warning",
        title: "Kwaliteitscontrole vraagt aandacht",
        text: `${qualityProblems} order(s) hebben kwaliteitsherwerk. Controleer de specificatie vóór overdracht.`
      });
    }
    if (state.config.money && state.financial.cash < state.financial.openingCash * 0.5) {
      insights.push({
        type: "warning",
        title: "Liquiditeit neemt sterk af",
        text: "Vergelijk inkopen, onderhanden werk en omzet voordat je extra productie vrijgeeft."
      });
    }
    if (!insights.length) {
      insights.push({
        type: "ok",
        title: "Proces is stabiel",
        text: "Geen directe bottleneck gevonden. Blijf plan, voorraad en werkelijke output vergelijken."
      });
    }
    return insights;
  }

  function renderAdvisor() {
    if (!els.gameAdvisorButton || !els.gameAdvisorPanel || !els.gameAdvisorContent) return;
    const insights = advisorInsights();
    const warnings = insights.filter(insight => insight.type === "warning").length;
    els.gameAdvisorPanel.hidden = !state.advisorOpen;
    els.gameAdvisorButton.setAttribute("aria-expanded", String(state.advisorOpen));
    els.gameAdvisorBadge.hidden = warnings === 0;
    els.gameAdvisorBadge.textContent = String(warnings);
    els.gameAdvisorContent.innerHTML = insights.map(insight => `
      <article class="game-advisor-insight is-${insight.type}">
        <h3>${escapeHtml(insight.title)}</h3>
        <p>${escapeHtml(insight.text)}</p>
        ${insight.action === "planning" ? `
          <div class="game-advisor-actions">
            <button type="button" class="primary-button compact-button"
                    data-advisor-enable-planning>Productieplanning activeren</button>
            <button type="button" class="secondary-button compact-button"
                    data-advisor-book-theory>Bekijk theorie uit het LE-boek</button>
          </div>
        ` : ""}
      </article>
    `).join("");
  }

  function chapter9Analysis() {
    return window.Chapter9Insights?.analyze({
      events: state.interactionBuffer,
      orders: state.orders,
      gameType: state.config.gameType,
      roleDefinitions: ROLES
    }) || null;
  }

  function chapter9InfoById(insightId, preferredVariant = state.config.gameType) {
    const chapter = window.Chapter9Insights;
    if (!chapter) return null;
    const preferred = chapter.variants[preferredVariant]?.insights
      .find(insight => insight.id === insightId);
    if (preferred) return preferred;
    return Object.values(chapter.variants)
      .flatMap(variant => variant.insights)
      .find(insight => insight.id === insightId) || null;
  }

  function openChapter9Info(insightId, preferredVariant = state.config.gameType) {
    const insight = chapter9InfoById(insightId, preferredVariant);
    if (!insight) return;
    const dialog = configurationHelpDialog();
    dialog.querySelector("#configurationHelpTitle").textContent = insight.title;
    dialog.querySelector("[data-config-help-mechanical]").textContent = insight.signal;
    dialog.querySelector("[data-config-help-learning]").textContent = insight.summary;
    dialog.querySelector("[data-config-help-basis]").textContent =
      "Onderbouwing: de inhoudelijke leerlijn van LEARNGame Operations Management.";
    if (dialog.open) dialog.close();
    dialog.showModal();
  }

  function renderChapter9Insights() {
    const analysis = chapter9Analysis();
    if (!analysis || !els.chapter9LiveIndicators) return;
    const variant = analysis.variant;
    els.chapter9InsightsSubtitle.textContent =
      `${variant.label} · ${variant.learningLine}`;
    const contrastStage = {
      lo3: {
        active: "lo3",
        note: "Versie 3 laat zien hoe de productgerichte organisatie de gevraagde output zeer effectief haalt. De kosten van ongebruikte capaciteit zijn nog niet zichtbaar."
      },
      lo4: {
        active: "lo4",
        note: "Versie 4 houdt de effectieve inrichting van versie 3 intact en voegt de financiële meetlaag toe. Zij toont de inefficiëntie, maar lost die nog niet op."
      },
      lo5: {
        active: "lo5",
        note: "Versie 5 is de volgende stap: de in versie 4 aangetoonde inefficiëntie wordt aangepakt met een functionele organisatie."
      }
    }[state.config.gameType];
    if (els.chapter9VariantContrast) {
      els.chapter9VariantContrast.hidden = !contrastStage;
      els.chapter9VariantContrast.innerHTML = contrastStage ? `
        <div class="chapter9-contrast-steps" aria-label="Leerlijn van versie 3 naar versie 5">
          <div class="${contrastStage.active === "lo3" ? "is-active" : ""}">
            <span>Versie 3</span>
            <strong>Meest effectief</strong>
            <small>Productgerichte organisatie</small>
          </div>
          <span class="chapter9-contrast-arrow" aria-hidden="true">→</span>
          <div class="${contrastStage.active === "lo4" ? "is-active" : ""}">
            <span>Versie 4</span>
            <strong>Inefficiëntie zichtbaar</strong>
            <small>Zelfde organisatie + geld</small>
          </div>
          <span class="chapter9-contrast-arrow" aria-hidden="true">→</span>
          <div class="${contrastStage.active === "lo5" ? "is-active" : ""}">
            <span>Versie 5</span>
            <strong>Efficiënter organiseren</strong>
            <small>Functionele herinrichting</small>
          </div>
        </div>
        <p>${escapeHtml(contrastStage.note)}</p>
      ` : "";
    }
    const paradoxLabel = analysis.paradoxActive
      ? "Actief: druk met niets"
      : analysis.eventCount < 4
        ? "Nog te weinig spelacties"
        : "Geen stilstandsparadox";
    els.chapter9LiveIndicators.innerHTML = `
      <article class="chapter9-indicator-card${analysis.paradoxActive ? " is-warning" : ""}">
        <div class="chapter9-indicator-heading">
          <h3>Sturingsparadox</h3>
          <button type="button"
                  class="configuration-help-button chapter9-info-button"
                  data-chapter9-info="management-paradox"
                  aria-label="Uitleg over de sturingsparadox"
                  title="Hoe ontstaat druk management bij stilstaande productie?">i</button>
        </div>
        <p><strong>${escapeHtml(paradoxLabel)}</strong></p>
        <div class="chapter9-meter-stack">
          <div>
            <div class="chapter9-meter-label"><span>Managementactiviteit</span><strong>${analysis.managementActivity}%</strong></div>
            <div class="chapter9-meter" style="--meter-value:${analysis.managementActivity}%"><span></span></div>
          </div>
          <div>
            <div class="chapter9-meter-label"><span>Productieve ketenbijdrage</span><strong>${analysis.systemOutput}%</strong></div>
            <div class="chapter9-meter is-output" style="--meter-value:${analysis.systemOutput}%"><span></span></div>
          </div>
        </div>
      </article>
      <article class="chapter9-indicator-card">
        <div class="chapter9-indicator-heading">
          <h3>Ketenoutput</h3>
          <button type="button"
                  class="configuration-help-button chapter9-info-button"
                  data-chapter9-info="effective-not-efficient"
                  aria-label="Uitleg over ketenoutput"
                  title="Waarom is activiteit niet hetzelfde als output?">i</button>
        </div>
        <p><strong>${analysis.productiveSteps} productieve stappen · ${analysis.completedOutput} afrondingen</strong></p>
        <p>Gebaseerd op de laatste ${analysis.eventCount} betekenisvolle spelacties, niet op muisklikken of schermwissels.</p>
      </article>
      <article class="chapter9-indicator-card${analysis.resistance >= 67 ? " is-warning" : ""}">
        <div class="chapter9-indicator-heading">
          <h3>Weerstand &amp; frictie</h3>
          <button type="button"
                  class="configuration-help-button chapter9-info-button"
                  data-chapter9-info="changeover-pressure"
                  aria-label="Uitleg over weerstand en frictie"
                  title="Waardoor loopt weerstand of procesfrictie op?">i</button>
        </div>
        <p><strong>${escapeHtml(analysis.resistanceLevel)} · ${analysis.resistance}%</strong></p>
        <div class="chapter9-meter is-resistance" style="--meter-value:${analysis.resistance}%"><span></span></div>
        <p>Variantwissels, blokkades, vertraging en herwerk verhogen het signaal.</p>
      </article>
    `;

    els.chapter9RoleActivity.innerHTML = analysis.roleActivity.length
      ? analysis.roleActivity.map(role => `
          <div class="chapter9-role-row">
            <div class="chapter9-role-label">
              <strong>${escapeHtml(role.role)}</strong>
              ${role.management ? "<small>management</small>" : ""}
            </div>
            <div class="chapter9-role-bars" aria-label="${escapeHtml(role.role)}: ${role.actions} acties, ${role.productive} productief">
              <div class="chapter9-role-bar" title="Activiteit: ${role.actions} acties">
                <span style="width:${role.activityPercent}%"></span>
              </div>
              <div class="chapter9-role-bar is-productive" title="Productieve bijdrage: ${role.productive} stappen">
                <span style="width:${role.productivityPercent}%"></span>
              </div>
            </div>
            <div class="chapter9-role-values">${role.actions} acties · ${role.productive} productief</div>
          </div>
        `).join("")
      : `<p class="chapter9-empty-state">Start de gamesessie om rolactiviteit en productieve bijdrage naast elkaar te zien.</p>`;

    els.chapter9CurrentInsightCards.innerHTML = variant.insights.map(insight => `
      <article class="chapter9-current-insight-card">
        <h4>${escapeHtml(insight.title)}</h4>
        <p>${escapeHtml(insight.summary)}</p>
        <button type="button"
                class="configuration-help-button"
                data-chapter9-info="${escapeHtml(insight.id)}"
                aria-label="Meer uitleg over ${escapeHtml(insight.title)}"
                title="${escapeHtml(insight.signal)}">i</button>
      </article>
    `).join("");
  }

  function renderChapter9Library(selection = els.chapter9VariantSelect?.value || state.config.gameType) {
    const chapter = window.Chapter9Insights;
    if (!chapter || !els.chapter9LibraryDialog) return;
    const historicalBase = window.GameVariantHistory?.get(selection)?.basePreset;
    const insightSelection = chapter.variants[selection]
      ? selection
      : historicalBase || selection;
    const variant = selection === "all"
      ? null
      : chapter.variants[insightSelection] || chapter.variants.lo4;
    els.chapter9VariantSelect.value = selection === "all" ? "all" : insightSelection;
    els.chapter9LibrarySummary.textContent = variant
      ? `${variant.label} · ${variant.learningLine}`
      : `${Object.keys(chapter.variants).length} spelvarianten met uitgewerkte procesinzichten.`;
    els.chapter9LibraryInsights.innerHTML = variant
      ? variant.insights.map(insight => `
          <article class="chapter9-library-insight">
            <h3>${escapeHtml(insight.title)}</h3>
            <p>${escapeHtml(insight.summary)}</p>
            <small><strong>Waar let je op?</strong> ${escapeHtml(insight.signal)}</small>
          </article>
        `).join("")
      : Object.values(chapter.variants).map(item => `
          <article class="chapter9-library-insight">
            <h3>${escapeHtml(item.label)}</h3>
            <p>${escapeHtml(item.learningLine)}</p>
            <small>${item.insights.length} uitgewerkte procesinzichten</small>
          </article>
        `).join("");
  }

  function initChapter9Insights() {
    const chapter = window.Chapter9Insights;
    if (!chapter || !els.chapter9LibraryDialog) return;
    els.chapter9VariantSelect.innerHTML = [
      `<option value="all">Alle varianten</option>`,
      ...Object.entries(chapter.variants).map(([id, variant]) =>
        `<option value="${escapeHtml(id)}">${escapeHtml(variant.label)}</option>`
      )
    ].join("");
    els.chapter9LibraryButton?.addEventListener("click", () => {
      renderChapter9Library(state.config.gameType);
      els.chapter9LibraryDialog.showModal();
    });
    els.chapter9VariantSelect.addEventListener("change", () => {
      renderChapter9Library(els.chapter9VariantSelect.value);
    });
    document.addEventListener("click", event => {
      const button = event.target.closest("[data-chapter9-info]");
      if (!button) return;
      event.preventDefault();
      openChapter9Info(button.dataset.chapter9Info);
    });
    els.chapter9LibraryDialog.addEventListener("click", event => {
      if (event.target === els.chapter9LibraryDialog) els.chapter9LibraryDialog.close();
    });
  }

  const GAME_COMPLEXITY_SCORES = Object.freeze({
    lo1: 12, lo2: 25, lo3: 32, lo4: 38, lo5: 50, lo5b: 56,
    lo6: 68, lo7: 78, lo7_digital: 82, lo8: 90, lo9: 100,
    le_training: 60, entrepreneurial: 72, entrepreneurial_simple: 62,
    la_game: 45, learngame_small_2018: 35, la_game_small_2020: 38,
    entrepreneurial_digital: 85
  });
  const NEXT_LEVEL_SEQUENCE = Object.freeze([
    "lo1", "lo2", "lo3", "lo4", "lo5", "lo5b", "lo6",
    "lo7", "lo7_digital", "lo8", "lo9"
  ]);

  function hudClamp(value, minimum = 0, maximum = 100) {
    return Math.max(minimum, Math.min(maximum, Number(value) || 0));
  }

  function hudVariance(values = []) {
    if (values.length < 2) return 0;
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    return values.reduce((sum, value) => sum + ((value - mean) ** 2), 0) / values.length;
  }

  function hudColor(value, positive = false) {
    const score = hudClamp(value);
    if (positive) {
      return score >= 67 ? "#32ddd2" : score >= 34 ? "#e6ad43" : "#ff7d62";
    }
    return score <= 33 ? "#32ddd2" : score <= 66 ? "#e6ad43" : "#ff7d62";
  }

  function complexityHudColor(value) {
    return value < 34 ? "#4bc7bf" : value < 67 ? "#6e89c8" : value < 85 ? "#e6ad43" : "#c17455";
  }

  function legacyProcessHudMetrics() {
    const orders = state.orders;
    const active = orders.filter(order => !order.done);
    const completed = orders.filter(order => order.done);
    let processingMinutes = 0;
    let elapsedMinutes = 0;
    const queueByRole = new Map();
    orders.forEach(order => {
      const endMinute = order.done
        ? Number(order.history.at(-1)?.minute || state.clockMinutes)
        : state.clockMinutes;
      elapsedMinutes += Math.max(0, endMinute - Number(order.acceptedAt || endMinute));
      const completedSteps = order.history.filter(item => (
        item.result === "success" || item.result === "complete"
      )).length;
      processingMinutes += (order.processSteps || [])
        .slice(0, completedSteps)
        .reduce((sum, step) => sum + (Number(step.minutes) || 0), 0);
    });
    active.forEach(order => {
      const step = currentStep(order);
      const roleId = step?.roleId === "customer1" ? order.customerRoleId : step?.roleId;
      if (roleId) queueByRole.set(roleId, (queueByRole.get(roleId) || 0) + 1);
    });
    const bottleneck = [...queueByRole.entries()]
      .sort((left, right) => right[1] - left[1])[0] || [null, 0];
    const bufferItems = [state.ss1, state.ss2, state.finishedGoods]
      .reduce((total, stock) => total + Object.values(stock || {})
        .reduce((sum, value) => sum + (Number(value) || 0), 0), 0);
    const wipItems = bufferItems + active.reduce(
      (sum, order) => sum + (Number(order.quantity) || 0),
      0
    );
    const waitingMinutes = Math.max(0, elapsedMinutes - processingMinutes);
    const waitingPercent = elapsedMinutes ? hudClamp(waitingMinutes / elapsedMinutes * 100) : 0;
    const demand = orders.map(order => Number(order.quantity) || 0);
    const supply = state.interactionBuffer
      .filter(event => event.actionType === "purchase_materials")
      .map(event => Number(event.quantity) || 0);
    const bullwhipRatio = supply.length >= 2 && demand.length >= 2
      ? Math.sqrt(hudVariance(supply) / Math.max(hudVariance(demand), 0.25))
      : 1;
    const potentialRevenue = orders.reduce(
      (sum, order) => sum + (Number(order.unitPrice) || 0) * (Number(order.quantity) || 0),
      0
    );
    const opportunityCost = state.config.opportunityCosts
      ? Math.max(0, Number(state.opportunityCost) || 0)
      : 0;
    return {
      orderCount: orders.length,
      activeCount: active.length,
      completedCount: completed.length,
      efficiency: elapsedMinutes ? hudClamp(processingMinutes / elapsedMinutes * 100) : null,
      waitingPercent,
      waitingMinutes,
      wipItems,
      wipPressure: hudClamp(wipItems / Math.max(4, wipItems + completed.length * 2) * 100),
      bottleneck: bottleneck[0] ? roleById(bottleneck[0])?.title || bottleneck[0] : "Nog niet vastgesteld",
      bottleneckQueue: bottleneck[1],
      bullwhip: hudClamp(Math.max(0, bullwhipRatio - 1), 0, 4),
      opportunityCostEnabled: state.config.opportunityCosts,
      opportunityCost,
      opportunityCostPressure: potentialRevenue
        ? hudClamp(opportunityCost / potentialRevenue * 100)
        : 0
    };
  }

  function standaloneProcessHudMetrics(snapshot) {
    const orders = snapshot.orders || [];
    const active = orders.filter(order => order.status !== "DELIVERED");
    const completed = orders.filter(order => order.status === "DELIVERED");
    const runtimes = Object.values(snapshot.roleRuntime || {});
    const queued = runtimes.reduce((sum, runtime) => sum + (runtime.queue?.length || 0), 0);
    const incidents = orders.reduce(
      (sum, order) => sum + (order.history || []).filter(item => item.type === "incident").length,
      0
    );
    const agePressure = active.length ? active.reduce((sum, order) => {
      const allowed = Math.max(1, Number(order.dueAt) - Number(order.createdAt));
      return sum + hudClamp((Date.now() - Number(order.createdAt)) / allowed * 100);
    }, 0) / active.length : 0;
    const waitingPercent = orders.length
      ? hudClamp(
          queued / Math.max(1, active.length + runtimes.length) * 100
          + agePressure * 0.28
          + incidents / Math.max(1, orders.length) * 10
        )
      : 0;
    const bottleneckRuntime = [...runtimes].sort((left, right) => (
      (right.queue?.length || 0) - (left.queue?.length || 0)
    ))[0];
    const customerLoad = (snapshot.roleRuntime?.customer?.queue?.length || 0)
      + (snapshot.roleRuntime?.customer?.activeOrderId ? 1 : 0);
    const upstreamLoad = (snapshot.roleRuntime?.srm?.queue?.length || 0)
      + (snapshot.roleRuntime?.srm?.activeOrderId ? 1 : 0);
    const wipItems = active.reduce((sum, order) => sum + (Number(order.quantity) || 1), 0);
    let potentialRevenue = 0;
    let opportunityCost = 0;
    if (state.config.opportunityCosts) {
      orders.forEach(order => {
        const product = snapshot.products?.[order.productId];
        const orderValue = (Number(product?.price) || 0) * (Number(order.quantity) || 1);
        const plannedMinutes = Math.max(
          1,
          (Number(order.dueAt) - Number(order.createdAt)) / 60000
        );
        const incidentDelayMinutes = (order.history || [])
          .filter(item => item.type === "incident")
          .reduce((sum, item) => sum + (Number(item.delayMs) || 0) / 60000, 0);
        const completedAt = order.status === "DELIVERED"
          ? Number(order.deliveredAt || order.dueAt)
          : Date.now();
        const overdueMinutes = Math.max(0, completedAt - Number(order.dueAt)) / 60000;
        potentialRevenue += orderValue;
        opportunityCost += Math.min(
          orderValue,
          (incidentDelayMinutes + overdueMinutes) * (orderValue / plannedMinutes)
        );
      });
    } else {
      potentialRevenue = orders.reduce((sum, order) => {
        const product = snapshot.products?.[order.productId];
        return sum + (Number(product?.price) || 0) * (Number(order.quantity) || 1);
      }, 0);
    }
    return {
      orderCount: orders.length,
      activeCount: active.length,
      completedCount: completed.length,
      efficiency: orders.length ? hudClamp(100 - waitingPercent) : null,
      waitingPercent,
      waitingMinutes: Math.round(active.reduce(
        (sum, order) => sum + Math.max(0, Date.now() - Number(order.createdAt)),
        0
      ) * waitingPercent / 100 / 60000),
      wipItems,
      wipPressure: hudClamp(wipItems / Math.max(4, wipItems + completed.length * 2) * 100),
      bottleneck: bottleneckRuntime
        ? snapshot.roles?.[bottleneckRuntime.roleId]?.title || bottleneckRuntime.roleId
        : "Nog niet vastgesteld",
      bottleneckQueue: bottleneckRuntime?.queue?.length || 0,
      bullwhip: hudClamp(Math.max(0, (upstreamLoad + 1) / (customerLoad + 1) - 1), 0, 4),
      opportunityCostEnabled: state.config.opportunityCosts,
      opportunityCost,
      opportunityCostPressure: potentialRevenue
        ? hudClamp(opportunityCost / potentialRevenue * 100)
        : 0
    };
  }

  function processHudMetrics() {
    const snapshot = logisticsGameController?.engine?.snapshot();
    return {
      gameType: state.config.gameType,
      complexity: GAME_COMPLEXITY_SCORES[state.config.gameType]
        ?? hudClamp(20 + state.config.productTypeCount * 5),
      ...(snapshot?.started
        ? standaloneProcessHudMetrics(snapshot)
        : legacyProcessHudMetrics())
    };
  }

  function setProcessHudMeter(element, output, width, text, color, title) {
    if (!element || !output) return;
    element.style.setProperty("--meter-width", `${hudClamp(width)}%`);
    element.style.setProperty("--meter-color", color);
    element.title = title;
    output.textContent = text;
  }

  function renderProcessHud() {
    const metrics = processHudMetrics();
    setProcessHudMeter(
      els.hudComplexity, els.hudComplexityValue, metrics.complexity,
      `${Math.round(metrics.complexity)}%`, complexityHudColor(metrics.complexity),
      `Complexiteit ${Math.round(metrics.complexity)}%: variatie, overdrachten en afhankelijkheden in de actieve variant.`
    );
    setProcessHudMeter(
      els.hudEfficiency, els.hudEfficiencyValue, metrics.efficiency ?? 0,
      metrics.efficiency === null ? "–" : `${Math.round(metrics.efficiency)}%`,
      metrics.efficiency === null ? "#8ca4aa" : hudColor(metrics.efficiency, true),
      metrics.efficiency === null
        ? "Efficiëntie wordt berekend zodra een order door de keten loopt."
        : `Efficiëntie ${Math.round(metrics.efficiency)}%: verwerking ten opzichte van verwerking plus wachten.`
    );
    setProcessHudMeter(
      els.hudWaiting, els.hudWaitingValue, metrics.waitingPercent,
      `${Math.round(metrics.waitingPercent)}%`, hudColor(metrics.waitingPercent),
      `Wachttijd ${Math.round(metrics.waitingPercent)}% (${metrics.waitingMinutes} min) door wachtrijen, overdrachten en blokkades.`
    );
    setProcessHudMeter(
      els.hudWip, els.hudWipValue, metrics.wipPressure,
      String(metrics.wipItems), hudColor(metrics.wipPressure),
      `Voorraad/WIP ${metrics.wipItems}. Grootste wachtrij: ${metrics.bottleneck} (${metrics.bottleneckQueue}); dit is de waarschijnlijke bottleneck.`
    );
    const bullwhipWidth = metrics.bullwhip / 4 * 100;
    setProcessHudMeter(
      els.hudBullwhip, els.hudBullwhipValue, bullwhipWidth,
      `${metrics.bullwhip.toFixed(1)}×`, hudColor(bullwhipWidth),
      metrics.bullwhip
        ? `Bullwhip ${metrics.bullwhip.toFixed(1)}×: de upstream reactie schommelt sterker dan de klantvraag.`
        : "Bullwhip 0.0×: klantvraag en ketenreactie lopen nog synchroon."
    );
    const opportunityCurrencyCode = state.config.baseCurrency || "EUR";
    const opportunityCurrencyLabel = {
      EUR: "€",
      USD: "$",
      GBP: "£",
      JPY: "¥",
      CHF: "CHF"
    }[opportunityCurrencyCode] || opportunityCurrencyCode;
    const opportunityCostText = metrics.opportunityCostEnabled
      ? `${opportunityCurrencyLabel} ${Math.round(metrics.opportunityCost)}`
      : "Uit";
    setProcessHudMeter(
      els.hudOpportunityCost,
      els.hudOpportunityCostValue,
      metrics.opportunityCostPressure,
      opportunityCostText,
      metrics.opportunityCostEnabled ? hudColor(metrics.opportunityCostPressure) : "#8ca4aa",
      metrics.opportunityCostEnabled
        ? `Opportunity costs ${formatMoney(metrics.opportunityCost)} (${Math.round(metrics.opportunityCostPressure)}% van de potentiële orderomzet) door vertraging, verstoringen en onbenutte capaciteit.`
        : "Opportunity costs zijn uitgeschakeld voor deze gamevariant."
    );

    const levelIndex = NEXT_LEVEL_SEQUENCE.indexOf(metrics.gameType);
    const nextGameType = levelIndex >= 0 ? NEXT_LEVEL_SEQUENCE[levelIndex + 1] : null;
    const challengeVisible = Boolean(
      gameManagementSupportedOnDevice()
      && nextGameType
      && metrics.completedCount
      && !metrics.activeCount
      && metrics.efficiency !== null
    );
    if (els.nextLevelChallenge) els.nextLevelChallenge.hidden = !challengeVisible;
    if (challengeVisible) {
      const nextVariant = window.GameVariantHistory?.get(nextGameType);
      els.nextLevelChallengeTitle.textContent =
        `${Math.round(metrics.efficiency)}% efficiënt · klaar voor ${nextVariant?.label || nextGameType}?`;
      els.nextLevelChallengeText.textContent =
        `Complexiteit stijgt van ${Math.round(metrics.complexity)}% naar ${GAME_COMPLEXITY_SCORES[nextGameType]}%. Probeer je efficiëntie vast te houden.`;
      els.nextLevelChallengeButton.dataset.nextGamePreset = nextGameType;
    }
    return metrics;
  }

  function closeTopDepartmentDetail() {
    topDepartmentDetailId = null;
    if (!els.topDepartmentDetailLayer) return;
    els.topDepartmentDetailLayer.hidden = true;
    els.topDepartmentDetailLayer.replaceChildren();
  }

  function renderTopDepartmentDetail(snapshot, departmentId = topDepartmentDetailId) {
    if (
      !els.topDepartmentDetailLayer
      || !window.IsometricLogisticsView
      || !snapshot?.started
      || !departmentId
    ) {
      closeTopDepartmentDetail();
      return;
    }
    topDepartmentDetailId = departmentId;
    const scene = standaloneLogisticsScene(snapshot);
    scene.selectedDepartmentId = departmentId;
    els.topDepartmentDetailLayer.hidden = false;
    window.IsometricLogisticsView.mount(els.topDepartmentDetailLayer, scene, {
      departmentDetailMode: "popup",
      onDepartmentClose: closeTopDepartmentDetail
    });
  }

  function renderMetrics() {
    els.lateValue.textContent = String(state.interactionBuffer.length);
    const sessionActive = Boolean(state.gameSessionRunning);
    els.metricStrip?.classList.toggle("is-inactive", !sessionActive);
    els.metricStrip?.setAttribute("aria-disabled", String(!sessionActive));
    els.metricStrip?.querySelectorAll("button").forEach(button => {
      if (
        button === els.liveEventsToggle
        || button === els.liveEventsClose
        || button === els.eventsClose
        || button === els.topPeopleButton
        || button === els.topAgentsButton
      ) return;
      button.disabled = !sessionActive;
    });
    if (!sessionActive) setEventsOpen(false);
    renderProcessHud();
    els.clockValue.textContent = formatClock(state.clockMinutes);
    els.eventCountValue.textContent = String(state.interactionBuffer.length);
    renderChapter9Insights();
  }

  function setLiveEventsOpen(open) {
    if (!els.liveEventsToggle || !els.liveEventsPopover) return;
    const nextOpen = Boolean(open);
    els.liveEventsPopover.hidden = !nextOpen;
    els.liveEventsToggle.setAttribute("aria-expanded", String(nextOpen));
    els.liveEventsToggle.classList.toggle("is-open", nextOpen);
    if (nextOpen) setEventsOpen(false);
  }

  function setEventsOpen(open) {
    if (!els.eventsToggle || !els.eventsPopover) return;
    const nextOpen = Boolean(open);
    if (nextOpen) renderEvents();
    els.eventsPopover.hidden = !nextOpen;
    els.eventsToggle.setAttribute("aria-expanded", String(nextOpen));
    els.eventsToggle.classList.toggle("is-open", nextOpen);
    if (nextOpen) setLiveEventsOpen(false);
  }

  function eventRowsMarkup(events) {
    if (!events.length) {
      return '<p class="event-log-empty">Er zijn nog geen gebeurtenissen in deze sessie.</p>';
    }
    return events.map(event => {
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

  function renderEvents() {
    const events = [...state.interactionBuffer].reverse();
    const markup = eventRowsMarkup(events);
    els.eventLog.innerHTML = markup;
    els.lateValue.textContent = String(events.length);
    els.eventCountValue.textContent = String(events.length);
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
        canvas.querySelectorAll(".swimlane-cable").forEach(edge => {
          edge.classList.toggle(
            "is-related",
            edge.classList.contains(`edge-source-${node.dataset.modelObjectId}`)
              || edge.classList.contains(`edge-target-${node.dataset.modelObjectId}`)
          );
        });
      };
      const clearConnectedEdges = () => {
        if (!canvas?.classList.contains("swimlane-canvas")) return;
        canvas.classList.remove("has-edge-focus");
        canvas.querySelectorAll(".swimlane-cable.is-related").forEach(edge => {
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
    if (els.towerTutorialGuide) els.towerTutorialGuide.hidden = true;
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

  function deviceCapabilities() {
    return window.LOMDeviceCapabilities?.current?.() || {
      isMobileDevice: false,
      supportsDigitalPlay: true,
      supportsTutorial: true,
      supportsGameManagement: true,
      supportsSessionCreation: true
    };
  }

  function gameManagementSupportedOnDevice() {
    const capabilities = deviceCapabilities();
    return capabilities.isMobileDevice !== true
      && capabilities.supportsDigitalPlay !== false
      && capabilities.supportsGameManagement !== false;
  }

  function applyDeviceAccessPolicy() {
    if (gameManagementSupportedOnDevice()) return;
    document.documentElement.dataset.deviceKind = "mobile";
    document.body.classList.add("mobile-player-only");
    document.querySelectorAll(
      '.app-view-switcher [data-main-menu-tab], [data-app-view="manager"]'
    ).forEach(control => {
      control.hidden = true;
      control.setAttribute("aria-hidden", "true");
      if ("disabled" in control) control.disabled = true;
    });
    document.querySelectorAll("[data-main-menu-tab]").forEach(control => {
      if (control.closest(".app-view-switcher")) return;
      control.setAttribute("aria-disabled", "true");
      control.dataset.managementUnavailable = "true";
    });
    state.appView = "player";
    state.managerTab = "session";
    sessionStorage.setItem("learngame.om.appView", "player");
    sessionStorage.setItem("learngame.om.managerTab", "session");
  }

  function tutorialSupportedOnDevice() {
    return deviceCapabilities().supportsTutorial !== false;
  }

  function sessionSupportedOnDevice(session) {
    const playMode = session?.game_config?.play_mode;
    return window.LOMDeviceCapabilities?.supportsSession?.(playMode, deviceCapabilities())
      ?? true;
  }

  function setTutorialFocus(stage = "builder") {
    if (!tutorialSupportedOnDevice()) {
      document.body.classList.remove(
        "tutorial-focus",
        "tutorial-stage-builder",
        "tutorial-stage-logistics",
        "tutorial-stage-tower"
      );
      if (els.tutorialExitButton) els.tutorialExitButton.hidden = true;
      updateTutorialResumeButton();
      return false;
    }
    state.tutorialDismissed = false;
    logisticsGameController?.pause();
    setManagerTab(stage === "logistics" ? "process" : stage === "tower" ? "tower-editor" : "session", false);
    state.tutorialStage = stage;
    state.tutorialPaused = false;
    document.body.classList.add("tutorial-focus");
    document.body.classList.toggle("tutorial-stage-builder", stage === "builder");
    document.body.classList.toggle("tutorial-stage-logistics", stage === "logistics");
    document.body.classList.toggle("tutorial-stage-tower", stage === "tower");
    syncWorkbenchVisibility(state.appView);
    if (els.tutorialExitButton) els.tutorialExitButton.hidden = false;
    document.querySelectorAll("[data-tutorial-launch]").forEach(button => {
      button.hidden = true;
    });
    return true;
  }

  function leaveTutorialFocus() {
    document.body.classList.remove(
      "tutorial-focus",
      "tutorial-stage-builder",
      "tutorial-stage-logistics",
      "tutorial-stage-tower"
    );
    const activeView = sessionStorage.getItem("learngame.om.appView") || state.appView || "player";
    setAppView(activeView, false);
    if (state.gameSessionRunning) logisticsGameController?.resume();
    if (els.tutorialExitButton) els.tutorialExitButton.hidden = true;
    updateTutorialResumeButton();
  }

  function updateTutorialResumeButton() {
    const isFocus = document.body.classList.contains("tutorial-focus");
    const supported = tutorialSupportedOnDevice();
    const label = supported
      ? (state.tutorialCompleted ? "Tutorial opnieuw" : "Tutorial hervatten")
      : "Tutorial op computer/laptop";
    document.querySelectorAll("[data-tutorial-launch]").forEach(button => {
      button.hidden = isFocus || !supported;
      button.disabled = !supported;
      button.classList.toggle("is-device-unavailable", !supported);
      button.setAttribute("aria-disabled", String(!supported));
      if (!isFocus) {
        button.style.display = "";
        const labelNode = button.querySelector("[data-tutorial-label]")
          || button.querySelector("span:last-child");
        if (labelNode) labelNode.textContent = label;
        button.title = supported
          ? state.tutorialCompleted
            ? "Tutorial opnieuw starten vanaf Stap 1"
            : "Tutorial hervatten waar je bent gestopt"
          : "De bouwtutorial werkt alleen op een computer of laptop met muis";
      }
    });
  }

  let lastTutorialStateUpdateTimestamp = 0;

  function launchTutorial() {
    if (!tutorialSupportedOnDevice()) {
      leaveTutorialFocus();
      return false;
    }
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
    if (els.towerTutorialGuide) els.towerTutorialGuide.hidden = true;
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
    if (!tutorialSupportedOnDevice()) {
      leaveTutorialFocus();
      return false;
    }
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
    } else if (state.tutorialStage === "tower") {
      startTowerDesignTutorial(true);
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
    if (els.towerTutorialGuide) els.towerTutorialGuide.hidden = true;
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
    if (!tutorialSupportedOnDevice()) return false;
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
    if (!tutorialSupportedOnDevice()) return false;
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
    if (!tutorialSupportedOnDevice()) return false;
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

  function updateTowerTutorialGuide(completed = false, product = null) {
    if (!els.towerTutorialGuide) return;
    els.towerTutorialGuide.hidden = false;
    els.towerTutorialGuide.classList.toggle("is-complete", completed);
    if (els.towerTutorialInstruction) {
      els.towerTutorialInstruction.textContent = completed
        ? `${product?.name || "Je nieuwe toren"} staat nu in het productassortiment. Bekijk de galerij en rond daarna de tutorial af.`
        : "Bouw een geldige toren van drie lagen, geef hem een naam en verkoopprijs en kies daarna Akkoord & toevoegen.";
    }
    if (els.towerTutorialCompleteButton) els.towerTutorialCompleteButton.hidden = !completed;
  }

  function startTowerDesignTutorial(resuming = false) {
    if (!tutorialSupportedOnDevice()) return false;
    state.logisticsTutorial.active = false;
    if (!resuming || state.logisticsTutorial.phase !== "tower_assortment_complete") {
      state.logisticsTutorial.phase = "tower_design";
    }
    els.dataModelPanel.classList.remove("visible");
    setAppView("manager", false);
    setTutorialFocus("tower");
    const completed = state.logisticsTutorial.phase === "tower_assortment_complete";
    setTowerTab(completed ? "assortment" : "builder", false);
    window.TowerEditor?.setColorConfiguration({
      multipleColors: true,
      editableColorLayers: ["groundPlate", "layer1", "layer2", "layer3"]
    });
    updateTowerTutorialGuide(completed);
    dispatchInteraction({
      actionType: "start_tutorial_product_design",
      learningObjectID: "tutorial_step_5_product_assortment",
      objectRole: "product_configuration",
      role: "Lerende",
      result: resuming ? "resumed" : "started",
      step: 5
    });
    renderAll();
    els.towerEditorMount?.scrollIntoView({ behavior: "smooth", block: "start" });
    return true;
  }

  function finishTowerDesignTutorial() {
    if (state.logisticsTutorial.phase !== "tower_assortment_complete") return false;
    window.TowerEditor?.setColorConfiguration({
      multipleColors: state.config.multipleColors,
      editableColorLayers: [...state.config.editableColorLayers]
    });
    endTutorial({ completed: true });
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
    return startTowerDesignTutorial();
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

  const SESSION_LAYOUT_STATION_BY_DEPARTMENT = Object.freeze({
    operations: "operations",
    inbound: "srm",
    production_1: "pd1",
    production_2: "pd2",
    production_3: "pd3",
    quality: "ssf",
    dispatch: "customer"
  });

  function isometricScene(configOverride = null) {
    if (
      !configOverride
      && state.logisticsTutorial.active
      && state.logisticsTutorial.phase.startsWith("financial_")
    ) {
      return financialTutorialScene();
    }
    if (
      !configOverride
      && state.logisticsTutorial.active
      && state.logisticsTutorial.phase.startsWith("internal_")
    ) {
      return internalLogisticsTutorialScene();
    }
    if (!configOverride && state.logisticsTutorial.active) return logisticsTutorialScene();
    const gameType = configOverride?.game_type || state.config.gameType;
    const organizationModel = configOverride?.organization_model || state.config.organizationModel;
    const productionProcesses = configOverride
      ? (window.LogisticsProcess?.normalizeProcesses(
          configOverride.production_processes,
          gameType
        ) || ["sequential"])
      : state.config.productionProcesses;
    const logisticsOrganization = configOverride
      ? configOverride.logistics_organization
        || (productionProcesses.length === 1 && productionProcesses[0] === "sequential" ? "functional" : "product")
      : state.config.logisticsOrganization;
    const entrepreneurial = organizationModel === "independent_enterprises";
    const organization = isometricOrganizationFor(organizationModel, logisticsOrganization);
    const processProfile = window.LogisticsProcess?.profileForProcesses(
      productionProcesses,
      gameType
    ) || null;
    const enabledStations = configOverride && Array.isArray(configOverride.enabled_roles)
      ? new Set(configOverride.enabled_roles
          .map(roleId => window.LOMRuntimeRoles?.stationId?.(roleId))
          .filter(Boolean))
      : null;
    const visible = enabledStations
      ? new Set(organization.departments
          .filter(definition => enabledStations.has(SESSION_LAYOUT_STATION_BY_DEPARTMENT[definition.id]))
          .map(definition => definition.id))
      : new Set(state.config.visibleLogisticsDepartments);
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

  function readInteractionOutbox() {
    const items = new Map();
    try {
      const legacyRaw = localStorage.getItem(INTERACTION_OUTBOX_STORAGE);
      if (legacyRaw) {
        try {
          const legacy = JSON.parse(legacyRaw);
          let migratedAll = Array.isArray(legacy);
          if (Array.isArray(legacy)) {
            legacy.filter(item => item?.id && item?.record).forEach(item => {
              items.set(item.id, item);
              if (!persistOutboxItem(item, { reportFailure: false })) migratedAll = false;
            });
          }
          if (migratedAll) localStorage.removeItem(INTERACTION_OUTBOX_STORAGE);
        } catch (error) {
          localStorage.removeItem(INTERACTION_OUTBOX_STORAGE);
          window.dispatchEvent(new CustomEvent("learngame-om-telemetry-outbox-corrupt", {
            detail: { storageKey: INTERACTION_OUTBOX_STORAGE, error }
          }));
          console.warn("Een onleesbare oude telemetrie-outbox is verwijderd; nieuwe losse records blijven beschikbaar.", error);
        }
      }
    } catch {}
    try {
      for (let index = 0; index < localStorage.length; index += 1) {
        const key = localStorage.key(index);
        if (!key?.startsWith(INTERACTION_OUTBOX_ITEM_PREFIX)) continue;
        try {
          const item = JSON.parse(localStorage.getItem(key) || "null");
          if (item?.id && item?.record) items.set(item.id, item);
        } catch {}
      }
    } catch {}
    volatileInteractionOutbox.forEach((item, id) => items.set(id, item));
    return [...items.values()].sort((first, second) => (
      String(first.queued_at || first.record?.timestamp || first.id)
        .localeCompare(String(second.queued_at || second.record?.timestamp || second.id))
    ));
  }

  function outboxItemKey(eventId) {
    return `${INTERACTION_OUTBOX_ITEM_PREFIX}${eventId}`;
  }

  function persistOutboxItem(item, { reportFailure = true } = {}) {
    try {
      localStorage.setItem(outboxItemKey(item.id), JSON.stringify(item));
      volatileInteractionOutbox.delete(item.id);
      return true;
    } catch (error) {
      volatileInteractionOutbox.set(item.id, item);
      if (reportFailure) {
        window.dispatchEvent(new CustomEvent("learngame-om-telemetry-storage-full", {
          detail: { eventId: item.id, error, retainedInMemory: true }
        }));
        console.error("Telemetrie kon niet duurzaam lokaal worden bewaard; de actie blijft in deze tab in de wachtrij.", error);
      }
      return false;
    }
  }

  function enqueueInteraction(record) {
    if (!readInteractionOutbox().some(item => item.id === record.eventID)) {
      persistOutboxItem({
        id: record.eventID,
        record: { ...record },
        attempts: 0,
        queued_at: new Date().toISOString()
      });
    }
    record.deliveryStatus = "pending";
  }

  function updateOutboxItem(eventId, updater) {
    const existing = readInteractionOutbox().find(item => item.id === eventId);
    if (!existing) return readInteractionOutbox();
    const updated = updater(existing);
    if (updated) {
      persistOutboxItem(updated);
    } else {
      volatileInteractionOutbox.delete(eventId);
      try { localStorage.removeItem(outboxItemKey(eventId)); } catch {}
    }
    return readInteractionOutbox();
  }

  function scheduleOutboxRetry(attempts = 1) {
    clearTimeout(outboxRetryTimer);
    const delay = Math.min(30000, 1000 * (2 ** Math.min(5, Math.max(0, attempts - 1))));
    outboxRetryTimer = setTimeout(() => void flushInteractionOutbox(), delay);
  }

  async function flushInteractionOutbox() {
    if (outboxFlushPromise) return outboxFlushPromise;
    let retryAttempts = null;
    const operation = (async () => {
      const bridge = await window.LeerpretSDKReady;
      for (const queued of readInteractionOutbox()) {
        try {
          await bridge.track(queued.record);
          updateOutboxItem(queued.id, () => null);
          const inMemory = state.interactionBuffer.find(item => item.eventID === queued.id);
          if (inMemory) {
            inMemory.deliveryStatus = "delivered";
            delete inMemory.deliveryError;
          }
        } catch (error) {
          const attempts = Number(queued.attempts || 0) + 1;
          updateOutboxItem(queued.id, item => ({
            ...item,
            attempts,
            last_error: String(error?.message || error),
            last_attempt_at: new Date().toISOString()
          }));
          const inMemory = state.interactionBuffer.find(item => item.eventID === queued.id);
          if (inMemory) {
            inMemory.deliveryStatus = "pending";
            inMemory.deliveryError = String(error?.message || error);
          }
          window.dispatchEvent(new CustomEvent("learngame-om-interaction-error", {
            detail: { record: queued.record, error, willRetry: true }
          }));
          retryAttempts = attempts;
          scheduleOutboxRetry(attempts);
          break;
        }
      }
    })().catch(error => {
      scheduleOutboxRetry(1);
      console.warn("De telemetrie-outbox wacht tot de Engine weer bereikbaar is.", error);
    }).finally(() => {
      if (outboxFlushPromise === operation) outboxFlushPromise = null;
      if (retryAttempts === null && readInteractionOutbox().length && navigator.onLine) {
        scheduleOutboxRetry(1);
      }
    });
    outboxFlushPromise = operation;
    return operation;
  }

  function mountSessionLayout(config = null) {
    const target = document.querySelector("[data-session-layout-lego]");
    if (!target || !window.IsometricLogisticsView) return false;
    // `renderAll()` wordt ook door simulator-events aangeroepen. Laat zo'n
    // algemene render de sessiepreview niet terugzetten naar de hoofdconfig:
    // het zichtbare sessieformulier blijft daar de bron van waarheid.
    const sessionForm = document.querySelector(
      "#gameSessionCreateForm, [data-active-game-config]"
    );
    const layoutConfig = config || (sessionForm
      ? window.ConfigurationLayoutPreview?.configFromForm?.(sessionForm)
      : null);
    window.IsometricLogisticsView.mount(target, isometricScene(layoutConfig), {
      departmentDetailMode: "none"
    });
    return true;
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

  function processCableMarkup(id, path, from, to, className = "") {
    const cables = window.LeerpretSDK?.components?.["lego-cables"];
    if (!cables?.connectionMarkup) return "";
    return cables.connectionMarkup({
      id,
      path,
      from,
      to,
      direction: "forward",
      className: `data-model-cable ${className}`.trim()
    });
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
      return processCableMarkup(`graph-${sourceId}-${targetId}`, path, [sx, sy], [tx, ty], "graph-cable");
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
      return processCableMarkup(`sequence-${item.id}-${next.id}`, path, [sx, sy], [tx, ty], "sequence-cable");
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
      return processCableMarkup(
        `swimlane-${item.id}-${next.id}`,
        path,
        [sx, sy],
        [tx, ty],
        `swimlane-cable edge-source-${item.id} edge-target-${next.id}`
      );
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
    renderFinancialStatements();
    renderInventory();
    renderEvents();
    renderDataModel(false);
    updatePriceInput();
    renderOrderPreview();
    renderPlayerView();
    renderAdvisor();
    mountSessionLayout();
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
        if (!delivery.accepted) return;
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
    lo4: ["customer", "logistics_manager", "sales", "finance", "raw_warehouse", "production_a", "production_b", "production_c", "finished_warehouse", "supplier"],
    lo5: ["customer", "sales", "finance", "logistics_manager", "raw_warehouse", "production_1", "production_2", "production_3", "finished_warehouse", "supplier"],
    lo6: ["customer", "sales", "finance", "logistics_manager", "raw_warehouse", "production_1", "production_2", "production_3", "finished_warehouse", "supplier", "transporter"],
    lo7: ["customer", "sales", "finance", "logistics_manager", "raw_warehouse", "production_1", "production_2", "production_3", "finished_warehouse", "supplier", "transporter"],
    lo8: ["customer", "sales", "finance", "logistics_manager", "raw_warehouse", "production_1", "production_2", "production_3", "finished_warehouse", "supplier", "transporter"],
    le_training: ["customer", "logistics_manager", "sales", "finance", "raw_warehouse", "production_a", "production_b", "production_c", "finished_warehouse"],
    entrepreneurial: ["customer", "sales", "supplier", "production_1", "production_2", "production_3", "finished_warehouse"]
  };
  window.GameVariantHistory?.derived.forEach(definition => {
    const roles = window.GameConfigurationStore
      ?.getConfiguration(definition.id)
      ?.settings
      ?.enabled_roles;
    PRESET_ROLE_IDS[definition.id] = Array.isArray(roles)
      ? [...roles]
      : [...(PRESET_ROLE_IDS[definition.basePreset] || PRESET_ROLE_IDS.lo4)];
  });

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
      ["Organisatievorm", config => config.organization_model === "independent_enterprises"
        ? "Zelfstandige ondernemingen"
        : config.organization_model === "school_learning_path"
          ? "School / leertraject"
          : "Eén gezamenlijke organisatie", "text"],
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
    state.config.playMode = settings.play_mode === "digital" ? "digital" : "physical";
    state.config.money = Boolean(settings.money);
    state.config.pnl = Boolean(settings.pnl);
    state.config.openingBalance = state.config.money && Boolean(settings.opening_balance_enabled);
    state.config.revenueBalance = state.config.money && Boolean(settings.revenue_balance_enabled);
    state.config.productionPlanning = Boolean(settings.production_planning_enabled);
    state.config.intermediateStock = Boolean(settings.intermediate_stock);
    state.config.opportunityCosts = Boolean(settings.opportunity_costs);
    state.config.roleFreedom = Boolean(settings.role_freedom);
    state.config.organizationModel = ["independent_enterprises", "school_learning_path"].includes(
      settings.organization_model
    ) ? settings.organization_model : "single_enterprise";
    state.config.fundingIncentive = ["quality", "balanced", "financing"].includes(
      settings.funding_incentive
    ) ? settings.funding_incentive : "balanced";
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
    state.config.hasSupplier = Boolean(settings.has_supplier);
    state.config.currencyMode = settings.currency_mode || "single";
    state.config.baseCurrency = settings.base_currency || "EUR";
    state.config.enabledCurrencies = [...(settings.enabled_currencies || [state.config.baseCurrency])];
    state.config.exchangeRates = { ...(settings.exchange_rates || { [state.config.baseCurrency]: 1 }) };

    const organization = isometricOrganizationFor(
      state.config.organizationModel,
      state.config.logisticsOrganization
    );
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
    if (els.productionPlanningToggle) {
      els.productionPlanningToggle.checked = state.config.productionPlanning;
    }
    window.TowerEditor?.setColorConfiguration({
      multipleColors: state.config.multipleColors,
      editableColorLayers: [...state.config.editableColorLayers]
    });
    els.priceModeSelect.value = state.config.priceMode;
    els.parallelProductionToggle.checked = state.config.productionProcesses.includes("parallel");
    els.sequentialProductionToggle.checked = state.config.productionProcesses.includes("sequential");
    els.hybridProductionTooltip.hidden = state.config.productionProcesses.length !== 2;
    els.productTypeCountInput.value = String(state.config.productTypeCount);
    const variantRules = variantRulesFor(state.config.gameType);
    els.productTypeCountInput.disabled = !variantRules.productTypeCountEditable;
    els.productTypeCountInput.title = variantRules.productTypeCountEditable
      ? "Vanaf LO-Game 6 zijn 1 tot en met 9 torensoorten instelbaar."
      : `Deze spelvariant gebruikt vast ${variantRules.fixedProductTypeCount} torensoort${variantRules.fixedProductTypeCount === 1 ? "" : "en"}.`;
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
      organizationModel: preset.config.organizationModel
        || (gameType === "entrepreneurial" ? "independent_enterprises" : "single_enterprise"),
      fundingIncentive: preset.config.fundingIncentive || "balanced",
      playMode: preset.config.playMode || "physical",
      productionPlanning: PRODUCTION_PLANNING_PRESET_GAMES.has(gameType),
      multipleColors: Boolean(preset.config.multipleColors),
      editableColorLayers: normalizeEditableColorLayers(preset.config.editableColorLayers),
      productionProcesses: window.LogisticsProcess?.defaultProcessesForGame(gameType) || ["parallel"],
      enabledRoles: [...(PRESET_ROLE_IDS[gameType] || PRESET_ROLE_IDS.lo4)],
      hasSupplier: (PRESET_ROLE_IDS[gameType] || PRESET_ROLE_IDS.lo4).includes("supplier"),
      currencyMode: "single",
      baseCurrency: "EUR",
      enabledCurrencies: ["EUR"],
      exchangeRates: { EUR: 1 },
      customerOrderMode: preset.config.customerOrderMode || "required"
    });
    applyLogisticsProcessContract(gameType);
    const organization = isometricOrganizationFor(
      state.config.organizationModel,
      state.config.logisticsOrganization
    );
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
    const normalized = window.GameConfigurationStore?.normalizeSettings(config, gameType) || config;
    const variantRules = variantRulesFor(gameType);
    const productTypeCount = Math.max(
      MIN_PRODUCT_TYPES,
      Math.min(
        MAX_PRODUCT_TYPES,
        variantRules.fixedProductTypeCount
          ?? (Number(normalized.product_type_count) || preset.config.productTypeCount)
      )
    );
    const productTypeCountChanged = state.config.productTypeCount !== productTypeCount;
    Object.assign(state.config, preset.config, {
      playMode: normalized.play_mode === "digital" ? "digital" : "physical",
      gameType,
      money: normalized.money ?? preset.config.money,
      pnl: normalized.pnl ?? preset.config.pnl,
      openingBalance: Boolean(
        (normalized.money ?? preset.config.money)
        && (normalized.opening_balance_enabled
          ?? financialDetailDefaults(gameType, preset.config.money).openingBalance)
      ),
      revenueBalance: Boolean(
        (normalized.money ?? preset.config.money)
        && (normalized.revenue_balance_enabled
          ?? financialDetailDefaults(gameType, preset.config.money).revenueBalance)
      ),
      productionPlanning: Boolean(
        normalized.production_planning_enabled
          ?? PRODUCTION_PLANNING_PRESET_GAMES.has(gameType)
      ),
      intermediateStock: normalized.intermediate_stock ?? preset.config.intermediateStock,
      opportunityCosts: normalized.opportunity_costs ?? preset.config.opportunityCosts,
      roleFreedom: normalized.role_freedom ?? preset.config.roleFreedom,
      organizationModel: ["independent_enterprises", "school_learning_path"].includes(
        normalized.organization_model
      ) ? normalized.organization_model : "single_enterprise",
      fundingIncentive: ["quality", "balanced", "financing"].includes(normalized.funding_incentive)
        ? normalized.funding_incentive
        : "balanced",
      multipleColors: variantRules.colorModeEditable
        && (normalized.multiple_colors ?? Boolean(preset.config.multipleColors)),
      editableColorLayers: normalizeEditableColorLayers(
        normalized.editable_color_layers ?? preset.config.editableColorLayers
      ),
      customerOrderMode: normalized.customer_order_mode === "free" ? "free" : "required",
      priceMode: normalized.price_mode || preset.config.priceMode,
      productionProcesses: window.LogisticsProcess?.normalizeProcesses(
        normalized.production_processes,
        gameType
      ) || ["parallel"],
      logisticsOrganization: normalized.logistics_organization || preset.config.logisticsOrganization,
      productTypeCount,
      enabledRoles: Array.isArray(normalized.enabled_roles)
        ? [...normalized.enabled_roles]
        : [...(PRESET_ROLE_IDS[gameType] || PRESET_ROLE_IDS.lo4)],
      hasSupplier: Boolean(normalized.has_supplier),
      currencyMode: normalized.currency_mode || "single",
      baseCurrency: normalized.base_currency || "EUR",
      enabledCurrencies: [...(normalized.enabled_currencies || [normalized.base_currency || "EUR"])],
      exchangeRates: { ...(normalized.exchange_rates || { EUR: 1 }) }
    });
    if (!state.config.multipleColors) {
      state.config.editableColorLayers = [];
    }
    applyLogisticsProcessContract(gameType);
    const organization = isometricOrganizationFor(
      state.config.organizationModel,
      state.config.logisticsOrganization
    );
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
    state.config.productionPlanning = Boolean(els.productionPlanningToggle?.checked);
    window.TowerEditor?.setColorConfiguration({
      multipleColors: state.config.multipleColors,
      editableColorLayers: [...state.config.editableColorLayers]
    });
    state.config.priceMode = els.priceModeSelect.value;
    const variantRules = variantRulesFor(state.config.gameType);
    state.config.productTypeCount = variantRules.fixedProductTypeCount ?? Math.max(
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
      production_planning_enabled: state.config.productionPlanning,
      intermediate_stock: state.config.intermediateStock,
      opportunity_costs: state.config.opportunityCosts,
      role_freedom: state.config.roleFreedom,
      organization_model: state.config.organizationModel,
      funding_incentive: state.config.fundingIncentive,
      multiple_colors: state.config.multipleColors,
      editable_color_layers: [...state.config.editableColorLayers],
      has_supplier: Boolean(state.config.hasSupplier),
      currency_mode: state.config.currencyMode || "single",
      base_currency: state.config.baseCurrency || "EUR",
      enabled_currencies: [...(state.config.enabledCurrencies || ["EUR"])],
      exchange_rates: { ...(state.config.exchangeRates || { EUR: 1 }) },
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
    const variantRules = variantRulesFor(state.config.gameType);
    const count = variantRules.fixedProductTypeCount ?? Math.max(
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
      const blob = new Blob([payload], { type: "application/json;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `learngame-events-${state.sessionId}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
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
    state.productionPlan = {
      quantities: { A: 0, B: 0, C: 0 },
      saved: false,
      updatedAt: null
    };
    state.advisorOpen = false;

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

    if (!tutorialSupportedOnDevice() || state.tutorialCompleted || state.tutorialDismissed) {
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
      roles: getActiveRoles(state.config.gameType)
        .map(roleById)
        .map(role => ({ id: role.id, token: role.token, title: role.title }))
    });
    renderAll();
  }

  function configureCustomerDecision(session) {
    const customerRoleIds = new Set(["customer", "customer1", "customer2", "customer3", "customer4"]);
    const agentCustomer = (session?.virtual_agents || []).some(agent => (
      customerRoleIds.has(agent.role_id)
    ));
    const humanCustomer = (session?.members || []).some(member => (
      member.present && customerRoleIds.has(member.assigned_role_id)
    ));
    window.LegoBuilder?.setCustomerDecision({
      mode: agentCustomer ? "agent" : humanCustomer ? "human" : "strict",
      tolerance: 0.3
    });
  }

  function wireEvents() {
    window.addEventListener("learngame-multiplayer-command-applied", event => {
      const command = event.detail?.command;
      if (!command?.command_id || !command?.member_id) return;
      const result = event.detail?.result || {};
      const telemetry = command.payload?._telemetry || {};
      const transfer = command.payload?.transfer || {};
      dispatchInteraction({
        personID: String(command.member_id),
        eventID: String(command.command_id),
        timestamp: command.submitted_at || telemetry.timestamp || new Date().toISOString(),
        learningObjectID: String(
          telemetry.learning_object_id || `lom.simulation.${command.role_id || "unknown"}`
        ),
        actionType: String(
          telemetry.action_type
          || (result.ok === false ? "simulation_role_action_rejected" : "simulation_role_action_completed")
        ).replace(/_submitted$/, result.ok === false ? "_rejected" : "_completed"),
        result: result.ok === false ? "rejected" : "success",
        objectRole: result.ok === false ? "resistance" : "success",
        roleId: command.role_id || null,
        orderId: telemetry.order_id || null,
        productType: telemetry.product_id || null,
        commandId: String(command.command_id),
        batchId: transfer.batchId || null,
        completedQuantity: transfer.quantity || command.payload?.completedQuantity || null,
        sourceRoleId: transfer.sourceRoleId || null,
        targetRoleId: transfer.targetRoleId || null,
        cargoKind: transfer.cargoKind || null,
        atomicTransfer: transfer.atomicTransfer ?? null,
        finalDelivery: transfer.finalDelivery ?? null,
        errors: Array.isArray(result.errors) ? result.errors.slice(0, 10) : []
      });
    });
    window.addEventListener("learngame-session-state", event => {
      const session = event.detail?.session || null;
      const hadSharedSession = state.gameSessionExists;
      measurementPersonId = session?.current_member_id
        ? String(session.current_member_id)
        : fallbackPersonId;
      if (session?.session_id) {
        state.sessionId = String(session.session_id);
      } else if (hadSharedSession || !String(state.sessionId || "").startsWith("icg2-v2-")) {
        state.sessionId = randomIdentifier("icg2-v2");
      }
      state.gameSessionExists = Boolean(session?.session_id);
      state.gameSessionRunning = Boolean(event.detail?.running);
      state.gameSessionDifficulty = session?.difficulty_level || "normal";
      if (session?.game_config) {
        applyGameSessionConfig(session.game_config);
      }
      configureCustomerDecision(session);
      if (!state.gameSessionRunning) {
        state.attention.mode = "task";
        logisticsGameController?.stop();
      }
      renderPlayerView();
      renderMetrics();
      renderFinancialStatements();
    });
    window.addEventListener("learngame-session-started", event => {
      const session = event.detail?.session;
      if (!session?.session_id) return;
      if (!sessionSupportedOnDevice(session)) {
        state.gameSessionRunning = false;
        logisticsGameController?.stop();
        renderAll();
        return;
      }
      measurementPersonId = session.current_member_id
        ? String(session.current_member_id)
        : fallbackPersonId;
      state.gameSessionExists = true;
      state.gameSessionRunning = true;
      state.sessionId = session.session_id;
      const member = session.members?.find(item => item.member_id === session.current_member_id);
      if (member?.assigned_role_id) state.assignedRoleId = member.assigned_role_id;
      state.gameSessionDifficulty = session.difficulty_level || "normal";
      configureCustomerDecision(session);
      if (session.game_config) applyGameSessionConfig(session.game_config);
      if (window.LOMMultiplayerRuntime?.handleSessionStarted) {
        window.LOMMultiplayerRuntime.handleSessionStarted(session);
      } else {
        startStandaloneLogisticsGame(state.gameSessionDifficulty, session.game_config);
      }
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
    window.addEventListener("leerpret-auth-changed", event => {
      if (event.detail?.authenticated) {
        checkBackendTutorialState();
        void flushInteractionOutbox();
      } else {
        measurementPersonId = fallbackPersonId;
      }
    });
    window.addEventListener("online", () => void flushInteractionOutbox());
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
    window.addEventListener("learngame-top-department-select", event => {
      const snapshot = logisticsGameController?.engine?.snapshot();
      renderTopDepartmentDetail(snapshot, event.detail?.departmentId);
    });
    window.addEventListener("learngame-top-department-close", closeTopDepartmentDetail);
    document.querySelectorAll("[data-main-menu-tab]").forEach(button => {
      button.addEventListener("click", () => {
        if (!gameManagementSupportedOnDevice()) {
          setAppView("player", false);
          return;
        }
        setLiveEventsOpen(false);
        setEventsOpen(false);
        setAppView("manager", false);
        setManagerTab(button.dataset.mainMenuTab);
      });
    });
    document.getElementById("topSessionStatusButton")?.addEventListener("click", () => {
      if (!gameManagementSupportedOnDevice()) return;
      setAppView("manager", false);
      setManagerTab("session");
    });
    els.liveEventsToggle?.addEventListener("click", event => {
      event.stopPropagation();
      setLiveEventsOpen(els.liveEventsToggle.getAttribute("aria-expanded") !== "true");
    });
    els.liveEventsClose?.addEventListener("click", () => {
      setLiveEventsOpen(false);
      els.liveEventsToggle?.focus();
    });
    els.eventsToggle?.addEventListener("click", event => {
      event.stopPropagation();
      setEventsOpen(els.eventsToggle.getAttribute("aria-expanded") !== "true");
    });
    els.eventsClose?.addEventListener("click", () => {
      setEventsOpen(false);
      els.eventsToggle?.focus();
    });
    document.addEventListener("click", event => {
      if (
        els.liveEventsToggle?.getAttribute("aria-expanded") === "true"
        && !els.liveEventsControl?.contains(event.target)
      ) {
        setLiveEventsOpen(false);
      }
      if (
        els.eventsToggle?.getAttribute("aria-expanded") === "true"
        && !els.eventsControl?.contains(event.target)
      ) {
        setEventsOpen(false);
      }
    });
    document.addEventListener("keydown", event => {
      if (
        event.key === "Escape"
        && els.liveEventsToggle?.getAttribute("aria-expanded") === "true"
      ) {
        setLiveEventsOpen(false);
        els.liveEventsToggle.focus();
      }
      if (
        event.key === "Escape"
        && els.eventsToggle?.getAttribute("aria-expanded") === "true"
      ) {
        setEventsOpen(false);
        els.eventsToggle.focus();
      }
    });
    document.querySelectorAll("[data-insights-tab]").forEach(button => {
      button.addEventListener("click", () => setInsightsTab(button.dataset.insightsTab));
    });
    document.querySelectorAll("[data-tower-tab]").forEach(button => {
      button.addEventListener("click", () => setTowerTab(button.dataset.towerTab));
    });
    els.towerTutorialCompleteButton?.addEventListener("click", finishTowerDesignTutorial);
    document.querySelectorAll("button[data-manager-tab]").forEach(button => {
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
      if (!purchaseForm || !state.gameSessionRunning || runtimeRoleId(state.assignedRoleId) !== "srm") return;
      event.preventDefault();
      const formData = new FormData(purchaseForm);
      purchaseMaterials(
        String(formData.get("partId") || ""),
        Math.max(1, Number(formData.get("quantity") || 1))
      );
    });
    els.playerFormMount.addEventListener("click", event => {
      const disruptionButton = event.target.closest("[data-player-disruption]");
      if (!disruptionButton || !state.gameSessionRunning || runtimeRoleId(state.assignedRoleId) !== "opr") return;
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
    els.exportButton?.addEventListener("click", exportEvents);
    els.menuExportButton?.addEventListener("click", exportEvents);
    els.resetButton?.addEventListener("click", resetState);
    els.nextLevelChallengeButton?.addEventListener("click", () => {
      if (!gameManagementSupportedOnDevice()) return;
      const nextGameType = els.nextLevelChallengeButton.dataset.nextGamePreset;
      if (!nextGameType) return;
      setAppView("manager");
      setManagerTab("session");
      const createSelect = document.querySelector(
        '#gameSessionCreateForm [data-session-game-type]'
      );
      if (createSelect && [...createSelect.options].some(option => option.value === nextGameType)) {
        createSelect.value = nextGameType;
        createSelect.dispatchEvent(new Event("change", { bubbles: true }));
        createSelect.closest("form")?.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
        return;
      }
      if (els.gameTypeSelect && [...els.gameTypeSelect.options]
        .some(option => option.value === nextGameType)) {
        els.gameTypeSelect.value = nextGameType;
        els.gameTypeSelect.dispatchEvent(new Event("change", { bubbles: true }));
      }
    });
    els.gameAdvisorButton?.addEventListener("click", () => {
      state.advisorOpen = !state.advisorOpen;
      renderAdvisor();
    });
    els.gameAdvisorCloseButton?.addEventListener("click", () => {
      state.advisorOpen = false;
      renderAdvisor();
    });
    els.gameAdvisorContent?.addEventListener("click", event => {
      if (event.target.closest("[data-advisor-enable-planning]")) {
        state.config.productionPlanning = true;
        if (els.productionPlanningToggle) els.productionPlanningToggle.checked = true;
        syncConfigFromControls(true);
        setAppView("manager", false);
        setManagerTab("inventory", false);
        return;
      }
      if (event.target.closest("[data-advisor-book-theory]")) {
        window.alert(
          "LE-boek LO-Game 4/5: werk met een forecast voor A, B en C, toets het plan aan de beschikbare voorraad en beperk omsteltijden."
        );
      }
    });
    els.inventoryGrid?.addEventListener("click", event => {
      if (!event.target.closest("[data-save-production-plan]")) return;
      const quantities = {};
      els.inventoryGrid.querySelectorAll("[data-plan-product]").forEach(input => {
        quantities[input.dataset.planProduct] = Math.max(0, Math.floor(Number(input.value) || 0));
      });
      const validation = validateProductionPlan(quantities);
      state.productionPlan = {
        quantities: validation.normalized,
        saved: validation.valid,
        updatedAt: validation.valid ? new Date().toISOString() : null
      };
      dispatchInteraction({
        actionType: "save_production_plan",
        result: validation.valid ? "success" : "invalid",
        objectRole: "production_planning",
        role: "Logistiek Manager",
        plannedQuantities: { ...state.productionPlan.quantities },
        materialRequirements: { ...validation.requirements },
        shortages: [...validation.shortages]
      });
      renderAll();
    });
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
        production_planning_enabled: state.config.productionPlanning,
        intermediate_stock: state.config.intermediateStock,
        opportunity_costs: state.config.opportunityCosts,
        role_freedom: state.config.roleFreedom,
        organization_model: state.config.organizationModel,
        funding_incentive: state.config.fundingIncentive,
        multiple_colors: state.config.multipleColors,
        editable_color_layers: [...state.config.editableColorLayers],
        price_mode: state.config.priceMode,
        production_processes: [...state.config.productionProcesses],
        logistics_organization: state.config.logisticsOrganization,
        product_type_count: state.config.productTypeCount,
        customer_order_mode: state.config.customerOrderMode || "required",
        has_supplier: Boolean(state.config.hasSupplier),
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
      els.productionPlanningToggle,
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
      [...Object.values(LOGISTICS_ORGANIZATION_VARIANTS), ENTREPRENEURIAL_ISOMETRIC_ORGANIZATION]
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
    state.config.visibleLogisticsDepartments = isometricOrganizationFor(
      state.config.organizationModel,
      variantId
    ).departments.map(department => department.id);
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

    navigator.serviceWorker.register("service-worker.js?v=learngame-om-v266-department-work-area").then(registration => {
      registration.update();
      if (registration.waiting) {
        registration.waiting.postMessage({ type: "SKIP_WAITING" });
      }
    }).catch(error => {
      console.info("Service worker niet geregistreerd:", error);
    });
  }

  function applyInitialRoute() {
    const tutorialDeepLink = location.hash === "#tutorialStep4"
      || location.hash === "#tutorialStep2";
    if (tutorialDeepLink && !tutorialSupportedOnDevice()) {
      leaveTutorialFocus();
      updateTutorialResumeButton();
      return;
    }
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
    state.insightsTab = sessionStorage.getItem("learngame.om.insightsTab") || "overview";
    state.towerTab = sessionStorage.getItem("learngame.om.towerTab") || "builder";
    applyDeviceAccessPolicy();
    state.appView = gameManagementSupportedOnDevice()
      ? sessionStorage.getItem("learngame.om.appView") || "player"
      : "player";
    setAppView(state.appView, false);
    updatePriceInput();
    updateTutorialResumeButton();
  }

  window.LOMLogisticsScene = Object.freeze({
    current: isometricScene,
    mountSessionLayout
  });

  window.LEARNGameOMSimulator = {
    dispatchInteraction,
    getInteractionBuffer: () => [...state.interactionBuffer],
    getProcessHudMetrics: () => ({ ...processHudMetrics() }),
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
    getSharedGameController: () => logisticsGameController,
    getSimulationRoleId: roleId => simulationRoleId(roleId),
    startSharedGame: (session, runtime = {}) => {
      const member = (session?.members || []).find(
        item => item.member_id === session.current_member_id
      );
      if (member?.assigned_role_id) state.assignedRoleId = member.assigned_role_id;
      const authoritativeHumanRoleIds = Array.isArray(runtime.humanRoleIds)
        ? runtime.humanRoleIds
        : (session?.members || [])
            .filter(item => item.present !== false && item.assigned_role_id)
            .map(item => item.assigned_role_id);
      const humanRoleIds = authoritativeHumanRoleIds
        .map(roleId => simulationRoleId(roleId))
        .filter(Boolean);
      if (!logisticsGameController?.engine?.started) {
        startStandaloneLogisticsGame(
          session?.difficulty_level || state.gameSessionDifficulty,
          session?.game_config || null,
          { humanRoleIds, runLoop: Boolean(runtime.isController) }
        );
      }
      const localRoleId = simulationRoleId(state.assignedRoleId);
      if (runtime.snapshot) {
        logisticsGameController.restoreSnapshot(runtime.snapshot, {
          humanRoleId: localRoleId,
          humanRoleIds,
          runLoop: Boolean(runtime.isController),
          elapsedSinceSnapshotMs: runtime.elapsedSinceSnapshotMs || 0
        });
      } else {
        logisticsGameController.engine.humanRoleId = localRoleId;
        logisticsGameController.engine.setHumanRoles(humanRoleIds);
        if (runtime.isController) logisticsGameController.engine.loop.start();
        else logisticsGameController.engine.loop.stop();
      }
      logisticsGameController.mount.hidden = false;
      if (!runtime.snapshot) logisticsGameController.render();
      return logisticsGameController;
    },
    updateSharedHumanRoles: session => {
      if (!logisticsGameController?.engine?.started) return [];
      const roles = (session?.members || [])
        .filter(item => item.present !== false && item.assigned_role_id)
        .map(item => simulationRoleId(item.assigned_role_id))
        .filter(Boolean);
      return logisticsGameController.engine.setHumanRoles(roles);
    },
    setSharedActionSubmitter: submitter => logisticsGameController?.setActionSubmitter(submitter),
    confirmSharedAction: () => logisticsGameController?.confirmRemoteAction(),
    rejectSharedAction: (_commandId, errors) => logisticsGameController?.rejectRemoteAction(errors),
    applySharedCommand: command => {
      const roleId = simulationRoleId(command?.role_id);
      if (!roleId) {
        return { ok: false, errors: [`Rol ${command?.role_id || "onbekend"} heeft geen digitale spelhandeling.`] };
      }
      return logisticsGameController?.engine?.completePlayerAction(command.payload || {}, roleId)
        || { ok: false, errors: ["De gedeelde spelmotor is niet gestart."] };
    },
    restoreSharedSnapshot: (snapshot, session, isController = false) => {
      const member = (session?.members || []).find(
        item => item.member_id === session.current_member_id
      );
      const localRoleId = simulationRoleId(member?.assigned_role_id);
      const humanRoleIds = (session?.members || [])
        .filter(item => item.present !== false && item.assigned_role_id)
        .map(item => simulationRoleId(item.assigned_role_id))
        .filter(Boolean);
      return logisticsGameController?.restoreSnapshot(snapshot, {
        humanRoleId: localRoleId,
        humanRoleIds,
        runLoop: Boolean(isController)
      });
    },
    stopSharedGame: () => {
      logisticsGameController?.setActionSubmitter(null);
      logisticsGameController?.stop();
    },
    beginOnboardingTutorial: () => {
      if (!tutorialSupportedOnDevice()) {
        leaveTutorialFocus();
        updateTutorialResumeButton();
        return false;
      }
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
    startTowerDesignTutorial,
    finishTowerDesignTutorial,
    pauseTutorial,
    resumeTutorial,
    launchTutorial,
    endTutorial,
    setAppView,
    setManagerTab,
    setInsightsTab,
    setTowerTab,
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
    const managerTabButton = event.target.closest("button[data-manager-tab]");
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

  initConfigurationHelp();
  initChapter9Insights();
  initControls();
  initLegoBuilder();
  initTowerEditor();
  initStandaloneLogisticsGame();
  wireEvents();
  resetState();
  const currentGameSession = window.LOMGameSessions?.getCurrentSession?.();
  if (currentGameSession?.session_id) {
    const currentSessionSupported = sessionSupportedOnDevice(currentGameSession);
    window.dispatchEvent(new CustomEvent("learngame-session-state", {
      detail: {
        session: currentGameSession,
        running: currentGameSession.status === "running" && currentSessionSupported,
        accessBlocked: !currentSessionSupported
      }
    }));
    if (currentGameSession.status === "running" && currentSessionSupported) {
      window.dispatchEvent(new CustomEvent("learngame-session-started", {
        detail: { session: currentGameSession }
      }));
    }
  }
  registerServiceWorker();
  applyInitialRoute();
  window.LEARNGameOMReady = true;
  if (window.__LOM_PENDING_SESSION_OVERVIEW) {
    window.__LOM_PENDING_SESSION_OVERVIEW = false;
    setAppView("manager", false);
    setManagerTab("session");
  }
  window.dispatchEvent(new CustomEvent("learngame-om-ready"));
})();
