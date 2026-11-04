#!/usr/bin/env python3
"""Render a carousel script (posts.json) as a PDF in the format of references/roteiro-modelo.pdf.

Usage: python3 build_roteiro.py posts.json output.pdf
Needs Google Chrome (headless print-to-pdf); no Python packages.
"""
import html
import json
import subprocess
import sys
import tempfile
from pathlib import Path

CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
RED = "#E30F1E"

CSS = f"""
@page {{ size: A4; margin: 18mm 16mm; }}
body {{ font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif; color: #1a1a1a; font-size: 10.5pt; line-height: 1.45; }}
h1 {{ font-size: 24pt; margin: 0 0 4px; color: {RED}; }}
h2 {{ font-size: 16pt; margin: 26px 0 4px; color: {RED}; page-break-after: avoid; }}
.meta {{ color: #666; margin-bottom: 14px; }}
.goal {{ color: #444; margin: 0 0 10px; }}
h3 {{ font-size: 11.5pt; margin: 18px 0 6px; }}
table {{ width: 100%; border-collapse: collapse; margin: 8px 0 6px; }}
th {{ background: {RED}; color: #fff; text-align: left; padding: 6px 8px; font-size: 9.5pt; }}
td {{ border-bottom: 1px solid #ddd; padding: 6px 8px; vertical-align: top; }}
tr {{ page-break-inside: avoid; }}
td.slide {{ width: 17%; font-weight: 600; }}
td.title {{ width: 20%; font-weight: 600; }}
td.photo {{ width: 24%; color: #555; font-size: 9.5pt; }}
ul {{ margin: 4px 0 0 18px; padding: 0; }}
li {{ margin-bottom: 4px; }}
.post {{ page-break-before: always; }}
.note {{ color: #555; font-size: 9.5pt; }}
"""


def e(text):
    return html.escape(text or "").replace("\n", "<br>")


def build_html(d):
    out = [f"<html><head><meta charset='utf-8'><style>{CSS}</style></head><body>"]
    out.append(f"<h1>{e(d['title'])}</h1><div class='meta'>{e(d['date'])}</div>")
    out.append("<h2>Overview</h2>")
    out.append(f"<p>{e(d['overview'])}</p>")
    out.append("<table><tr><th>#</th><th>Carousel</th><th>Goal</th></tr>")
    for p in d["posts"]:
        out.append(f"<tr><td>{p['n']}</td><td><b>{e(p['title'])}</b></td><td>{e(p['goal'])}</td></tr>")
    out.append("</table>")
    if d.get("to_confirm"):
        out.append("<h2>Points to confirm before posting</h2><ul>")
        for c in d["to_confirm"]:
            out.append(f"<li><b>{e(c['post'])}:</b> {e(c['text'])}</li>")
        out.append("</ul>")
    if d.get("photo_note"):
        out.append(f"<p class='note'>{e(d['photo_note'])}</p>")
    for p in d["posts"]:
        out.append(f"<div class='post'><h2>{p['n']}. {e(p['title'])}</h2>")
        out.append(f"<p class='goal'>{e(p['summary'])}</p>")
        out.append("<table><tr><th>Slide</th><th>Title</th><th>Text</th><th>Photo suggestion</th></tr>")
        for s in p["slides"]:
            out.append(
                f"<tr><td class='slide'>{e(s['slide'])}</td><td class='title'>{e(s['title'])}</td>"
                f"<td>{e(s['text'])}</td><td class='photo'>{e(s['photo'])}</td></tr>"
            )
        out.append("</table></div>")
    out.append("</body></html>")
    return "".join(out)


def main():
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    data = json.loads(Path(sys.argv[1]).read_text(encoding="utf8"))
    target = Path(sys.argv[2]).resolve()
    with tempfile.TemporaryDirectory() as tmp:
        page = Path(tmp) / "roteiro.html"
        page.write_text(build_html(data), encoding="utf8")
        subprocess.run(
            [CHROME, "--headless=new", "--disable-gpu", "--no-pdf-header-footer",
             f"--print-to-pdf={target}", page.as_uri()],
            check=True, capture_output=True,
        )
    print(f"PDF written: {target}")


if __name__ == "__main__":
    main()
