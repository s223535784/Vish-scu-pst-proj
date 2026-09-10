#!/usr/bin/env python3
"""Pull the content out of a saved portfolio and back into this repository.

Your saved .html file is the copy that holds your real content: the text you
typed, the photographs and the attached documents. This repository only holds
the seed content in src/data.json. Run this before publishing so the site shows
your current portfolio rather than the seed:

    python3 sync.py ~/Downloads/Vishesh_Pahuja_Portfolio.html

It also accepts a Portfolio data (.json) export. Nothing is uploaded anywhere;
this only rewrites src/data.json and rebuilds index.html.
"""
import json, os, subprocess, sys

ROOT = os.path.dirname(os.path.abspath(__file__))
TARGET = os.path.join(ROOT, 'src', 'data.json')


def extract(path):
    text = open(path, encoding='utf-8').read()
    if path.lower().endswith('.json'):
        return json.loads(text)
    start = text.find('window.DATA=')
    if start < 0:
        raise SystemExit('%s does not contain portfolio data. Give it a saved '
                         'portfolio .html or a Portfolio data .json export.' % path)
    # The data block ends at the first ';' that closes it, immediately before
    # the closing tag the builder writes.
    for end_marker in (';window.PORTFOLIO_MODE', ';</script>'):
        end = text.find(end_marker, start)
        if end > 0:
            return json.loads(text[start + len('window.DATA='):end])
    raise SystemExit('could not find the end of the data block in %s' % path)


def main():
    if len(sys.argv) != 2:
        raise SystemExit(__doc__)
    source = sys.argv[1]
    if not os.path.exists(source):
        raise SystemExit('no such file: %s' % source)

    data = extract(source)
    if not isinstance(data, dict) or 'standards' not in data:
        raise SystemExit('that data does not look like this portfolio')

    focus = sum(len(s.get('focus', [])) for s in data['standards'].values())
    attachments = 0
    for standard in data['standards'].values():
        for area in standard.get('focus', []):
            attachments += sum(1 for e in area.get('evidence', []) if e.get('img') or e.get('file'))
    attachments += sum(1 for e in data.get('library', []) if e.get('img') or e.get('file'))

    payload = json.dumps(data, ensure_ascii=False, indent=1)
    open(TARGET, 'w', encoding='utf-8').write(payload)
    size = len(payload.encode('utf-8'))
    print('read %s' % source)
    print('  %d focus areas, %d embedded attachments' % (focus, attachments))
    print('  wrote src/data.json, %.1f MB' % (size / 1048576.0))
    if size > 5 * 1048576:
        print('  note: attachments are stored as text in this file, so the commit '
              'will be large. Consider linking to very big PDFs instead of embedding them.')
    subprocess.check_call([sys.executable, os.path.join(ROOT, 'build.py')])
    print('\nNow commit and push, and the published site will follow:')
    print('  git add -A && git commit -m "Update portfolio content" && git push')


if __name__ == '__main__':
    main()
