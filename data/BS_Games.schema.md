# BS_Games.json — In-House Games Data Schema

`data/BS_Games.json` is the single source of truth for games developed by Bekeirat Software.
It is loaded by `js/bs-games.js` and consumed by:

- `index.html` — "Our Original Games" carousel (homepage)
- `pages/original-games.html` — collection page with filtered grid
- `pages/bs-game.html` — dynamic details page (`?id=<game id>`)

All file paths are stored **relative to the site root** (e.g. `Apps/EnBlocks2026/play/index.html`).
`js/bs-games.js` resolves them automatically depending on whether the page lives at the site
root or under `/pages/`.

## Top level

| Field           | Type    | Required | Description                                  |
| --------------- | ------- | -------- | -------------------------------------------- |
| `schemaVersion` | number  | yes      | Schema revision, currently `1`.              |
| `publisher`     | string  | yes      | Publisher name.                              |
| `lastUpdated`   | string  | yes      | ISO date of the last data update.            |
| `games`         | array   | yes      | Array of in-house game objects (see below).  |

## Game object

| Field              | Type     | Required | Description                                                                 |
| ------------------ | -------- | -------- | --------------------------------------------------------------------------- |
| `id`               | string   | yes      | Stable unique id (`BS001`, `BS002`, …). Used in URLs: `pages/bs-game.html?id=BS001`. |
| `slug`             | string   | yes      | Folder name under `Apps/` (e.g. `enblocks2026`).                             |
| `title`            | string   | yes      | Display name.                                                                |
| `shortDescription` | string   | yes      | One-line text used on cards / carousels.                                     |
| `description`      | string[] | yes      | Paragraphs shown in the "About The Game" section.                            |
| `genre`            | string   | yes      | Human-readable genre label (e.g. `Puzzle / Strategy`).                       |
| `category`         | string   | yes      | Filter category used by the collection page grid.                            |
| `tags`             | string[] | yes      | Filter tags.                                                                 |
| `version`          | string   | yes      | Current game version.                                                        |
| `releaseDate`      | string   | yes      | ISO release date.                                                            |
| `rating`           | string   | yes      | Age rating (e.g. `Everyone`).                                                |
| `languages`        | string[] | no       | Supported languages.                                                         |
| `featured`         | boolean  | yes      | `true` pins the game first in the homepage carousel.                         |
| `playOnline`       | boolean  | yes      | `true` enables the "Play Now" popup with the live version.                   |
| `orientation`      | string   | yes      | `portrait`, `landscape`, or `square` — tunes the popup aspect ratio.         |
| `folder`           | string   | yes      | Game folder relative to site root.                                           |
| `detailPage`       | string   | yes      | Static detail page (kept for SEO / direct links).                            |
| `privacyPolicy`    | string   | no       | Path to the game privacy policy (empty string if none).                      |
| `icon`             | string   | yes      | Square icon image.                                                           |
| `thumbnail`        | string   | yes      | Card image.                                                                  |
| `banner`           | string   | yes      | Wide hero image on the details page.                                         |
| `play`             | object   | yes      | `{ "available": bool, "url": "Apps/<slug>/play/index.html" }` — the live version loaded inside the site popup. |
| `screenshots`      | array    | yes      | `[{ "src", "alt" }]` — shown in the screenshots slider + lightbox.           |
| `trailers`         | array    | yes      | `[{ "title", "url" }]` — video URLs (mp4/embeddable).                        |
| `features`         | array    | yes      | `[{ "icon", "title", "text" }]` — Key Features bullets.                      |
| `stores`           | array    | yes      | Download / store links: `[{ "platform", "type": "download"|"store", "label", "url" }]`. |

## Adding a new in-house game

1. Create the folder `Apps/<slug>/` following the standard structure:
   `index.html` (details), `assets/` (banner + screenshots), `play/index.html` (live version),
   `privacy/` (optional).
2. Append one object to the `games` array in `data/BS_Games.json` with a new `BS###` id.
3. Nothing else — the homepage carousel, collection grid, and details pages update automatically.
