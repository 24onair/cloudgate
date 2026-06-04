import React from "react";

/**
 * 의존성 없는 경량 마크다운 렌더러.
 * 법적 문서(약관·개인정보·환불정책)에 쓰인 GFM 부분집합만 지원한다:
 * 제목(#/##/###), 단락, **굵게**, 순서/비순서 목록(1단계 중첩), 표, 구분선(---),
 * 인용(>), 코드펜스(```). 서버 컴포넌트에서 그대로 렌더 가능.
 */

// ── 인라인: **굵게** 처리 ───────────────────────────────────────────
function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /\*\*(.+?)\*\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    parts.push(
      <strong key={`${keyPrefix}-b${i++}`} style={{ fontWeight: 700, color: "#23251d" }}>
        {m[1]}
      </strong>,
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

interface ListItem {
  ordered: boolean;
  marker: string;
  text: string;
  children: ListItem[];
}

const HR = { borderColor: "rgba(35,37,29,0.12)" } as const;

export function Markdown({ source }: { source: string }) {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const blocks: React.ReactNode[] = [];
  let i = 0;
  let key = 0;
  const k = () => `md-${key++}`;

  const isTableSep = (s: string) => /^\s*\|?[\s:|-]+\|?\s*$/.test(s) && s.includes("-");
  const listMatch = (s: string) =>
    /^(\s*)(\d+)\.\s+(.*)$/.exec(s) ?? /^(\s*)([-*])\s+(.*)$/.exec(s);

  while (i < lines.length) {
    const line = lines[i];

    // 빈 줄
    if (line.trim() === "") { i++; continue; }

    // 코드펜스 ```
    if (/^\s*```/.test(line)) {
      const buf: string[] = [];
      i++;
      while (i < lines.length && !/^\s*```/.test(lines[i])) { buf.push(lines[i]); i++; }
      i++; // 닫는 ```
      blocks.push(
        <pre key={k()} style={{
          background: "#f1f2ec", border: "1px solid rgba(35,37,29,0.1)", borderRadius: 10,
          padding: "12px 14px", overflowX: "auto", fontSize: 13, lineHeight: 1.6,
          color: "#3a3c33", margin: "12px 0",
        }}>
          <code>{buf.join("\n")}</code>
        </pre>,
      );
      continue;
    }

    // 구분선 ---
    if (/^\s*---+\s*$/.test(line)) {
      blocks.push(<hr key={k()} style={{ ...HR, margin: "24px 0", borderTop: "1px solid rgba(35,37,29,0.12)" }} />);
      i++;
      continue;
    }

    // 제목
    const h = /^(#{1,3})\s+(.*)$/.exec(line);
    if (h) {
      const level = h[1].length;
      const content = renderInline(h[2], k());
      const style: React.CSSProperties =
        level === 1 ? { fontSize: 24, fontWeight: 800, margin: "8px 0 16px", color: "#23251d" }
        : level === 2 ? { fontSize: 19, fontWeight: 700, margin: "28px 0 10px", color: "#23251d" }
        : { fontSize: 16, fontWeight: 700, margin: "20px 0 8px", color: "#3a3c33" };
      blocks.push(
        level === 1 ? <h1 key={k()} style={style}>{content}</h1>
        : level === 2 ? <h2 key={k()} style={style}>{content}</h2>
        : <h3 key={k()} style={style}>{content}</h3>,
      );
      i++;
      continue;
    }

    // 인용 >
    if (/^\s*>\s?/.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
        buf.push(lines[i].replace(/^\s*>\s?/, ""));
        i++;
      }
      blocks.push(
        <blockquote key={k()} style={{
          borderLeft: "3px solid #F54E00", background: "#faf6f2",
          padding: "10px 14px", margin: "14px 0", borderRadius: "0 8px 8px 0",
          color: "#4d4f46", fontSize: 14, lineHeight: 1.7,
        }}>
          {renderInline(buf.join(" "), k())}
        </blockquote>,
      );
      continue;
    }

    // 표 (현재 줄이 |로 시작하고 다음 줄이 구분선)
    if (/^\s*\|/.test(line) && i + 1 < lines.length && isTableSep(lines[i + 1])) {
      const splitRow = (s: string) =>
        s.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
      const header = splitRow(line);
      i += 2; // 헤더 + 구분선
      const rows: string[][] = [];
      while (i < lines.length && /^\s*\|/.test(lines[i])) {
        rows.push(splitRow(lines[i]));
        i++;
      }
      blocks.push(
        <div key={k()} style={{ overflowX: "auto", margin: "14px 0" }}>
          <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 13.5 }}>
            <thead>
              <tr>
                {header.map((c, ci) => (
                  <th key={ci} style={{
                    border: "1px solid rgba(35,37,29,0.12)", padding: "8px 10px",
                    background: "#eeefe9", textAlign: "left", fontWeight: 700, color: "#23251d",
                    whiteSpace: "nowrap",
                  }}>{renderInline(c, `${k()}-th${ci}`)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, ri) => (
                <tr key={ri}>
                  {r.map((c, ci) => (
                    <td key={ci} style={{
                      border: "1px solid rgba(35,37,29,0.1)", padding: "8px 10px",
                      color: "#4d4f46", verticalAlign: "top",
                    }}>{renderInline(c, `${k()}-td${ri}-${ci}`)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }

    // 목록 (순서/비순서, 1단계 중첩)
    if (listMatch(line)) {
      const items: ListItem[] = [];
      while (i < lines.length && listMatch(lines[i])) {
        const mm = listMatch(lines[i])!;
        const indent = mm[1].length;
        const ordered = /\d/.test(mm[2]);
        const item: ListItem = { ordered, marker: mm[2], text: mm[3], children: [] };
        if (indent >= 2 && items.length > 0) {
          items[items.length - 1].children.push(item);
        } else {
          items.push(item);
        }
        i++;
      }
      blocks.push(renderList(items, k()));
      continue;
    }

    // 단락 (연속된 일반 줄 묶기)
    const buf: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !/^\s*(#{1,3}\s|---+\s*$|>\s?|```|\|)/.test(lines[i]) &&
      !listMatch(lines[i])
    ) {
      buf.push(lines[i].trim());
      i++;
    }
    if (buf.length) {
      blocks.push(
        <p key={k()} style={{ margin: "10px 0", lineHeight: 1.8, color: "#4d4f46", fontSize: 14.5 }}>
          {renderInline(buf.join(" "), k())}
        </p>,
      );
    }
  }

  return <div>{blocks}</div>;
}

function renderList(items: ListItem[], keyBase: string): React.ReactNode {
  const ordered = items[0]?.ordered ?? false;
  const Tag = ordered ? "ol" : "ul";
  return (
    <Tag key={keyBase} style={{
      margin: "10px 0", paddingLeft: 22, lineHeight: 1.8, color: "#4d4f46", fontSize: 14.5,
      listStyleType: ordered ? "decimal" : "disc",
    }}>
      {items.map((it, idx) => (
        <li key={`${keyBase}-${idx}`} style={{ margin: "4px 0" }}>
          {renderInline(it.text, `${keyBase}-${idx}`)}
          {it.children.length > 0 && renderList(it.children, `${keyBase}-${idx}-c`)}
        </li>
      ))}
    </Tag>
  );
}
