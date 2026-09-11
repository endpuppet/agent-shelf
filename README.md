# Agent Shelf

A public, Git-backed visual shelf for reusable **agent skills** and **prompts**.

The repository is the source of truth. The root static site is the browsing interface.

## What the interface does

- browse Skills and Prompts separately
- filter by use-case category
- full-text search across title, description, tags, and category
- preview Markdown or inspect raw source
- copy full file content
- copy a shareable Agent Shelf deep link
- copy/open the canonical GitHub source link
- mobile-first layout with touch-safe controls and reduced-motion support

## Structure

```text
skills/
  interface-design/
  motion-animation/
  svg-vector/
  interactive-worlds/
  rendering/

prompts/
  research/
  web-prototypes/
  visual-assets/

catalog.json     # UI index/metadata
index.html       # static shell
app.js           # catalog, routing, copy actions, Markdown viewer
styles.css       # mobile-first UI
```

## Add an item

1. Put the Markdown file under the matching category folder.
2. Add one entry to `catalog.json` with `type`, `category`, `slug`, `title`, `description`, `tags`, and `path`.
3. Push to `main`.

The Pages workflow will redeploy automatically once GitHub Pages is configured to use **GitHub Actions**.

## GitHub Pages setup

In the repository: **Settings → Pages → Build and deployment → Source → GitHub Actions**.

After that, pushes to `main` deploy automatically through `.github/workflows/pages.yml`.

Expected project Pages URL:

`https://endpuppet.github.io/agent-shelf/`

## Design notes

The interface intentionally starts read-only. Editing/committing from the browser should be added later behind proper GitHub authentication, never by embedding a token in client-side code.
