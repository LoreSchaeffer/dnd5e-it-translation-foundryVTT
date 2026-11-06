# Workflow di traduzione

## Preparazione

1. Lavorare su un branch dedicato e verificare `git status`.
2. Trattare `C:/Users/lmlor/Desktop/dnd5e` come sola lettura.
3. Eseguire `npm install`, `npm test` e lo snapshot baseline.
4. Confermare versione dnd5e 6.0.6 e hash dei file 2024.

## Traduzione di una entry

1. Individuare il documento sorgente per `_id`; il nome non è un'identità
   sufficiente perché può essere duplicato.
2. Inventariare tutti i campi visibili, inclusi documenti incorporati.
3. Consultare il glossario e verificare i termini `review`.
4. Copiare la struttura tecnica dal sorgente e sostituire solo testo visibile.
5. Convertire misure con consapevolezza del campo, mai con regex globale.
6. Eseguire validatore e audit prima di passare all'entry successiva.

## Lotti

Seguire l'ordine: personaggi, classfeatures, incantesimi, oggetti, attori,
tabelle, regole, effetti, revisione trasversale. Dopo ogni lotto:

- validare JSON e test;
- controllare markup e token;
- controllare inglese e unità imperiali residue;
- rigenerare i report;
- aggiornare copertura ed eccezioni;
- creare un commit atomico.

## Ruoli

Il traduttore produce il testo e risolve i termini verificati. Il revisore
controlla fedeltà meccanica, italiano, HTML e metricazione. Il release manager
esegue audit da zero, confronta gli hash protetti e prepara la release senza
modificare il sistema sorgente.

## Comandi

```text
npm test
node scripts/snapshot-baseline.mjs --source C:/Users/lmlor/Desktop/dnd5e
npm run audit -- --source C:/Users/lmlor/Desktop/dnd5e
```

Un exit code diverso da zero nell'audit blocca il lotto. Le eccezioni ammesse
vanno in `config/translation-allowlist.json` con campo preciso, motivo e stato.
