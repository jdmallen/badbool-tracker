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

Unit tests cover the merge, normalize, validation, and rate-limit logic (`vitest`).

## Cloud sync (optional)

Deploying `api/` behind Azure Static Web Apps enables GitHub sign-in and cross-device
sync via Azure Table Storage. See `PLAN-cloud-sync.md` for the full design and deploy
steps (SWA app settings, table creation, budget alert). Not required to use the tracker.

## License

Code is MIT-licensed; the site list (from BADBOOL) is CC BY-NC-SA 4.0. See `LICENSE`.
