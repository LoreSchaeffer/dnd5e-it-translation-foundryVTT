# Aggiornare la traduzione per una nuova versione dnd5e

## Regola di sicurezza

Non modificare né migrare in-place il repository del sistema. Usare i file
estratti `packs/_source` come input di sola lettura e produrre ogni modifica nel
modulo Babele.

## Procedura

1. Registrare versione, commit e stato Git del sistema corrente.
2. Preparare separatamente la nuova versione ed estrarre i pack con gli strumenti
   ufficiali del sistema, fuori dal repository di traduzione.
3. Confrontare manifest, elenco pack, tipi documento e schema dei campi.
4. Classificare pack legacy, modern e condivisi. `effects` resta integralmente
   in perimetro; i pack 2024 non entrano nelle percentuali legacy.
5. Inventariare per `_id`: aggiunti, rimossi, rinominati e modificati. Non
   accoppiare automaticamente documenti omonimi duplicati.
6. Per ogni campo modificato, riallineare prima la struttura tecnica e poi
   riapplicare il testo italiano verificato.
7. Rigenerare baseline, audit e copertura. Rieseguire tutti i test.
8. Verificare gli hash dei file esclusi e lo stato Git di entrambi i sistemi.

## Cambi di schema

Quando un campo viene spostato o un'attività cambia identificatore, non copiare
la vecchia struttura nel nuovo documento. Aggiornare walker, mapping Babele,
fixture e test con un caso reale. Registrare errori evidenti del sorgente senza
correggere silenziosamente la regola.

## Chiusura

Una nuova versione è supportata soltanto quando tutti i pack in perimetro sono
di nuovo al 100%, i validatori sono verdi e l'installazione reale in Foundry è
stata verificata separatamente e autorizzata.
