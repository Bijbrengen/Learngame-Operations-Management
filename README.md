# LEARNGame Operations Management

Deze zelfstandige repository bevat de eerste digital twin van de LEARNGame Operations Management / Legostiek Management als leerbox-proefopstelling. De huidige interface volgt expliciet de ICG2 versie 2-flow uit het bronarchief van de Leerpret-hostrepo: klantorder, Operations-inbox, Productie Afdeling 1, SS1, Productie Afdeling 2, SS2, Productie Afdeling 3, klantacceptatie, kwaliteitscontrole en archief.

De browserruntime heeft geen backend- of buildafhankelijkheden. `product.json`
beschrijft wat bij dit product hoort en welke hostkoppelingen bij afsplitsing
door een adapter of deploymentconfiguratie moeten worden overgenomen.

## Aanmelden via Leerpret

De standalone LO-game toont rechtstreeks Google Sign-In en gebruikt bewust
niet de engine-sessie:

1. de game controleert `GET /api/auth/leerbox/session` met
   `credentials: include`;
2. wanneer de game vanuit een reeds aangemelde Leerpret-frontend is geopend,
   wisselt zij die aanmelding stil in voor een beperkte LO-sessie;
3. een standalone bezoeker meldt zich in de game zelf aan met Google Identity
   Services; de backend verifieert het Google ID-token en maakt daarna
   `leerpret_leerbox_session`;
4. afmelden loopt via `POST /api/auth/leerbox/logout`.

De speler vult in de LO-game dus geen organisatie of API-sleutel in. De
beperkte sessie bevat standaard alleen `learner` (`Lerende`).
`attraction` (`Leerattractie`) wordt alleen geaccepteerd wanneer de backend
dat recht in de getekende sessie heeft opgenomen. Deze cookie wordt niet door
de engine-, architect- of technologieroutes als autorisatie geaccepteerd.

Lokaal gebruikt de game standaard `http://127.0.0.1:8011/api`. Een andere
centrale service kan via de opstartparameter `?api=...` worden gekozen. De Leerpret-backend
moet voor een afzonderlijke oorsprong die oorsprong opnemen in
`LEERPRET_CORS_ORIGINS`. Google Sign-In vereist daarnaast
`GOOGLE_OAUTH_CLIENT_ID` op de backend en de oorsprong van de standalone game
als Authorized JavaScript origin in Google Cloud.

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
- vóór het vrije spel een interactieve tutorial doorlopen waarin Toren A in
  drie stappen wordt gebouwd met de drie GIF-voorbeelden uit `source_docs`;
- LEGO-blokken uit het bestaande SVG-palet aanklikken of slepen, 90 graden
  draaien en in een isometrische 3D-view op een groene 6x6-grondplaat laten
  vastklikken;
- alleen op een volledig ondersteund, vlak oppervlak bouwen en een levering
  op kleur, afmeting, laag en positie laten controleren;
- na de tutorial klantorders voor Toren A, B en C bouwen volgens de
  bijgeleverde productafbeeldingen;
- vaste of vrije verkoopprijs gebruiken en het aantal verschillende LEGO-torens aanpassen;
- de order door Operations, Magazijn Grondstoffen, Productie 1, SS1, Productie 2, SS2, Productie 3, klantacceptatie, kwaliteitscontrole en archief laten lopen;
- grondstoffen inkopen met de prijzen uit het inkoopformulier;
- materiaaltekorten blokkeren en daarna herstelacties registreren;
- drie productiestappen per order simuleren;
- het eerste conceptschema als orderproces met datamodelobjecten bekijken via de knop `Orderproces`;
- binnen die weergave wisselen tussen `Procesgraph` per afdeling, `Sequentie` als slingerend links-rechts/rechts-links orderpad en `Afdelingsroute` als sequentieel pad binnen vaste afdelingsbanen;
- via `Isometrische kaart` de indeling uit
  `source_docs/20260209-LO-Game-spelversie-4-HR.pptx` als aanklikbare
  SVG-zones bekijken: Magazijn Grondstoffen, Productieafdeling A, B en C,
  Magazijn Gereed Product en de klant;
- in die kaart de drie afzonderlijke materiaalroutes uit dia 13, 15 en 16
  zien: Grondstoffen -> Afdeling A/B/C -> Gereed Product. Er is dus geen
  centraal splits- of samenvoegpunt; elke afdeling heeft een eigen aanvoer
  en afvoer. Vanaf Gereed Product loopt een aparte uitleverroute naar de klant;
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
- `lego-builder.js` bevat de tutorialstate, het herbruikte blokkenpalet,
  klik/drag-and-drop, grid-snapping, steuncontrole en levervalidatie;
- `index.html` bevat alleen de statische werkbank;
- `style.css` maakt de orderstroom, voorraad en torens visueel inspecteerbaar.

De volgende logische stap is een adapterlaag naar de simulator, vergelijkbaar met het profiel `phile`, zodat LEARNGame-events expliciet naar de vijf markers `(T, A, V, R, S)` kunnen worden vertaald.

## Interactieve LEGO-bouwmodule

De bouwmodule start altijd met een woordarme tutorial voor Toren A. Bovenaan
staat alleen dat de speler leverancier van LEGO-torens is en dat een klant de
afgebeelde toren wil. De geanimeerde klanttoren laat de opbouw visueel zien.
De grondplaat, noppen, blokken en grijze doelvlakken
worden door dezelfde `LegoTowerRenderer` in een vaste isometrische
SVG-projectie getekend. Blokken kunnen uitsluitend worden gesleept; klikken en
handmatig draaien zijn uitgeschakeld. Een onjuist blok of een onjuiste positie
geeft geen tekstmelding, maar laat het blok en de grondplaat kort trillen.
Terugdraaien en wissen gebruiken alleen een terugpijl en prullenbakpictogram.

Na deze bedieningsoefening verschijnt een nieuwe klantbestelling voor Toren B,
maar het blokkenpalet is leeg. Via `Ga naar de magazijnen` opent Stap 2,
`Magazijn & Voorraad`. De speler haalt in de isometrische logistieke kaart
twee blauwe 2x4-blokken uit Magazijn A, één geel 2x2-blok uit Magazijn B en
één groen 2x2-blok uit Magazijn C. De magazijnen hebben een open dak met een
zichtbaar ophaalvak. Daarin liggen kleine, isometrische LEGO-blokken van het
juiste én een misleidend formaat. De speler moet goed naar het aantal noppen
kijken en de juiste blokken naar het ontvangstvak van de Bouwafdeling slepen.
Een verkeerd formaat wordt geweigerd en teruggelegd. Een juist blok verdwijnt
uit het magazijn en verschijnt zichtbaar in het open ontvangstvak van de
Bouwafdeling. De magazijnbadge neemt af en de ontvangstteller neemt toe. Zodra
alle vier blokken zichtbaar zijn aangekomen, kiest de speler daar
`Ga met deze blokken bouwen`.

Na de overdracht keert de speler terug naar de bouwafdeling. Alleen de vier
opgehaalde onderdelen zijn beschikbaar en elk geplaatst blok wordt van de
bouwvoorraad afgetrokken. Na een correcte Toren B wordt de vrije bouwopdracht
nog niet direct ontgrendeld.

Daarna start Stap 3, `Interne Logistiek`. Toren B staat als zichtbaar
halffabricaat in het open dak van Productie. De speler pakt de complete toren
vast en sleept hem via de gemarkeerde interne transportroute naar het open
ontvangstvak van de volgende afdeling, Gereed Product. Daar verschijnt de
toren opnieuw; de badge bij Productie neemt af van één naar nul en de
ontvangstbadge neemt toe van nul naar één. Na de bevestigde ontvangst wordt
vrij bouwen ontgrendeld.

Na het aanmelden staat de applicatie in tutorial-focusmodus: alleen de actieve
bouwoefening of logistieke kaart is zichtbaar. De orderstroom, instellingen,
voorraadpanelen en meetlog blijven verborgen om rust te bewaren. Met
het sluitpictogram kan de speler vanuit iedere stap direct naar de volledige
applicatie gaan. Ook de logistieke stappen gebruiken geen detailpaneel,
afdelingsondertitels of tekstuele goed/fout-feedback.

Stap 2 is tijdens ontwikkeling rechtstreeks te openen via:

```text
http://127.0.0.1:4173/#tutorialStep2
```

Daarna kan de speler een bestelling voor A, B of C kiezen. De catalogus en
validatie gebruiken één gedeelde set bouwdoelen. Een klik of drop wordt vanuit
de isometrische schermcoördinaten teruggerekend naar het dichtstbijzijnde
geldige punt op het 6x6-raster. Daarbij wordt ook de stapelhoogte meegenomen,
zodat op een hoger blok kan worden doorgebouwd. Een blok krijgt automatisch de
eerstvolgende geldige laag.
Alle bedekte noppen moeten dezelfde steunhoogte hebben; daardoor kan een blok
niet in de lucht of half op een lager blok worden geplaatst. `Klaar / Leveren`
vergelijkt vervolgens type, kleur, maat, onderlinge positie en laag. Een
correcte toren blijft geldig wanneer de speler het volledige bouwwerk op de
grondplaat verschuift of 90, 180 of 270 graden draait.

De bronbeelden zijn voor de runtime overgenomen naar `assets/lego/`. De
interactieve blokjes zelf blijven afkomstig uit `LegoTowerRenderer`, zodat het
palet en de bestaande torenvoorbeelden dezelfde SVG-vormtaal gebruiken.

## Isometrische logistieke view

De nieuwe view bestaat uit drie gescheiden lagen:

```text
script.js
  game-state, afdelingsdefinities, voorraad- en orderprojectie
        |
        v
isometric-logistics-view.js
  generieke SVG-projectie, zones, verbindingen en interactie
        |
        v
style.css
  oppervlakken, statuskleuren, responsiviteit en animatie
```

De renderer ontvangt alleen een scene-object met `departments`,
`connections` en `selectedDepartmentId`. Daardoor kan een andere statebron
later dezelfde view gebruiken. De afdelingskleuren volgen dia 17 van
`20260209-LO-Game-spelversie-4-HR.pptx`: roze voor Grondstoffen, oplopende
blauwtinten voor Afdeling A, B en C, en petrol voor Gereed Product. De groene
lijnen zijn de drie afzonderlijke materiaalstromen uit dia 13, 15 en 16; de
cyaan lijn is de uitlevering naar de klant. Operationele status blijft een
afzonderlijk gegeven.

De Game Master-instelling `Organisatie` bewaart twee organisatievarianten in
dezelfde game:

- `Productgericht (LO 3/4)` toont drie zelfstandige productafdelingen. Het
  grondstoffenmagazijn heeft drie afzonderlijke uitstromen naar A, B en C,
  waarna iedere afdeling rechtstreeks aan Magazijn Gereed Product levert;
- `Functionele keten (LO 1/2/5/6/7)` toont de seriële stroom Inkomend
  Magazijn -> Assemblage 1 -> Assemblage 2 -> Assemblage 3 ->
  Kwaliteitscontrole -> Expeditie.

De instelling verandert de organisatorische projectie en niet de opgeslagen
orders, voorraad of interactie-events. Wisselen kan ook programmatisch:

```js
window.LEARNGameOMSimulator.setLogisticsOrganizationVariant("functional");
window.LEARNGameOMSimulator.setLogisticsOrganizationVariant("product");
```

De vaste isometrische projectie is:

```js
screenX = originX + (gridX - gridY) * tileWidth / 2;
screenY = originY + (gridX + gridY) * tileHeight / 2 - elevation;
```

Een afdeling wordt toegevoegd door een definitie aan
`ISOMETRIC_DEPARTMENT_DEFINITIONS` en eventueel een verbinding aan
`ISOMETRIC_DEPARTMENT_CONNECTIONS` toe te voegen. De Game Master kan zichtbare
afdelingen tijdens runtime instellen:

```js
window.LEARNGameOMSimulator.setVisibleLogisticsDepartments([
  "inbound",
  "production_1",
  "quality",
  "dispatch"
]);
```

De actuele afdelingsprojectie, inclusief status, voorraden en orders, is
beschikbaar via:

```js
window.LEARNGameOMSimulator.getLogisticsDepartments();
```

De view is rechtstreeks te openen via:

```text
http://127.0.0.1:4173/#isometricLogistics
```

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
