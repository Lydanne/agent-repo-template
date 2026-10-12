# 工具约定

只有宿主实际提供的工具可以调用，文件说明不等于安装或授权。

- agent_repo：list/inspect 读取登记及本地 Git 状态；skills 生成范围索引，启用 sync 时会先同步。
- agent_worker：run 接纳后台执行，status/wait 查询原任务，cancel 取消，await_user/reply 补充信息。参数合同见插件文档。
- memory_search/memory_get：按宿主当前会话可见性检索。
- feishu_group_history：Main 按需读取当前群并交接必要信息；Worker 不直接获取群历史。

机器路径、模型、状态目录、CLI 登录态和凭证只在管理员私有宿主配置中维护。角色政策文件为 tools/agent-worker-policy.json，修改后重新生成并审查迁移计划，不自动改变已受理任务。
