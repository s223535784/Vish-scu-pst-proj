# Vishesh Pahuja, professional experience portfolio

A teaching portfolio mapped to the Australian Professional Standards for
Teachers (Graduate career stage), built as **one self-contained HTML file**.

`index.html` is the portfolio. Open it by double clicking, in any browser. It
needs no server and no internet connection: the text, the photographs and the
attached documents all live inside the file, so it opens the same way on a
university computer, a school laptop or a USB stick.

## Using it

| Action | How |
| --- | --- |
| Edit anything | Press **Edit**. Every heading, paragraph, list item and evidence title becomes editable in place. |
| Details that are not on the page | The **gear** button: name, contact details, unit, standard titles, domain names and colours. |
| Attach evidence | In any Evidence panel, drag files in, choose files, or paste a screenshot with Ctrl+V. |
| Add a listed item | *add a titled item* in an Evidence panel, then give it a title, date, note and optional link. |
| Search | Type in the search box, or press `/`. Results open as their own tab underneath the header. |
| Keep your work | **Save file**, or Ctrl+S. This writes a new copy of the whole portfolio, attachments included. |
| Hand it in | **Download → PDF document**, or **Word document** for a version you can keep editing in Word. |

Press `?` in the page for the full list of keyboard shortcuts.

### How saving works

Three separate things, worth keeping straight:

1. **The saved file is your portfolio.** Save file (Ctrl+S) writes everything,
   including every attachment, into one `.html` file. Keep that file. In
   Chrome and Edge the first save asks where to put it and every later save
   writes over the same file.
2. **The browser draft is a safety net, not the portfolio.** As you type, the
   page caches your text in the browser so a crash or an accidental close does
   not lose it. Attachments are cached separately and some browsers refuse to
   cache them at all from a local file. The indicator in the header always tells
   you the truth: green means cached, amber means unsaved changes, red means the
   browser is refusing to cache and you should save the file.
3. **Restore from a saved portfolio** (Download menu) reads a `.html` copy back
   in, which is how you recover attachments the browser could not cache.

A focus area counts as **Evidenced** only once it has both an attachment or
listed item *and* an explanation of how it meets the standard. One of the two
shows as **In progress**, so the summary and the tab counts reflect what an
assessor would actually accept.

## Working on the application

`index.html` is generated. The sources are:

```
src/portfolio.css   styles
src/portfolio.js    the application
src/data.json       the seed content only
build.py            assembles the three into index.html
tests/              browser tests, Playwright
```

```sh
python3 build.py                       # rebuild index.html
node tests/functional.test.mjs         # 69 checks: search, editing, routing, files, a11y
node tests/exports.test.mjs            # 22 checks: print, PDF, Word, JSON, restore, quota
```

Set `CHROME_PATH` if Playwright cannot find a browser.

> **Warning.** `build.py` writes `index.html` from `src/data.json`. If you have
> been editing a saved copy of the portfolio, that copy holds your content and
> this repository does not. To fold your content back in, use
> **Download → Portfolio data (.json)** and save it over `src/data.json` before
> rebuilding.

Two constraints the build enforces, because breaking either one silently blanks
the page: neither the stylesheet nor the script may contain a literal
`</style` or `</script`, and the built file must end up with exactly two script
blocks.
