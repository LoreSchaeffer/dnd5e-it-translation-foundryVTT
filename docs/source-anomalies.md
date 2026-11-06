# Anomalie del sorgente dnd5e 6.0.6

Questo rapporto registra gli errori evidenti del sorgente inglese senza
correggerne silenziosamente la meccanica nella traduzione Babele.

| Pack | Documento | Campo | Anomalia | Trattamento |
| --- | --- | --- | --- | --- |
| `spells` | Control Water (`7fFHlBk3UNX8gPKL`) | `system.activities.3uKDmmkF8irChzl6.description.value` | La frase sull'onda omette la condizione che dovrebbe introdurre «instead create», rendendo ambiguo quando l'onda sostituisca l'inondazione. | Tradotto il testo disponibile senza aggiungere una condizione meccanica assente dal sorgente. |
| `spells` | Flesh to Stone (`kozNy29b0X6exFhY`) | `system.activities.ZLjky0SAN3L2Afkr.description.value` | L'attività contiene il testo dei tiri salvezza e delle malattie di `Contagion`, estraneo a `Flesh to Stone`. | Tradotto fedelmente il campo sorgente; nessuna regola è stata sostituita o inventata. |
