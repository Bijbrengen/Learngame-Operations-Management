# Isometrische historische pariteitspoort

Deze poort vergelijkt de renderer uit Git-commit
`440ee20ee3224eba3dba1cb70346a6af75374f55` rechtstreeks met de actuele
werkboom. De historische renderer-, materiaalwagenprofiel- en CSS-bronnen
worden met `git show` gelezen en pas gebruikt nadat bytegrootte en SHA-256
overeenkomen met `isometric-history-provenance.json`. Er staat dus geen handmatig gekopieerde
"oude" productcode in de testmap.

Het scenario voert in twee door een volledige navigatie geïsoleerde
Chromium-documenten op hetzelfde renderoppervlak dezelfde echte acties uit:
een afdeling aanklikken, een materiaalwagen met Enter oppakken, annuleren
met Escape, via het toetsenbord afleveren, resetten en met de muis slepen en
afleveren. Op elk controlepunt moeten gelijk zijn:

- geserialiseerde DOM en relevante CSSOM-regels;
- computed styles, inclusief aanwezige pseudo-elementen;
- op 1/64 pixel gekwantiseerde element- en SVG-geometrie, SVG-attributen,
  matrices, bounding boxes en padlengtes;
- interactiestatus en focus;
- de gedecodeerde RGBA/RGB-pixelbuffer van de kaart (nul pixels buiten de
  expliciet begrensde compositor-kanaalruis toegestaan).

CSS-transities en -animaties staan uit en de SVG/SMIL-tijdlijn wordt bij ieder
controlepunt op tijdstip nul bevroren. Zo vergelijkt de poort dezelfde visuele
frame in plaats van twee toevallig verschillende animatiemomenten.
Voor de pixelscreenshot worden SVG-timingnodes bovendien tijdelijk losgenomen
en meteen op hun oorspronkelijke DOM-index teruggezet. Hun volledige markup
blijft onderdeel van de vooraf vastgelegde exacte SVG-fingerprint; de screenshot
meet bewust het deterministische basisframe.
Eén renderoppervlak voorkomt bovendien compositor-kleurafronding tussen twee
tabs; JavaScript-globals worden door de tussentijdse navigatie wel volledig
opnieuw opgebouwd.
Het aparte `playwright.parity.config.cjs`-project gebruikt softwarematige
rasterisatie en een vast sRGB-profiel. Daardoor blijft ook de gedecodeerde
gradientpixelbuffer reproduceerbaar zonder de instellingen van de gewone
acceptatietests te veranderen.
Chromium kan na SVG-filtering bij kleurconversie nog enkele kanaalwaarden
afronden; ook Chromiums eigen screenshot-sync-tests hanteren daarvoor een
kanaaltolerantie. Het contract begrenst die ruis op zes waarden per kanaal
(de gemeten bovengrens na deterministische SMIL-normalisatie) en
staat daarbuiten exact nul afwijkende pixels toe. Omdat markup, CSS, SVG en
geometrie daarnaast exact gelijk moeten zijn, kan deze tolerantie geen
positionele of stijlafwijking verhullen.

Beide pagina's laden binnen een run exact hetzelfde actuele Engine-manifest.
Dat is een bewuste isolatiegrens: deze poort bewaakt de expliciet geaccepteerde
LOM-output en bewijst bij volgende consumentmigraties dat die output niet
verandert; hij vergelijkt geen oude Engine-deployment met een nieuwe.
Manifestversie en -hash worden wel in de testruntime vastgelegd. Een aparte
Engine-contracttest blijft nodig voor wijzigingen binnen de SDK zelf.

Direct na een expliciet beoordeelde baselineverplaatsing mogen historische en
actuele bronnen byte-identiek zijn. De poort blijft dan de geaccepteerde output
vastleggen en wordt bij de eerstvolgende bronwijziging vanzelf weer een
migratievergelijking; bronverschil kunstmatig afdwingen voegt geen zekerheid toe.

Lokaal is een Engine op `http://127.0.0.1:47111/api` nodig, tenzij
`LEERPRET_API_URL` is gezet. Uitvoeren:

```powershell
npm run test:parity-contract
npm run test:visual:history-parity
```

Wijzig de baseline alleen na expliciete beoordeling van alle verwachte
outputverschillen. Werk dan commit en bronhashes samen bij; wijzig scenario- en
contractversies alleen wanneer ook de handelingen of het fingerprintcontract
veranderen. De CI-checkout gebruikt volledige Git-geschiedenis omdat een
onbereikbare historische commit hard moet falen.
