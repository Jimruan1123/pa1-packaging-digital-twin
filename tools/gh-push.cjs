// GitHub 增量推送（公司电脑：git 命令行出站被拦，走 Clash Verge CONNECT 隧道 + REST API）
//
// 相比早期的 gh_push.cjs 修了两个要命的问题：
//   1. 旧脚本建 commit 不带 parents -> 每次推送都把历史冲掉。这里会读当前 HEAD 当 parent。
//   2. 旧脚本 walkDir 用 `.cjs` 后缀黑名单排除自己，导致 tools/ 下的脚本也被漏掉；
//      并且没有真正读 .gitignore。这里改成显式白/黑名单 + 尊重 .gitignore 的核心条目。
//
// 用法：
//   $env:NODE_TLS_REJECT_UNAUTHORIZED="0"
//   $env:GITHUB_TOKEN="github_pat_..."
//   node tools/gh-push.cjs --repo Jimruan1123/pa1-packaging-digital-twin --branch main -m "提交说明"
//   加 --dry 只列文件不上传。

const http = require('http');
const tls = require('tls');
const fs = require('fs');
const path = require('path');

const PROXY_HOST = process.env.PROXY_HOST || '127.0.0.1';
const PROXY_PORT = Number(process.env.PROXY_PORT || 7897);

function arg(name, def) {
  const i = process.argv.indexOf('--' + name);
  if (i < 0) return def;
  const v = process.argv[i + 1];
  return (v && !v.startsWith('--')) ? v : true;
}

const REPO = arg('repo', 'Jimruan1123/pa1-packaging-digital-twin');
const BRANCH = arg('branch', 'main');
const DRY = !!arg('dry', false);
const MESSAGE = arg('m', null) || process.env.COMMIT_MESSAGE;

// 目录/文件排除规则。dist 是构建产物，绝不上传（见 AGENTS.md 部署章节）。
const SKIP_DIRS = new Set(['node_modules', 'dist', '.git', '.vite', 'dist-ssr']);
const SKIP_FILES = new Set([
  '_p.txt', 'deploy.zip',
  // 早期一次性脚手架：pa1-writer 依赖的 pa1-content.cjs 已不存在，全是死代码
  'pa1-build.cjs', 'pa1-p1.cjs', 'pa1-writer.cjs',
  // 已被 tools/gh-push.cjs 取代（旧脚本不带 parents，会冲掉提交历史）
  'gh_push.cjs', 'gh_check.cjs', 'gh_test.cjs',
  // index.html 的旧副本
  'pa1-layout.html',
  // 本地改动前的备份，不进仓库
  'pa1-main.backup.ts',
]);
// 二进制/图片不走这个文本上传通道；.hold 是构建时临时改名产物
const SKIP_EXT = /\.(png|jpe?g|gif|ico|exe|dll|zip|pptx?|docx?|xlsx?|hold|local|log)$/i;

function walk(dir, base, out = []) {
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, item.name);
    const rel = path.relative(base, full).replace(/\\/g, '/');
    if (item.isDirectory()) {
      if (SKIP_DIRS.has(item.name)) continue;
      if (item.name.startsWith('.')) continue;
      walk(full, base, out);
      continue;
    }
    if (SKIP_FILES.has(item.name)) continue;
    if (SKIP_EXT.test(item.name)) continue;
    // 隐藏文件只放行 .gitignore
    if (item.name.startsWith('.') && item.name !== '.gitignore') continue;
    out.push(rel);
  }
  return out;
}

function api(method, apiPath, token, body) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      host: PROXY_HOST, port: PROXY_PORT,
      method: 'CONNECT', path: 'api.github.com:443',
    });
    req.on('connect', (pres, socket) => {
      if (pres.statusCode !== 200) {
        return reject(new Error('代理 CONNECT 失败: ' + pres.statusCode + '（Clash Verge 没开或端口不对？）'));
      }
      const t = tls.connect({ socket, servername: 'api.github.com', rejectUnauthorized: false }, () => {
        const b = body ? JSON.stringify(body) : '';
        const h = [
          method + ' ' + apiPath + ' HTTP/1.1',
          'Host: api.github.com',
          'User-Agent: CodexBot/1.0',
          'Connection: close',
          'Content-Length: ' + Buffer.byteLength(b),
          'Accept: application/vnd.github.v3+json',
          'Authorization: token ' + token,
        ];
        if (body) h.push('Content-Type: application/json');
        t.write(h.join('\r\n') + '\r\n\r\n' + b);
      });
      let data = '', headersDone = false, status = 0;
      t.on('data', c => {
        data += c.toString();
        if (!headersDone && data.includes('\r\n\r\n')) {
          const parts = data.split('\r\n\r\n');
          status = parseInt(parts[0].split('\r\n')[0].split(' ')[1], 10);
          data = parts.slice(1).join('\r\n\r\n');
          headersDone = true;
        }
      });
      t.on('end', () => {
        let parsed = data;
        try { parsed = JSON.parse(data); } catch (e) {}
        if (status >= 200 && status < 300) resolve(parsed);
        else reject(new Error('HTTP ' + status + ': ' + String(data).substring(0, 300)));
      });
      t.on('error', reject);
    });
    req.on('error', reject);
    req.end();
  });
}

(async () => {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error('缺 GITHUB_TOKEN 环境变量');
  if (!MESSAGE && !DRY) throw new Error('缺提交说明，用 -m "..."');

  const root = path.resolve(__dirname, '..');
  const files = walk(root, root).sort();
  console.log('待上传 ' + files.length + ' 个文件：');
  files.forEach(f => console.log('  - ' + f));
  if (DRY) { console.log('\n--dry 模式，未上传。'); return; }

  // 读当前 HEAD 作为 parent，保住提交历史
  let parentSha = null;
  try {
    const ref = await api('GET', '/repos/' + REPO + '/git/ref/heads/' + BRANCH, token);
    parentSha = ref.object.sha;
    console.log('\n当前 HEAD: ' + parentSha.substring(0, 12));
  } catch (e) {
    console.log('\n没有现成分支（空仓库或新分支），将作为首个提交');
  }

  console.log('上传 blob...');
  const tree = [];
  for (const rel of files) {
    const content = fs.readFileSync(path.join(root, rel));
    const blob = await api('POST', '/repos/' + REPO + '/git/blobs', token, {
      content: content.toString('base64'), encoding: 'base64',
    });
    tree.push({ path: rel, mode: '100644', type: 'blob', sha: blob.sha });
    console.log('  OK ' + rel);
  }

  console.log('创建 tree...');
  const treeRes = await api('POST', '/repos/' + REPO + '/git/trees', token, { tree });

  console.log('创建 commit...');
  const commitBody = { message: MESSAGE, tree: treeRes.sha };
  if (parentSha) commitBody.parents = [parentSha];
  const commit = await api('POST', '/repos/' + REPO + '/git/commits', token, commitBody);

  console.log('更新 ref...');
  try {
    await api('POST', '/repos/' + REPO + '/git/refs', token, {
      ref: 'refs/heads/' + BRANCH, sha: commit.sha,
    });
  } catch (e) {
    await api('PATCH', '/repos/' + REPO + '/git/refs/heads/' + BRANCH, token, {
      sha: commit.sha, force: false,
    });
  }

  console.log('\n=== 推送完成 ===');
  console.log('commit: ' + commit.sha.substring(0, 12));
  console.log('https://github.com/' + REPO + '/tree/' + BRANCH);
})().catch(e => { console.error('失败: ' + e.message); process.exit(1); });
