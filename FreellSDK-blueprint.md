# FreellSDK — Blauwdruk (Shadow DOM component host)

Ontwerpdocument. Nog geen code gewijzigd. Doel: het lego-cluster
(`lego-builder.js`, `lego-tower-renderer.js`, `tower-editor.js`) omvormen tot
een ingekapselde FreellSDK-component, als eerste bouwsteen van een echte SDK.

---

## 1. Doel & principes

- **Eén global.** Alles hangt onder `window.FreellSDK`. Geen losse `LegoBuilder`,
  `LegoTowerRenderer`, `TowerEditor` meer in de globale ruimte.
- **Echte inkapseling via Shadow DOM.** De UI van een component leeft in een
  shadow root. Styling van de component botst niet met de pagina en de pagina
  kan de component niet per ongeluk overschrijven.
- **Geen prefix-drift.** Omdat CSS binnen de shadow root leeft, hoef je klassen
  niet meer defensief te prefixen. De scope beschermt je. De koppeling
  "klassenaam in JS-string ↔ klassenaam in style.css" verdwijnt als probleem.
- **Dunne frontend.** De pagina (bv. GitHub Pages) laadt de SDK en roept
  `FreellSDK.mount(...)` aan. Valt de SDK weg, dan toont de pagina een minimale
  fallback.
- **Testzwaartepunt naar pure logica.** Wat getest kan worden zonder browser
  (validatie, catalogus, state) wordt zuiver testbaar gemaakt; alleen render/klik
  test je met een echte browser.

---

## 2. Architectuur op hoofdlijnen

```
window.FreellSDK
├── version            "1.0.0"
├── mount(el, opts)    → maakt shadow root, injecteert CSS, rendert component
├── register(id, def)  → een component onder de SDK aanmelden
├── components         (register van gedefinieerde componenten, op id)
│   ├── "lego-builder"    (generator + logica + interactie)
│   ├── "lego-renderer"   (SVG-tekenlaag, puur)
│   └── "lego-editor"     (editor-UI)
└── internal (privé, niet op window)
```

Elke `mount()` doet drie dingen:

1. `el.attachShadow({ mode: "open" })` — een geïsoleerde DOM-boom.
2. De component-CSS in die shadow root zetten (zie §4).
3. De HTML/SVG van de component in de shadow root renderen en events koppelen.

Buiten de shadow root is niets van de interne opmaak zichtbaar of aanpasbaar,
behalve wat je bewust doorlaat via CSS-variabelen (§5).

---

## 2a. Naamgeving — SDK-prefix + component-prefix (twee niveaus)

De lego-bouwer is straks één van vele componenten. Zonder discipline krijg je
botsingen en onduidelijkheid ("wiens `reset` is dit?"). Regel: **elk publiek
ding draagt twee niveaus — het SDK-merk én de component-id.** Nooit een kaal
`reset` of `.panel` los in de wereld.

| Wat | Conventie | Voorbeeld (lego-bouwer) |
| --- | --- | --- |
| Component-id (de bron van waarheid) | kort, kebab-case, domein-gekwalificeerd | `lego-builder` |
| JS-toegang | `FreellSDK.components["<id>"]` | `FreellSDK.components["lego-builder"]` |
| Custom element / mount-tag | `freell-<id>` | `<freell-lego-builder>` |
| Events | `<id>:<event>` | `lego-builder:build_valid` |
| Publieke CSS-variabelen | `--fs-<id>-<naam>` | `--fs-lego-builder-accent` |
| CSS-bestand | `<id>.css` | `lego-builder.css` |
| Interne CSS-klassen | géén prefix nodig (shadow-scoped) | `.brick`, `.panel` |

Het domeinwoord (`lego-`) blijft dus deel van de component-id. Zo blijft het
helder als de SDK groeit: `lego-builder` naast een toekomstige `quiz-player` of
`chart-widget`, elk met eigen events (`quiz-player:answered`) en eigen
CSS-variabelen (`--fs-quiz-player-*`). De interne klassen binnen een component
hoeven niets te prefixen — de shadow root scheidt ze al.

---

## 3. Bestandsindeling

Voorstel — houd het klein en herkenbaar:

```
sdk/
├── freell-sdk.js          # de enige <script> die de pagina laadt (boot + namespace)
├── sdk.manifest.json      # ← bron van waarheid: alle component-id's → bestanden
├── components/
│   ├── lego-builder.js    # FreellSDK.register("lego-builder", …)
│   ├── lego-renderer.js
│   └── lego-editor.js
└── styles/
    ├── lego-builder.css    # component-CSS, in shadow root geïnjecteerd
    ├── lego-editor.css
    └── tokens.css          # gedeelde design-tokens (kleuren, spacing) als CSS-variabelen
```

**Het manifest is het scharnier.** Eén bestand somt op welke componenten er zijn
en uit welke bestanden ze bestaan:

```json
{ "components": {
    "lego-builder":  { "js": "components/lego-builder.js",  "css": "styles/lego-builder.css" },
    "lego-renderer": { "js": "components/lego-renderer.js" },
    "lego-editor":   { "js": "components/lego-editor.js",   "css": "styles/lego-editor.css" }
} }
```

`index.html`, `service-worker.js` (cachelijst) én de tests lezen straks allemaal
uit dit manifest in plaats van hard-gecodeerde bestandsnamen. Eén hernoeming =
één wijziging. Precies dit haalt het "overal namen bijwerken"-werk weg (zie §8).

Belangrijk: de CSS blíjft in `.css`-bestanden (leesbaar, cacheable). Ze worden
alleen niet meer globaal in `<head>` gezet, maar per component in de shadow root
geladen. Zo genereer je geen 161 KB CSS runtime uit JS — je verplaatst alleen
waar de bestaande CSS naartoe geladen wordt.

---

## 4. Hoe scoped CSS in de shadow root komt

Twee nette technieken; beide zonder de CSS in JS-strings te proppen:

**A. `adoptedStyleSheets` met `CSSStyleSheet` (voorkeur, modern).**
De component laadt zijn `.css` één keer op, bouwt er een `CSSStyleSheet` van, en
deelt dat blad tussen alle instanties. Efficiënt: het blad wordt één keer
geparsed, ook bij tien componenten op de pagina.

**B. `<style>` in de shadow root (eenvoudigst, breedste support).**
De component zet een `<style>`-element met de CSS-tekst bovenin de shadow root.
Simpel, iets meer geheugen bij veel instanties.

In beide gevallen: de selectors gelden alleen binnen die shadow root. `.brick`,
`.tower-row`, `.lego-builder-panel` hoeven dus niet hernoemd te worden — ze kunnen
zelfs kort en generiek blijven, want ze lekken niet meer.

---

## 5. Styling van buitenaf blijven toestaan

Volledige inkapseling betekent dat de pagina jouw component niet zomaar kan
restylen. Dat wil je meestal ook — maar je laat bewust een paar knoppen open via
**CSS custom properties**, want die dringen wél door de shadow-grens heen:

```css
/* in de host-pagina */
freell-lego { --fs-accent: #e11d48; --fs-radius: 12px; }
```

```css
/* binnen de component-CSS */
.brick { border-radius: var(--fs-radius, 8px); }
```

Zo bepaal jij als SDK-bouwer welke stijl-haakjes app-bouwers mogen bedienen. Dat
is precies het contract dat een SDK hoort te hebben: klein, expliciet, stabiel.

---

## 6. Publieke API (afgeleid van de huidige LegoBuilder)

De bestaande `LegoBuilder`-API is al bruikbaar als contract. Onder FreellSDK:

```js
const lego = FreellSDK.mount(el, { component: "lego-builder", productId: "A" });

lego.setProduct(id)
lego.registerProduct(def)      lego.unregisterProduct(id)
lego.startFreeBuild(id)
lego.prepareStockTutorial()    lego.setStockTutorialInventory(...)
lego.restartTutorial()         lego.skipTutorial()
lego.validateBuild()           // pure logica → los testbaar
lego.getCatalog()              lego.getSnapshot()
lego.reset()
lego.on(event, handler)        // events als "skip_lego_tutorial", "build_valid", …
```

De scheiding die je wilt: `validateBuild`, `getCatalog`, `getSnapshot` en de
tutorial-state zijn **pure functies over data** — die horen 100 % gedekt te
worden door unit-tests zonder browser. `mount`/render/klik is het enige dat een
echte browser (Playwright) nodig heeft.

---

## 7. Fallback / offline

De pagina blijft dun en expliciet:

```html
<div id="lego"><p class="offline">Onderdeel wordt geladen…</p></div>
<script src="https://backend/sdk/freell-sdk.js"></script>
<script>
  if (window.FreellSDK) {
    FreellSDK.mount(document.getElementById("lego"), { component: "lego-builder", productId: "A" });
  } // anders blijft de "wordt geladen / offline"-tekst staan
</script>
```

Geen SDK → de fallback-tekst in de host blijft simpelweg staan. Geen leeg scherm.

---

## 8. Testvangnet — vier lagen, elk met een eigen taak

Doel: één keer een test schrijven, daarna nooit meer hetzelfde met de hand
nacontroleren. Elke laag vangt een ander soort regressie.

### Laag 0 — Packaging/wiring (de bestaande Python-tests, hergebruikt)

`tests/test_product_package.py` bestaat al en checkt of scripts correct ingeladen
en gecachet zijn. **Gooi die niet weg — herpositioneer ze als packaging-laag.**
Ze testen geen gedrag, maar ze bewaken wél iets echts: dat de SDK-bundel goed is
aangesloten. Maak ze alleen *manifest-gedreven* in plaats van hard-gecodeerd,
zodat een hernoeming ze niet meer stuk maakt:

```python
# was: self.assertIn('src="character-generation.js"', html)  ← breekt bij elke rename
# wordt: itereren over sdk.manifest.json
import json
def test_alle_sdk_bestanden_zijn_ingeladen_en_gecachet():
    manifest = json.loads((ROOT / "sdk/sdk.manifest.json").read_text())
    html = (ROOT / "index.html").read_text()
    sw   = (ROOT / "service-worker.js").read_text()
    for comp in manifest["components"].values():
        for path in filter(None, [comp.get("js"), comp.get("css")]):
            assert path in html or "freell-sdk.js" in html  # component óf de bundel
            assert path in sw                                # staat in de cachelijst
```

Nu volgt de test automatisch elke rename mee. Dit is precies je "hoe hergebruik
ik de bestaande regressietests": je behoudt de intentie, maakt ze data-gedreven,
en ze worden onderdeel van het nieuwe geheel in plaats van blokkade.

### Laag 1 — Unit (pure logica, zonder browser)

Test `validateBuild`, `getCatalog`, `getSnapshot`, tutorial-stappen en
state-overgangen op vaste input → vaste output. Groot en snel (milliseconden).
Node/Vitest. Dit is waar je de meeste dekking goedkoop haalt.

### Laag 2 — Contract (klassen & events)

Eén test die faalt zodra een component een klassenaam of event uitspuugt die niet
in zijn CSS/contract staat. Vangt stille JS↔CSS-drift af en houdt de
event-namen (`lego-builder:build_valid`) stabiel.

### Laag 3 — Visual regression (Playwright screenshot-vergelijking)

Dit is de laag die je pijn wegneemt: **de computer vergelijkt de nieuwe render
pixel-voor-pixel met een goedgekeurde baseline en faalt alleen als er echt iets
verandert.** Je test dus niet meer met de hand of "de toren er nog goed uitziet".

Hoe het werkt:

1. **Harness-pagina per componenttoestand.** Maak kleine, statische pagina's die
   één component in één vaste toestand mounten — niet de hele app. Bijv.
   `harness/lego-builder--toren-A.html`, `…--tutorial-stap-2.html`,
   `…--offline.html`. Deze dubbelen als levende documentatie (§ dit vervangt
   handmatig "klik-en-kijk").
2. **`toHaveScreenshot()` van de Playwright Test-runner.** Eerste run maakt de
   baseline-PNG's aan; latere runs diffen ertegen en genereren bij verschil een
   diff-afbeelding in het HTML-rapport. Baselines commit je in de repo.
3. **Bewuste wijziging? `--update-snapshots`.** Verander je een component met
   opzet, dan keur je de nieuwe baseline in één commando goed en review je de
   diff. Ongewenste verandering = rode test, met plaatje erbij.

**Determinisme is hier alles** (anders krijg je flaky screenshots):

- Zet animaties/transities uit in testmodus (`prefers-reduced-motion` of een
  injected `* { animation: none !important; transition: none !important; }`).
- Vaste viewport, vaste fonts (wacht op `document.fonts.ready`).
- **Seed alle randomizers.** Deze repo heeft bewust randomizers (logistics-engine,
  agent-simulatie). Geef de SDK een testmodus met vaste seed, en bevries datum/tijd,
  anders verschilt elke render.
- Eén browser vastpinnen (Playwrights gebundelde Chromium) en een kleine
  tolerantie (`maxDiffPixels`) voor anti-aliasing-ruis tussen machines.

### Eerlijk over de taalkeuze voor visual regression

Je wilde testen zoveel mogelijk in Python houden. Voor lagen 0 en 1 is dat prima.
Maar voor visual regression is de **Node Playwright Test-runner** duidelijk
volwassener dan de Python-variant: automatische baselines, diff-rapport,
ingebouwde retry tegen flakiness. Python's `page.screenshot()` kan het ook, maar
dan bouw je de baseline/diff-machinerie zelf. Advies: laat lagen 2–3 (de
browser-lagen) in een kleine Node/Playwright-map náást de SDK draaien die hij
test; houd lagen 0–1 waar je wilt. Dat is geen "alles in twee talen" — het is het
juiste gereedschap voor precies de laag die het nodig heeft.

### Volgorde

Eerst laag 1 (unit) groen op de **huidige** code, dán migreren. Laag 3 (baselines)
leg je vast op de huidige, werkende render — die baseline is je bewijs dat de
migratie het uiterlijk niet stiekem verandert.

---

## 9. Migratiepad (strangler, verticaal per component)

Klein en omkeerbaar, één component tegelijk:

1. **`lego-renderer` eerst** — het is de puurste laag (SVG-tekenen, geen state),
   maar let op: **gedeeld** met `isometric-logistics-view.js` (48 verwijzingen).
   Verplaats het achter `FreellSDK.components["lego-renderer"]` en laat een dunne
   alias `window.LegoTowerRenderer` er tijdelijk naar wijzen, zodat de isometric
   view blijft werken tijdens de overgang.
2. **`lego-editor`** — geïsoleerd, weinig consumenten. Om te zetten naar shadow
   root met eigen CSS.
3. **`lego-builder`** — laatst, want die leunt op de renderer. Mount-API +
   shadow root + eigen CSS. Verwijder daarna de tijdelijke alias uit stap 1.
4. **Opruimen** — `window.*`-aliassen weg; `index.html`, `service-worker.js` én
   de Python-tests lezen voortaan uit `sdk.manifest.json` (§3, §8-laag 0).

Baseline-screenshots (§8-laag 3) leg je vóór stap 1 vast, zodat elke stap
bewijsbaar het uiterlijk niet verandert.

Op elk tussenpunt draait de app. Nooit meer dan één component "open".

---

## 10. Repo-specifieke aandachtspunten

- **Gedeelde renderer.** `LegoTowerRenderer` wordt óók door
  `isometric-logistics-view.js` gebruikt. Migreer die niet stil weg zonder alias,
  anders breekt de isometrische weergave. Dit is het grootste koppelpunt.
- **Service worker.** `service-worker.js` cachet expliciete bestandsnamen. Nieuwe
  of hernoemde SDK-bestanden moeten in de cachelijst, anders krijgen gebruikers
  oude versies of missende assets. Denk aan cache-busting/versienummer.
- **Python-tests pinnen bestandsnamen.** `tests/test_product_package.py` doet o.a.
  `assertIn('src="character-creation.js"', html)` en checkt de service-worker-cache.
  Herpositioneer ze als manifest-gedreven packaging-laag (§8-laag 0), dan breken
  ze niet meer bij elke rename maar volgen ze mee.
- **Randomizers = flaky screenshots.** De logistics-engine en agent-simulatie
  gebruiken bewust randomness. Zonder vaste seed + bevroren tijd verschilt elke
  render en faalt visual regression ten onrechte. Geef de SDK een testmodus met
  seed vóór je laag 3 opzet (§8).
- **Grote `style.css` (161 KB).** Alleen het lego-deel (~147 selectors rond
  `lego`/`tower`/`brick`) hoort naar de component-CSS. Laat de rest met rust.
- **`script.js` (213 KB).** Grote centrale file; controleer per stap welke
  lego-aanroepen daar zitten voordat je een namespace hernoemt.

---

## Samenvatting

FreellSDK wordt één global die componenten in een Shadow DOM mount en hun CSS
scoped meelevert. Dat maakt de prefix-vraag overbodig (scope i.p.v. prefix),
haalt de JS↔CSS-driftfout weg, en geeft je een klein, expliciet stijl-contract
via CSS-variabelen. De migratie loopt verticaal per component, met de gedeelde
`TowerRenderer` als grootste opgelet-punt en een unit-testvangnet dat je vóór de
verplaatsing legt.
