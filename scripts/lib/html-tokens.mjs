const VOID_TAGS = new Set([
  "area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"
]);

function readRawTokens(text) {
  const rawTokens = [];
  const errors = [];
  let index = 0;

  while (index < text.length) {
    if (text[index] !== "<") {
      index += 1;
      continue;
    }

    if (text.startsWith("<!--", index)) {
      const end = text.indexOf("-->", index + 4);
      if (end < 0) {
        errors.push(`Unclosed HTML comment at ${index}`);
        break;
      }
      rawTokens.push(text.slice(index, end + 3));
      index = end + 3;
      continue;
    }

    if (!/[A-Za-z!/]/.test(text[index + 1] ?? "")) {
      index += 1;
      continue;
    }

    let quote = null;
    let cursor = index + 1;
    for (; cursor < text.length; cursor += 1) {
      const character = text[cursor];
      if (quote) {
        if (character === quote) quote = null;
      } else if (character === '"' || character === "'") {
        quote = character;
      } else if (character === ">") {
        break;
      }
    }
    if (cursor >= text.length) {
      errors.push(`Unclosed HTML tag at ${index}`);
      break;
    }
    rawTokens.push(text.slice(index, cursor + 1));
    index = cursor + 1;
  }

  return { rawTokens, errors };
}

function parseAttributes(text, offset, errors) {
  const attributes = [];
  let index = 0;
  while (index < text.length) {
    while (/\s/.test(text[index] ?? "")) index += 1;
    if (index >= text.length) break;

    const nameStart = index;
    while (index < text.length && !/[\s=]/.test(text[index])) index += 1;
    const name = text.slice(nameStart, index);
    while (/\s/.test(text[index] ?? "")) index += 1;
    let value = null;
    let quote = null;

    if (text[index] === "=") {
      index += 1;
      while (/\s/.test(text[index] ?? "")) index += 1;
      if (text[index] === '"' || text[index] === "'") {
        quote = text[index++];
        const valueStart = index;
        while (index < text.length && text[index] !== quote) index += 1;
        if (index >= text.length) {
          errors.push(`Unclosed attribute quote at ${offset + valueStart - 1}`);
          value = text.slice(valueStart);
        } else {
          value = text.slice(valueStart, index);
          index += 1;
        }
      } else {
        const valueStart = index;
        while (index < text.length && !/\s/.test(text[index])) index += 1;
        value = text.slice(valueStart, index);
      }
    }

    if (name) attributes.push({ name, value, quote });
  }
  return attributes;
}

function parseToken(raw, errors) {
  if (raw.startsWith("<!--")) return { kind: "comment", name: "!--", selfClosing: true, attributes: [{ name: "raw", value: raw, quote: null }] };
  const inner = raw.slice(1, -1).trim();
  if (inner.startsWith("!")) return { kind: "declaration", name: inner.split(/\s/, 1)[0], selfClosing: true, attributes: [{ name: "raw", value: raw, quote: null }] };
  if (inner.startsWith("/")) return { kind: "close", name: inner.slice(1).trim(), selfClosing: false, attributes: [] };

  const selfClosing = /\/\s*$/.test(inner);
  const body = selfClosing ? inner.replace(/\/\s*$/, "") : inner;
  const nameMatch = body.match(/^([^\s]+)/);
  const name = nameMatch?.[1] ?? "";
  const attributeText = body.slice(name.length);
  return {
    kind: "open",
    name,
    selfClosing,
    attributes: parseAttributes(attributeText, raw.indexOf(attributeText), errors)
  };
}

export function scanHtml(text) {
  const { rawTokens, errors } = readRawTokens(text);
  const tokens = rawTokens.map(raw => parseToken(raw, errors));
  const stack = [];

  for (const token of tokens) {
    const name = token.name.toLowerCase();
    if (token.kind === "open" && !token.selfClosing && !VOID_TAGS.has(name)) {
      stack.push(name);
    } else if (token.kind === "close") {
      const expected = stack.pop();
      if (expected !== name) errors.push(`Closing tag </${token.name}> does not match <${expected ?? "none"}>`);
    }
  }
  if (stack.length) errors.push(`Unclosed HTML tags: ${stack.join(", ")}`);

  return { tokens, rawTokens, errors };
}
