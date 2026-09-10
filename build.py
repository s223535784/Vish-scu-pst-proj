#!/usr/bin/env python3
"""Assemble src/ into the single-file portfolio.

    python3 build.py                                   -> index.html, editable
    python3 build.py --readonly --out dist/index.html   -> a published copy

A read-only copy hides the editing controls and does not cache a draft in the
visitor's browser, so a published site reads as a document rather than an
editor that cannot save anywhere.

The portfolio is deliberately one self-contained .html file: it opens on any
computer, with no server and no internet, and every attachment travels inside
it. This script only rebuilds the *application*. Content that Vishesh has typed
into a saved copy of index.html lives in that copy, not here, so read the
warning in README.md before running it over a portfolio in use.
"""
import argparse, json, os, urllib.parse

parser = argparse.ArgumentParser(description='Build the single-file portfolio.')
parser.add_argument('--readonly', action='store_true',
                    help='hide the editing controls, for a published copy')
parser.add_argument('--out', default=None, help='output path (default index.html)')
args = parser.parse_args()

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, 'src')

css = open(os.path.join(SRC, 'portfolio.css'), encoding='utf-8').read()
js = open(os.path.join(SRC, 'portfolio.js'), encoding='utf-8').read()
data = json.load(open(os.path.join(SRC, 'data.json'), encoding='utf-8'))

# A literal closing tag inside either block would end the inline element early
# and silently break the page, so refuse to build one.
assert '</script' not in js, 'portfolio.js contains a literal closing script tag'
assert '</style' not in css, 'portfolio.css contains a literal closing style tag'

payload = json.dumps(data, ensure_ascii=False, separators=(', ', ': ')).replace('</', '<\\/')

svg = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 34 34">'
       '<rect width="34" height="34" rx="8" fill="#d99518"/>'
       '<path d="M19.5 24.2l3 3 6.2-7" stroke="#0f1c23" stroke-width="3" fill="none" stroke-linecap="round"/>'
       '<rect x="7" y="9" width="14" height="2.6" rx="1.3" fill="#0f1c23"/>'
       '<rect x="7" y="14.5" width="20" height="2.6" rx="1.3" fill="#0f1c23" opacity=".55"/></svg>')
icon = 'data:image/svg+xml,' + urllib.parse.quote(svg, safe='')

fonts = ('<link rel="preconnect" href="https://fonts.googleapis.com">'
         '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
         '<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;'
         '12..96,500;12..96,600;12..96,700&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;'
         '1,6..72,400&display=swap" rel="stylesheet">')

out = ('<!doctype html><html lang="en"><head><meta charset="utf-8">'
       '<meta name="viewport" content="width=device-width,initial-scale=1">'
       '<title>' + data['profile']['name'] + ', professional experience portfolio</title>'
       '<meta name="description" content="Teaching portfolio mapped to the Australian Professional '
       'Standards for Teachers.">'
       '<link rel="icon" href="' + icon + '">' + fonts +
       '<style id="style-main">' + css + '</style></head><body><div id="app"></div>'
       '<noscript><div style="padding:40px;font-family:Georgia,serif">This portfolio needs JavaScript '
       'switched on to display. The content is stored inside this file and is not sent anywhere.'
       '</div></noscript>'
       '<script id="data-script">window.DATA=' + payload + ';' +
       ("window.PORTFOLIO_MODE='read';" if args.readonly else '') + '</script>'
       '<script id="app-script">' + js + '</script></body></html>')

assert out.count('</script>') == 2, 'unexpected script boundaries in the built file'

path = os.path.abspath(args.out) if args.out else os.path.join(ROOT, 'index.html')
directory = os.path.dirname(path)
if directory:
    os.makedirs(directory, exist_ok=True)
open(path, 'w', encoding='utf-8').write(out)
print('built %s, %d bytes%s' % (path, len(out.encode('utf-8')),
                                ', read only' if args.readonly else ''))
