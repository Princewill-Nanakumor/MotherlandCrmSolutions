#!/usr/bin/env node
/**
 * Tailwind v4: important modifier moves to suffix (!cls -> cls!)
 * Gradients: bg-gradient-to-* -> bg-linear-to-*
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const EXT = new Set([".tsx", ".jsx", ".css"]);

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const name of fs.readdirSync(dir)) {
    if (name === "node_modules" || name.startsWith(".")) continue;
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, acc);
    else if (EXT.has(path.extname(name))) acc.push(p);
  }
  return acc;
}

function fixGradients(str) {
  const dirs = ["r", "l", "t", "b", "tr", "tl", "br", "bl"];
  let out = str;
  for (const d of dirs) {
    out = out.split(`bg-gradient-to-${d}`).join(`bg-linear-to-${d}`);
  }
  return out;
}

/** Move prefix ! on the final utility segment to suffix (v4) */
function fixImportantToken(token) {
  const t0 = token.trim();
  if (!t0 || t0.includes("${")) return token;
  if (t0 === "!important" || t0 === "important") return token;
  let t = t0;
  let hadSuffixBang = false;
  if (t.endsWith("!")) {
    hadSuffixBang = true;
    t = t.slice(0, -1);
  }
  const parts = t.split(":");
  const lastIdx = parts.length - 1;
  const last = parts[lastIdx];
  if (last.startsWith("!")) {
    parts[lastIdx] = last.slice(1);
    return parts.join(":") + "!";
  }
  if (hadSuffixBang) return parts.join(":") + "!";
  return parts.join(":");
}

function fixClassChunk(chunk) {
  return fixGradients(chunk)
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => fixImportantToken(w))
    .join(" ");
}

function transformQuotedClassnames(content) {
  let out = content;

  const applyToInner = (inner) => {
    if (!inner.includes("!") && !inner.includes("bg-gradient-to-")) {
      return inner;
    }
    if (inner.includes("${")) {
      // Only fix static class segments between ${ }; skip JS (? ternary, !foo booleans, comments)
      return inner.replace(/([^${]+)/g, (seg) => {
        if (seg.includes("//") || /[?(){},;]/.test(seg)) return seg;
        if (!seg.includes("!") && !seg.includes("bg-gradient-to-")) return seg;
        return fixClassChunk(seg);
      });
    }
    return fixClassChunk(inner);
  };

  out = out.replace(/className="([^"]*)"/g, (_, inner) => {
    return `className="${applyToInner(inner)}"`;
  });
  out = out.replace(/className='([^']*)'/g, (_, inner) => {
    return `className='${applyToInner(inner)}'`;
  });
  out = out.replace(/className=\{`([^`]*)`\}/g, (_, inner) => {
    return `className={\`${applyToInner(inner)}\`}`;
  });
  return out;
}

function looksLikeUtilityString(inner) {
  if (!inner || inner.includes("${") || inner.includes("\n")) return false;
  // * for arbitrary variants; ' for [&_*:not([class*='x'])] in class strings
  if (!/^[\w\s:!\[\]/.%*(),'-]+$/.test(inner)) return false;
  if (inner.includes("bg-gradient-to-")) return true;
  // variant-prefixed important, e.g. dark:!text-white
  if (/(?:^|\s)(?:[\w\[\]-]+):!/.test(inner)) return true;
  // leading important on utility (not !important CSS keyword alone)
  if (/(?:^|\s)![a-z@]/.test(inner)) return true;
  return false;
}

/** Ternary / helper returns: "foo bar" strings that are class lists */
function transformLooseClassStrings(content) {
  let out = content;
  for (const q of ['"', "'"]) {
    const re =
      q === '"'
        ? /"([^"\\]*)"/g
        : /'([^'\\]*)'/g;
    out = out.replace(re, (m, inner) => {
      if (!looksLikeUtilityString(inner)) return m;
      return q + fixClassChunk(inner) + q;
    });
  }
  return out;
}

function transformFile(content) {
  let out = fixGradients(content);
  out = transformQuotedClassnames(out);
  out = transformLooseClassStrings(out);
  return out;
}

const targets = [
  path.join(ROOT, "src"),
  path.join(ROOT, "app"),
  path.join(ROOT, "components"),
].filter((d) => fs.existsSync(d));

const files = targets.flatMap((d) => walk(d));
let changed = 0;
for (const file of files) {
  const before = fs.readFileSync(file, "utf8");
  const after = transformFile(before);
  if (after !== before) {
    fs.writeFileSync(file, after);
    changed++;
    console.log(path.relative(ROOT, file));
  }
}
console.log(`Updated ${changed} file(s).`);
