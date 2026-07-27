/**
 * Historische ontwikkellijn van de LEARNGame-simulaties.
 * Bron: LE-boek Learngames, Appendix 1 (1992-2024).
 */
(function (global) {
  "use strict";

  const records = [
    {
      id: "lo1", label: "LO Game 1 · zonder geld", year: "1995",
      organization: "Functionele organisatie met één product (Toren A)",
      objective: "Kwaliteit en inleiding in rollenspel",
      development: "Na de meerproductgame ontstond het idee voor een voorafgaande éénproductvariant."
    },
    {
      id: "lo2", label: "LO Game 2 · LEGOstiek", year: "1992",
      organization: "Functionele organisatie met afdelingen 1, 2 en 3 en Toren A, B en C",
      objective: "Ineffectiviteit",
      development: "De oorspronkelijke meerproductvariant maakt afdelingsdenken, overdrachten en ineffectiviteit zichtbaar."
    },
    {
      id: "lo3", label: "LO Game 3 · zonder geld", year: "1992",
      organization: "Productgeoriënteerde organisatie met afdelingen A, B en C",
      objective: "Effectiviteit",
      development: "Complete producten worden per productafdeling gemaakt; de directe productstroom verhoogt de effectiviteit."
    },
    {
      id: "lo4", label: "LO Game 4 · met geld", year: "1992",
      organization: "Productgeoriënteerde organisatie met afdelingen A, B en C",
      objective: "Inefficiëntie",
      development: "De geldlaag laat zien dat de effectieve derde variant door capaciteitsbeslag en opportunity costs niet de efficiëntste is."
    },
    {
      id: "lo5", label: "LO Game 5 · centrale inkoop", year: "1992",
      organization: "Functionele organisatie met afdelingen 1, 2 en 3 en drie producten",
      objective: "Efficiency en planning; van ordersturing naar productie op basis van prognose",
      development: "Centrale inkoop en het ontkoppelen van verkoop en productie maken planning en schaalvoordeel bespreekbaar."
    },
    {
      id: "lo5b", label: "LO Game 5b · decentrale inkoop", year: "1998",
      organization: "Functionele organisatie met afdelingen 1, 2 en 3 en drie producten",
      objective: "Effectief en efficiënt, maar inflexibel",
      development: "Decentrale inkoop verandert de afstemming, maar de geoptimaliseerde functionele keten blijft kwetsbaar voor afwijkende vraag.",
      basePreset: "lo5",
      settings: { decentralized_procurement: true }
    },
    {
      id: "lo6", label: "LO Game 6 · KOOP", year: "2001",
      organization: "Functionele organisatie met Toren A, B en C plus klantenspecifieke Torens D en E",
      objective: "Productflexibiliteit en het klantenorderontkoppelpunt (KOOP)",
      development: "Klantenspecifieke varianten maken zichtbaar waar voorraadgestuurde productie overgaat in ordergestuurd maatwerk."
    },
    {
      id: "lo7", label: "LO Game 7 · wereldmarkt", year: "2005",
      organization: "Functioneel netwerk met meerdere leveranciers, klanten en wereldmarkten",
      objective: "Creativiteit activeren; competitie en complexiteit",
      development: "De keten wordt een netwerk waarin marktkeuze, transport, competitie en samenwerking samenkomen."
    },
    {
      id: "lo7_digital", label: "LO Game 7 · papierloos", year: "2006",
      organization: "Papierloze keten met gekoppelde laptops",
      objective: "Flexibiliteit en ICT; digitale tracing, balans en verlies-en-winstrekening",
      development: "Digitale registratie koppelt de fysieke stroom aan realtime informatie en financiële metingen.",
      basePreset: "lo7",
      settings: { play_mode: "digital", digital_tracking: true }
    },
    {
      id: "lo8", label: "LO Game 8 · Forwarder", year: "2018",
      organization: "Keten met vervoersmodaliteiten via een Freight Forwarder",
      objective: "Keuze en afstemming van vervoersmodaliteiten",
      development: "De expediteur verbindt vervoerskeuzes, levertijd, kosten en internationale ketenregie."
    },
    {
      id: "lo9", label: "LO Game 9 Digital · Incompetence Game", year: "2024",
      organization: "Digitale ketensimulatie",
      objective: "Bottlenecks visualiseren",
      development: "De digitale variant maakt blokkades, onderbenutting en systeemverlies direct zichtbaar.",
      basePreset: "lo8",
      settings: { play_mode: "digital", bottleneck_visualization: true }
    },
    {
      id: "le_training", label: "LE-Training", year: "2009",
      organization: "Budgetorganisatie, bijvoorbeeld scholen",
      objective: "Lumpsumfinanciering",
      development: "De productielogica wordt vertaald naar leertrajecten, budgetprikkels en de spanning tussen financiering en kwaliteit."
    },
    {
      id: "entrepreneurial", label: "LEARNGame Entrepreneurship", year: "2010",
      organization: "Individuele, zelfstandige ondernemingen in een waardeketen",
      objective: "Creativiteit, ondernemerschap, gedragsstijlen en soft skills",
      development: "Afdelingen worden onafhankelijke ondernemingen; toegevoegde waarde, concurrentie en strategische samenwerking staan centraal."
    },
    {
      id: "entrepreneurial_simple", label: "Entrepreneurship Simple · 7 kleuren", year: "2011",
      organization: "Vereenvoudigde keten van zelfstandige ondernemingen",
      objective: "Ondernemerschap toegankelijk maken met zeven kleuren",
      development: "Een compactere Entrepreneurship-opzet verlaagt de instapdrempel en behoudt marktinteractie en toegevoegde waarde.",
      basePreset: "entrepreneurial",
      settings: {
        multiple_colors: true,
        editable_color_layers: ["groundPlate", "layer1", "layer2", "layer3"],
        color_count: 7
      }
    },
    {
      id: "la_game", label: "LA-Game · talen en communicatie", year: "—",
      organization: "Communicatieketen met kleurgecodeerde referenties",
      objective: "Talen, communicatie en Reference Creation",
      development: "De productiestroom wordt een communicatieopdracht waarin een gedeelde referentie correct moet worden opgebouwd.",
      basePreset: "lo2",
      settings: {
        multiple_colors: true,
        editable_color_layers: ["groundPlate", "layer1", "layer2", "layer3"],
        color_count: 7,
        role_freedom: true
      }
    },
    {
      id: "learngame_small_2018", label: "LEARNGame kleine groepen", year: "2018",
      organization: "Compacte keten voor kleine groepen",
      objective: "De volledige leerdynamiek met minder deelnemers",
      development: "Drie kleuren en samengevoegde rollen maken de LEARNGame uitvoerbaar met een kleine groep.",
      basePreset: "lo2",
      settings: {
        multiple_colors: true,
        editable_color_layers: ["groundPlate", "layer1", "layer2", "layer3"],
        color_count: 3,
        role_freedom: true
      }
    },
    {
      id: "la_game_small_2020", label: "LA-Game kleine groepen", year: "2020",
      organization: "Compacte communicatieketen voor kleine groepen",
      objective: "Talen, communicatie en Reference Creation",
      development: "De LA-Game wordt met drie kleuren en gecombineerde rollen geschikt gemaakt voor kleine groepen.",
      basePreset: "lo2",
      settings: {
        multiple_colors: true,
        editable_color_layers: ["groundPlate", "layer1", "layer2", "layer3"],
        color_count: 3,
        role_freedom: true
      }
    },
    {
      id: "entrepreneurial_digital", label: "Digitale LEARNGame Entrepreneurship", year: "2020",
      organization: "Digitale markt van zelfstandige ondernemingen",
      objective: "Digitale transactieregistratie, ART- en ALERT-validatie en individuele portfolio’s",
      development: "Transacties en gedrag worden digitaal traceerbaar en kunnen per deelnemer in een portfolio worden verantwoord.",
      basePreset: "entrepreneurial",
      settings: {
        play_mode: "digital",
        digital_tracking: true,
        transaction_registration: true,
        individual_portfolios: true
      }
    }
  ].map(record => Object.freeze({
    ...record,
    settings: Object.freeze({ ...(record.settings || {}) })
  }));

  const byId = Object.freeze(Object.fromEntries(records.map(record => [record.id, record])));

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function infoMarkup(variantId) {
    const item = byId[variantId] || byId.lo4;
    return `
      <article class="game-variant-history-info" data-variant-history-info="${escapeHtml(item.id)}">
        <div>
          <span class="game-variant-history-year">${escapeHtml(item.year)}</span>
          <strong>${escapeHtml(item.label)}</strong>
        </div>
        <p><b>Organisatie:</b> ${escapeHtml(item.organization)}</p>
        <p><b>Leerdoel:</b> ${escapeHtml(item.objective)}</p>
        <p>${escapeHtml(item.development)}</p>
      </article>
    `;
  }

  function tableMarkup(selectedId) {
    return `
      <div class="game-variant-history-table-wrap">
        <table class="game-variant-history-table">
          <caption>Ontwikkeling van de LEARNGame-simulaties 1992–2024 · klik een variant om de preset te kiezen.</caption>
          <thead>
            <tr><th>Variant</th><th>Jaar</th><th>Organisatie</th><th>Onderwijskundig doel</th></tr>
          </thead>
          <tbody>
            ${records.map(item => `
              <tr${item.id === selectedId ? ' class="is-selected"' : ""}>
                <th scope="row">
                  <button type="button"
                          class="game-variant-history-select"
                          data-select-history-preset="${escapeHtml(item.id)}"
                          aria-pressed="${item.id === selectedId}">
                    ${escapeHtml(item.label)}
                  </button>
                </th>
                <td>${escapeHtml(item.year)}</td>
                <td>${escapeHtml(item.organization)}</td>
                <td>${escapeHtml(item.objective)}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  function selectedForHost(host) {
    const formSelect = host.closest("form")?.querySelector("[data-session-game-type]");
    const sessionSelect = document.querySelector("#gameSessionCreateForm [data-session-game-type]");
    return formSelect?.value || sessionSelect?.value || document.getElementById("gameTypeSelect")?.value || "lo4";
  }

  function renderHost(host, selectedId = selectedForHost(host)) {
    if (!host) return;
    const showTable = host.hasAttribute("data-game-variant-history-table");
    host.innerHTML = `
      ${infoMarkup(selectedId)}
      ${showTable ? tableMarkup(selectedId) : ""}
    `;
  }

  function mountAll(root = document) {
    root.querySelectorAll?.("[data-game-variant-history], [data-game-variant-history-table]")
      .forEach(host => renderHost(host));
  }

  document.addEventListener("change", event => {
    if (!event.target.matches("[data-session-game-type], #gameTypeSelect")) return;
    document.querySelectorAll("[data-game-variant-history], [data-game-variant-history-table]")
      .forEach(host => renderHost(host, event.target.value));
  });

  document.addEventListener("click", event => {
    const button = event.target.closest("[data-select-history-preset]");
    if (!button) return;
    const variantId = button.dataset.selectHistoryPreset;
    const select = button.closest("form")?.querySelector("[data-session-game-type]")
      || document.querySelector("#gameSessionCreateForm [data-session-game-type]")
      || document.getElementById("gameTypeSelect");
    if (!select || ![...select.options].some(option => option.value === variantId)) return;
    select.value = variantId;
    select.dispatchEvent(new Event("change", { bubbles: true }));
    button.closest("details")?.scrollIntoView({ block: "nearest" });
  });

  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => mutation.addedNodes.forEach(node => {
      if (!(node instanceof Element)) return;
      if (node.matches("[data-game-variant-history], [data-game-variant-history-table]")) {
        renderHost(node);
      }
      mountAll(node);
    }));
  });
  document.addEventListener("DOMContentLoaded", () => {
    mountAll();
    observer.observe(document.body, { childList: true, subtree: true });
  });

  global.GameVariantHistory = Object.freeze({
    records: Object.freeze(records),
    byId,
    get: variantId => byId[variantId] || null,
    derived: Object.freeze(records.filter(record => record.basePreset)),
    infoMarkup,
    tableMarkup,
    mountAll
  });
})(window);
