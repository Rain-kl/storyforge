# Pending development and branch audit

> Snapshot: 2026-10-06 19:19 (UTC+8) · Remote main `7b0ac619`. This page records development evidence, not a list of released features.

This audit covers all 16 local branches (including this documentation-maintenance branch) and 43 registered worktrees, including detached worktrees and those moved into archives. Excluding maintenance, 8 of the remaining 15 branch heads are outside main. “Local-only commits” means commits not contained in any fetched origin branch; the count is not the number of missing features.

## Now in main

- [PR #107](https://github.com/yuanbw2025/storyforge/pull/107): game-production responsibilities and lifecycle documentation, plus review protection until longform candidates are saved.
- [PR #108](https://github.com/yuanbw2025/storyforge/pull/108): preserving entered task-repair drafts during the initial production-progress load.
- [PR #109](https://github.com/yuanbw2025/storyforge/pull/109): home layout, text display, and a unified power-system editor within World origin. The earlier “local and unpushed” description is obsolete.
- [PR #110](https://github.com/yuanbw2025/storyforge/pull/110): the prepared Last Letter motion-comic sample. Its documentation has already passed [site deployment](https://github.com/yuanbw2025/storyforge/actions/runs/37356743763). The sample does not mean comic production can automatically create equivalent animation.

See the [changelog](/en/updates/changelog), [longform settings](/en/features/longform/planning), and [candidates and recovery](/en/guides/ai-workflow). Mainline integration, application deployment, and documentation deployment are checked separately; a merge date is not a version-release date.

## Branches still outside main

| Local branch | Commits outside main | Local-only commits | Audit conclusion |
| --- | ---: | ---: | --- |
| `feat/builtin-games-mainline-20261006` | 5 | 0 | Three built-in narrative games integrated with text open world; pushed as [PR #111](https://github.com/yuanbw2025/storyforge/pull/111), its latest inspected remote CI failed, so fixes and merge are pending. Not described as live on the official site. |
| `feat/builtin-3d-adventure` | 9 | 9 | Earlier local development of the three built-in works overlaps the migration in PR #111. Keep the old commit evidence without counting three additional features. |
| `feat/mist-harbor-builtin` | 1 | 1 | `6ddbdb8c`: Mist Harbor AVG effects, soundtrack, and recording copy. An unpushed commit in an archived worktree; continued relevance needs review. |
| `fix/avg-production-world-media-reuse` | 1 | 1 | `618d388e`: frozen-world media reuse, also contained in the older open-world architecture branch. Retained as one review item. |
| `codex/backup-text-open-world-before-main-sync-20260906-3f38495f` | 45 | 45 | Old backup with 43 ordinary patches equivalent to main. Remaining differences include historical documentation and generated metadata; do not merge again based on SHA counts. |
| `feat/public-product-presentation` | 53 | 53 | Old open-world production branch with 45 ordinary patches equivalent to main. Remaining source, rules, protagonist, story-architecture, and documentation differences need comparison with later implementations. |
| `feat/text-open-world-product-architecture` | 38 | 38 | Old open-world architecture, partly superseded by later implementation. Not 38 missing features; do not restore obsolete product boundaries. |
| `refactor/storyforge-bronze-ui` | 3 | 0 | Pushed historical UI branch, with [PR #84](https://github.com/yuanbw2025/storyforge/pull/84) still open. It does not replace current interface instructions. |

## Uncommitted work and archive deduplication

- `feat/builtin-games-mainline-20261006`: 10 uncommitted status entries at audit time, covering work cards, scenes in the three games, navigation tests, debug configuration, SVG assets, and generated documentation. The pushed PR #111 version does not contain these local changes.
- `feat/builtin-games-release`: 72 status entries observed across built-in works, entry points, assets, dependencies, and documentation, related to the migration in PR #111. Staged and unstaged files are not an accepted release snapshot.
- `codex/wechat-articles-screenshots-20260922`: two uncommitted home/workspace CSS files; screenshot adjustments still need to be distinguished from product changes.
- `feat/character-chat-recording`: all 78 untracked entries are under `.vite-e2e-cache/`, classified as test cache only.
- `feat/character-chat-optimization-20261006`: no independent feature commits or uncommitted files at audit time. A branch name does not prove completed optimization.

Earlier cleanup authorized by the maintainer removed 74 old branch references and moved 33 old worktrees into an archive directory. A remaining directory does not mean its branch is active. Archived detached `c5e04d3c` contains only unique merge history with no file difference against the merge base. The September 12 UI rebuild at detached `e08ffd7e` was explicitly retired by the maintainer and is no longer treated as pending delivery. Equivalent patches from old text-adventure revisions have been deduplicated and are not proposed for merging again.

This maintenance does not commit, push, merge, or clean up the development work above, or modify author browser data. The full historical record remains in the [2026-10-04 audit snapshot](/en/updates/development-status-20261004), excluded from local search and not a current to-do list.

Continue: [Changelog](/en/updates/changelog) · [Compatibility](/en/updates/compatibility).
