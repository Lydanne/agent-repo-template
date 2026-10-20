import {readFile, realpath} from 'node:fs/promises';
import {dirname, resolve, isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

// Settings and the optional base configuration are private local files, outside this repo.
const repo = await realpath(resolve(dirname(fileURLToPath(import.meta.url)), '..'));
const [settingsPath, basePath] = process.argv.slice(2);
if (!settingsPath) throw Error('Usage: node tools/create-openclaw-patch.mjs /private/settings.json [/private/base.json | --host-config]');
const settings = JSON.parse(await readFile(settingsPath, 'utf8'));
let base = {};
if (basePath === '--host-config') {
  for (const key of ['agents', 'plugins', 'tools', 'bindings']) {
    const result = spawnSync('openclaw', ['config', 'get', key, '--json'], {encoding: 'utf8'});
    if (result.error) throw result.error;
    const value = JSON.parse(result.stdout);
    if (value.ok === false && value.error) {
      if (JSON.stringify(value.error).match(/Config path (?:not found|is valid but unset):/)) continue;
      throw Error('Cannot export host configuration subtree: ' + key);
    }
    if (result.status !== 0) throw Error('Cannot export host configuration subtree: ' + key);
    base[key] = value;
  }
} else if (basePath) base = JSON.parse(await readFile(basePath, 'utf8'));
const policy = JSON.parse(await readFile(resolve(repo, 'tools/agent-worker-policy.json'), 'utf8'));
const registry = JSON.parse(await readFile(resolve(repo, 'projects.json'), 'utf8'));
const projectId = settings.projectId;
if (typeof projectId !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(projectId) || !registry.projects || !Object.hasOwn(registry.projects, projectId)) throw Error('Register settings.projectId in projects.json first');
for (const key of ['cli', 'node', 'codexHome', 'state']) {
  if (typeof settings[key] !== 'string' || !isAbsolute(settings[key])) throw Error('Absolute settings.' + key + ' required');
}
if (typeof settings.model !== 'string' || !settings.model.trim()) throw Error('Set an available Codex model in settings.model');
const gitEnvironment = settings.gitEnvironment;
if (gitEnvironment !== undefined && (
  gitEnvironment === null || typeof gitEnvironment !== 'object' || Array.isArray(gitEnvironment) ||
  Object.keys(gitEnvironment).length > 100 ||
  Object.entries(gitEnvironment).some(([key, value]) => !/^[A-Za-z_][A-Za-z0-9_]*$/.test(key) || /[\0\r\n]/.test(key) || typeof value !== 'string' || [...value].length > 40000 || value.includes('\0'))
)) throw Error('Invalid settings.gitEnvironment');
const policies = {};
for (const key of ['executorInstructions', 'businessDataPolicy', 'asyncInstructions', 'delegationInstructions']) {
  if (typeof policy[key] !== 'string' || !policy[key].trim()) throw Error('Missing policy.' + key);
  policies[key] = policy[key];
}
const agentId = settings.agentId ?? 'main';
if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(agentId)) throw Error('Invalid agentId');
const useEntries = base.agents?.entries !== undefined && base.agents?.list === undefined;
let agents, agent;
if (useEntries) {
  if (!base.agents.entries || typeof base.agents.entries !== 'object' || Array.isArray(base.agents.entries)) throw Error('Invalid base agents.entries');
  agents = structuredClone(base.agents.entries);
  agent = Object.hasOwn(agents, agentId) ? agents[agentId] : {};
  if (!agent || typeof agent !== 'object' || Array.isArray(agent)) throw Error('Invalid Agent entry');
  Object.defineProperty(agents, agentId, {value: agent, enumerable: true, configurable: true, writable: true});
} else {
  agents = structuredClone(base.agents?.list ?? []);
  if (!Array.isArray(agents) || agents.filter(item => item.id === agentId).length > 1) throw Error('Invalid base agents.list');
  agent = agents.find(item => item.id === agentId);
  if (!agent) { agent = {id: agentId}; agents.push(agent); }
}
agent.workspace = repo;
const tools = ['read', 'memory_search', 'memory_get', 'agent_repo', 'agent_worker'];
agent.tools = {...agent.tools, ...(agent.tools?.allow ? {allow: [...new Set([...agent.tools.allow, ...tools])]} : {alsoAllow: [...new Set([...(agent.tools?.alsoAllow ?? []), ...tools])]})};
const patch = {
  agents: useEntries ? {entries: agents} : {list: agents},
  plugins: {
    ...(base.plugins?.allow ? {allow: [...new Set([...base.plugins.allow, 'feishu-conversation', 'agent-repo', 'agent-worker'])]} : {}),
    entries: {
      feishu: {enabled: false},
      'feishu-conversation': {enabled: true, hooks: {allowConversationAccess: true}},
      'agent-repo': {enabled: true, hooks: {allowConversationAccess: true}, config: {agents: {[agentId]: {repo, sync: {enabled: false, ...(gitEnvironment !== undefined ? {gitEnvironment: {...gitEnvironment}} : {})}}}}},
      'agent-worker': {enabled: true, config: {
        cwd: resolve(repo, 'projects', projectId), projectRouting: 'agent-repo',
        cli: settings.cli, node: settings.node, codexHome: settings.codexHome, state: settings.state,
        pathPrefix: settings.pathPrefix ?? [dirname(settings.cli), dirname(settings.node)].join(':'),
        model: settings.model, reasoningEffort: 'low', approvalMode: 'read-only',
        skillsEnabled: true, asyncCompletion: Boolean(settings.feishu), resourceKeyExample: 'project:test:target:<id>', ...policies,
      }},
    },
  },
};
if (base.tools?.allow) patch.tools = {allow: [...new Set([...base.tools.allow, ...tools])]};
if (settings.feishu) {
  if (!settings.feishu.appId || !settings.feishu.appSecret) throw Error('Both Feishu application credentials required');
  patch.channels = {feishu: {enabled: true, appId: settings.feishu.appId, appSecret: settings.feishu.appSecret,
    domain: 'feishu', connectionMode: 'websocket', dmPolicy: 'pairing', groupPolicy: 'allowlist',
    groupAllowFrom: settings.feishu.groupAllowFrom ?? [], requireMention: true}};
  if (agentId !== 'main') patch.bindings = [...(base.bindings ?? []), {agentId, match: {channel: 'feishu', accountId: 'default'}}];
}
process.stdout.write(JSON.stringify(patch, null, 2) + '\n');
