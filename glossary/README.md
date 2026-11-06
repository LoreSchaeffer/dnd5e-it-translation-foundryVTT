# Glossario canonico

`glossary.json` è la fonte unica per la terminologia della traduzione. Ogni
voce contiene termine inglese e italiano, categoria, genere, plurale, regola
d'uso, fonte o motivazione e stato di revisione.

Gli stati sono:

- `verified`: verificato nel Manuale del Giocatore italiano 2014 o in una
  fonte italiana esplicitamente indicata;
- `proposed`: scelta coerente con il corpus esistente ma ancora da verificare;
- `review`: ambiguità nota che richiede una decisione editoriale.

Prima di tradurre un termine, cercarlo qui senza distinzione tra maiuscole e
minuscole. Una nuova resa dello stesso termine richiede `scope` e `rationale`
su tutte le varianti. Aggiornare prima il glossario e poi i compendi; non
introdurre eccezioni locali silenziose.

Le chiavi e gli enum tecnici inglesi non sono termini traducibili. Le regole
operative sono in [guida alla traduzione](../docs/translation-guide.md) e le
misure in [conversione metrica](../docs/metric-conversion.md).
