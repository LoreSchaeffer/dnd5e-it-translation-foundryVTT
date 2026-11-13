import assert from "node:assert/strict";
import test from "node:test";

import { translateMonsterPattern } from "../scripts/lib/monster-patterns.mjs";

test("translates legacy monster multiattack while preserving the embedded item roll", () => {
  assert.equal(
    translateMonsterPattern("<p>The [[lookup @name lowercase]]{monster} makes two [[/item .abc123]]{tail} attacks.</p>"),
    "<p>Il [[lookup @name lowercase]]{mostro} effettua due attacchi con [[/item .abc123]]{Coda}.</p>"
  );
  assert.equal(
    translateMonsterPattern("<p>The [[lookup @name lowercase]]{monster} makes one [[/item .def456]]{unarmed strike}.</p>"),
    "<p>Il [[lookup @name lowercase]]{mostro} effettua un [[/item .def456]]{Colpo Senz'Armi}.</p>"
  );
});

test("refuses unknown labels and near-match prose", () => {
  assert.equal(
    translateMonsterPattern("<p>The [[lookup @name lowercase]]{monster} makes two [[/item .abc123]]{unknown strike} attacks.</p>"),
    undefined
  );
  assert.equal(
    translateMonsterPattern("<p>The [[lookup @name lowercase]]{monster} makes two tail attacks.</p>"),
    undefined
  );
});
