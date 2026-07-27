(() => {
  "use strict";

  const SOURCE_ROOT = "source_docs/LE-boek%20Learngames/";
  const sourcePath = fileName => `${SOURCE_ROOT}${encodeURIComponent(fileName)}`;

  const assets = Object.freeze([
    { variant: "lo1", type: "svg", file: "1-informatie-en-goederenstroom-lo-game-1.svg", title: "Informatie- en goederenstroom" },
    { variant: "lo1", type: "svg", file: "1-logistiek-schema-lo-game-1.svg", title: "Logistiek schema" },
    { variant: "lo1", type: "csv", file: "1-orderbegeleidingsformulier-lo-game-1.csv", title: "Orderbegeleidingsformulier" },
    { variant: "lo1", type: "svg", file: "1-productieproces-lo-game-1.svg", title: "Productieproces" },
    { variant: "lo1", type: "csv", file: "1-rolindeling-deelnemers-lo-game-1.csv", title: "Rolindeling deelnemers" },
    { variant: "lo2", type: "csv", file: "2-orderformulier-lo-game-2.csv", title: "Orderformulier" },
    { variant: "lo2", type: "csv", file: "2-rolindeling-deelnemers-lo-game-2.csv", title: "Rolindeling deelnemers" },
    { variant: "lo3", type: "csv", file: "3-orderformulier-lo-game-3.csv", title: "Orderformulier" },
    { variant: "lo3", type: "svg", file: "3-productiegeorienteerde-organisatie-lo-game-3.svg", title: "Productgeoriënteerde organisatie" },
    { variant: "lo3", type: "csv", file: "3-rolindeling-deelnemers-lo-game-3.csv", title: "Rolindeling deelnemers" },
    { variant: "lo4", type: "csv", file: "4-order-history-analysis-lo-game-4.csv", title: "Orderhistorie en analyse" },
    { variant: "lo4", type: "svg", file: "4-productgestuurde-organisatie-lo-game-4.svg", title: "Productgestuurde organisatie" },
    { variant: "lo5", type: "svg", file: "5-functionele-organisatie-lo-game-5.svg", title: "Functionele organisatie" },
    { variant: "lo5", type: "csv", file: "5-rolindeling-deelnemers-lo-game-5.csv", title: "Rolindeling deelnemers" },
    { variant: "lo6", type: "svg", file: "6-customer-order-decoupling-points-lo-game-6.svg", title: "Klantorderontkoppelpunten" },
    { variant: "lo6", type: "svg", file: "6-productieorganisatie-lo-game-6.svg", title: "Productieorganisatie" },
    { variant: "lo7", type: "svg", file: "7-productieorganisatie-lo-game-7.svg", title: "Digitale productieorganisatie" },
    { variant: "lo7", type: "svg", file: "7-transport-intermediary-freight-forwarder-lo-game-7.svg", title: "Transportbemiddelaar / freight forwarder" },
    { variant: "lo8", type: "svg", file: "8-freight-forwarder-lo-game-8.svg", title: "Freight forwarder" },
    { variant: "lo8", type: "svg", file: "8-functionele-organisatie-lo-game-8.svg", title: "Functionele ketenorganisatie" },
    { variant: "le_training", type: "svg", file: "9-productieproces-organisatie-le-training.svg", title: "School als productieproces" },
    { variant: "entrepreneurial", type: "svg", file: "10-organisatiediagram-learngame-entrepreneurship.svg", title: "Keten van zelfstandige ondernemingen" }
  ].map(asset => Object.freeze({ ...asset, url: sourcePath(asset.file) })));

  const variants = Object.freeze({
    lo1: {
      label: "LO Game 1",
      learningLine: "Effectiviteit en zicht op de basisstroom",
      insights: [
        {
          id: "flow-visibility",
          title: "Zie de hele goederen- en informatiestroom",
          summary: "Een order wordt pas effectief uitgevoerd als informatie en materiaal dezelfde keten doorlopen.",
          signal: "Vergelijk overdrachten, wachttijd en de plaats van de order in de keten."
        },
        {
          id: "silo-thinking",
          title: "Afdelingsdenken verlengt de doorlooptijd",
          summary: "Iedere afdeling ziet slechts haar eigen bewerking. Lokale juistheid garandeert daardoor geen goed totaalproces.",
          signal: "Veel overdrachten of blokkades bij weinig gereed product wijzen op verkokering."
        }
      ]
    },
    lo2: {
      label: "LO Game 2",
      learningLine: "Variatie, omstellen en afhankelijkheid",
      insights: [
        {
          id: "changeover-pressure",
          title: "Meer varianten geven meer omstellingen",
          summary: "Wisselen tussen torensoorten vergroot afstemming en doorlooptijd, ook als elke afdeling afzonderlijk goed werkt.",
          signal: "Let op variantwissels, wachtrijen en terugkerende overdrachtsfouten."
        },
        {
          id: "forced-partnership",
          title: "Afhankelijkheid beperkt de keuzevrijheid",
          summary: "Een klant kan een slechte levertijd accepteren wanneer er geen reëel alternatief voor de ketenpartner is.",
          signal: "Een geaccepteerde order is niet automatisch bewijs van een goede prestatie."
        }
      ]
    },
    lo3: {
      label: "LO Game 3",
      learningLine: "De meest effectieve organisatie; efficiëntie is nog niet zichtbaar",
      insights: [
        {
          id: "management-paradox",
          title: "Management druk, productie stil",
          summary: "Management kan veel overleggen en sturen terwijl de systeemeffectiviteit nul blijft.",
          signal: "Hoge managementactiviteit naast nul productieve voortgang activeert de sturingsparadox."
        },
        {
          id: "capacity-imbalance",
          title: "Bezetting is ongelijk verdeeld",
          summary: "Een productafdeling kan overbelast zijn terwijl andere afdelingen wachten. De organisatie levert wel, maar benut haar capaciteit slecht.",
          signal: "Vergelijk activiteit en output per rol of productafdeling."
        },
        {
          id: "effective-not-efficient",
          title: "Versie 3 is de meest effectieve",
          summary: "De productgerichte organisatie is sterk in doelbereik: complete torens kunnen met een korte, directe productstroom worden geleverd.",
          signal: "Meet hier eerst of de gevraagde output wordt gehaald; zonder financiële laag blijft de verspilde capaciteit nog grotendeels buiten beeld."
        }
      ]
    },
    lo4: {
      label: "LO Game 4",
      learningLine: "Maakt zichtbaar dat de effectieve versie 3 niet de efficiëntste is",
      insights: [
        {
          id: "lo3-lo4-contrast",
          title: "Versie 4 onthult de keerzijde van versie 3",
          summary: "De productgerichte organisatie blijft effectief, maar geld en opportunity costs tonen dat dezelfde output gepaard kan gaan met onderbenutting, overbelasting en gemiste opbrengsten.",
          signal: "Vergelijk de gerealiseerde output met kosten, rolbelasting en ongebruikte capaciteit. Versie 4 stelt de diagnose; de herinrichting volgt pas in versie 5."
        },
        {
          id: "margin-versus-volume",
          title: "Volume is niet hetzelfde als waarde",
          summary: "Een kleine, rustige afdeling kan door een hoge marge meer bijdragen dan een grote afdeling met veel handelingen.",
          signal: "Vergelijk omzet, marge en opportunity costs per afdeling; tel niet alleen activiteiten."
        },
        {
          id: "opportunity-cost",
          title: "Onbenutte capaciteit heeft een prijs",
          summary: "Onderbezetting bij A en C en overbelasting bij B worden zichtbaar als gemiste opbrengst.",
          signal: "Een hoge opportunity cost wijst op capaciteit die elders waarde had kunnen toevoegen."
        },
        {
          id: "management-paradox",
          title: "Druk sturen kan stilstand maskeren",
          summary: "Meer managementhandelingen lossen een capaciteitsknelpunt niet vanzelf op.",
          signal: "Vergelijk managementactiviteit met productieve stappen en gereed product."
        }
      ]
    },
    lo5: {
      label: "LO Game 5",
      learningLine: "De in versie 4 zichtbare inefficiëntie functioneel verbeteren",
      insights: [
        {
          id: "shared-capacity",
          title: "Gedeelde capaciteit verhoogt benutting",
          summary: "Na de diagnose in versie 4 worden afdelingen functioneel in serie gezet, zodat gespecialiseerde capaciteit voor alle gevraagde torens kan worden benut.",
          signal: "Vergelijk output en rolbelasting met de productgerichte variant."
        },
        {
          id: "planning-versus-flow",
          title: "Planning helpt, maar kan ook voorraad duwen",
          summary: "Programmatisch produceren verhoogt de bezetting; zonder vraagkoppeling ontstaan tussenvoorraden en een pushproces.",
          signal: "Lees activiteit altijd samen met onderhanden werk en werkelijke klantvraag."
        },
        {
          id: "bottleneck",
          title: "De zwakste schakel bepaalt de output",
          summary: "De drukste afdeling is vaak het knelpunt; voorraad stapelt zich vlak vóór die stap op.",
          signal: "Zoek de combinatie van hoge wachtrij, hoge activiteit en lage ketendoorvoer."
        }
      ]
    },
    lo6: {
      label: "LO Game 6",
      learningLine: "Flexibiliteit en klantorderontkoppelpunt",
      insights: [
        {
          id: "customer-specificity",
          title: "Klantwensen dringen de keten binnen",
          summary: "Hoe eerder een kleur- of productspecificatie vastligt, hoe groter de invloed op planning en uitvoering.",
          signal: "Vergelijk doorlooptijd en fouten voor vroege en late klantkeuzes."
        },
        {
          id: "decoupling-point",
          title: "Het ontkoppelpunt verdeelt planbaar en klantgestuurd werk",
          summary: "Vóór het KOOP kan strak worden gepland; erna moet de keten reageren op variabele klantwensen.",
          signal: "Bekijk waar de orderkeuze de materiaal- en informatiestroom verandert."
        },
        {
          id: "flexibility-cost",
          title: "Flexibiliteit vraagt informatie",
          summary: "Meer kleuren en varianten vergroten klantwaarde, maar ook coördinatie, omstellingen en foutkans.",
          signal: "Meet extra marge naast extra handelingen, wachttijd en herwerk."
        }
      ]
    },
    lo7: {
      label: "LO Game 7",
      learningLine: "Digitale besturing en traceerbaarheid",
      insights: [
        {
          id: "digital-traceability",
          title: "Digitale events maken de keten traceerbaar",
          summary: "Orders, betalingen en overdrachten zijn niet alleen sneller, maar ook achteraf als actiereeks te analyseren.",
          signal: "Gebruik de eventlijn om oorzaken van vertraging en herwerk terug te vinden."
        },
        {
          id: "real-time-finance",
          title: "Balans en resultaat worden realtime",
          summary: "Digitale transacties verbinden operationele keuzes direct aan kas, omzet, kosten en marge.",
          signal: "Vergelijk lokale snelheid met het actuele resultaat van de totale keten."
        },
        {
          id: "market-coordination",
          title: "Vrijheid vergroot de behoefte aan afstemming",
          summary: "Vrije rollen en prijzen kunnen ondernemerschap stimuleren, maar maken afspraken en informatiekwaliteit belangrijker.",
          signal: "Let op prijsinteractie, afwijkend rolgedrag en leverbetrouwbaarheid."
        }
      ]
    },
    lo8: {
      label: "LO Game 8",
      learningLine: "Ketenintegratie en transportregie",
      insights: [
        {
          id: "chain-orchestration",
          title: "De freight forwarder regisseert de keten",
          summary: "Transport wordt een zelfstandige coördinatiefunctie die leveranciers, productie en aflevering verbindt.",
          signal: "Meet niet alleen transportacties, maar ook hun effect op totale doorlooptijd."
        },
        {
          id: "information-before-movement",
          title: "Informatie moet vóór de goederen uit lopen",
          summary: "Digitale ketensturing werkt pas als de juiste partij tijdig over order, locatie en status beschikt.",
          signal: "Een fysieke wachtrij met veel administratieve events wijst op slechte synchronisatie."
        },
        {
          id: "local-versus-chain",
          title: "Lokale optimalisatie kan de keten vertragen",
          summary: "Een efficiënt transport- of productieonderdeel is niet automatisch optimaal voor de eindklant.",
          signal: "Beoordeel iedere rol op bijdrage aan ketendoorvoer, niet alleen op eigen bezetting."
        }
      ]
    },
    le_training: {
      label: "LE-Training",
      learningLine: "School als parallel leerproces binnen een budget",
      insights: [
        {
          id: "parallel-learning",
          title: "Leerlingen lopen sequentieel, groepen werken parallel",
          summary: "Een leerling doorloopt leerjaren na elkaar, terwijl meerdere groepen en leerinhouden tegelijk capaciteit vragen.",
          signal: "Vergelijk belasting en voortgang per groep én over de volledige leerroute."
        },
        {
          id: "budget-depletion",
          title: "Budget raakt op terwijl het proces doorgaat",
          summary: "Geld is hier financiering: kosten lopen door en extra inzet levert niet vanzelf extra omzet op.",
          signal: "Zet budgetverbruik af tegen leerkwaliteit, voortgang en ondersteuningsbehoefte."
        },
        {
          id: "support-cost",
          title: "Extra ondersteuningsbehoefte kost tijd",
          summary: "Niet-standaard behoeften vragen extra capaciteit die niet altijd financieel wordt gecompenseerd.",
          signal: "Een eerlijke beoordeling combineert activiteit, kwaliteit, beschikbare tijd en financiering."
        },
        {
          id: "school-silos",
          title: "Ook jaargroepen kunnen verkokeren",
          summary: "Elke groep kan lokaal goed functioneren terwijl overdrachten en de totale leerlingroute slecht aansluiten.",
          signal: "Let op wachttijd en informatieverlies bij overgangen tussen groepen."
        }
      ]
    },
    entrepreneurial: {
      label: "Entrepreneurial Game",
      learningLine: "Zelfstandige ondernemingen in één productieketen",
      insights: [
        {
          id: "independent-enterprises",
          title: "De afdelingen zijn zelfstandige bedrijven",
          summary: "Leverancier, producent en handelaar vormen samen een keten, maar optimaliseren ieder hun eigen onderneming.",
          signal: "Een overdracht is een inkoop- of verkooptransactie, geen interne verrekening."
        },
        {
          id: "profit-and-learning",
          title: "Winnen vraagt een expliciet criterium",
          summary: "Winst kan het spelcriterium zijn, maar ondernemerschapsleren kan eveneens als resultaat worden beoordeeld.",
          signal: "Toon financieel resultaat naast risico, initiatief, netwerk en vastgelegde leeropbrengst."
        },
        {
          id: "network-value",
          title: "Het transactienetwerk laat ondernemerschap zien",
          summary: "Veelzijdige geldstromen tonen wie koopt, verkoopt en relaties onderhoudt; omvang alleen zegt nog niets over kwaliteit.",
          signal: "Combineer netwerkactiviteit met marge en leverprestatie."
        },
        {
          id: "competition-cooperation",
          title: "Concurrentie en samenwerking bestaan tegelijk",
          summary: "Ondernemingen concurreren om resultaat en werken strategisch samen wanneer dat hun ketenpositie versterkt.",
          signal: "Maak prijs, partnerkeuze, transacties en eigen resultaat per onderneming zichtbaar."
        }
      ]
    }
  });

  const ignoredObjectRoles = new Set([
    "navigation", "orientation", "attention", "onboarding", "configuration",
    "measurement", "product_configuration"
  ]);
  const productiveActions = new Set([
    "start_production", "complete_production_step", "complete_stock_tutorial_build",
    "internal_transport", "finished_goods_transfer", "quality_control",
    "customer_acceptance", "archive_order"
  ]);
  const outputActions = new Set(["archive_order", "customer_acceptance"]);

  function clamp(value, minimum = 0, maximum = 100) {
    return Math.max(minimum, Math.min(maximum, value));
  }

  function analyze({ events = [], orders = [], gameType = "lo4", roleDefinitions = [] } = {}) {
    const gameplayEvents = events
      .filter(event => !ignoredObjectRoles.has(String(event.objectRole || "")))
      .slice(-36);
    const roles = new Map();
    let managementActions = 0;
    let productiveSteps = 0;
    let completedOutput = 0;
    let frictionEvents = 0;
    let variantSwitches = 0;

    events.slice(-80).forEach(event => {
      if (["apply_game_type_preset", "load_game_configuration"].includes(event.actionType)) {
        variantSwitches += 1;
      }
    });

    gameplayEvents.forEach(event => {
      const role = String(event.role || "Onbekende rol");
      const roleId = String(event.roleId || "");
      const actionType = String(event.actionType || "");
      const isManagement = roleId === "opr"
        || /operations manager|game master|management/i.test(role);
      const isProductive = productiveActions.has(actionType)
        || /product(ie|ion)|build|transport|transfer/i.test(actionType);
      const isOutput = outputActions.has(actionType) || event.result === "complete";
      const isFriction = event.objectRole === "friction"
        || ["blocked", "delayed", "opportunity_cost", "disruptive", "incorrect"].includes(event.result);
      const row = roles.get(role) || { role, actions: 0, productive: 0, management: isManagement };
      row.actions += 1;
      if (isProductive) row.productive += 1;
      row.management = row.management || isManagement;
      roles.set(role, row);
      if (isManagement) managementActions += 1;
      if (isProductive) productiveSteps += 1;
      if (isOutput) completedOutput += 1;
      if (isFriction) frictionEvents += 1;
    });

    const maxActions = Math.max(1, ...Array.from(roles.values(), role => role.actions));
    roleDefinitions.forEach(definition => {
      if (!roles.has(definition.title)) {
        roles.set(definition.title, {
          role: definition.title,
          actions: 0,
          productive: 0,
          management: definition.id === "opr"
        });
      }
    });

    const roleActivity = Array.from(roles.values())
      .map(role => ({
        ...role,
        activityPercent: Math.round((role.actions / maxActions) * 100),
        productivityPercent: Math.round((role.productive / Math.max(1, role.actions)) * 100)
      }))
      .sort((a, b) => b.actions - a.actions || a.role.localeCompare(b.role, "nl"));

    const managementActivity = clamp(Math.round((managementActions / Math.max(4, gameplayEvents.length)) * 240));
    const systemOutput = clamp(
      completedOutput * 34 + productiveSteps * 9
    );
    const paradoxActive = gameplayEvents.length >= 4
      && managementActions >= 3
      && productiveSteps === 0
      && completedOutput === 0;
    const resistance = clamp(
      frictionEvents * 14 + Math.max(0, variantSwitches - 1) * 18
    );

    return {
      variant: variants[gameType] || variants.lo4,
      assets: assets.filter(asset => asset.variant === gameType),
      allAssets: assets,
      managementActivity,
      systemOutput,
      paradoxActive,
      productiveSteps,
      completedOutput,
      resistance,
      resistanceLevel: resistance >= 67 ? "Hoog" : resistance >= 34 ? "Oplopend" : "Laag",
      roleActivity,
      eventCount: gameplayEvents.length
    };
  }

  window.Chapter9Insights = Object.freeze({
    source: Object.freeze({
      title: "LE-boek Learngames, hoofdstuk 9",
      url: sourcePath("Chapter_9_AI_Optimized.md")
    }),
    variants,
    assets,
    analyze
  });
})();
