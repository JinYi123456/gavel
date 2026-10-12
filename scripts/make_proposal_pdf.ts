// Renders submission/proposal.md into the branded submission PDF.
// Usage: node scripts/make_proposal_pdf.ts
// Output: submission/GAVEL-proposal.pdf (+ submission/proposal.html for the record)

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { marked } from "marked";
import { chromium } from "playwright";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
mkdirSync(join(root, "submission"), { recursive: true });

const md = readFileSync(join(root, "submission/proposal.md"), "utf8");
const body = await marked.parse(md, { gfm: true });

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,700;9..144,900&family=Inter:wght@400;500;600&family=Special+Elite&display=swap" rel="stylesheet">
<style>
  :root {
    --ink: #241c12;
    --ink-soft: #5a4c39;
    --oxblood: #7c1d17;
    --brass: #8a6a2a;
    --paper: #fbf6ea;
    --edge: #ddd0b4;
  }
  * { box-sizing: border-box; }
  html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body {
    font-family: "Inter", system-ui, sans-serif;
    color: var(--ink);
    font-size: 10pt;
    line-height: 1.42;
    margin: 0;
  }
  .sheet {
    padding: 4mm 2mm 4mm;
  }
  .masthead {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    border-bottom: 3px double var(--brass);
    padding-bottom: 6px;
    margin-bottom: 14px;
  }
  .wordmark {
    font-family: "Special Elite", monospace;
    letter-spacing: 0.3em;
    font-size: 15pt;
    color: var(--oxblood);
  }
  .masthead .meta {
    font-family: "Special Elite", monospace;
    font-size: 8.5pt;
    color: var(--ink-soft);
    letter-spacing: 0.06em;
    text-align: right;
  }
  h1 {
    font-family: "Fraunces", Georgia, serif;
    font-size: 24pt;
    color: var(--oxblood);
    margin: 2px 0 2px;
    letter-spacing: -0.01em;
  }
  h3 {
    font-family: "Fraunces", Georgia, serif;
    font-size: 13pt;
    margin: 2px 0 2px;
    color: var(--ink);
  }
  h2 {
    font-family: "Fraunces", Georgia, serif;
    font-size: 13.5pt;
    margin: 13px 0 5px;
    color: var(--ink);
    border-bottom: 1px solid var(--edge);
    padding-bottom: 3px;
  }
  p { margin: 0 0 5px; }
  strong { color: var(--ink); }
  ul { margin: 0 0 8px 16px; padding: 0; }
  li { margin-bottom: 2px; }
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 8px 0 10px;
    font-size: 9.6pt;
  }
  th {
    font-family: "Special Elite", monospace;
    font-size: 8pt;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    text-align: left;
    color: var(--brass);
    border-bottom: 2px solid var(--brass);
    padding: 4px 8px 4px 0;
  }
  td {
    border-bottom: 1px solid var(--edge);
    padding: 4px 8px 4px 0;
    vertical-align: top;
  }
  tr { page-break-inside: avoid; }
  hr { border: none; border-top: 1px dashed var(--edge); margin: 12px 0; }
  a { color: var(--oxblood); text-decoration: none; }
  .rule-note {
    margin-top: 14px;
    font-family: "Special Elite", monospace;
    font-size: 8.6pt;
    color: var(--ink-soft);
    border-top: 3px double var(--brass);
    padding-top: 6px;
  }
</style>
</head>
<body>
  <div class="sheet">
    <div class="masthead">
      <span class="wordmark">GAVEL</span>
      <span class="meta">Proposal / technical summary<br/>Team HOKKIEN MEE IS RED</span>
    </div>
    ${body}
    <div class="rule-note">Every scam gets a fair trial. The AI investigates — the person decides.</div>
  </div>
</body>
</html>`;

writeFileSync(join(root, "submission/proposal.html"), html);

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent(html, { waitUntil: "networkidle" });
await page.pdf({
  path: join(root, "submission/GAVEL-proposal.pdf"),
  format: "A4",
  printBackground: true,
  margin: { top: "14mm", bottom: "14mm", left: "16mm", right: "16mm" },
  displayHeaderFooter: true,
  headerTemplate: "<span></span>",
  footerTemplate:
    '<div style="width:100%;font-size:7.5pt;color:#8a6a2a;font-family:monospace;padding:0 16mm;display:flex;justify-content:space-between;"><span>GAVEL — proposal</span><span>page <span class="pageNumber"></span> of <span class="totalPages"></span></span></div>',
});
await browser.close();
console.log("rendered -> submission/GAVEL-proposal.pdf");
