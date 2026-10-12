# 原生记忆与共享边界

MEMORY.md 保存长期经验，memory/YYYY-MM-DD.md 保存日常记录。projects.json 不登记项目记忆路径，agent-repo 不提供新的记忆工具或自动写回。

Main 使用宿主原生 memory_search/memory_get，在当前会话可见范围检索；交给 Worker 的 memory 只包含本任务所需、有来源的少量经验。matched、no_match 必须来自真实检索，无法使用检索工具时明确 unavailable 及原因。

Worker 提供经验建议；Main 核对当前证据、去重、确认适用条件和共享权限后才保存。共享工作区不等于私人记录可进入群聊；Git 目录、工具 topic 和项目路由均不能提供私聊权限隔离。

开启 preserveLocalMemory 后，Agent Repo 同步可保留未暂存的 MEMORY.md 和 memory/YYYY-MM-DD.md，前提是远端没有改变相同或祖先路径。其他改动、暂存项和业务项目改动仍可阻止同步。不能自动提交、stash 或覆盖冲突来继续。

Git clone 不恢复被忽略的 SQLite、原始对话、任务状态、向量缓存、Codex 登录态或未提交记忆；需要时由管理员私有备份和恢复。公共模板永远不承载这些资料。
