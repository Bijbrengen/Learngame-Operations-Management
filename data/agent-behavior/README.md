# Menselijke patronen voor lokale agents

`entrepreneurship-human-patterns.v1.json` bevat uitsluitend geaggregeerde
gedragspatronen uit eerder gespeelde Entrepreneurship-games. De browserruntime
leest dezelfde gegevens via `entrepreneurship-human-patterns.v1.js`.

De dataset bevat geen e-mailadressen, gamecodes of individuele tijdlijnen.
Alleen verdelingen per roltype zijn opgenomen: reactietempo, overdrachtstempo,
korte actiebursts, langere aarzelpauzes en activiteit per spelfase.

Opnieuw genereren vanuit de lokale SQL-dump:

```powershell
python scripts\build_entrepreneurship_agent_patterns.py
```

De afleiding gebruikt transacties niet als bewijs voor logistieke fouten,
persoonlijkheid of productvoorkeuren. Die conclusies zijn uit deze bron niet
betrouwbaar te trekken.
