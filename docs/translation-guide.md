# Guida alla traduzione italiana

## Autorità e perimetro

La struttura e la meccanica autorevoli sono i pack YAML di dnd5e 6.0.6. Il
Manuale del Giocatore italiano 2014 serve soltanto per verifiche terminologiche
puntuali. La traduzione è autonoma e non riproduce sistematicamente la prosa del
manuale. Il perimetro include i tredici pack legacy e l'intero pack `effects`;
i pack 2024 restano esclusi e byte-identici.

## Regole linguistiche

- Scrivere italiano naturale, mantenendo soggetto, condizioni e conseguenze
  della regola inglese.
- Rendere `must` come obbligo, `can/may` come possibilità e `if/when` come
  condizione temporale o logica equivalente. Non attenuare o rafforzare.
- Conservare numeri, dadi, CD, bonus, durate, frequenze e limiti.
- Usare il [glossario canonico](../glossary/glossary.json). Una voce `review`
  non va propagata senza annotare la decisione.
- Usare minuscole nella prosa (`azione`, `tiro salvezza`) e maiuscole nei nomi
  propri, nomi di privilegi e intestazioni secondo il sorgente.
- Non tradurre nomi propri senza forma italiana attestata. Inserire l'eccezione
  nell'allowlist con motivo, campo e stato.

## Testo meccanico

Una traduzione deve conservare la stessa portata normativa. Esempio sicuro:

- `A creature can use its reaction` -> `Una creatura può usare la sua reazione`.

Esempio non sicuro:

- `A creature can` -> `Una creatura deve` (cambia possibilità in obbligo).

Non correggere errori del sorgente nel testo tradotto. Registrarli nel rapporto
di revisione con pack, ID, campo e proposta separata.

## Nomi, label e campi

Tradurre ogni testo visibile: nome, descrizione, materiale, requisito, label,
attività, pagina Journal, risultato RollTable, biografia, embedded item ed
effetto. `fromPack` è un indizio, non una prova: nome e descrizione risultanti
devono essere materialmente italiani.

Non tradurre chiavi JSON, enum, ID, formule, flag o target. Consultare
[preservazione Foundry](foundry-format-preservation.md) prima di modificare
HTML o sintassi inline.

## Misure

La prosa visibile usa metri, chilometri e chilogrammi. Applicare le convenzioni
e gli arrotondamenti documentati in [conversione metrica](metric-conversion.md),
senza sostituzioni globali e senza doppia conversione.

## Ambiguità

Se una scelta può cambiare una regola, non indovinare. Segnare il campo
`review`, spiegare le alternative e lasciare invariato il testo finché la
decisione non è verificata. Le scelte puramente stilistiche possono essere
risolte seguendo il glossario e registrate nella revisione del lotto.
