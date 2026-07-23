# LEARNGame Operations Management

Deze zelfstandige repository bevat de eerste digital twin van de LEARNGame Operations Management / Legostiek Management als leerbox-proefopstelling. De huidige interface volgt expliciet de ICG2 versie 2-flow uit het bronarchief van de Leerpret-hostrepo: klantorder, Operations-inbox, Productie Afdeling 1, SS1, Productie Afdeling 2, SS2, Productie Afdeling 3, klantacceptatie, kwaliteitscontrole en archief.

De browserruntime heeft geen backend- of buildafhankelijkheden. `product.json`
beschrijft wat bij dit product hoort en welke hostkoppelingen bij afsplitsing
door een adapter of deploymentconfiguratie moeten worden overgenomen.

## Uitgangspunten

- Een basisgame met configuraties in plaats van losse spelversies.
- Fysiek en digitaal horen bij elkaar: dezelfde spelkern moet later naar een webinterface, IoT-opstelling of adapter zoals Minecraft kunnen worden gekoppeld.
- De interface is een meetopstelling, geen eindgame. Zij maakt de logistieke stroom zichtbaar en schrijft kale interactie-events weg.
- Rollen, voorraad, productie, verkoop, geldstromen, winst/verlies, opportunity costs, rolvrijheid en het aantal torensoorten zijn instelbaar.

Belangrijkste bronnen voor deze versie:

```text
info/LEARNGame Operations Management/gespreksverslag-henk-digital-twin-20260422.md
info/LEARNGame Operations Management/icg2-versie-2/processtappen-screenshots/icg2-v2-flow.pptx
info/LEARNGame Operations Management/icg2-versie-2/processtappen-screenshots/screenshots-toelichting.xlsx
info/LEARNGame Operations Management/icg2-versie-2/video-instructies/login-instructies-ssml.html
```

Daarnaast zijn de orderformulieren voor Toren A, B en C en het inkoopformulier gebruikt voor productgroepen en prijzen.

## Openen

Open `index.html` rechtstreeks in de browser. Er is geen server nodig.

Voor de PWA-functies, zoals installeren op het beginscherm en offline caching, moet de leerbox via `http://localhost` of `https://` worden geopend. Lokaal kan dat vanaf de repo-root bijvoorbeeld met:

```powershell
python -m http.server 4173
```

Open daarna:

```text
http://localhost:4173/
```

De service worker gebruikt een network-first strategie: bij verbinding wordt de nieuwste versie van de server opgehaald, terwijl eerder bezochte bestanden als fallback beschikbaar blijven.

Binnen het Leerpret-dashboard blijft de bestaande compatibiliteits-URL werken:

```text
/tools/leerbox/learngame-operations-management/
```

Leerpret vindt deze repository via `LEARNGAME_OM_DIR`. Als beide repositories
naast elkaar onder dezelfde bovenliggende map staan, werkt ook automatisch
`../Learngame Operations Management`.

## Wat de proefopstelling nu doet

- starten bij `Klant 1` met de echte ICG2-handeling `Ik wil een order plaatsen`;
- orders aanmaken voor een configureerbare catalogus van 3 tot 9 torensoorten, standaard met het ICG2-v2 voorbeeld `3 torens` en `7 minuten`;
- de gekozen order direct als LEGO-torenpreview zien, inclusief aantal en orderwaarde;
- vaste of vrije verkoopprijs gebruiken en het aantal verschillende LEGO-torens aanpassen;
- de order door Operations, Magazijn Grondstoffen, Productie 1, SS1, Productie 2, SS2, Productie 3, klantacceptatie, kwaliteitscontrole en archief laten lopen;
- grondstoffen inkopen met de prijzen uit het inkoopformulier;
- materiaaltekorten blokkeren en daarna herstelacties registreren;
- drie productiestappen per order simuleren;
- het eerste conceptschema als orderproces met datamodelobjecten bekijken via de knop `Orderproces`;
- binnen die weergave wisselen tussen `Procesgraph` per afdeling, `Sequentie` als slingerend links-rechts/rechts-links orderpad en `Afdelingsroute` als sequentieel pad binnen vaste afdelingsbanen;
- de genummerde datamodelobjecten `00` t/m `23` als expliciete leerobjecten inspecteren;
- de ICG2-loginlogica als bronmetadata registreren: QR-code per rol, taalkeuze, account, game code en rol;
- geldstromen, resultaat en opportunity costs bijhouden;
- verstoringen genereren zoals machine-uitval, spoeddruk, leveranciersvertraging en herwerk;
- rolvrijheid/disruptief gedrag als configureerbare conditie meenemen;
- ruwe interactie-events bewaren voor de Leerpret Simulator.
- op iPhone-formaat werken met grotere touchdoelen, horizontaal swipebare procesbanen, safe-area ondersteuning en iOS-standalone styling;
- als PWA worden toegevoegd aan het beginscherm via `manifest.webmanifest`, `service-worker.js` en het app-icoon in `icons/icon.svg`.

De eventbuffer is in de browser beschikbaar via:

```js
window.LEARNGameOMSimulator.getInteractionBuffer()
```

Daarnaast levert `getContractEventBuffer()` dezelfde interacties als
`leerpret-interaction-event-v1`. De leerbox post beide vormen naar de host:
`events` voor bestaande consumenten en `contract_events` voor nieuwe,
contractgedreven consumenten.

Een event ziet er bijvoorbeeld zo uit:

```json
{
  "personID": "person-ab12cd",
  "learningObjectID": "leerbox-learngame-operations-management",
  "learningBoxID": "leerbox-learngame-operations-management",
  "timestamp": "2026-04-22T10:00:00.000Z",
  "actionType": "process_step",
  "orderId": "order-001",
  "role": "Operations / Logistiek",
  "stage": 5,
  "result": "success",
  "objectRole": "order_flow"
}
```

De datamodel-weergave is overgenomen uit:

```text
info/LEARNGame Operations Management/Eerste Concept SChema_90cmx900cm.html
info/LEARNGame Operations Management/Eerste Concept SChema_90cmx900cm.pdf
```

De PDF is gebruikt om de volledige orderstroom te controleren. De HTML bevatte bij inspectie een compactere selectie, terwijl de PDF de complete genummerde reeks `0` t/m `23` toont. In de leerboxdefinitie staan deze nu als `dm_...` leerobjecten, zodat het procesmodel niet alleen zichtbaar is maar ook als contactlaag kan worden gelogd. De visualisatie toont de verbindingen tussen de processtappen en houdt 400 Operations, 500 Inkoop en productie A/B/C gescheiden. De sequentieweergave volgt dezelfde volgorde als de kale engine-input en loopt per rij afwisselend van links naar rechts en van rechts naar links. De afdelingsroute behoudt de swimlanes maar legt dezelfde volgorde van boven naar beneden door de afdelingen heen. De kleurcodering uit het conceptschema is behouden: groen voor klant, inkoop en grondstoffen, geel voor verkoop/betaling, rood voor operations-overdracht, paars voor productie en blauw voor administratie, gereed product en geldstroom.

## Ontwerpnotitie

Deze digital twin kiest bewust voor een kleine, testbare kern:

- `script.js` bevat de speldata, configuratie, engine-acties en eventdispatch;
- `lego-tower-renderer.js` bevat de vaste isometrische LEGO-torenrenderer voor 6x6 grondplaat, 2x4- en 2x2-blokken;
- `index.html` bevat alleen de statische werkbank;
- `style.css` maakt de orderstroom, voorraad en torens visueel inspecteerbaar.

De volgende logische stap is een adapterlaag naar de simulator, vergelijkbaar met het profiel `phile`, zodat LEARNGame-events expliciet naar de vijf markers `(T, A, V, R, S)` kunnen worden vertaald.

## Productgrens

Deze map bezit:

- de volledige statische browserruntime en PWA-assets;
- gecureerde capture-, engine- en contactberichtfixtures;
- een lokale kopie van het publieke v1-interactiecontract;
- tests die de zelfstandigheid en lokale assets bewaken.

De hostrepo bezit voorlopig nog:

- het omvangrijke historische bronarchief onder
  `info/LEARNGame Operations Management/`;
- ingevulde editorstate en mutatielogs onder `backend/data/leerbox-mutations/`;
- de FastAPI-mount op de bestaande dashboard-URL;
- simulator-, telemetry- en markerinterpretatie.

Geen van deze hostonderdelen is nodig om de leerbox in de browser te draaien.

Test de productgrens met:

```powershell
python -m unittest discover tests
```

## Self-explaining / self-starting

De eerste zichtbare handeling is bewust geen technische configuratie, maar de rolhandeling uit ICG2: `Klant 1` plaatst een order. Daarna toont de taakkaart steeds de rol die aan zet is en de knop die in de digitale game logisch hoort bij die rol, bijvoorbeeld `Nu bijwerken`, `Parafeer`, `Vrijgeven PD1`, `Controleer SS1` of `Archiveer`.
