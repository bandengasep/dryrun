export type CodeLang = "python" | "sql";

export type TokenType = "keyword" | "string" | "comment" | "number" | "function" | "text";

export interface Token {
  text: string;
  type: TokenType;
}

const PYTHON_KEYWORDS = [
  "def", "return", "print", "pass", "if", "elif", "else", "for", "while", "in", "import",
  "from", "class", "try", "except", "finally", "with", "as", "lambda", "True", "False",
  "None", "and", "or", "not", "is", "yield", "break", "continue", "global", "nonlocal",
  "raise", "assert", "del", "async", "await", "self",
];

const SQL_KEYWORDS = [
  "SELECT", "FROM", "WHERE", "JOIN", "INNER", "LEFT", "RIGHT", "OUTER", "ON", "GROUP", "BY",
  "ORDER", "HAVING", "INSERT", "INTO", "VALUES", "UPDATE", "SET", "DELETE", "CREATE", "TABLE",
  "ALTER", "DROP", "AS", "AND", "OR", "NOT", "NULL", "IS", "LIKE", "IN", "LIMIT", "OFFSET",
  "DISTINCT", "CASE", "WHEN", "THEN", "END", "ASC", "DESC", "UNION", "ALL", "EXISTS",
  "BETWEEN", "DEFAULT", "PRIMARY", "KEY", "FOREIGN", "REFERENCES",
];

function buildRegex(lang: CodeLang): RegExp {
  const keywords = lang === "python" ? PYTHON_KEYWORDS : SQL_KEYWORDS;
  const keywordPattern = keywords.join("|");
  const comment = lang === "python" ? "#.*" : "--.*";
  const string =
    lang === "python"
      ? `"""[\\s\\S]*?"""|'''[\\s\\S]*?'''|"(?:[^"\\\\]|\\\\.)*"|'(?:[^'\\\\]|\\\\.)*'`
      : `'(?:[^'\\\\]|\\\\.)*'`;
  const number = `\\b\\d+(?:\\.\\d+)?\\b`;
  const func = `\\b[A-Za-z_][A-Za-z0-9_]*(?=\\s*\\()`;
  const keyword = `\\b(?:${keywordPattern})\\b`;

  return new RegExp(
    `(?<comment>${comment})|(?<string>${string})|(?<keyword>${keyword})|(?<func>${func})|(?<number>${number})`,
    lang === "sql" ? "gi" : "g"
  );
}

export function tokenize(code: string, lang: CodeLang): Token[] {
  const regex = buildRegex(lang);
  const tokens: Token[] = [];
  let lastIndex = 0;

  for (const match of code.matchAll(regex)) {
    const index = match.index ?? 0;
    if (index > lastIndex) {
      tokens.push({ text: code.slice(lastIndex, index), type: "text" });
    }

    const groups = match.groups ?? {};
    const type: TokenType = groups.comment
      ? "comment"
      : groups.string
        ? "string"
        : groups.keyword
          ? "keyword"
          : groups.func
            ? "function"
            : groups.number
              ? "number"
              : "text";

    tokens.push({ text: match[0], type });
    lastIndex = index + match[0].length;
  }

  if (lastIndex < code.length) {
    tokens.push({ text: code.slice(lastIndex), type: "text" });
  }

  return tokens;
}
