# Preservazione della formattazione Foundry

## Principio

La traduzione sostituisce solo testo visibile. JSON, HTML e sintassi Foundry
restano strutturalmente identici al sorgente dnd5e 6.0.6.

## Dati immutabili

Non modificare `_id`, UUID, chiavi JSON, `flags`, `folder`, `sort`, ownership,
`img`, `src`, enum, formule, identificatori di attività, chiavi Active Effect,
`mode`, `priority`, `transfer`, riferimenti e target di collegamenti.

## HTML

Conservare ordine, numero e nidificazione di tag; nomi, ordine e valori degli
attributi; classi, ID, stili, `data-*`, immagini, tabelle, liste, paragrafi e
blockquote. Non passare il testo attraverso Markdown o un serializer DOM.

Sicuro:

```html
<p class="note"><strong>Speed:</strong> 30 feet.</p>
<p class="note"><strong>Velocità:</strong> 9 metri.</p>
```

Non sicuro:

```html
<p class="nota"><b>Velocità:</b> 9 metri.</p>
```

Il secondo esempio cambia classe e tag.

## Sintassi Foundry

In `@UUID[target]{label}` si traduce solo `label`. Lo stesso vale per
`@Compendium`, `@Embed`, `@Check`, `@Save`, `@Damage`, `@Template` e
`@Condition`. Restano identici `[[...]]`, comandi slash, formule, placeholder,
Handlebars e riferimenti `Compendium.dnd5e...`.

Sicuro:

```text
@UUID[Compendium.dnd5e.items.Item.abc]{Longsword}
@UUID[Compendium.dnd5e.items.Item.abc]{Spada Lunga}
```

Non sicuro: cambiare `abc`, tradurre `Item` o riscrivere `1d20 + @mod`.

## Controlli

Eseguire:

```text
npm test
npm run audit -- --source C:/Users/lmlor/Desktop/dnd5e
```

L'audit confronta sequenza di tag, attributi, bilanciamento, target, roll,
formule, placeholder e conteggio dei token. Ogni mismatch è bloccante. Se un
frammento non si può allineare senza ricostruirlo, lasciarlo nel rapporto di
revisione anziché modificarlo arbitrariamente.
