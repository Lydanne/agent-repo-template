# 首次接入 OpenClaw、更新与恢复

本模板是 Agent workspace，不能通过 plugins install 安装。第一次从上到下执行本页；已有旧环境迁移才使用 --prepare-migration。插件产物准备与隔离安装见 [完整安装指南](https://github.com/Lydanne/openclaw-plugins/blob/main/docs/openclaw-setup.md)。

## 1. 准备宿主与两个仓库

需要 Node.js 24.19+、pnpm 10.33.2、OpenClaw 2026.9.5+、Git 和可用的 Codex CLI。先执行 openclaw onboard 完成 Gateway 与主模型配置；在 Gateway 运行用户下执行 codex login、codex login status。Main 的宿主模型与 Worker 的 Codex 模型分别配置，不互相替代。

在 GitHub 点 Use this template 创建自己的角色仓库，再 clone 到实际绝对路径。以下 OWNER/MY-AGENT、OWNER/PROJECT 均须替换；项目分支应与登记一致。

```sh
git clone https://github.com/OWNER/MY-AGENT.git /srv/agents/my-agent
cd /srv/agents/my-agent
mkdir -p projects
git clone --no-recurse-submodules https://github.com/OWNER/PROJECT.git projects/demo
```

填写角色文件与 tools/agent-worker-policy.json，再将 projects.json 改为：

```json
{
  "schemaVersion": 1,
  "projects": {
    "demo": {
      "name": "演示项目",
      "url": "https://github.com/OWNER/PROJECT.git",
      "branch": "main",
      "repository": "projects/demo",
      "skills": []
    }
  }
}
```

有已提交技能目录才登记，例如 projects/demo/.agents/skills。业务仓库须为独立 Git 根，origin URL 和分支与登记一致。项目适用 AGENTS.md、技能也须已提交。按 [项目指南](projects.md) 核对，然后在角色仓库提交本次角色和登记改动；projects/ 已忽略，不提交嵌套业务仓库。

## 2. 安装三个插件

按完整安装指南构建并 npm pack 三个包。在目标 OpenClaw 状态目录执行（替换包路径；--force 同时会允许覆盖，首次安装前核对来源）：

```sh
openclaw plugins install /absolute/feishu-package.tgz --force --accept-capabilities
openclaw plugins install /absolute/agent-repo-package.tgz --force --accept-capabilities
openclaw plugins install /absolute/agent-worker-package.tgz --force --accept-capabilities
```

三个清单 ID 分别是 feishu-conversation、agent-repo、agent-worker。不要安装官方 @openclaw/feishu 来代替本仓库版本，也不要额外加入同一源码 load.paths。插件安装只为下次 Gateway 加载保存产物，尚未完成业务配置。

## 3. 生成完整配置补丁

在仓库外创建仅当前用户可读的私有目录，将以下内容保存为 settings.json，替换所有路径、模型及飞书凭证。model 填 Codex 账号实际可用模型；示例值不是所有账号都可用。state 须可写，codexHome 指向该运行用户已经登录的目录。cli 和 node 应填写 command -v 的绝对路径；Node 须满足版本要求。

```json
{
  "agentId": "main",
  "projectId": "demo",
  "cli": "/usr/local/bin/codex",
  "node": "/usr/local/bin/node",
  "codexHome": "/home/openclaw/.codex",
  "state": "/home/openclaw/.openclaw/agent-worker",
  "model": "gpt-6.1-sol",
  "feishu": {
    "appId": "cli_REPLACE",
    "appSecret": "REPLACE",
    "groupAllowFrom": ["oc_REPLACE"]
  }
}
```

未接入飞书时先省略 feishu 对象，通过本地项目验收后再添加。生成器此时关闭 asyncCompletion，使用本地 wait/status 协议；飞书异步交付依赖实际来源绑定和完成适配器，不能仅在本地会话开启该开关。飞书凭证及生成补丁不得放进本仓库。对私有目录及文件设置 700/600 权限。

```sh
cd /srv/agents/my-agent
node tools/create-openclaw-patch.mjs /private/settings.json --host-config > /private/plugin.patch.json
openclaw config patch --file /private/plugin.patch.json --dry-run
openclaw config patch --file /private/plugin.patch.json
openclaw config validate
```

--host-config 通过当前 OpenClaw 的 config get --json 导出 agents/plugins/tools/bindings，支持宿主原始 JSON5，保留旧 agents.list 或新 agents.entries 配置格式；生成器不修改配置。离线操作可用标准 JSON 文件路径代替 --host-config。必须指向目标宿主环境，已有配置不能省略输入，否则数组中的其他 Agent 和白名单可能丢失。

生成器配置 Agent workspace 与 agent-repo binding 为同一角色根，保持 sync.enabled=false、开启会话钩子，显式加入工具权限；Worker 使用 agent-repo 项目路由、只读沙箱、指定机器路径与模型，并读取四项模板政策。政策不会被插件自动从文件重读，修改后须重新生成并应用。已有工具 deny/profile、Agent 与通道策略仍须核对，deny 优先于 allow；不得全局开放不需要的工具。非 main Agent 会增加 default 飞书账号 binding，已有相同 binding 时先合并去重。

可选只读检查，从插件仓库执行：

```sh
node packages/agent-repo/cli.mjs inspect --repo /srv/agents/my-agent
```

普通 plan 只登记 binding，--activate-workspace 才规划 workspace；tarball 安装加 --installed，避免添加源码路径。--prepare-migration 为既有旧 Feishu workspaceSync/Worker 迁移，--prepare-sync 为另行启用同步；首次接入不需要这两种计划。plan 输出包含说明和 patch，不能整份当配置补丁应用。

## 4. 飞书配置与启动

在飞书开发者后台创建自建应用，启用机器人、长连接订阅 im.message.receive_v1，授予消息接收/发送权限，发布版本并设置应用可用范围。卡片回调、报告文档及附件权限见 [Feishu 插件指南](https://github.com/Lydanne/openclaw-plugins/blob/main/packages/feishu/README.md)。官方 [飞书设置说明](https://docs.openclaw.ai/channels/feishu) 可核对平台流程，插件安装来源仍使用本仓库产物。

```sh
openclaw plugins inspect feishu-conversation --runtime --json
openclaw plugins inspect agent-repo --runtime --json
openclaw plugins inspect agent-worker --runtime --json
openclaw gateway run
```

首次以前台日志验收，后台运行可由管理员执行 openclaw gateway install；已有服务在授权维护窗口执行 openclaw gateway restart。另一个终端执行 openclaw gateway health。只有 feishu-conversation 提供 feishu 通道，旧官方 feishu 插件被关闭。没有真实飞书凭证时通道未连接属于预期，不等于飞书验收通过。

默认 DM 需要配对：先私聊机器人，再由管理员运行 openclaw pairing list feishu、openclaw pairing approve feishu <code>。群聊把机器人加入已登记 groupAllowFrom 的群并 @；空白名单拒绝群消息。多账号/多 Agent 需按实际 accountId 调整 binding。旧 channels.feishu.workspaceSync 必须关闭后才能启用新的仓库同步。

## 5. 验收与恢复

先让 Main 调用 agent_repo list、agent_repo skills repository=projects/demo 和 agent_worker projects，核对注册项目和技能。再要求 Main 委派一个只读任务：读取 demo 的 README，报告实际工作目录与 HEAD；run 提供 projectId=demo、repository=projects/demo、topic、requestId、task、context、constraints 和 memory。无可引用记忆时按工具 schema 使用 unavailable 状态并写明原因。飞书异步受理后 Main 结束轮次，保存 jobId，等待完成事件；本地模式则用原 jobId 的 wait/status 取回结果；只在明确查询进度时用原 jobId 查询。

一次新任务的工具参数示例（memory 仅在工具确实不可用时如此填写，有工具时先检索）：

```json
{
  "action": "run",
  "projectId": "demo",
  "repository": "projects/demo",
  "topic": "demo-readme-check",
  "requestId": "demo-readme-check-001",
  "task": "读取 README，报告当前目录及 Git HEAD",
  "context": "首次接入验收，没有此前任务上下文",
  "constraints": "仅在 demo 项目只读；不修改业务文件、不提交推送、不调用外部业务服务",
  "memory": {"status": "unavailable", "queries": [], "items": [], "reason": "本会话没有可用的原生记忆工具"}
}
```

本地模式可增加 deliveryMode=wait、waitSeconds=0 后用原 jobId 取回结果；飞书异步模式不能使用 deliveryMode=wait。

核对真实 Codex 运行、实际 cwd、技能与报告。之后在授权测试群核对 @受理、卡片、补充回复、完成提醒、报告正文和成员访问权限。loaded、健康响应或模拟 CLI 测试不替代真实模型和飞书端到端验证。

角色改动在角色仓库，业务提交在 Project Repo，插件升级在 openclaw-plugins。异机恢复时重新克隆角色和项目，恢复私有登录态、重生成机器路径补丁。保留原 Worker state、requestId、jobId；正在执行的任务先交接，不删除旧状态或重复 run。自动同步应单独验收安全快进、origin/tracking、脏树及分叉保护，再启用。
