import DOMPurify from "dompurify";

const TAGS = ["p","strong","em","b","i","ul","ol","li","code","pre","table","thead","tbody","tr","th","td","img","a","br","span","h3","h4","div"];
const looksLikeHtml = (s) => /<[a-z][\s\S]*>/i.test(s);

/** Renders plain text (line breaks kept) or sanitised HTML. */
export default function RichText({ text, className = "" }) {
  const t = String(text ?? "");
  if (looksLikeHtml(t)) {
    return (
      <div className={`question-html-content ${className}`}
        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(t, { ALLOWED_TAGS: TAGS, ALLOWED_ATTR: ["href", "src", "alt", "class", "target", "rel"] }) }} />
    );
  }
  return <div className={className}>{t.split("\n").map((l, i) => <p key={i}>{l}</p>)}</div>;
}
