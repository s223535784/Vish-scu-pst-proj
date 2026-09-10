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

It is genuinely offline. Nothing is fetched at runtime except the two web fonts,
and the page is designed to fall back to system fonts when those cannot load.
Word documents are previewed by the page itself: a `.docx` is a zip of XML, and
browsers can now unzip it natively, so no library is involved.

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

## Publishing it as a website

`index.html` on its own is enough. Dragging that one file onto
[app.netlify.com/drop](https://app.netlify.com/drop) gives you a live URL in a
few seconds, with nothing else to configure.

Publishing from this repository is better if you expect to update it, because
every push republishes. In Netlify: **Add new site → Import an existing project
→ GitHub → this repository**. `netlify.toml` already sets the build command, so
accept what it offers. It builds a **read-only** copy into `dist/`: the Edit
button, the details dialog and the save controls are gone, the page caches
nothing in a visitor's browser, and the search, tabs, viewer and PDF or Word
downloads all still work. Visitors read a document; you keep editing your own
copy of the file.

`netlify.toml` also sets `X-Robots-Tag: noindex, nofollow`, so the site will not
turn up in search results. Delete that line if you want it indexed.

### Getting your content onto the published site

This repository holds the *seed* content in `src/data.json`. Your real content
lives in the `.html` file you have been saving. So publishing your current
portfolio is two steps:

```sh
python3 sync.py ~/Downloads/Vishesh_Pahuja_Portfolio.html
git add -A && git commit -m "Update portfolio content" && git push
```

`sync.py` reads the data block out of your saved file (or out of a Portfolio
data `.json` export), writes it to `src/data.json` and rebuilds. Netlify then
rebuilds from the push.

### Before you publish anything

A placement portfolio holds student work, photographs of children and a mentor's
written assessment of you. A Netlify URL is public to anyone who has it, even
unlisted and unindexed. Worth settling first:

- Whether your school and university permit student images and student work to
  be published at all. Most schools require signed consent per student, and many
  say no to anything outside their own systems.
- Whether the mentor reports should be on a public URL. They are about you, and
  a coordinator can be sent the file instead.
- Whether faces and student names appear in any screenshot you have attached.

If any of that is unresolved, the safer route is to email the saved `.html`
file, or to publish a copy with the sensitive attachments removed. Netlify's
password protection and its private team options sit behind a paid plan, so on
the free tier "unlisted URL" is the only protection available.

## Working on the application

`index.html` is generated. The sources are:

```
src/portfolio.css   styles
src/portfolio.js    the application
src/data.json       the seed content only
build.py            assembles the three into index.html
sync.py             pulls content out of a saved portfolio back into src/
netlify.toml        publishing configuration
tests/              browser tests, Playwright
```

```sh
npm install
npm test                       # builds both copies, then runs all four suites
python3 build.py               # rebuild index.html, editable
npm run build:publish          # rebuild dist/index.html, read only
```

| Suite | Checks |
| --- | --- |
| `tests/functional.test.mjs` | 69: search, editing, routing, attachments, persistence, a11y |
| `tests/exports.test.mjs` | 22: print, PDF, Word, JSON, restore, storage-quota failure |
| `tests/docx.test.mjs` | 29: the Word preview, with all network requests blocked |
| `tests/published.test.mjs` | 19: the read-only copy, served under the real Netlify headers |

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
