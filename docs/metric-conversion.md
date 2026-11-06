# Conversione al sistema metrico

## Convenzioni di gioco

| Imperiale | Metrico italiano | Uso |
| --- | --- | --- |
| 5 ft | 1,5 m | quadretto, portata e distanze standard |
| 1 ft | 0,3 m | conversione proporzionale |
| 1 mile | 1,5 km | viaggio e gittate in miglia |
| 1 lb | 0,5 kg | peso |

Usare precisione da gioco, non precisione scientifica. Un cubo di 10 piedi
diventa un cubo con spigolo di 3 metri, non `3 m³`.

## Tre livelli distinti

1. Campi strutturati: convertire valore e unità insieme (`ft` -> `m`, `mi` ->
   `km`, `lb` -> `kg`).
2. Prosa: tradurre soltanto misure effettive nel testo visibile, dopo aver
   escluso formule, UUID, ID e inline roll.
3. Impostazioni native dnd5e: usare le opzioni metriche del sistema quando
   disponibili; non duplicarne il risultato con un hook.

## Geometria e gittata

Conservare il tipo della forma: raggio, diametro, cono, linea, cubo, altezza e
profondità. Convertire separatamente gittata normale e lunga. Per scene e griglia
standard usare distanza `1.5` e unità `m`.

## Idempotenza

Ogni converter deve controllare l'unità sorgente. Un valore già in `m`, `km` o
`kg` resta invariato. Le funzioni non mutano l'oggetto ricevuto. Gli hook usano
flag di conversione e non riconvertono documenti Babele già metrici.

Valori zero, null e stringhe vuote restano tali. Numeri non dimensionali, dadi,
CD, bonus e identificatori non sono misure.

## Errori da prevenire

- etichettare `1,5` come metri dopo aver convertito una miglia;
- usare `m` al posto di `km`;
- leggere la vecchia unità `ml` invece di `mi`;
- applicare il converter delle distanze in piedi alle miglia;
- convertire template già metrici sulla base della sola grandezza numerica;
- mutare l'oggetto sorgente con merge in-place.
