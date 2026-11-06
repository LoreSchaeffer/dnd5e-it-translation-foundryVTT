# Checklist di qualità

## Traduttore

- [ ] Ho identificato il documento per `_id` e controllato eventuali omonimi.
- [ ] Ho tradotto tutti i campi visibili, pagine, risultati ed embedded item.
- [ ] Ho usato il glossario e segnalato termini `review`.
- [ ] Ho conservato obblighi, possibilità, condizioni, numeri, dadi e CD.
- [ ] Ho convertito soltanto misure reali e non ho riconvertito valori metrici.
- [ ] Non ho modificato HTML, target, formule, placeholder, enum o flag.

## Revisore

- [ ] Il testo italiano è naturale e fedele alla meccanica inglese.
- [ ] Il diff non contiene modifiche ai pack 2024.
- [ ] Tag, attributi, UUID, inline roll e formule sono invariati.
- [ ] Journal, RollTable, Actor embedded item e Active Effect sono completi.
- [ ] Ogni eccezione ha scope, motivo e stato nell'allowlist.
- [ ] `npm test` e l'audit del lotto hanno prodotto l'esito previsto.

## Release manager

- [ ] Ho rigenerato i report in un nuovo processo dalla sorgente 6.0.6.
- [ ] La copertura legacy + effects è 100% e non esistono errori bloccanti.
- [ ] Non restano inglese o unità imperiali visibili non giustificati.
- [ ] Gli hash 2024 coincidono con la baseline.
- [ ] HEAD e modifiche preesistenti del repository dnd5e sono invariati.
- [ ] Branch, commit, comandi, allowlist e revisioni umane sono documentati.
- [ ] Nessun push, release o deploy è stato eseguito senza autorizzazione.
