# Performance budgets

The number this app holds is the gzipped JavaScript of the web preview, the same export Vercel serves. CI runs `npm run export:web` and then the check. The build fails when either total passes its ceiling.

First-load JS is every script `dist/index.html` loads before the dictation screen can run. Deferred JS is every other exported chunk. Both are level-9 gzip. Native iOS and Android binaries are not in this gate. CI has no device build.

Ceilings started as the measured size, rounded up to the next KiB, plus 8 KiB. Raise `maxBytes` in `perf/budgets.json` in the same change that grows the bundle, and say why. `baselineBytes` is the measurement the ceiling was set from.

| Bundle | Baseline | Ceiling |
|---|---:|---:|
| First-load JS | 327.4 kB (327366) | 335.9 kB (335872) |
| Deferred JS | 6.2 kB (6249) | 15.4 kB (15360) |

Most of the first load is `entry-*.js`. The shared runtime and the common chunk are the rest.

CI writes `perf/snapshot.json` after the export: parsed bytes and level-9 gzip for first-load JS and deferred JS. A sticky pull-request comment, `<!-- perf-budget -->`, diffs that file against the snapshot from the last successful build on `main`. `baselineBytes` is not the diff. A growth of at least 100 B or 1% is marked. The comment does not fail the build. The gzip ceiling still does. Raise `maxBytes` in the same change that grows the bundle.

There is no browser bench. The shipping build is the native app, and CI has no device build.

```bash
npm run export:web
npm run perf:budget
node scripts/check-bundle-budget.mjs --print
```
