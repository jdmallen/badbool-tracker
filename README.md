# BADBOOL Tracker

A personal to-do list for working through the people search sites on
[BADBOOL](https://github.com/yaelwrites/Big-Ass-Data-Broker-Opt-Out-List).

## Run

```sh
pnpm install
pnpm dev            # http://localhost:5173
pnpm dev --host     # also reachable from other devices on the LAN
```

Progress is saved to `localStorage` in your browser — no account needed, and it works
from a plain static host serving `dist/`. Use **Export JSON** / **Import JSON** in the
"Data" section to back up or move progress between devices, or sign in with GitHub to
sync automatically (see `api/README.md` for the sync backend).

### With sign-in and cloud sync

`pnpm dev` serves the front end alone, so sign-in in the `⋯` menu does nothing. For the
full stack — auth, the API, and a local Table Storage emulator:

```sh
pnpm dev:local      # http://localhost:4280
```

One command, one Ctrl+C. It starts Azurite and the Static Web Apps CLI, which in turn
launches Vite and the Azure Functions host; the long-winded flags live in
`swa-cli.config.json`.

Browse **4280, not 5173** — `/.auth/me` only exists behind the SWA proxy, and on the Vite
port the app silently reports you as signed out.

There's no real OAuth app involved. `⋯` → "Sign in with GitHub" opens the SWA CLI's auth
emulator, a local form where you choose:

- **Provider** — must be `github`; anything else is rejected by `api/src/lib/principal.js`.
- **User ID** — the Table partition key your synced data lands under. Reuse it to test
  cross-device sync, change it to test per-user isolation. Note it down; the form
  pre-fills a fresh random one each visit.
- **Username** — cosmetic, shown as "Syncing as …". **Claims** are ignored.

Node 22 is required and pinned in `.tool-versions`: the SWA CLI only accepts Node 18–22
when locating Functions Core Tools, and refuses to start the API otherwise.

### Inspect what's been synced

```sh
pnpm table:dump           # per-user summary
pnpm table:dump --json    # raw table entities
```

Needs Azurite running. Each user is one row whose `data` column holds the whole progress
document as a JSON string, so this decodes it rather than printing a blob. Point it at the
real table with `TABLES_CONNECTION_STRING=… pnpm table:dump`.

## Refresh the list

```sh
pnpm extract
```

Re-downloads the README and rewrites `src/entries.json` and `api/src/sites.json`. Link
picks the heuristic gets wrong are fixed by hand in `OVERRIDES` in `scripts/extract.py`.
Progress is keyed by a slug of each site's name, so a renamed site shows up as open again.

## Tests

```sh
pnpm test
```

`vitest`, covering the Vue components and the list/search/filter composables, storage
(normalize, merge, cloud delete), the design-token rules below, and the API's principal
decoding, payload validation and rate-limit logic.

## Styling

Every color, control height, radius, z-index and duration lives in `src/tokens.css`;
component `<style>` blocks reference those variables rather than literals. `rem` is for
sizes that must stay fixed (touch targets, the content column), `em` for anything that
should scale with its surrounding text.

`src/tokens.test.js` enforces this — it fails on any hex color or color function outside
the token file, on any `var(--…)` that isn't defined there, and on any `px` value other
than `1px`/`2px` hairlines, the `999px` pill-radius sentinel and the off-screen `-9999px`
skip link.

## Cloud sync (optional)

Deploying `api/` behind Azure Static Web Apps enables GitHub sign-in and cross-device
sync via Azure Table Storage. See `api/README.md` for what's there and the one-time
deploy steps (SWA app settings, table creation, budget alert). Not required to use the
tracker.

## License

Code is MIT-licensed; the site list (from BADBOOL) is CC BY-NC-SA 4.0. See `LICENSE`.
