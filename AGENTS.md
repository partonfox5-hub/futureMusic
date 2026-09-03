# futuremusic.online — agent rules

Site: **futuremusic.online** (Express + EJS + `public/`).  
Repo: `https://github.com/partonfox5-hub/futureMusic.git`  
Deploy: push to `master` → Cloud Run rebuilds production.

## Horde WebXR: always production (standing)

**Horde** (`/horde`, `public/games/horde/`) ships **straight to production**. Never a `/test-*` page. Edit live Horde assets, commit, `git push origin master`, report `https://futuremusic.online/horde`.

## Default deploy workflow: PRODUCTION FIRST (temporary)

**Override (2026-08-24):** the owner asked to **push straight to production** until they say otherwise. Skip the test-page workflow. Ship on the real routes, commit, and `git push origin master`.

The previous default (test URL first, then promote) is paused — restore it when the owner says to go back to test-first.

<!-- original: TEST FIRST, then production. The owner tests live on production Cloud Run, but new work must not land on linked production routes first. -->

### When implementing or pushing site changes

1. **Ship a test page first** (default for every push that adds/changes user-facing features).
2. Test URLs use a **random alphanumeric slug** (letters + numbers only), e.g. `k7m3q9x2`.
3. Patterns:
   - New page route: `/test-<slug>` or `/t/<slug>` (prefer `/test-<slug>` for clarity)
   - View file: `views/test-<slug>.ejs` (or reuse production view with a query/flag only if safer)
   - Game/static assets under test paths when needed:  
     `public/games/.../test-<slug>/` or query `?v=test-<slug>` only if isolation requires it
4. **Do not link** the test URL from homepage, nav, `projects.ejs`, footer, or any production listing.
5. Register the route in `server.js` (or module) next to other routes; keep it easy to delete.
6. **Commit + push** test work when ready. You are authorized to `git add` / `commit` / `push` to `origin master` for this repo (no force-push unless explicitly requested).
7. **End of response must include:**
   - Exact test URL(s), e.g. `https://futuremusic.online/test-k7m3q9x2`
   - Reminder: *Confirm when you want the final production push: remove the test page/route and move features onto the real production page/route.*

### Production cutover (only after user confirms)

1. Merge test behavior into the real production path (e.g. `/rampart`, `/projects` card).
2. Delete test routes, `views/test-*.ejs`, and unused test assets.
3. Ensure production links/nav/projects cards are updated.
4. Commit + push with a clear message (`Promote … to production; remove test-…`).
5. Confirm the production URL in the response.

### Do not by default

- Edit the live production page in place as the first ship of a feature set.
- Add homepage / projects / nav links to unfinished test URLs.
- Leave abandoned test routes forever — clean them up on promote or when asked.

### Exceptions

- Pure backend/config/dependency fixes with **no** user-facing page change may push without a test page; still say so clearly.
- Hotfix the user explicitly says “push straight to production” / “skip test page”.
- **Horde WebXR (`/horde`, `public/games/horde/`)** — always ship straight to production. Do **not** use `/test-*` pages for Horde web. Edit production assets, commit, `git push origin master`. Report `https://futuremusic.online/horde`. (Owner, 2026-09-03.)

## Git push conventions

```text
# typical (from repo root)
git status
git add <relevant paths>
git commit -m "<accurate summary of this change>"
git push origin master
```

- Prefer staging relevant paths over `git add .` when secrets or junk might exist.
- Never force-push unless the user explicitly asks.
- Commit messages must match the actual change.

## Related game source

- Active Rampart development may live in `C:\rampart-reborn`.
- Site-served copy is under `public/games/rampart-reborn/…`.
- After game edits, **sync into `public/games/...`** before commit/push so Cloud Run gets the files.
