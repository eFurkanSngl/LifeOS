import { Fragment, type ReactNode } from "react";
// Text is always rendered through React. Raw HTML and remote images are never executed.
function inline(value: string): ReactNode[] {
  return value
    .split(/(`[^`]+`|\*\*[^*]+\*\*|\[[^\]]+\]\(https:\/\/[^\s)]+\))/g)
    .map((part, i) => {
      if (part.startsWith("`")) return <code key={i}>{part.slice(1, -1)}</code>;
      if (part.startsWith("**"))
        return <strong key={i}>{part.slice(2, -2)}</strong>;
      // Links remain readable text, so preview never opens unvalidated destinations.
      return <Fragment key={i}>{part}</Fragment>;
    });
}
export function Markdown({ body }: { body: string }) {
  let fenced = false;
  return (
    <div className="markdown-preview">
      {body.split("\n").map((line, i) => {
        if (line.startsWith("```")) {
          fenced = !fenced;
          return null;
        }
        if (fenced)
          return (
            <pre key={i}>
              <code>{line}</code>
            </pre>
          );
        if (line.startsWith("### "))
          return <h4 key={i}>{inline(line.slice(4))}</h4>;
        if (line.startsWith("## "))
          return <h3 key={i}>{inline(line.slice(3))}</h3>;
        if (line.startsWith("# "))
          return <h2 key={i}>{inline(line.slice(2))}</h2>;
        if (/^[-*] /.test(line))
          return <p key={i}>• {inline(line.slice(2))}</p>;
        return <p key={i}>{inline(line) || "\u00a0"}</p>;
      })}
    </div>
  );
}
