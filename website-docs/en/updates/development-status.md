# Pending development and branch review

> Snapshot: October 4, 2026 · remote main `dd253f85`. This is development evidence, not a released-feature list or a promise to merge historical alternatives.

Rechecked all 86 local branches after PR #100 merged. Excluding this documentation-maintenance branch, 67 heads are ancestors of main and 18 have commits outside main. “Local-only commits” means commits not reachable from any fetched origin branch. Rebases, cherry-picks, and merges can leave different SHAs for overlapping content; counts are not counts of missing features. No other development branches were pushed or merged by this documentation task.

[PR #100](https://github.com/yuanbw2025/storyforge/pull/100) merged on October 4. The flagship and render-cost branch heads are now contained in main; several older revision branches are patch-equivalent. Their delivered behavior is documented in [Text adventure](/en/features/interactive/text-adventure) and the [Changelog](/en/updates/changelog). The particular Tidal Bell Isles work remains a local unpublished playtest, not a built-in distributed release.

| Local branch | Commits outside main | Local-only commits | Content and disposition |
| --- | ---: | ---: | --- |
| `codex/backup-text-open-world-before-main-sync-20260906-3f38495f` | 45 | 45 | Historical open-world backup; 43 patches match main. Review remaining changes individually; do not merge blindly. |
| `codex/backup-text-open-world-pre-main-rebase-20260906` | 38 | 38 | Pre-rebase open-world backup; same head as the product-architecture branch. Old SHAs alone do not prove missing functionality. |
| `feat/application-dossier` | 1 | 1 | AVG frozen-world media reuse; identical commit to fix/avg-production-world-media-reuse. Later implementation equivalence needs review. |
| `feat/builtin-3d-adventure` | 9 | 9 | Tidemark, Aphelion, and a short rescue episode, independent saves and display controls; local commits not pushed. |
| `feat/game-product-production-lanes` | 4 | 4 | Game-product lifecycle, production responsibilities, and charter knowledge-base routing; four documentation commits not pushed. |
| `feat/independent-creation-integration` | 2 | 2 | Only distinct merge commits; no file delta against the merge base. Not a new feature. |
| `feat/mist-harbor-builtin` | 1 | 1 | Fog Harbor AVG sound, music, and recording copy; one local commit beyond its remote branch. |
| `feat/public-product-presentation` | 53 | 53 | Historical open-world production branch; 45 patches match main. Remaining source/rules/protagonist/story changes need comparison with later implementations. |
| `feat/text-adventure-content-revision` | 1 | 1 | The distinct story/cast revision patch now matches main. Retain its historical identity without counting it as undelivered functionality. |
| `feat/text-adventure-scene-plan-revision` | 12 | 12 | All 12 local-only patches now match main. Scene, route, and visual revisions shipped through PR #100; historical commits remain. |
| `feat/text-open-world-product-architecture` | 38 | 38 | Historical open-world architecture/gameplay, same head as the pre-rebase backup; partly equivalent, partly requiring manual review. |
| `fix/avg-production-world-media-reuse` | 1 | 1 | Same commit as feat/application-dossier; retain frozen-media reuse as a review item. |
| `fix/home-layout-font-preview` | 3 | 3 | Home/sidebar layout and power settings consolidated under world origin; local only. Current-main guides retain current entries. |
| `fix/readme-community-links` | 1 | 1 | Distinct merge commit; no new community capability claimed. Historical merge differences need maintainer review. |
| `fix/text-adventure-repair-baseline` | 1 | 1 | The distinct fix matches main. Repair-baseline invalidation after upstream changes is delivered, not a missing feature. |
| `fix/text-adventure-source-depth` | 1 | 1 | Main contains later specialist-source reading work, but this older patch has a different patch ID. Retain a delta review item without claiming the capability is missing. |
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
