# 项目登记与技能范围

projects.json 只登记项目元数据，默认 projects 为空。登记格式为 schemaVersion=1、projects 对象；键为最多 64 字符的项目 ID，首字符字母数字，其余可用连字符及下划线。

每项要求 name、url、branch、repository、skills。repository 固定为 projects/<登记ID>；skills 是对应项目内部相对路径的数组，可为空。knowledge 可选且须在项目内部，原生同步仅对明确登记为 projects/<ID>/wiki 的 wiki 使用对应同步逻辑。

URL 不含密码、Token 查询串或片段。路径不使用绝对路径、.. 或逃逸软链接。不登记 memory 字段。最多 100 项、每项 20 个技能目录，登记文件不超过 256 KiB。

## 准备业务仓库

先将示例 OWNER/PROJECT 和分支替换为真实值：

```sh
mkdir -p projects
git clone --no-recurse-submodules https://github.com/OWNER/PROJECT.git projects/demo
git -C projects/demo status --short --branch
git -C projects/demo remote -v
```

项目根必须为独立 Git 仓库，不能使用软链接，也不能作为角色仓库的 Submodule；projects/ 整体忽略。业务项目自身可包含 repositories/<名称> 或 wiki 子模块，按该项目 AGENTS.md 初始化所需范围。

list/inspect 基于本地状态，不 fetch。启用同步或迁移前管理员刷新 refs，核对实际 origin、登记分支及 tracking；不要自动 stash、覆盖改动或提交经验来消除同步阻塞。

## Main / Worker 范围

- agent_repo skills repository=projects/demo：角色 skills/＋demo 登记的开发技能。
- repository=projects/demo/repositories/server：再继承 server/.agents/skills；同名子仓库优先，角色技能保持优先。
- Worker cwd 始终为 projects/demo；scopeDirectory 才是所选 server 范围，运行命令要明确相对目录。
- 多项目逐任务明确选择，不用 defaultProject 推断运行目标。不把 projects/ 加入全局 skills.load.extraDirs。
- 技能、角色规则及相关 AGENTS.md 须已提交；后台接纳后冻结范围，执行前发现版本或未提交变更时停止，不自动重跑。
