# Runbook per completare la traduzione italiana D&D 5e 2014

Questo documento descrive il processo operativo da seguire per portare il
modulo Babele alla copertura completa dei compendi D&D 5e 2014 e del compendio
`effects`, mantenendo intatti il sistema dnd5e sorgente, i contenuti 2024 e la
sintassi tecnica di Foundry VTT.

Il runbook integra, senza sostituirli:

- [Guida di traduzione](./translation-guide.md)
- [Preservazione della formattazione Foundry](./foundry-format-preservation.md)
- [Conversione metrica](./metric-conversion.md)
- [Workflow sintetico](./translation-workflow.md)
- [Checklist di qualità](./quality-checklist.md)
- [Aggiornamento a nuove versioni dnd5e](./updating-dnd5e.md)
- [Registro delle anomalie sorgente](./source-anomalies.md)

## 1. Risultato atteso

Il lavoro è concluso soltanto quando tutte le condizioni seguenti sono vere:

1. I pack legacy `backgrounds`, `classes`, `classfeatures`, `heroes`, `items`,
   `monsterfeatures`, `monsters`, `races`, `rules`, `spells`, `subclasses`,
   `tables`, `tradegoods` e l'intero pack `effects` sono coperti al 100%.
2. Non restano campi visibili mancanti, testo inglese non giustificato o unità
   imperiali non giustificate.
3. Tutti i JSON sono validi e caricabili da Babele.
4. HTML, UUID, riferimenti, formule, inline roll, placeholder e altri token
   Foundry sono invariati rispetto al sorgente.
5. I test passano e l'audit globale termina con exit code `0`.
6. I file 2024 esclusi dal perimetro coincidono con la baseline protetta.
7. Il repository sorgente `C:\Users\lmlor\Desktop\dnd5e` non è stato
   modificato dal processo di traduzione.
8. Report, copertura, eccezioni e anomalie sono aggiornati e versionati.

Una percentuale elevata non equivale al completamento: l'unica soglia finale è
il 100% verificato dall'audit.

## 2. Percorsi e responsabilità

| Ruolo | Percorso | Regola |
| --- | --- | --- |
| Modulo traducibile | `C:\Users\lmlor\Desktop\dnd5e-it-translation-foundryVTT` | È l'unico repository da modificare. |
| Sistema autorevole | `C:\Users\lmlor\Desktop\dnd5e` | Sola lettura; versione attesa `6.0.6`. |
| Compendi Babele | `compendium/dnd5e.<pack>.json` | Destinazione delle traduzioni. |
| Override revisionati | `config/*.json` | Input ripetibile per applicare campi tradotti. |
| Glossario | `glossary/glossary.json` | Terminologia canonica e stato di revisione. |
| Report | `reports/translation-audit.{json,md}` | Stato autorevole della copertura. |
| Anomalie | `docs/source-anomalies.md` | Errori del sorgente non corretti silenziosamente. |

Non scrivere mai nei pack del sistema dnd5e. Non usare Ollama o servizi di
traduzione esterni. Il manuale italiano va consultato solo per verifiche
terminologiche puntuali, non per copiare sistematicamente paragrafi.

## 3. Preparazione di ogni sessione

Aprire PowerShell nella radice del modulo e impostare un percorso esplicito:

```powershell
$Repo = 'C:\Users\lmlor\Desktop\dnd5e-it-translation-foundryVTT'
$Source = 'C:\Users\lmlor\Desktop\dnd5e'
Set-Location -LiteralPath $Repo
```

Controllare branch, modifiche e remoti prima di scrivere:

```powershell
git branch --show-current
git status --short
git remote -v
git log -5 --oneline
```

Regole operative:

- lavorare sul branch dedicato `codex/complete-2014-translation-606`;
- non cambiare branch con modifiche non attribuite e non usare
  `git reset --hard` o comandi equivalenti;
- considerare ogni file già modificato come lavoro da preservare;
- non integrare più attori nello stesso commit quando possono essere verificati
  separatamente;
- non eseguire push, release o installazione in Foundry senza autorizzazione.

Installare le dipendenze soltanto se mancano e verificare l'harness:

```powershell
npm install
npm test
```

Il risultato atteso è l'intera suite verde. Un test fallito blocca la
traduzione finché la causa non è compresa e corretta.

## 4. Riprendere correttamente lo stato sospeso

Lo stato del repository, non la memoria della chat, è l'autorità. Alla ripresa:

1. Eseguire `git status --short`.
2. Separare i file già committati da override non tracciati o parziali.
3. Non assumere che un override non tracciato sia pronto solo perché esiste.
4. Per ogni override pendente eseguire di nuovo controllo delle invarianti,
   applicazione, audit, test e commit atomico.
5. Rigenerare l'audit globale dopo l'ultimo override integrato.

Per elencare gli override di mostri non ancora tracciati:

```powershell
git status --short | Select-String '^\?\? config/monsters-.*-overrides\.json$'
```

Non aggiungere in blocco tutti questi file con `git add config`. Ogni file deve
essere prima associato al proprio documento sorgente, revisionato e verificato.

## 5. Creare o aggiornare la baseline protetta

La baseline registra lo stato Git del sistema sorgente e gli hash dei file 2024
che devono restare invariati:

```powershell
node scripts/snapshot-baseline.mjs --source $Source
```

Controllare `reports/baseline.json` e annotare:

- versione e commit del sistema dnd5e;
- stato Git preesistente del sistema sorgente;
- hash SHA-256 dei compendi moderni esclusi.

Non interpretare modifiche preesistenti nel repository dnd5e come prodotte dal
modulo. Al termine si confronteranno HEAD e stato con questa fotografia.

## 6. Generare l'audit e scegliere il lavoro successivo

Eseguire l'audit globale:

```powershell
node scripts/audit-translations.mjs --source $Source
```

Finché il lavoro è incompleto, exit code `1` è atteso. È però obbligatorio che:

- il numero di problemi bloccanti diminuisca dopo ogni entry;
- non compaiano nuovi problemi non `missing-field`;
- l'entry appena tradotta abbia zero problemi;
- il totale dei campi tradotti aumenti del numero previsto.

I report prodotti sono:

- `reports/translation-audit.json`, usato per query e automazione;
- `reports/translation-audit.md`, usato per revisione umana.

Per raggruppare i campi mancanti del pack `monsters` per documento:

```powershell
node -e "const r=require('./reports/translation-audit.json'),p=r.packs.find(x=>x.pack==='monsters'),g=new Map();for(const i of p.issues.filter(x=>x.code==='missing-field')){if(!g.has(i.id))g.set(i.id,[]);g.get(i.id).push(i)}console.log(JSON.stringify([...g].map(([id,a])=>({id,name:a[0].name,count:a.length,paths:a.map(x=>x.fieldPath)})),null,2))"
```

Per gli altri pack sostituire `monsters` con il nome del pack. Lavorare sempre
per `_id`; il nome non è un identificatore affidabile perché può essere
duplicato.

## 7. Unità di lavoro consigliata

L'unità più sicura è un singolo documento sorgente con tutti i suoi campi
mancanti. Per un Actor include anche:

- biografia e dettagli visibili;
- Item incorporati;
- descrizioni normali e chat;
- attività e profili;
- Active Effect visibili;
- etichette traducibili dei riferimenti.

Per Journal e RollTable l'unità comprende rispettivamente tutte le pagine e
tutti i risultati testuali. Non dichiarare completa un'entry perché il solo
campo `name` è tradotto.

## 8. Estrarre i campi sorgente

Usare gli strumenti del progetto, senza modificare i YAML sorgente. Esempio per
un Actor del pack `monsters`:

```powershell
$ActorId = '<ID_SORGENTE>'
node --input-type=module -e "import path from'node:path';import{loadSourcePack}from'./scripts/lib/source-inventory.mjs';import{walkVisibleFields}from'./scripts/lib/visible-fields.mjs';const docs=await loadSourcePack(path.join('C:/Users/lmlor/Desktop/dnd5e','packs','_source','monsters'));const d=docs.find(x=>x.id===process.argv[1]);if(!d)throw new Error('Documento non trovato');console.log(JSON.stringify({id:d.id,name:d.name,fields:walkVisibleFields(d)},null,2));" $ActorId
```

Confrontare l'output con i soli `fieldPath` ancora segnalati dall'audit. Non
tradurre chiavi meccaniche escluse dal walker.

## 9. Tradurre il testo visibile

Prima di scrivere:

1. Cercare i termini nel glossario.
2. Controllare traduzioni analoghe già committate.
3. Consultare il manuale italiano solo se la terminologia è incerta.
4. Segnalare nel glossario i termini nuovi o ambigui.

Durante la traduzione:

- conservare obbligo, possibilità, condizione, durata e causalità;
- conservare numeri, dadi, CD, bonus, frequenze e limiti;
- mantenere numero, ordine e nidificazione dei tag HTML;
- non cambiare attributi, classi, ID, stili o `data-*`;
- non cambiare target di `@UUID`, `@Compendium`, `@Embed` o riferimenti locali;
- non cambiare contenuto tecnico di `[[...]]`, formule o placeholder;
- tradurre solo le label visibili separate dal target;
- non sostituire token ripetuti con pronomi se ciò ne cambia numero o ordine;
- non correggere silenziosamente una regola apparentemente errata.

Se il sorgente contiene un refuso, tradurre il significato naturale senza
alterare la meccanica e aggiungere una riga a `docs/source-anomalies.md`. Se il
refuso è dentro un token tecnico, conservarlo esattamente e documentarlo.

## 10. Convertire le misure

Applicare le convenzioni di progetto:

| Sorgente | Destinazione |
| --- | --- |
| `5 feet` | `1,5 metri` |
| `1 foot` | `0,3 metri` |
| `1 mile` | `1,5 km` |
| `1 pound` | `0,5 kg` |

Verificare separatamente:

- campi strutturati di movimento, gittata, sensi e template;
- misure scritte nella prosa;
- etichette unità restituite da lookup dinamici;
- geometria di raggi, diametri, coni, linee, cubi, altezze e profondità.

Non convertire numeri non dimensionali, dadi, ID, UUID, bonus, CD o formule.
Non riconvertire valori già metrici. Un cubo di 3 metri indica uno spigolo di
3 metri, non un volume di `3 m³`.

## 11. Scrivere un override revisionabile

Creare un file dedicato, per esempio:

```text
config/monsters-<nome-normalizzato>-overrides.json
```

Struttura minima:

```json
{
  "monsters": {
    "<ID_SORGENTE>": {
      "items[<ITEM_ID>].system.description.value": "<p>Testo italiano...</p>"
    }
  }
}
```

Regole:

- una chiave per ogni `fieldPath` esatto dell'audit;
- nessun campo estraneo o meccanico;
- JSON formattato con due spazi;
- nessun commento, trailing comma o duplicato di chiave;
- nome file stabile e descrittivo;
- un documento sorgente per file, salvo famiglie piccole esplicitamente
  revisionate insieme.

## 12. Controllare le invarianti prima dell'applicazione

Impostare il file da verificare:

```powershell
$Override = 'config/monsters-<nome>-overrides.json'
```

Eseguire il confronto indipendente tra ogni valore sorgente e traduzione:

```powershell
node --input-type=module -e "import fs from'node:fs';import path from'node:path';import{loadSourcePack}from'./scripts/lib/source-inventory.mjs';import{walkVisibleFields}from'./scripts/lib/visible-fields.mjs';import{compareInvariants}from'./scripts/lib/invariants.mjs';const cfg=JSON.parse(fs.readFileSync(process.argv[1],'utf8')).monsters,docs=await loadSourcePack(path.join('C:/Users/lmlor/Desktop/dnd5e','packs','_source','monsters'));let n=0;for(const[id,ov]of Object.entries(cfg)){const d=docs.find(x=>x.id===id);if(!d){console.error('Documento mancante',id);n++;continue}const m=new Map(walkVisibleFields(d).map(x=>[x.fieldPath,x.value]));for(const[p,t]of Object.entries(ov)){if(!m.has(p)){console.error('Campo mancante',id,p);n++;continue}const q=compareInvariants(m.get(p),t);if(q.length){console.error(id,p,q);n+=q.length}}}if(n)process.exit(1);console.log('invariants: ok');" $Override
```

Qualsiasi diagnostica è bloccante. Correggere l'override; non aggirare il
validatore con un'allowlist generica.

Per pack diversi da `monsters`, cambiare sia la chiave JSON sia il percorso
`packs/_source/<pack>` nello script.

## 13. Applicare l'override

Solo dopo il precheck:

```powershell
node scripts/apply-field-overrides.mjs `
  --source $Source `
  --pack monsters `
  --overrides $Override
```

Lo script modifica soltanto il file Babele del modulo. Subito dopo, controllare
il diff del file interessato:

```powershell
git diff -- $Override compendium/dnd5e.monsters.json
```

Verificare che non siano cambiate entry estranee e che l'override sia stato
indirizzato all'entry corretta, soprattutto in presenza di nomi duplicati.

## 14. Eseguire l'audit post-entry

Rigenerare il report:

```powershell
node scripts/audit-translations.mjs --source $Source
```

Poi verificare l'entry appena applicata:

```powershell
$ActorId = '<ID_SORGENTE>'
node -e "const r=require('./reports/translation-audit.json'),p=r.packs.find(x=>x.pack==='monsters'),t=r.totals.fields;console.log(JSON.stringify({actorIssues:p.issues.filter(x=>x.id===process.argv[1]).length,nonMissing:p.issues.filter(x=>x.code!=='missing-field').length,translated:t.translated,total:t.total,coverage:t.translated/t.total*100},null,2))" $ActorId
```

Accettare l'entry soltanto se:

- `actorIssues` è `0`;
- `nonMissing` resta `0` per il pack in lavorazione;
- la copertura aumenta del numero atteso di campi;
- non compaiono residui inglesi o imperiali.

L'exit code globale può restare `1` finché esistono altri campi mancanti.

## 15. Test, whitespace e commit atomico

Eseguire sempre:

```powershell
npm test
git diff --check -- `
  $Override `
  compendium/dnd5e.monsters.json `
  reports/translation-audit.json `
  reports/translation-audit.md `
  docs/source-anomalies.md
```

Gli avvisi LF/CRLF su Windows non sono da soli un errore; errori di whitespace
riportati da `git diff --check` devono invece essere risolti.

Aggiungere selettivamente solo i file dell'entry verificata:

```powershell
git add -- `
  $Override `
  compendium/dnd5e.monsters.json `
  reports/translation-audit.json `
  reports/translation-audit.md `
  docs/source-anomalies.md

git diff --cached --stat
git diff --cached --check
git commit -m "feat: translate <document name> actor"
```

Non usare `git add .` quando altri traduttori o subagent hanno file pendenti.

## 16. Uso sicuro dei subagent

I subagent possono tradurre in parallelo documenti indipendenti, ma non devono
scrivere contemporaneamente negli stessi file condivisi.

### Compiti consentiti al subagent

- leggere il documento sorgente assegnato;
- tradurre tutti i `missing-field` di un solo `_id`;
- creare un unico file `config/...-overrides.json`;
- eseguire il precheck `compareInvariants`;
- segnalare conversioni metriche e anomalie sorgente.

### Compiti riservati al coordinatore

- modificare `compendium/dnd5e.<pack>.json`;
- rigenerare i report globali;
- aggiornare documentazione e registro anomalie;
- revisionare qualità e terminologia;
- eseguire test, staging, commit e push;
- assegnare il documento successivo evitando sovrapposizioni.

Brief minimo per un subagent:

```text
Traduci tutti i missing-field del documento <NOME>, ID <ID>, pack <PACK>.
Crea soltanto config/<FILE>-overrides.json. Non modificare compendium, report,
documentazione o Git. Preserva esattamente HTML e token Foundry, applica le
conversioni metriche del progetto, esegui compareInvariants e segnala ogni
anomalia del sorgente. Non fare commit.
```

Il coordinatore deve rieseguire personalmente il controllo invarianti: il
risultato dichiarato dal subagent è utile, ma non sostituisce la verifica.

## 17. Ordine consigliato dei lavori residui

Usare sempre il report corrente, non una lista storica. In generale:

1. integrare e verificare gli override già presenti ma non tracciati;
2. completare `monsters` per documenti interi;
3. completare `rules`, incluse tutte le pagine Journal e i titoli;
4. risolvere documenti o campi extra nei pack legacy con analisi di identità,
   alias o obsolescenza, senza cancellazioni automatiche;
5. rieseguire una revisione trasversale di tutti i pack;
6. chiudere allowlist, glossario, copertura e documentazione.

Per problemi `extra-document` o `extra-field`:

- verificare se l'entry è stata rinominata mantenendo la stessa identità;
- cercare `flags.core.sourceId`, `compendiumSource` e `_id`;
- usare gli strumenti di alias/copia/pruning soltanto con una corrispondenza
  dimostrata;
- non rimuovere un'entry solo perché non compare con lo stesso nome;
- documentare qualsiasi eccezione mantenuta.

## 18. Casi speciali per tipo di pack

### `rules`

- controllare ogni JournalEntryPage per ID stabile;
- tradurre titolo e contenuto di ogni pagina;
- conservare tabelle, heading, ancore e link;
- verificare che nessuna pagina sia saltata perché il Journal padre è tradotto.

### `tables`

- tradurre ogni risultato testuale e conservarne range, peso e ID;
- non modificare formule, riferimenti o intervalli numerici;
- verificare separatamente risultati incorporati e riferimenti esterni.

### `monsters` e `heroes`

- verificare Actor, Item incorporati, attività ed effetti;
- non considerare sufficiente un `fromPack` senza controllare il risultato
  visibile effettivo;
- mantenere separati attori omonimi tramite `_id`.

### `effects`

- tradurre nomi, descrizioni e label realmente visibili;
- non tradurre chiavi, enum, formule, `mode`, `priority`, `transfer` o valori
  meccanici delle modifiche;
- includere l'intero pack, anche se condiviso tra contenuti legacy e moderni.

### Pack 2024

Sono esclusi. Non tradurli, non contarli nella copertura e non modificarli per
comodità. Ogni variazione degli hash protetti è un blocco di release.

## 19. Gestire allowlist e anomalie

Usare `config/translation-allowlist.json` solo per eccezioni reali e precise,
come nomi propri approvati o valori tecnici che l'euristica identifica come
testo. Ogni voce deve avere:

- pack;
- documento e campo esatti;
- valore o regola limitata;
- motivazione;
- stato di revisione.

Non usare l'allowlist per nascondere traduzioni mancanti, markup rotto o unità
imperiali ancora visibili.

Registrare in `docs/source-anomalies.md` refusi, sintassi tecnica corrotta e
incongruenze del sorgente. Conservare la meccanica originale e spiegare come è
stata resa la prosa italiana.

## 20. Verifica finale da zero

Quando il report ordinario raggiunge il 100%, eseguire una sessione finale
senza affidarsi a processi o dati in memoria:

```powershell
Set-Location -LiteralPath $Repo
npm test
node scripts/audit-translations.mjs --source $Source
git diff --check
git status --short
```

Verificare nel report:

- `blockingIssues = 0`;
- copertura campi = 100%;
- zero documenti, pagine, risultati o campi mancanti;
- zero invarianti violate;
- zero residui inglesi o imperiali non autorizzati;
- tutti i pack previsti presenti, incluso `effects`;
- nessun pack 2024 incluso nel denominatore.

Confrontare quindi la baseline:

1. calcolare nuovamente gli hash dei file moderni protetti;
2. confrontarli con `reports/baseline.json`;
3. confrontare HEAD e stato Git del repository sorgente con la baseline;
4. distinguere esplicitamente eventuali modifiche sorgente preesistenti;
5. verificare che nessun comando abbia scritto nei pack dnd5e.

## 21. Aggiornare la documentazione di chiusura

Prima del commit finale aggiornare:

- copertura per pack e totali tradotti;
- report JSON e Markdown;
- glossario e termini ancora proposti;
- allowlist ed eccezioni residue;
- registro anomalie sorgente;
- checklist di qualità;
- elenco delle revisioni umane ancora consigliate.

Il riepilogo finale deve riportare:

- branch e stato Git;
- commit creati;
- conteggi per compendio;
- totale entry e campi tradotti;
- allowlist ed eccezioni;
- test e comandi eseguiti;
- prova che sorgente e pack 2024 sono invariati;
- eventuali punti che richiedono ancora revisione umana.

## 22. Commit finale, push e release

Creare il commit finale solo dopo la verifica completa:

```powershell
git diff --check
git diff --cached --check
git commit -m "chore: finalize 2014 translation audit"
```

Il commit non autorizza automaticamente le azioni esterne. Eseguire soltanto
con approvazione separata:

- push su GitHub;
- merge su `main`;
- tag o release;
- installazione o aggiornamento nel mondo Foundry.

## 23. Diagnosi rapida dei fallimenti

| Sintomo | Controllo | Azione |
| --- | --- | --- |
| L'entry ha ancora `missing-field` | ID e `fieldPath` dell'override | Correggere chiave o aggiungere il campo mancante. |
| Compare un errore HTML | Sequenza tag e attributi | Ripartire dallo scheletro sorgente; tradurre solo il testo. |
| Cambia un token Foundry | UUID, roll, formula, placeholder | Ripristinare byte per byte la parte tecnica. |
| Resta testo inglese | Contenuto visibile e label | Tradurre o aggiungere un'eccezione precisa e motivata. |
| Resta un'unità imperiale | Prosa e campi strutturati | Convertire una sola volta con l'unità corretta. |
| La copertura non aumenta | Entry Babele e ID sorgente | Verificare chiave duplicata, alias e mapping. |
| L'audit aggiunge errori non-missing | Diff dell'ultimo documento | Revertire solo l'override locale o correggerlo prima del commit. |
| Cambiano file 2024 | Diff e hash baseline | Fermarsi e ripristinare esclusivamente le modifiche introdotte dal lotto. |
| I test falliscono | Primo test fallito e stack trace | Diagnosticare la causa; non committare finché la suite non è verde. |

## 24. Checklist compatta per ogni entry

- [ ] Documento scelto dal report tramite `_id`.
- [ ] Tutti i campi visibili estratti e compresi.
- [ ] Terminologia verificata nel glossario.
- [ ] Italiano naturale e meccanica invariata.
- [ ] Misure convertite senza doppia conversione.
- [ ] Override JSON valido e limitato al documento.
- [ ] `compareInvariants` senza diagnostiche.
- [ ] Override applicato al pack corretto.
- [ ] Audit: zero problemi per l'entry e zero nuovi problemi non-missing.
- [ ] `npm test` completamente verde.
- [ ] `git diff --check` senza errori.
- [ ] Diff revisionato manualmente.
- [ ] Anomalie sorgente documentate.
- [ ] Commit atomico creato con staging selettivo.

Seguendo questa sequenza ogni traduzione resta riproducibile, revisionabile e
sicura rispetto alla struttura Foundry, mentre il report globale fornisce una
misura oggettiva dell'avanzamento fino al 100%.
