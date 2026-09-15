# BADBOOL Tracker

A personal to-do list for working through the people search sites on
[BADBOOL](https://github.com/yaelwrites/Big-Ass-Data-Broker-Opt-Out-List).

## Run

```sh
pnpm install
pnpm dev            # http://localhost:5173
pnpm dev --host     # also reachable from other devices on the LAN
```

Progress is saved to `data/progress.json` (git-ignored) by a small middleware in
`vite.config.js`, so it works under `pnpm dev` and `pnpm preview`. A plain static host
serving `dist/` has no save endpoint.

## Refresh the list

```sh
pnpm extract
```

Re-downloads the README and rewrites `src/entries.json`. Link picks the heuristic gets
wrong are fixed by hand in `OVERRIDES` in `scripts/extract.py`. Progress is keyed by a
slug of each site's name, so a renamed site shows up as open again.
