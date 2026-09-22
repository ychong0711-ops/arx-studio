"use client";

import { useMemo, type ReactNode } from "react";

/* ── XML 라인 렌더러 ─────────────────────────────── */
function renderXmlLine(line: string, key: number): ReactNode {
  const parts: ReactNode[] = [];
  let rest = line;
  let k = 0;
  const tagRe = /(<\/?[!]?)([A-Za-z0-9-]+)((?:(?:"[^"]*")|[^">])*)(\/?>)/;
  while (rest.length > 0) {
    const m = rest.match(tagRe);
    if (!m || m.index === undefined) {
      if (rest.trim()) parts.push(<span key={k++} className="text-[#a8d8a2]">{rest}</span>);
      else parts.push(rest);
      break;
    }
    if (m.index > 0) {
      const text = rest.slice(0, m.index);
      if (text.trim()) parts.push(<span key={k++} className="text-[#a8d8a2]">{text}</span>);
      else parts.push(text);
    }
    const [, open, tagName, attrsRaw, close] = m;
    parts.push(
      <span key={k++} className="text-fog/70">{open}</span>,
      <span key={k++} className="text-accent">{tagName}</span>,
    );
    if (attrsRaw) {
      const attrRe = /([A-Za-z-]+)(=)("[^"]*")/g;
      let last = 0;
      let am: RegExpExecArray | null;
      while ((am = attrRe.exec(attrsRaw)) !== null) {
        if (am.index > last) parts.push(attrsRaw.slice(last, am.index));
        parts.push(
          <span key={k++} className="text-amberx">{am[1]}</span>,
          <span key={k++} className="text-fog/70">{am[2]}</span>,
          <span key={k++} className="text-[#c8a7f5]">{am[3]}</span>,
        );
        last = attrRe.lastIndex;
      }
      if (last < attrsRaw.length) parts.push(attrsRaw.slice(last));
    }
    parts.push(<span key={k++} className="text-fog/70">{close}</span>);
    rest = rest.slice(m.index + m[0].length);
  }
  return parts;
}

/* ── C 라인 렌더러 ───────────────────────────────── */
const C_KEYWORDS = new Set([
  "extern",
  "void",
  "typedef",
  "static",
  "const",
  "struct",
  "return",
  "if",
  "else",
  "for",
  "while",
  "include",
  "define",
  "ifndef",
  "endif",
  "pragma",
]);
const C_TYPE_RE = /^(u?int(8|16|32|64)|sint(8|16|32|64)|float(32|64)|boolean|Std_ReturnType|Std_TransformerForwardCode)$/;

function renderCLine(line: string, key: number): ReactNode {
  const parts: ReactNode[] = [];
  let k = 0;
  // 주석 라인
  const trimmed = line.trimStart();
  if (trimmed.startsWith("/*") || trimmed.startsWith("*") || trimmed.startsWith("//")) {
    return <span className="text-fog/55 italic">{line}</span>;
  }
  // 전처리기
  if (trimmed.startsWith("#")) {
    const m = line.match(/^(\s*)(#\w+)(.*)$/);
    if (m) {
      parts.push(m[1]);
      parts.push(
        <span key={k++} className="text-rose">{m[2]}</span>,
        <span key={k++} className="text-[#c8a7f5]">{m[3]}</span>,
      );
      return parts;
    }
  }
  const tokenRe = /("(?:[^"\\]|\\.)*")|(\/\*.*?\*\/)|([A-Za-z_][A-Za-z0-9_]*)|(\s+|.)/g;
  let m: RegExpExecArray | null;
  while ((m = tokenRe.exec(line)) !== null) {
    const [str, strTok, commentTok, ident, other] = m;
    if (str !== undefined) {
      if (strTok) parts.push(<span key={k++} className="text-[#a8d8a2]">{strTok}</span>);
      else if (commentTok) parts.push(<span key={k++} className="text-fog/55 italic">{commentTok}</span>);
      else if (ident) {
        if (C_KEYWORDS.has(ident)) parts.push(<span key={k++} className="text-accent">{ident}</span>);
        else if (C_TYPE_RE.test(ident)) parts.push(<span key={k++} className="text-mint">{ident}</span>);
        else if (/^Rte_/.test(ident)) parts.push(<span key={k++} className="text-amberx">{ident}</span>);
        else parts.push(<span key={k++} className="text-mist">{ident}</span>);
      } else parts.push(other);
    }
  }
  return parts;
}

export function CodeView({
  code,
  lang,
  maxHeight,
}: {
  code: string;
  lang: "xml" | "c" | "h";
  maxHeight?: string;
}) {
  const lines = useMemo(() => code.split("\n"), [code]);
  return (
    <div
      className="overflow-auto bg-ink-900/70 px-4 py-3 font-mono text-[11.5px] leading-[1.65]"
      style={maxHeight ? { maxHeight } : undefined}
    >
      {lines.map((line, i) => (
        <div key={i} className="flex">
          <span className="w-11 shrink-0 pr-4 text-right text-fog/30 select-none">
            {i + 1}
          </span>
          <span className="whitespace-pre-wrap">
            {lang === "xml" ? renderXmlLine(line, i) : renderCLine(line, i)}
          </span>
        </div>
      ))}
    </div>
  );
}
