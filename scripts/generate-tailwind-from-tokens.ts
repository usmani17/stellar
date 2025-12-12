import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { formatHex } from "culori";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type AnyObj = Record<string, any>;

function oklchToHex(v: string): string {
  try {
    const hex = formatHex(v);
    return hex ? hex.toUpperCase() : v;
  } catch {
    return v;
  }
}

function isToken(v: any): v is { $value: any } {
  return !!v && typeof v === "object" && "$value" in v;
}

function isRef(v: any): v is string {
  return typeof v === "string" && /^\{[^}]+\}$/.test(v.trim());
}

function getByPath(root: AnyObj, dotPath: string): any {
  return dotPath.split(".").reduce((acc, k) => acc?.[k], root);
}

function resolveValue(tokensRoot: AnyObj, value: any, depth = 0): any {
  if (depth > 20) return value;

  if (typeof value !== "string") return value;

  const trimmed = value.trim();

  if (isRef(trimmed)) {
    const refPath = trimmed.slice(1, -1);
    const refObj = getByPath(tokensRoot, refPath);
    if (!refObj) return value;

    if (isToken(refObj)) return resolveValue(tokensRoot, refObj.$value, depth + 1);
    if (typeof refObj === "string") return resolveValue(tokensRoot, refObj, depth + 1);

    return refObj;
  }

  if (trimmed.startsWith("oklch")) return oklchToHex(trimmed);

  return trimmed;
}

function tokenTreeToPlain(tokensRoot: AnyObj, node: AnyObj): AnyObj {
  const out: AnyObj = {};
  for (const [k, v] of Object.entries(node || {})) {
    if (isToken(v)) {
      out[k] = resolveValue(tokensRoot, v.$value);
      continue;
    }
    if (v && typeof v === "object" && !Array.isArray(v)) {
      const child = tokenTreeToPlain(tokensRoot, v);
      if (Object.keys(child).length) out[k] = child;
    }
  }
  return out;
}

function flattenToVars(
  node: any,
  prefix: string[],
  vars: string[]
) {
  if (node == null) return;

  if (typeof node === "string" || typeof node === "number") {
    const name = `--${prefix.join("-")}`;
    vars.push(`  ${name}: ${String(node)};`);
    return;
  }

  if (Array.isArray(node)) {
    // for font family arrays
    const name = `--${prefix.join("-")}`;
    vars.push(`  ${name}: ${node.map((x) => (typeof x === "string" ? `"${x}"` : x)).join(", ")};`);
    return;
  }

  if (typeof node === "object") {
    for (const [k, v] of Object.entries(node)) {
      flattenToVars(v, [...prefix, k], vars);
    }
  }
}

function generateThemeCss(tokens: AnyObj) {
  // read sets
  const core = tokens.core || {};
  const semantic = tokens.semantic || {};
  const typography = tokens.typography || {};

  // convert to plain values
  const coreColors = tokenTreeToPlain(tokens, core.color || {});
  const semanticColors = tokenTreeToPlain(tokens, semantic.color || {});
  const radius = tokenTreeToPlain(tokens, core.radius || {});
  const spacing = tokenTreeToPlain(tokens, core.spacing || {});

  const fontFamily = tokenTreeToPlain(tokens, typography.fontFamily || {});
  const letterSpacing = tokenTreeToPlain(tokens, typography.letterSpacing || {});
  const textStyle = tokenTreeToPlain(tokens, typography.textStyle || {});

  // optional, merge neutralVariant into neutral so you can use --color-neutral-n10
  if (coreColors.neutralVariant && coreColors.neutral) {
    coreColors.neutral = { ...coreColors.neutral, ...coreColors.neutralVariant };
    delete coreColors.neutralVariant;
  }

  const vars: string[] = [];

  // colors
  flattenToVars(coreColors, ["color"], vars);
  flattenToVars(semanticColors, ["color", "semantic"], vars);

  // radius
  flattenToVars(radius, ["radius"], vars);

  // spacing
  flattenToVars(spacing, ["spacing"], vars);

  // typography
  flattenToVars(fontFamily, ["font", "family"], vars);
  flattenToVars(letterSpacing, ["letter", "spacing"], vars);

  // text styles become multiple vars per style
  // Example style h500: { fontSize, lineHeight, letterSpacing }
  for (const [styleName, style] of Object.entries(textStyle)) {
    if (!style || typeof style !== "object") continue;
    const fsVal = (style as any).fontSize;
    const lhVal = (style as any).lineHeight;
    const lsVal = (style as any).letterSpacing;

    if (fsVal) vars.push(`  --font-size-${styleName}: ${fsVal};`);
    if (lhVal) vars.push(`  --line-height-${styleName}: ${lhVal};`);
    if (lsVal != null) vars.push(`  --letter-spacing-${styleName}: ${lsVal};`);
  }

  const header = [
    "/* Auto-generated, do not edit by hand */",
    "/* Source: tokens/tokens.json */",
    "/* Run: npm run generate:theme */",
    ""
  ].join("\n");

  const themeBlock = `@theme {\n${vars.join("\n")}\n}\n`;

  return `${header}${themeBlock}`;
}

function run() {
    const tokensPath = path.join(__dirname, '../src/assets/global.json');
    if (!fs.existsSync(tokensPath)) {
    throw new Error(`tokens.json not found at ${tokensPath}`);
  }
  const tokens = JSON.parse(fs.readFileSync(tokensPath, "utf-8"));

  const outCss = generateThemeCss(tokens);

  const outPath = path.join(__dirname, "../src/styles/theme.generated.css");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, outCss, "utf-8");

  console.log(`Generated ${outPath}`);
}

run();
