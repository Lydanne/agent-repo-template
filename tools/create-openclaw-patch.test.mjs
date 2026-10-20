import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, copyFile, mkdir, writeFile, readFile, realpath, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';

test('fresh and existing configurations preserve Agent settings and render portable policies', async t => {
  const root = await mkdtemp(join(tmpdir(), 'agent-template-test-'));
  t.after(() => rm(root, {recursive: true, force: true}));
  const repo = join(root, 'role'); await mkdir(join(repo, 'tools'), {recursive: true});
  for (const file of ['create-openclaw-patch.mjs', 'agent-worker-policy.json']) await copyFile(new URL(file, import.meta.url), join(repo, 'tools', file));
  await writeFile(join(repo, 'projects.json'), JSON.stringify({schemaVersion: 1, projects: {demo: {}}}));
  const settings = {projectId: 'demo', cli: '/bin/codex', node: '/bin/node', codexHome: join(root, 'codex'), state: join(root, 'worker'), model: 'available-model', gitEnvironment: {CUSTOM_SYNC_MARKER: '1'}};
  const settingsPath = join(root, 'settings.json'), basePath = join(root, 'base.json');
  const base = {agents: {list: [{id: 'main', model: 'keep'}, {id: 'other', workspace: '/other'}]}, plugins: {allow: ['keep']}, tools: {allow: ['keep_tool']}};
  await writeFile(basePath, JSON.stringify(base));
  for (const feishu of [undefined, {appId: 'fixture', appSecret: 'fixture', groupAllowFrom: ['oc_fixture']}]) {
    await writeFile(settingsPath, JSON.stringify({...settings, feishu}));
    const patch = JSON.parse(execFileSync(process.execPath, [join(repo, 'tools/create-openclaw-patch.mjs'), settingsPath, basePath], {encoding: 'utf8'}));
    assert.equal(patch.agents.list[0].model, 'keep');
    assert.deepEqual(patch.agents.list[1], base.agents.list[1]);
    assert.ok(patch.tools.allow.includes('agent_worker') && patch.plugins.allow.includes('keep'));
    const worker = patch.plugins.entries['agent-worker'].config;
    assert.equal(worker.asyncCompletion, Boolean(feishu));
    assert.equal(worker.approvalMode, 'read-only');
    assert.ok(worker.executorInstructions.includes('{projectDir}'));
    assert.equal(worker.cwd, join(await realpath(repo), 'projects', 'demo'));
    assert.deepEqual(patch.plugins.entries['agent-repo'].config.agents.main.sync, {enabled: false, gitEnvironment: settings.gitEnvironment});
    assert.equal(patch.plugins.load, undefined);
    assert.equal(patch.plugins.entries['agent-repo'].config.agents.main.repo, await realpath(repo));
    assert.equal(await readFile(basePath, 'utf8'), JSON.stringify(base));
    assert.equal(patch.plugins.entries['feishu-conversation'].hooks.allowConversationAccess, true);
  }
  const {gitEnvironment, ...withoutEnvironment} = settings;
  await writeFile(settingsPath, JSON.stringify(withoutEnvironment));
  const fresh = JSON.parse(execFileSync(process.execPath, [join(repo, 'tools/create-openclaw-patch.mjs'), settingsPath], {encoding: 'utf8'}));
  assert.equal(fresh.plugins.allow, undefined);
  assert.equal(fresh.agents.list.length, 1);
  assert.deepEqual(fresh.plugins.entries['agent-repo'].config.agents.main.sync, {enabled: false});
  await writeFile(basePath, JSON.stringify({agents: {entries: {main: {model: 'keep', tools: {deny: ['exec']}}, other: {workspace: '/other'}}}}));
  const canonical = JSON.parse(execFileSync(process.execPath, [join(repo, 'tools/create-openclaw-patch.mjs'), settingsPath, basePath], {encoding: 'utf8'}));
  assert.equal(canonical.agents.entries.main.model, 'keep');
  assert.deepEqual(canonical.agents.entries.main.tools.deny, ['exec']);
  assert.deepEqual(canonical.agents.entries.other, {workspace: '/other'});
  assert.equal(canonical.agents.list, undefined);
  for (const environment of [{}, {KEY: ''}, {KEY: '😀'.repeat(20001)}]) {
    await writeFile(settingsPath, JSON.stringify({...withoutEnvironment, gitEnvironment: environment}));
    const patch = JSON.parse(execFileSync(process.execPath, [join(repo, 'tools/create-openclaw-patch.mjs'), settingsPath], {encoding: 'utf8'}));
    assert.deepEqual(patch.plugins.entries['agent-repo'].config.agents.main.sync, {enabled: false, gitEnvironment: environment});
  }
  for (const environment of [null, [], {'BAD-NAME': '1'}, {'KEY\n': '1'}, {KEY: 1}, {KEY: 'a\0b'}, {KEY: 'a'.repeat(40001)}, Object.fromEntries(Array.from({length: 101}, (_, i) => ['KEY_' + i, '1']))]) {
    await writeFile(settingsPath, JSON.stringify({...withoutEnvironment, gitEnvironment: environment}));
    assert.throws(() => execFileSync(process.execPath, [join(repo, 'tools/create-openclaw-patch.mjs'), settingsPath], {encoding: 'utf8', stdio: 'pipe'}), /Invalid settings.gitEnvironment/);
  }


});
