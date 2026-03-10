/**
 * Safe formula evaluator for dashboard table custom columns.
 * Supports column references and arithmetic: +, -, *, /
 * No eval(); uses a simple tokenizer + recursive descent parser.
 * Safe: no code execution, no prototype access, division-by-zero returns null,
 * NaN/Infinity filtered, strict identifier whitelist.
 */

const MAX_FORMULA_LENGTH = 500;
const MAX_IDENT_LENGTH = 128;
const MAX_NUMBER = 1e15;
const MIN_NUMBER = -1e15;

/**
 * Evaluate a formula string against a row of data.
 * Formula syntax: column_ref, numeric literal, +, -, *, /, parentheses.
 * Returns number, or null if invalid/division by zero/NaN/Infinity.
 */
export function evaluateDashboardTableFormula(
  formula: string,
  row: Record<string, unknown>,
  availableKeys: string[]
): number | null {
  if (!formula || typeof formula !== "string") return null;
  const trimmed = formula.trim();
  if (!trimmed || trimmed.length > MAX_FORMULA_LENGTH) return null;
  if (typeof row !== "object" || row === null || !Array.isArray(availableKeys)) return null;

  try {
    const tokens = tokenize(trimmed);
    const ast = parseExpression(tokens);
    const result = evaluateAst(ast, row, availableKeys);
    if (result === null) return null;
    if (!Number.isFinite(result)) return null;
    if (result > MAX_NUMBER || result < MIN_NUMBER) return null;
    return result;
  } catch {
    return null;
  }
}

interface Token {
  type: "number" | "ident" | "op" | "lparen" | "rparen";
  value: string | number;
}

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < input.length) {
    const ch = input[i];
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    if (ch === "(") {
      tokens.push({ type: "lparen", value: "(" });
      i++;
      continue;
    }
    if (ch === ")") {
      tokens.push({ type: "rparen", value: ")" });
      i++;
      continue;
    }
    if (/[+\-/*]/.test(ch)) {
      tokens.push({ type: "op", value: ch });
      i++;
      continue;
    }
    if (/\d/.test(ch) || (ch === "." && /\d/.test(input[i + 1]))) {
      let num = "";
      while (i < input.length && num.length < 30 && /[\d.eE+-]/.test(input[i])) {
        num += input[i];
        i++;
      }
      const n = parseFloat(num);
      const safe = Number.isFinite(n) ? Math.max(MIN_NUMBER, Math.min(MAX_NUMBER, n)) : 0;
      tokens.push({ type: "number", value: safe });
      continue;
    }
    if (/[a-zA-Z_]/.test(ch)) {
      let ident = "";
      while (i < input.length && ident.length < MAX_IDENT_LENGTH && /[a-zA-Z0-9_.]/.test(input[i])) {
        ident += input[i];
        i++;
      }
      if (ident.length > 0) tokens.push({ type: "ident", value: ident });
      continue;
    }
    i++;
  }
  return tokens;
}

type AstNode =
  | { type: "number"; value: number }
  | { type: "ident"; value: string }
  | { type: "binary"; op: string; left: AstNode; right: AstNode }
  | { type: "unary"; op: string; operand: AstNode };

function parseExpression(tokens: Token[]): AstNode {
  let pos = 0;

  function peek(): Token | undefined {
    return tokens[pos];
  }

  function consume(): Token | undefined {
    return tokens[pos++];
  }

  function parsePrimary(): AstNode {
    const t = consume();
    if (!t) throw new Error("Unexpected end");
    if (t.type === "number") {
      return { type: "number", value: t.value as number };
    }
    if (t.type === "ident") {
      return { type: "ident", value: t.value as string };
    }
    if (t.type === "lparen") {
      const inner = parseAdd();
      const r = consume();
      if (!r || r.type !== "rparen") throw new Error("Missing )");
      return inner;
    }
    if (t.type === "op" && (t.value === "+" || t.value === "-")) {
      const operand = parsePrimary();
      return { type: "unary", op: t.value as string, operand };
    }
    throw new Error("Invalid token");
  }

  function parseMul(): AstNode {
    let left = parsePrimary();
    for (;;) {
      const p = peek();
      if (p && p.type === "op" && (p.value === "*" || p.value === "/")) {
        consume();
        const right = parsePrimary();
        left = { type: "binary", op: p.value as string, left, right };
      } else {
        break;
      }
    }
    return left;
  }

  function parseAdd(): AstNode {
    let left = parseMul();
    for (;;) {
      const p = peek();
      if (p && p.type === "op" && (p.value === "+" || p.value === "-")) {
        consume();
        const right = parseMul();
        left = { type: "binary", op: p.value as string, left, right };
      } else {
        break;
      }
    }
    return left;
  }

  const result = parseAdd();
  if (pos < tokens.length) throw new Error("Unexpected token (e.g. unmatched )");
  return result;
}

function evaluateAst(
  ast: AstNode,
  row: Record<string, unknown>,
  availableKeys: string[]
): number | null {
  if (ast.type === "number") return ast.value;
  if (ast.type === "ident") {
    const key = resolveColumnKey(ast.value, availableKeys);
    if (!key || !availableKeys.includes(key)) return null;
    if (!(key in row)) return null;
    const v = row[key];
    if (v === null || v === undefined) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  if (ast.type === "unary") {
    const v = evaluateAst(ast.operand, row, availableKeys);
    if (v === null) return null;
    return ast.op === "-" ? -v : v;
  }
  if (ast.type === "binary") {
    const left = evaluateAst(ast.left, row, availableKeys);
    const right = evaluateAst(ast.right, row, availableKeys);
    if (left === null || right === null) return null;
    let result: number;
    switch (ast.op) {
      case "+":
        result = left + right;
        break;
      case "-":
        result = left - right;
        break;
      case "*":
        result = left * right;
        break;
      case "/":
        if (right === 0) return null;
        result = left / right;
        break;
      default:
        return null;
    }
    return Number.isFinite(result) ? result : null;
  }
  return null;
}

function resolveColumnKey(ref: string, availableKeys: string[]): string {
  if (typeof ref !== "string" || ref.length > MAX_IDENT_LENGTH) return "";
  if (availableKeys.includes(ref)) return ref;
  const lastPart = ref.includes(".") ? ref.split(".").pop() ?? ref : ref;
  if (availableKeys.includes(lastPart)) return lastPart;
  return ref;
}

/** Get display segments for formula (column refs as tags, rest as text) */
export function getFormulaDisplaySegments(
  formula: string,
  availableKeys: string[]
): Array<{ type: "tag" | "text"; value: string }> {
  if (!formula) return [];
  const result: Array<{ type: "tag" | "text"; value: string }> = [];
  const re = /[a-zA-Z_][a-zA-Z0-9_.]*/g;
  let lastEnd = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(formula)) !== null) {
    if (m.index > lastEnd) {
      result.push({ type: "text", value: formula.slice(lastEnd, m.index) });
    }
    const ident = m[0];
    result.push({
      type: availableKeys.includes(ident) ? "tag" : "text",
      value: ident,
    });
    lastEnd = re.lastIndex;
  }
  if (lastEnd < formula.length) {
    result.push({ type: "text", value: formula.slice(lastEnd) });
  }
  return result;
}

/** Parse formula into display segments for tag-based UI */
export function parseFormulaToSegments(formula: string): Array<{ type: "ident" | "number" | "op"; value: string | number }> {
  if (!formula?.trim()) return [];
  try {
    const tokens = tokenize(formula.trim());
    return tokens
      .filter((t) => t.type !== "lparen" && t.type !== "rparen")
      .map((t) => ({
        type: t.type === "ident" ? "ident" : t.type === "number" ? "number" : "op",
        value: t.value,
      }));
  } catch {
    return [];
  }
}

/** Serialize segments back to formula string */
export function segmentsToFormula(
  segments: Array<{ type: string; value: string | number }>
): string {
  return segments.map((s) => String(s.value)).join(" ");
}

/** Validate formula syntax and column references; returns error message or null if valid */
export function validateDashboardTableFormula(
  formula: string,
  availableKeys: string[]
): string | null {
  if (!formula?.trim()) return "Formula is required";
  try {
    const tokens = tokenize(formula.trim());
    if (tokens.length === 0) return "Formula is empty";
    for (const t of tokens) {
      if (t.type === "ident" && !availableKeys.includes(t.value as string)) {
        return `"${t.value}" is not a valid column. Use column names from your data.`;
      }
    }
    parseExpression(tokens);
    return null;
  } catch {
    return "Invalid formula. Use column names, operators (+ - * /), and parentheses ()";
  }
}
