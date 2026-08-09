# LEARNGame Operations Management

Deze zelfstandige repository bevat de eerste digital twin van de LEARNGame
Operations Management / Legostiek Management als leerbox-proefopstelling. De
runtime ondersteunt zowel de productgerichte parallelle route als de
functionele sequentiële productieketen uit het bronarchief.

De browserruntime heeft geen backend- of buildafhankelijkheden. `product.json`
beschrijft wat bij dit product hoort en welke hostkoppelingen bij afsplitsing
door een adapter of deploymentconfiguratie moeten worden overgenomen.

## Plaats in het Leerpret-repositorylandschap

De normale lokale opstelling bestaat uit drie zelfstandige Git-repository's:

```text
D:\repos\
├── Leerpret\
├── LeerpretEngine\
├── LeerboxEditor\
└── Learngame Operations Management\
```

- `Leerpret` bezit artikelen, onderzoek, generieke leerboxbronnen, het
  canonieke publieke interactiecontract en de dashboardfrontend.
- `LeerpretEngine` bezit FastAPI, authenticatie, gamesessies, profielopslag,
  telemetry, actieverwerking, scoring en simulatie.
- `LeerboxEditor` bezit de zelfstandige statische editor voor
  leerbox-captures.
- deze repository bezit de productspecifieke browsergame, PWA-assets, lokale
  fixtures en producttests.

Er is geen Git-submodule en broncode wordt niet automatisch tussen deze
repository's gekopieerd. Deze game communiceert met LeerpretEngine via
publieke HTTP-routes en versieerbare contractevents. De lokale contractkopieën
onder `contracts/` maken zelfstandige validatie en offline ontwikkeling
mogelijk; de canonieke taalneutrale bron staat in `Leerpret/contracts/`. Een
contractwijziging moet bewust in alle consumers worden doorgevoerd en getest.

LeerpretEngine vindt deze repository via `LEARNGAME_OM_DIR` of standaard als
buurmap `../Learngame Operations Management`. De Engine kan de game daardoor
zonder kopie mounten op:

```text
/tools/leerbox/learngame-operations-management/
```

Standalone draait de game normaal op poort `47113` en gebruikt zij
LeerpretEngine op poort `47111`. De statische spelkern blijft zonder backend
bruikbaar; authenticatie, gedeelde sessies, duurzame profielopslag en
servertelemetry vereisen de Engine.

## Character Creation en gedragsscan

Na het aanmelden doorloopt de speler eerst een gamified point-buy-wizard:

1. een korte uitleg: de gedragsstijltest helpt de game een passende rol kiezen;
2. Basic Style Scan met 10 categorieën;
3. Response Style Scan met 10 categorieën;
4. daarna pas de bestaande self-starting bouwtutorial.

De wizard vraagt geen naam, e-mailadres, geslacht of profielfoto. Het
gedragsprofiel wordt uitsluitend gekoppeld aan de pseudonieme, leerboxgebonden
sessie.

Elke categorie bevat vier gedragskenmerken. De speler moet exact 20 punten
verdelen, met 0 tot en met 10 punten per kenmerk. Een volgende categorie blijft
vergrendeld totdat de actieve categorie klopt. De radarvisualisatie is een live
preview, geen testuitslag.

De brondocumenten gebruiken niet dezelfde scoringsrichting: in
`Behavior Basic style.pdf` gaan de meeste punten naar het kenmerk dat het minst
past; in `Behavior Response style.pdf` gaan de meeste punten naar het kenmerk
dat onder druk het best past. De wizard vermeldt dit per fase.

Voor het opslaan voert de game een terughoudende statistische
plausibiliteitscontrole uit. Zij signaleert alleen zeer sterke patronen:
vrijwel overal gelijke punten of bijna identieke Basis- en Responsstijlscans,
terwijl hoge punten in die scans juist een tegengestelde betekenis hebben. In
dat geval legt de game vriendelijk uit dat de antwoorden te weinig onderscheid
geven voor een passende rol en vraagt zij beide scans opnieuw in te vullen. Dit
is nadrukkelijk geen psychologische beoordeling of leugendetector.

De game meet daarnaast de actieve invultijd per categorie. Zeer snel invullen
blokkeert de speler niet automatisch, maar verlaagt de betrouwbaarheid van de
rolmatch. Na de twintig categorieën verschijnt een overzichtstabel waarin alle
waarden nog aangepast kunnen worden. Daarna toont de game het herkenbare
archetype, de best passende operationele rol, alternatieve matchpercentages en
de betrouwbaarheid. Het pseudonieme resultaat kan rechtstreeks als PDF worden
gedownload.

Na beide scans verstuurt de game het profiel met de beperkte LO-gamesessie naar:

```text
POST /api/v1/player/behavior-profile
```

De Leerpret-backend valideert de volledige 0–10/20-puntenverdeling opnieuw en
slaat het profiel op onder een gehashte, niet-raadbare profiel-id. Zonder een
geldige `learner`-sessie voor `learngame-operations-management` antwoordt de
route met `401`. Bij een volgende aanmelding vraagt de game dit accountprofiel
eerst op en slaat de wizard automatisch over wanneer het al bestaat. Via
`Karakter aanpassen` kan de speler het bestaande profiel bewust opnieuw openen
en onder hetzelfde account overschrijven.

## Aanmelden via Leerpret

De standalone LO-game toont rechtstreeks Google Sign-In en gebruikt bewust
niet de engine-sessie:

1. de game controleert `GET /api/auth/leerbox/session` met
   `credentials: include`;
2. wanneer de game vanuit een reeds aangemelde Leerpret-frontend is geopend,
   wisselt zij die aanmelding stil in voor een beperkte LO-sessie;
3. een standalone bezoeker meldt zich in de game zelf aan via een
   authorization-codeflow met uitsluitend de scope `openid`; Google deelt
   daardoor geen naam, e-mailadres of profielfoto met Leerpret;
4. de backend maakt van Googles vaste accountcode direct een
   Leerpret-specifiek pseudoniem en verwijdert de tijdelijke Google-tokens;
5. afmelden loopt via `POST /api/auth/leerbox/logout`.

De speler vult in de LO-game dus geen organisatie of API-sleutel in. De
beperkte sessie bevat standaard alleen `learner` (`Lerende`).
`attraction` (`Leerattractie`) wordt alleen geaccepteerd wanneer de backend
dat recht in de getekende sessie heeft opgenomen. Deze cookie wordt niet door
de engine-, architect- of technologieroutes als autorisatie geaccepteerd.

De game leest de lokale adressen uit `LEERPRET_API_URL` en
`LEARNGAME_OM_URL`. Voor GitHub Pages gebruikt de generator afzonderlijk
`LEERPRET_PRODUCTION_API_URL` en `LEARNGAME_OM_PRODUCTION_URL`.
`runtime-config.js` kiest op basis van de browserhost de lokale of
productie-adressen en valt nooit terug op een tijdelijke tunnel of andere
poort. De GitHub Actions-preview draait herkenbaar op poort `47913` en gebruikt
de productie-Engine; de normale lokale app op `47113` gebruikt de lokale Engine
op `47111`. Een tijdelijke centrale service kan voor een testsessie via `?api=...`
worden gekozen. De Leerpret-backend
moet voor een afzonderlijke oorsprong die oorsprong opnemen in
`LEERPRET_CORS_ORIGINS`. De minimale Google-aanmelding vereist daarnaast
`GOOGLE_OAUTH_CLIENT_ID` en `GOOGLE_OAUTH_CLIENT_SECRET` op de backend en de
oorsprong van de standalone game als Authorized JavaScript origin in Google
Cloud. Het client secret hoort uitsluitend in de genegeerde
`LeerpretEngine/.env`.

## Uitgangspunten

- Een basisgame met configuraties in plaats van losse spelversies.
- Fysiek en digitaal horen bij elkaar: dezelfde spelkern moet later naar een webinterface, IoT-opstelling of adapter zoals Minecraft kunnen worden gekoppeld.
- De interface is een meetopstelling, geen eindgame. Zij maakt de logistieke stroom zichtbaar en schrijft kale interactie-events weg.
- Rollen, voorraad, productie, verkoop, geldstromen, winst/verlies, opportunity costs, rolvrijheid en het aantal torensoorten zijn instelbaar.

## Spelersview en beheerdersview

De runtime heeft twee afzonderlijke werkoppervlakken op dezelfde game-state:

- `Speler` toont alleen het actuele rolgebonden formulier. De digitale
  formulieren zijn afgeleid van de orderbegeleidings-, productie-, inkoop- en
  registratieformulieren uit de oorspronkelijke spelhandleidingen.
- `Beheer` bevat de volledige cockpit met orderinvoer, instellingen, voorraad,
  events en de verschillende procesweergaven.

De schakelaar bovenin maakt het tijdens de ontwikkeling mogelijk om direct
tussen beide perspectieven te springen. Tijdens de self-starting tutorial is
de schakelaar verborgen. Na een bevestigde formulierhandeling gaat de
Spelersview automatisch naar de isometrische systeemsimulatie. Alleen wanneer
de volgende processtap bij de toegewezen rol hoort, verschijnt opnieuw een
formulier.

De visuele basistokens komen, wanneer beschikbaar, uit:

```text
GET /api/ui/theme-tokens?surface=learngame-om
```

`leerpret-theme.js` vertaalt dat contract naar lokale CSS-variabelen. Dezelfde
waarden zijn als offline fallback meegebouwd, zodat de standalone game niet
afhankelijk wordt van de bereikbaarheid van de Leerpret-backend. LEGO-kleuren
en afdelingskleuren blijven producteigen tokens.

## Wachttijd is kijktijd

Na het verwerken van een digitaal formulier schakelt de vrije game kort
automatisch naar het isometrische systeemperspectief. De speler ziet dan de
volledige goederen- en informatiestroom. Zodra de volgende processtap klaarstaat,
verschijnt een attentie-alert met rol, formulierhandeling en processtap en keert
de interface terug naar het werkperspectief. Beide wisselingen worden als kale
interactie-events vastgelegd.

De game gebruikt een gedeelde, servergestuurde multiplayerlobby. Een Game
Master maakt uitsluitend vanuit `Beheer > Gamesessie` een gesloten, open of
semi-gesloten sessie aan en deelt de unieke gamecode. Spelers kunnen met een
code deelnemen; open sessies met vrije plaatsen worden tevens in de
spelersweergave aangeboden. Alleen wanneer geen open plek beschikbaar is,
verschijnt `Vrije game starten`. De speler wordt dan automatisch Game Master
van de nieuwe sessie.

Wanneer rollen onbezet zijn, kan iedere aanwezige speler een startverzoek doen.
Alle reeds aanwezige spelers kiezen vervolgens unaniem tussen wachten en
starten met gesimuleerde agents. Eén wachtstem wijst het verzoek af. Pas wanneer
iedereen instemt, vult de backend alle resterende rollen met virtuele agents en
gaat de sessiestatus naar `running`. De gedeelde toestand volgt
`contracts/game-session-consensus-v1.schema.json`.

Iedere gamesessie bewaart daarnaast een eigen moeilijkheidsgraad. De Game
Master kiest in de lobby `Makkelijk`, `Gemiddeld` of `Moeilijk`. De preset
stuurt de aanvraagfrequentie, incidentkans en spreiding in reactietijden van
de lokale agents. Op `Moeilijk` voegt de engine ook expliciete dataruis toe,
zoals typefouten en onderschepte verkeerde leveringen. Na de sessiestart staat
de keuze vast.

## Menselijker agentgedrag zonder LLM

Bij het gametype `Entrepreneurial Game` gebruikt de lokale simulatie
geaggregeerde timingpatronen uit 7.170 historische transacties, verdeeld over
53 gespeelde games. Hieruit zijn 695 bruikbare spelersreeksen samengevat per
rolfamilie: leverancier, producent en handelaar.

Iedere virtuele rol krijgt bij de start willekeurig een gewogen profiel
`Proactief`, `Gestaag` of `Bedachtzaam`. Dat profiel varieert lokaal:

- verwerkingstempo en overdrachtstempo;
- de kans op een korte actieburst;
- incidentele langere aarzel- of wachtpauzes;
- de activiteit in de vroege, middelste en late spelfase.

De afgeleide bestanden staan in `data/agent-behavior/`. Ze bevatten geen
e-mailadressen, gamecodes of individuele tijdlijnen. De dataset schrijft geen
foutkansen, persoonlijkheid of productvoorkeuren aan historische spelers toe,
omdat de transactiedump daarvoor geen betrouwbare basis biedt. De LO Game
1–7-presets blijven de bestaande vaste simulatietiming gebruiken.

De patronen kunnen reproduceerbaar opnieuw worden gebouwd met:

```powershell
python scripts\build_entrepreneurship_agent_patterns.py
```

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
python -m http.server 47113
```

Open daarna:

```text
http://127.0.0.1:47113/
```

De service worker gebruikt een network-first strategie: bij verbinding wordt de nieuwste versie van de server opgehaald, terwijl eerder bezochte bestanden als fallback beschikbaar blijven.

## Visuele controle met Playwright

Deze repository heeft eigen Playwright-tests en een eigen
`@playwright/test`-ontwikkelafhankelijkheid. De Chromiumbinary staat volgens
de Playwright-conventie buiten de repository in de gedeelde gebruikerscache
`%LOCALAPPDATA%\ms-playwright`. Andere Leerpret-repository's worden niet
aangepast en kunnen dezelfde browserbinary later hergebruiken. Playwright leest
`LEARNGAME_OM_URL` uit `.env`, start de statische server zo nodig op die vaste
URL en wijkt niet naar een andere poort uit.

Eenmalig op een nieuwe werkplek:

```powershell
npm install
npx playwright install chromium
```

### Werkafspraak: volledige suite alleen in GitHub Actions

Voer de volledige desktop- en mobiele Playwright-suite niet standaard lokaal
uit. Deze suite duurt relatief lang en hoort bij de handmatig gestarte
GitHub Actions-workflow `Playwright Acceptatietests`:

1. open op GitHub het tabblad **Actions**;
2. kies **Playwright Acceptatietests**;
3. kies **Run workflow** en de gewenste branch.

De workflow gebruikt uitsluitend `workflow_dispatch` en start dus niet
automatisch bij iedere push. Lokaal mogen wel snelle syntax- en unitcontroles
worden uitgevoerd. Draai een afzonderlijke Playwright-specificatie alleen
wanneer iemand daar expliciet om vraagt.

De workflow bewaart bij een mislukte test het Playwright-rapport en de
`test-results/` als artifact, inclusief beschikbare trace, video en
foutafbeelding.

Binnen het Leerpret-dashboard blijft de bestaande compatibiliteits-URL werken:

```text
/tools/leerbox/learngame-operations-management/
```

Leerpret vindt deze repository via `LEARNGAME_OM_DIR`. Als beide repositories
naast elkaar onder dezelfde bovenliggende map staan, werkt ook automatisch
`../Learngame Operations Management`.

## Productieroutes en financiële weergave

`logistics-process.js` is de canonieke matrix voor de productieroute:

| Preset | Productieroute |
| --- | --- |
| LO Game 1 | sequentieel |
| LO Game 2 | sequentieel |
| LO Game 3 | parallel |
| LO Game 4 | parallel |
| LO Game 5 | sequentieel |
| LO Game 6 | sequentieel |
| LO Game 7 | sequentieel |
| Tutorial | parallel |

In de parallelle route ontvangt Productie A, B of C de volledige materiaalset
en bouwt die afdeling zelfstandig een compleet product. De tutorial gebruikt
daarom exact deze goederenstroom:

```text
Magazijn Grondstoffen
  -> Productieafdeling B
  -> Magazijn Gereed Product
  -> Expeditie
```

In de sequentiële route gaat ieder product achtereenvolgens door
Productieafdeling 1, tussenvoorraad SS1, Productieafdeling 2, tussenvoorraad
SS2 en Productieafdeling 3. De voortgang en het onderhanden werk worden daarbij
per laag bijgehouden.

Het financiële overzicht toont in beide routes een balans, een
winst-en-verliesrekening en de voorraadstanden. Parallelle productie wordt
uitgesplitst per Productie A/B/C met materiaal, conversiekosten, onderhanden
werk, gereed product, omzet en opportunity costs. Sequentiële productie wordt
uitgesplitst per laag/productiestap met materiaalverbruik, conversiekosten en
cumulatief onderhanden werk.

De instellingen gebruiken twee vinkjes. Parallel en sequentieel mogen tegelijk
actief zijn; dit is een hybride, zelf te benoemen configuratie en geen
meegeleverde preset. Elke wijziging wordt met bestaande presets vergeleken. Bij
een exacte match springt de gametypekeuze naar die preset; bij een unieke
combinatie kan de Game Master de configuratie als nieuwe preset opslaan.

Onder **Beheer → Gamesessie → Spelvariant en spelregels** staan twee
vergelijkingsmatrices voor Games 1–7.
De eerste toont iedere actuele speloptie, waaronder productieroutes en de
kleurrechten per laag. De tweede toont alle rollen, waaronder Leverancier en
Transporteur. Beide matrices worden automatisch uit dezelfde ingebouwde
presetdata opgebouwd en zijn daardoor geen afzonderlijk handmatig overzicht.

**Gamesessie** is de eerste en standaard actieve beheertab. De voormalige
aparte tab **Spelkern** is hierin samengevoegd; de order- en informatiestroom
blijft daardoor binnen dezelfde gamesessiecontext beschikbaar.
Wisselen tussen Speler en Beheer gebeurt uitsluitend via de schakelaar boven
in de applicatie; het voormalige dubbele perspectiefblok in het zijmenu is
verwijderd.

## Wat de proefopstelling nu doet

- starten bij `Klant 1` met de echte ICG2-handeling `Ik wil een order plaatsen`;
- een gametype kiezen uit `Entrepreneurial Game` en `LO Game 1` tot en met `LO Game 7`, waarna de bijbehorende spelinstellingen als aanpasbare preset worden ingevuld;
- orders aanmaken voor een configureerbare catalogus van 1 tot 9 torensoorten, standaard met het ICG2-v2 voorbeeld `3 torens` en `7 minuten`;
- na de sessiestart een volledig lokale logistieke game-engine draaien met de
  rolstates `IDLE`, `PROCESSING`, `WAITING_FOR_NEXT` en `AWAITING_PLAYER`;
- de gekozen spelersrol handmatig laten handelen in een tweedelig
  orderformulier/actiepaneel, terwijl de zes overige rollen door vaste
  state-machines worden verwerkt;
- bij wachttijd een live fabrieksoverzicht tonen met orderoverdrachten,
  afdelingsstatussen, Peak Flow, kwaliteitsfouten en materiaalvertragingen;
- de gekozen order direct als LEGO-torenpreview zien, inclusief aantal en orderwaarde;
- vóór het vrije spel een interactieve bouwtutorial doorlopen en daarna Toren B
  volgens de parallelle goederenstroom volledig in Productieafdeling B bouwen;
- LEGO-blokken uit het bestaande SVG-palet aanklikken of slepen, 90 graden
  draaien en in een isometrische 3D-view op een groene 6x6-grondplaat laten
  vastklikken;
- alleen op een volledig ondersteund, vlak oppervlak bouwen en een levering
  op kleur, afmeting, laag en positie laten controleren;
- na de tutorial klantorders voor Toren A, B en C bouwen volgens de
  bijgeleverde productafbeeldingen;
- vaste of vrije verkoopprijs gebruiken en het aantal verschillende LEGO-torens aanpassen;
- de order automatisch door de parallelle of sequentiële route van de gekozen
  gamepreset laten lopen;
- grondstoffen inkopen met de prijzen uit het inkoopformulier;
- materiaaltekorten blokkeren en daarna herstelacties registreren;
- afhankelijk van de preset één volledige parallelle bouwroute of drie
  opeenvolgende productiestappen per order simuleren;
- het eerste conceptschema als orderproces met datamodelobjecten bekijken via de knop `Orderproces`;
- binnen die weergave wisselen tussen `Procesgraph` per afdeling, `Sequentie` als slingerend links-rechts/rechts-links orderpad en `Afdelingsroute` als sequentieel pad binnen vaste afdelingsbanen;
- via `Isometrische kaart` de fysieke indeling als aanklikbare SVG-zones
  bekijken: Magazijn Grondstoffen, Productieafdeling A, B en C,
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
- `lego-tower-renderer.js` bevat de vaste en geanimeerde isometrische
  LEGO-torenrenderer voor de vaste 6x6-grondplaat, instelbare
  grondplaatkleuren en 2x4- en 2x2-blokken;
- `tower-editor.js` laat de Game Master naast de torenlagen ook de kleur van
  de vaste 6x6-grondplaat kiezen. De keuze wordt in `groundPlate.color`
  opgeslagen en in previews, klantorders en de bouwmodule hergebruikt;
- `lego-builder.js` bevat de tutorialstate, het herbruikte blokkenpalet,
  klik/drag-and-drop, grid-snapping, steuncontrole en levervalidatie;
- `index.html` bevat alleen de statische werkbank;
- `style.css` maakt de orderstroom, voorraad en torens visueel inspecteerbaar.

De volgende logische stap is een adapterlaag naar de simulator, vergelijkbaar met het profiel `phile`, zodat LEARNGame-events expliciet naar de vijf markers `(T, A, V, R, S)` kunnen worden vertaald.

LO Game 6 heeft in **Beheer → Gamesessie → Spelvariant en spelregels** als
unieke preset `Meerdere kleuren` ingeschakeld. Daaronder staan afzonderlijke
vinkjes voor Grondplaat en laag 1, 2 en 3. Alleen
vrijgegeven lagen mogen in de toreneditor een afwijkende kleur krijgen; overige
lagen vallen terug op klassiek groen, geel, rood en wit. Dezelfde instelling kan
voor een aangepaste game worden aan- of uitgezet en als eigen preset worden
opgeslagen.

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

De animatie heeft alleen de blokvolgorde nodig. Bijvoorbeeld
`LegoTowerRenderer.renderAnimated(["yellow_8", "yellow_8", "red_8", "white_4"])`
tekent en animeert Toren A. De renderer leidt plaats, oriëntatie, hoogte,
valtijd en schaduw zelf af. Dezelfde compacte invoer wordt gebruikt voor
Toren B in de magazijn- en logistieke tutorial.

Na deze bedieningsoefening verschijnt een nieuwe klantbestelling voor Toren B,
maar het blokkenpalet is leeg. Via `Ga naar de magazijnen` opent Stap 2,
`Magazijn & Voorraad`. De speler haalt in de isometrische logistieke kaart
twee blauwe 2x4-blokken uit Magazijn A, één geel 2x2-blok uit Magazijn B en
één groen 2x2-blok uit Magazijn C. De magazijnen hebben een open dak met een
zichtbaar ophaalvak. Daarin liggen kleine, isometrische LEGO-blokken in meerdere
kleuren en formaten: per magazijn één benodigd type tussen drie of vier
afleiders. De speler moet kleur en aantal noppen vergelijken en de juiste
blokken naar het ontvangstvak van de Bouwafdeling slepen. Een verkeerd type
wordt geweigerd en teruggelegd. Een juist blok verdwijnt
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
ontvangstbadge neemt toe van nul naar één. Na de bevestigde ontvangst start
Stap 4.

Stap 4, `Financieel & Transactie`, herhaalt de orderoverdracht vanuit financieel
perspectief. De speler sleept de onderdelen uit het open Magazijn naar Gereed
Product. Tussen de vier benodigde onderdelen liggen vier afleiders die niet op
de stuklijst van Toren B staan. Ze kunnen worden versleept, maar worden
geweigerd en niet financieel geboekt. Iedere juiste materiaaluitgifte boekt de
actuele onderdeelprijs af en toont
een rode min-mutatie bij het magazijn. Zodra de materiaalset compleet is,
verschijnt Toren B. De speler sleept die naar Expeditie; daar wordt de actuele
verkoopprijs bijgeschreven met een groene plus-mutatie. Een zwevende
saldo-indicator reageert rood of groen en het afsluitende overzicht toont
inkoopkosten, verkoopopbrengst en marge. De bedragen en de aan/uit-status van
geld komen uit de bestaande Game Master-state en product-/onderdeelcatalogus.
Met `Naar Stap 5` verlaat de speler de begeleide route en begint de vrije game
als meesterproef.

Na het aanmelden staat de applicatie in tutorial-focusmodus: alleen de actieve
bouwoefening of logistieke kaart is zichtbaar. De orderstroom, instellingen,
voorraadpanelen en meetlog blijven verborgen om rust te bewaren. Met
het sluitpictogram kan de speler vanuit iedere stap de tutorial pauzeren en
direct naar de volledige applicatie gaan. `Tutorial hervatten` opent exact de
bouw- of logistieke stap waar de speler stopte. Na volledige afronding verandert
de knop in `Tutorial opnieuw` en begint de route weer bij Stap 1. De visuele
logistieke stappen gebruiken geen detailpaneel of
afdelingsondertitels. Alleen de financiële stap toont de expliciete opdracht en
het compacte transactieresultaat dat voor het leerdoel nodig is.

Stap 2 is tijdens ontwikkeling rechtstreeks te openen via:

```text
http://127.0.0.1:47113/#tutorialStep2
```

Stap 4 heeft voor gerichte ontwikkeling dezelfde directe route:

```text
http://127.0.0.1:47113/#tutorialStep4
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
http://127.0.0.1:47113/#isometricLogistics
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
