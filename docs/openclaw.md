# 接入、更新与异机恢复

完整插件安装、隔离验证和组合配置见 [OpenClaw 接入指南](https://github.com/Lydanne/openclaw-plugins/blob/main/docs/openclaw-setup.md)。模板本身不通过 plugins install 安装。

## 接入

1. 安装 agent-repo 插件；需要后台执行时另装 agent-worker，需要飞书交付时安装 feishu-conversation。
2. 配置 agents.list 中目标 Agent workspace 为本角色仓库，并配置 plugins.entries.agent-repo.config.agents.<AgentID>.repo 为相同绝对路径。保留其他 Agent 项。
3. 开启 agent-repo hooks.allowConversationAccess，先保持 sync.enabled=false，核对工具白名单。
4. 新版 Worker 使用 projectRouting=auto/agent-repo，经可信 Agent 项目 API 派生 cwd；旧版兼容入口配置 skillContextRoot 为角色根，cwd 为独立 projects/<ID> 项目根。显式配置 CLI、Node、Codex 用户目录、状态、模型、沙箱及四项角色政策。
5. 使用 agent-repo CLI 生成计划。普通 plan 不切 workspace；--activate-workspace 规划 workspace；--prepare-migration 还规划 Worker 政策与同步；--prepare-sync 只规划同步。都不应用配置、不 fetch、不重启。

从插件仓库运行（路径替换为实际值）：

```sh
node packages/agent-repo/cli.mjs inspect --repo /srv/agents/my-agent
node packages/agent-repo/cli.mjs plan --agent-id main \
  --repo /srv/agents/my-agent --config /private/path/openclaw.json \
  --default-project demo --prepare-migration > /private/path/agent-plan.json
```

CLI 配置输入须为标准 JSON，JSON5 先通过宿主正规接口导出。审查 plan 的 ready/blockers/warnings，单独保存 patch 字段，用 openclaw config patch --file <patch> --dry-run 验证。迁移要求实际项目已初始化、refs 已刷新且角色与项目跟踪分支一致，不使用空登记模板直接激活。

同步启用时，关闭旧 channels.feishu.workspaceSync.enabled；两套同步入口不能同时使用。政策修改后重新生成并审查计划，已受理 job 保留旧配置快照。

## 更新与恢复

角色改动提交到自己的仓库；业务提交在独立 Project Repo；插件升级在 openclaw-plugins。自动同步为安全快进，脏工作树、错误 origin/tracking、分叉或未初始化对象需管理员处理，不自动修复。

新机器克隆自己的角色仓库，然后逐项目克隆并按任务初始化子模块，恢复已授权的私有状态和 CLI 登录，重新审查绝对路径与配置。存在正在执行的任务时先交接，保留原状态目录和 jobId；不以新的 run 代替恢复。

## 验收

核对角色文件、可信 Agent binding、agent_repo list/inspect/skills、记忆可见范围、实际 Worker cwd 与技能/规范读取。飞书连接、@受理、卡片回执、用户补充、报告可读和完成提醒按测试群分别验证。模板建仓、插件 loaded 或模型返回成功均不证明生产端到端交付。
