# 待合并开发记录与分支核对

> 核对快照：2026-10-04 · 远程 main `0108ab31`。本页是开发证据，不是已发布功能清单，也不承诺将历史替代方案全部合并。

已遍历全部 85 个本地分支：65 个 head 已是主干祖先，20 个存在主干之外的提交。下表“仅本地提交”指未被任何已获取的 origin 分支包含的提交；rebase、cherry-pick 和 merge 都可能产生内容重叠但 SHA 不同的记录，数字不代表遗漏功能数量。本轮文档核对没有推送或合并这些开发分支。

正式操作指南以主干行为为准；未合并内容在这里登记，合并后再复核并更新指南。[PR #100](https://github.com/yuanbw2025/storyforge/pull/100) 在快照时仍开放，后续以其最新状态与最终检查为准。

| 本地分支 | 主干外提交 | 仅本地提交 | 内容与处理结论 |
| --- | ---: | ---: | --- |
| `codex/backup-text-open-world-before-main-sync-20260906-3f38495f` | 45 | 45 | 旧开放世界备份；43 个补丁与主干等价，余项需逐项核对，勿重复合并。 |
| `codex/backup-text-open-world-pre-main-rebase-20260906` | 38 | 38 | 旧开放世界 rebase 前备份；与同名产品架构分支同 head，不能仅凭旧 SHA 判断功能缺失。 |
| `feat/application-dossier` | 1 | 1 | AVG 复用冻结世界媒资；与 fix/avg-production-world-media-reuse 同一提交，是否已被后续实现覆盖待核对。 |
| `feat/builtin-3d-adventure` | 9 | 9 | 《潮痕：最后一盏灯》《远日点：第七码头》与短篇救援内置作品、独立存档及显示控制；本地提交未推送。 |
| `feat/game-product-production-lanes` | 4 | 4 | 游戏产品生命周期、生产分工及总纲知识库路由规定；4 个文档提交尚未推送。 |
| `feat/independent-creation-integration` | 2 | 2 | 仅独有 merge 提交；相对合并基线无文件差异，不当作新增功能。 |
| `feat/mist-harbor-builtin` | 1 | 1 | 雾港 AVG 音效、配乐与录制文案；本地比远程分支多 1 个提交。 |
| `feat/public-product-presentation` | 53 | 53 | 旧开放世界生产分支；45 个补丁与主干等价，其余涉及来源、规则、主角与故事架构，需核对后续实现。 |
| `feat/text-adventure-content-revision` | 9 | 1 | 故事和角色局部修订；本地独有补丁与 PR #100 等价，随该 PR 跟踪。 |
| `feat/text-adventure-first-community-flagship` | 43 | 0 | PR #100 已推送未合并；潮钟群岛未发布试玩、封面详情、局部修订、恢复及玩家指引。工程与作品发布分别验收。 |
| `feat/text-adventure-scene-plan-revision` | 22 | 12 | 12 个本地独有补丁与 PR #100 等价；场景、路线与视觉修订不重复计数。 |
| `feat/text-open-world-product-architecture` | 38 | 38 | 旧开放世界架构与玩法实现，与 rebase 前备份同 head；部分等价、部分需人工核对。 |
| `fix/avg-production-world-media-reuse` | 1 | 1 | 与 feat/application-dossier 同一提交；保留冻结媒资复用的待核对项。 |
| `fix/home-layout-font-preview` | 3 | 3 | 首页布局与侧栏文字、力量体系收口到世界起源；本地未推送，当前主干指南不提前切换入口。 |
| `fix/open-world-player-render-cost` | 26 | 0 | head 已包含在 PR #100；旅行效果校验索引优化与其关联冒险修订随该 PR 跟踪。 |
| `fix/readme-community-links` | 1 | 1 | 独有 merge 提交；不据此宣称新的社区功能，历史合并差异待维护者确认。 |
| `fix/text-adventure-repair-baseline` | 11 | 1 | 本地独有修复补丁与 PR #100 等价；上游修改后的修复基线失效处理。 |
| `fix/text-adventure-source-depth` | 1 | 1 | 专职任务读取所选来源；PR #100 有相关后续实现，但 patch-id 不等价，待核对再处置。 |
| `refactor/storyforge-bronze-ui` | 3 | 0 | 青铜 UI 分支已推送未合并；历史替代方案，不替换当前官网操作说明。 |
| `refactor/storyforge-ui-rebuild` | 5 | 5 | 早期 UI 重建及交接，本地未推送；与后续主干界面存在重叠，需核对独有差异。 |

## 尚未提交的工作区

- `feat/builtin-games-release`：内置游戏、入口、素材、依赖与文档存在暂存及未暂存改动，与 `feat/builtin-3d-adventure` 有关联重叠；未提交文件仍需单独检查，不能当作可发布快照。
- `codex/wechat-articles-screenshots-20260922`：首页及工作区布局 CSS 未提交，需作者判断是截图专用调整还是正式产品改动。
- `feat/character-chat-recording`：仅发现未跟踪的 `.vite-e2e-cache/`，归类为测试缓存，不当作遗漏功能。

本轮没有修改作者原工作区、浏览器数据或媒资。仅存在本地文件与分支，不能证明开发已完成或已经验收。

## 下次如何核对

重新枚举每个本地分支及关联工作区，刷新远程引用，结合祖先关系、补丁等价性、实际实现与 PR 状态，再对照受影响指南和更新日志。已确认但尚未合并的内容继续在本页登记，不提前放入已交付能力说明。同步维护中英文，在文档维护记录中保留上次成功处理的主干提交，另行核对官网部署是否成功。

继续阅读：[更新日志](/updates/changelog) · [版本与兼容](/updates/compatibility)。
