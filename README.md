# Agent Repo Template

用于 OpenClaw 的通用角色仓库模板，配合 [agent-repo 插件](https://github.com/Lydanne/openclaw-plugins/tree/main/packages/agent-repo) 与 [agent-worker 插件](https://github.com/Lydanne/openclaw-plugins/tree/main/packages/agent-worker) 使用。角色、技能、项目登记和可共享经验由此仓库维护；业务代码在独立 Project Repo 中维护。

## 创建自己的 Agent

1. 在本仓库点击 **Use this template → Create a new repository**，选择自己的仓库名及可见性。
2. 克隆新仓库，明确读取 [BOOTSTRAP.md](BOOTSTRAP.md)，填写身份、职责与授权边界。OpenClaw 不保证克隆后自动完成初始化。
3. 编辑 projects.json，登记实际项目；克隆项目到 projects/<项目ID>。角色仓库只忽略目录，不自动克隆或初始化项目。
4. 提交角色、规则和登记文件。技能及规范必须已提交，才能参与运行时快照校验。
5. 安装插件并生成配置计划，审查后在授权维护窗口接入 OpenClaw；详细步骤见 [接入与恢复](docs/openclaw.md)。

只想参考文件时可以 clone 此模板；用于实际角色时应创建独立仓库，并让 origin 指向自己的角色仓库。同步默认要求 main/origin，不要把日常记忆自动推送到公共模板。

## 文件与职责

| 路径 | 用途 |
| --- | --- |
| AGENTS.md | 主会话工作流、项目选择、委派与授权 |
| SOUL.md / IDENTITY.md / USER.md / TOOLS.md | 角色、身份、非私密使用偏好、工具约定 |
| BOOTSTRAP.md | 创建新角色时的管理员初始化清单 |
| projects.json | schemaVersion=1 的项目登记；默认空登记 |
| skills/ | 此角色专用技能；不复制所有业务项目技能 |
| tools/agent-worker-policy.json | 完整迁移计划读取的角色政策；不含机器路径 |
| MEMORY.md / memory/YYYY-MM-DD.md | 经核验且允许在共享范围保存的经验 |
| projects/<项目ID>/ | 被 Git 忽略的独立业务仓库 |
| docs/ | 项目登记、接入、恢复和记忆管理说明 |

此仓库不是 OpenClaw 插件，不含业务源码、真实用户数据、凭证或运行状态；也不提供完整操作系统权限隔离。一个角色的工作区记忆可能被多个会话共享，目录分开不等于私聊隔离。

## 最小项目登记示例

下面 demo 仅示范格式，必须替换 URL 和项目名，不能按字面运行：

```json
{
  "schemaVersion": 1,
  "projects": {
    "demo": {
      "name": "Demo",
      "url": "https://github.com/OWNER/PROJECT.git",
      "branch": "main",
      "repository": "projects/demo",
      "skills": ["projects/demo/.agents/skills"]
    }
  }
}
```

见 [项目与技能范围](docs/projects.md)、[记忆管理](docs/memory.md) 和 [插件安装组合指南](https://github.com/Lydanne/openclaw-plugins/blob/main/docs/openclaw-setup.md)。模板默认空登记可被插件解析，但没有可执行项目；它不会替你申请业务权限或应用生产配置。
