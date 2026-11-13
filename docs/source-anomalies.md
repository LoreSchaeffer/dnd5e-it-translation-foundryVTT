# Anomalie del sorgente dnd5e 6.0.6

Questo rapporto registra gli errori evidenti del sorgente inglese senza
correggerne silenziosamente la meccanica nella traduzione Babele.

| Pack | Documento | Campo | Anomalia | Trattamento |
| --- | --- | --- | --- | --- |
| `spells` | Control Water (`7fFHlBk3UNX8gPKL`) | `system.activities.3uKDmmkF8irChzl6.description.value` | La frase sull'onda omette la condizione che dovrebbe introdurre «instead create», rendendo ambiguo quando l'onda sostituisca l'inondazione. | Tradotto il testo disponibile senza aggiungere una condizione meccanica assente dal sorgente. |
| `spells` | Creation (`lnaGnxMzpYnbw1uU`) | `system.description.value` | Il testo contiene la parola `range` racchiusa tra apostrofi (`within 'range'`), formattazione anomala non presente nelle altre descrizioni. | Conservata visibilmente l'enfasi anomala come «entro “gittata”» senza modificarne la meccanica. |
| `spells` | Find Familiar (`JGT5bNqu9REL7Fuz`) | `system.description.value` | L'ultima frase richiede di usare l'«action modifier» per il tiro per colpire, espressione non definita dal sistema e probabilmente intesa come «spell attack modifier». | Tradotta letteralmente come «modificatore di azione», senza sostituire silenziosamente la regola del sorgente. |
| `spells` | Flesh to Stone (`kozNy29b0X6exFhY`) | `system.activities.ZLjky0SAN3L2Afkr.description.value` | L'attività contiene il testo dei tiri salvezza e delle malattie di `Contagion`, estraneo a `Flesh to Stone`. | Tradotto fedelmente il campo sorgente; nessuna regola è stata sostituita o inventata. |
| `items` | Silver Horn of Valhalla (`lTfo6OVvAY2iJ4oq`) | `system.description.value` | La descrizione evoca `3d4 + 3` berserker, mentre la tabella `Horn of Valhalla` associata indica `2d4 + 2` per il corno d'argento. | Conservato `3d4 + 3` nella descrizione perché è il valore presente nel campo sorgente tradotto; nessuna correzione meccanica arbitraria. |
| `heroes` | Beiro (`xVmbM44RXyI2Eqq3`) | `items[2Ejl2ovEUJg7swzL].system.description.value` | L'embedded item `Musical Instrument: Flute` contiene la descrizione inglese del liuto (`A lute...`). | Tradotto fedelmente il testo sorgente come liuto, senza sostituire silenziosamente lo strumento. |
| `monsterfeatures` | Hellish Rejuvenation (`XmLuhZYd9WnCWBlU`) | `system.description.value` | La frase inglese ripete per errore `comes back to comes back to life`. | Tradotto una sola volta il significato evidente «torna in vita», senza alterare la meccanica. |
| `monsterfeatures` | Frightening Gaze (`cpnrDGQrqgPlSmwR`) | `system.description.value` | Nonostante il nome della capacità, il testo inglese rende il bersaglio `grappled` anziché `frightened`. | Tradotto fedelmente come «afferrato», senza sostituire silenziosamente la condizione meccanica del sorgente. |
| `monsterfeatures` | Sleep Breath (`43BnuqkQgg5l1Nfh`) | `system.description.value` | La sezione segreta indica un cono di 60 piedi, mentre il riepilogo pubblico dello stesso campo indica 90 piedi. | Convertite fedelmente le due misure rispettivamente in 18 e 27 metri, senza scegliere arbitrariamente quale correggere. |
