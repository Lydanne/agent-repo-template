# 新角色初始化

管理员创建派生仓库后显式执行以下清单；不假定 OpenClaw 自动运行此文件。

1. 确认名称、Agent ID、角色仓库 URL、main 分支、业务职责和仓库可见性。
2. 填写 IDENTITY.md、SOUL.md、USER.md、TOOLS.md 和 AGENTS.md，删除不适用约定。
3. 审查 tools/agent-worker-policy.json 四项角色政策；默认只读，无机器参数。
4. 按 docs/projects.md 登记并克隆项目，初始化必要子模块，核对 origin/branch/tracking。
5. 按 docs/memory.md 确认经验共享范围；模板记忆为空，不继承他人的私人内容。
6. 提交角色、规则及技能，生成配置计划并审查。先不启用自动同步或生产飞书。
7. 验收角色、项目范围、记忆、实际 Worker 执行及授权测试群交付。

完成后按宿主原生初始化生命周期处理此文件；不要删除仍需要的记录或将存在此文件视为已经初始化的证据。异机恢复见 docs/openclaw.md。
