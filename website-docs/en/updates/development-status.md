# Pending development and branch review

> Snapshot: October 4, 2026 · remote main `0108ab31`. This is development evidence, not a released-feature list or a promise to merge historical alternatives.

Inspected all 85 local branches: 65 heads are ancestors of main, and 20 have commits outside main. “Local-only commits” below means commits not reachable from any fetched origin branch; rebases, cherry-picks, and merge commits can leave different SHAs for overlapping content. Counts are not counts of missing features. No development branches were pushed or merged during this documentation audit.

Formal usage instructions describe mainline behavior. Unmerged work is recorded here and must be reassessed after integration. [PR #100](https://github.com/yuanbw2025/storyforge/pull/100) was open at the snapshot; its latest status and final checks govern future decisions.

| Local branch | Commits outside main | Local-only commits | Content and disposition |
| --- | ---: | ---: | --- |
| `codex/backup-text-open-world-before-main-sync-20260906-3f38495f` | 45 | 45 | Historical open-world backup; 43 patches match main. Review remaining changes individually; do not merge blindly. |
| `codex/backup-text-open-world-pre-main-rebase-20260906` | 38 | 38 | Pre-rebase open-world backup; same head as the product-architecture branch. Old SHAs alone do not prove missing functionality. |
| `feat/application-dossier` | 1 | 1 | AVG frozen-world media reuse; identical commit to fix/avg-production-world-media-reuse. Later implementation equivalence needs review. |
| `feat/builtin-3d-adventure` | 9 | 9 | Tidemark (潮痕：最后一盏灯), Aphelion (远日点：第七码头), and a short rescue episode, independent saves and display controls; local commits not pushed. |
| `feat/game-product-production-lanes` | 4 | 4 | Game-product lifecycle, production responsibilities, and charter knowledge-base routing; four documentation commits not pushed. |
| `feat/independent-creation-integration` | 2 | 2 | Only distinct merge commits; no file delta against the merge base. Not a new feature. |
| `feat/mist-harbor-builtin` | 1 | 1 | Fog Harbor AVG sound, music, and recording copy; one local commit beyond its remote branch. |
| `feat/public-product-presentation` | 53 | 53 | Historical open-world production branch; 45 patches match main. Remaining source/rules/protagonist/story changes need comparison with later implementations. |
| `feat/text-adventure-content-revision` | 9 | 1 | Story/cast revisions; the local-only patch is equivalent to PR #100. Track with that PR. |
| `feat/text-adventure-first-community-flagship` | 43 | 0 | PR #100 pushed, not merged: unpublished Tidal Bell Isles playtest, cover/details, local revisions, recovery, and player guidance. Engineering and work publication require separate acceptance. |
| `feat/text-adventure-scene-plan-revision` | 22 | 12 | Twelve local-only patches match PR #100; do not count scene, route, and visual revisions twice. |
| `feat/text-open-world-product-architecture` | 38 | 38 | Historical open-world architecture/gameplay, same head as the pre-rebase backup; partly equivalent, partly requiring manual review. |
| `fix/avg-production-world-media-reuse` | 1 | 1 | Same commit as feat/application-dossier; retain frozen-media reuse as a review item. |
| `fix/home-layout-font-preview` | 3 | 3 | Home/sidebar layout and power settings consolidated under world origin; local only. Current-main guides retain current entries. |
| `fix/open-world-player-render-cost` | 26 | 0 | Head is contained in PR #100; travel-effect validation indexing and related adventure revisions are tracked there. |
| `fix/readme-community-links` | 1 | 1 | Distinct merge commit; no new community capability claimed. Historical merge differences need maintainer review. |
| `fix/text-adventure-repair-baseline` | 11 | 1 | Local-only fix matches PR #100: invalidate repair baselines after upstream changes. |
| `fix/text-adventure-source-depth` | 1 | 1 | Specialist tasks read selected sources; related later implementation exists in PR #100, but patch IDs differ. Review before disposition. |
| `refactor/storyforge-bronze-ui` | 3 | 0 | Bronze UI branch pushed but unmerged; a historical alternative, not a replacement for current-main instructions. |
| `refactor/storyforge-ui-rebuild` | 5 | 5 | Early UI rebuild and handoff, local only; overlaps later mainline UI and needs a unique-delta review. |

## Uncommitted worktrees

- `feat/builtin-games-release`: staged and unstaged changes for built-in games, entry pages, assets, dependencies, and documentation. Related work overlaps `feat/builtin-3d-adventure`; uncommitted files still need independent review and are not a publishable snapshot.
- `codex/wechat-articles-screenshots-20260922`: uncommitted home and workspace-layout CSS changes. Whether these are screenshot-only adjustments or intended product changes needs the author's decision.
- `feat/character-chat-recording`: only an untracked `.vite-e2e-cache/` directory; classified as test cache, not an undocumented feature.

No author's workspace, browser database, or assets were modified by this audit. Local files and branch existence alone do not establish completed or validated behavior.

## Next reconciliation

Re-enumerate every local branch and associated worktree, refresh remote refs, compare ancestry, patch equivalence, actual implementation, and PR state, then reconcile the affected guides and changelog. Record confirmed unmerged work here without moving it into delivered-feature descriptions. Keep both languages aligned. Preserve the last successfully processed main commit in the documentation maintenance record; deployment success must be checked separately.

See [Changelog](/en/updates/changelog) · [Compatibility](/en/updates/compatibility).
