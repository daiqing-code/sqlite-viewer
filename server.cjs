// 记忆库查看器 - 后端服务
// 启动: node server.cjs

const http = require('http');
const fs = require('fs');
const path = require('path');
const { readFileSync, readdirSync, statSync, writeFileSync, copyFileSync, existsSync, mkdirSync } = fs;

const initSqlJs = require('sql.js');

const CONFIG = JSON.parse(readFileSync(path.join(__dirname, 'config.json'), 'utf-8'));

const openclawHome = process.env.OPENCLAW_HOME || process.env.HOME || '.';
const DB_PATH = path.resolve(openclawHome, CONFIG.dbSubPath);
const WORKSPACE_DIR = path.resolve(openclawHome, CONFIG.workspaceSubPath);
const PORT = CONFIG.port;

// 解析 agent ID
let AGENT_ID = CONFIG.agentId;
if (!AGENT_ID) {
  const configPath = path.join(openclawHome, '.openclaw', 'openclaw.json');
  try {
    const cfg = JSON.parse(readFileSync(configPath, 'utf-8'));
    const agents = cfg.agents;
    if (agents) {
      if (agents.id) {
        AGENT_ID = agents.id;
      } else if (Array.isArray(agents.list) && agents.list.length > 0) {
        const main = agents.list.find(a => a.id === 'main');
        AGENT_ID = main ? main.id : agents.list[0].id;
      }
    }
    if (!AGENT_ID) console.error('⚠️ 未找到 agent 配置，请在 config.json 中设置 agentId');
  } catch (e) {
    console.error('⚠️ 读取 openclaw.json 失败，请在 config.json 中设置 agentId');
    AGENT_ID = '';
  }
}

let db = null;
let SQL = null;

// 读取身份名称（实时读取，不需要重启）
function getIdentityName() {
  const identityPath = path.join(WORKSPACE_DIR, 'IDENTITY.md');
  try {
    const content = readFileSync(identityPath, 'utf-8');
    const m = content.match(/\*\*Name:\*\*\s*(.+)$/m);
    return m ? m[1].trim() : '';
  } catch {
    return '';
  }
}

async function initDb() {
  SQL = await initSqlJs();
  if (existsSync(DB_PATH)) {
    const buffer = readFileSync(DB_PATH);
    db = new SQL.Database(new Uint8Array(buffer));
    console.log(`✅ 已加载记忆库: ${DB_PATH} (${(buffer.length/1024/1024).toFixed(1)} MB)`);
  } else {
    console.error(`❌ 未找到: ${DB_PATH}`);
    process.exit(1);
  }
}

// ====== 工作区文件接口（仅根目录 .md） ======
function collectRootWorkspaceFiles(dir) {
  const results = [];
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return results; }
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    if (!entry.isFile()) continue;
    if (!entry.name.endsWith('.md')) continue;
    const fullPath = path.join(dir, entry.name);
    try {
      const s = statSync(fullPath);
      results.push({ path: entry.name, fullPath, size: s.size, mtime: s.mtimeMs, isDir: false });
    } catch {}
  }
  return results.sort((a,b) => a.path.localeCompare(b.path));
}

// ====== memory/ 目录文件列表 ======
function collectMemoryDirFiles() {
  const dir = path.join(WORKSPACE_DIR, 'memory');
  const results = [];
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return results; }
  for (const entry of entries) {
    if (entry.name.startsWith('.') || entry.isDirectory()) continue;
    if (!entry.name.endsWith('.md')) continue;
    const fullPath = path.join(dir, entry.name);
    try {
      const s = statSync(fullPath);
      results.push({ path: `memory/${entry.name}`, fullPath, size: s.size, mtime: s.mtimeMs, isDir: false });
    } catch {}
  }
  return results.sort((a,b) => b.path.localeCompare(a.path));
}

// ====== 技能列表（从 skills 目录读取） ======
function collectSkills() {
  const skillsDir = path.join(WORKSPACE_DIR, 'skills');
  const results = [];
  let entries;
  try { entries = readdirSync(skillsDir, { withFileTypes: true }); } catch { return results; }
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
    const skillDir = path.join(skillsDir, entry.name);
    const skillMdPath = path.join(skillDir, 'SKILL.md');
    let description = '', version = '', location = '';
    try {
      const content = readFileSync(skillMdPath, 'utf-8');
      const mDesc = content.match(/description:\s*"([^"]+)"/);
      const mVer = content.match(/version:\s*"([^"]+)"/);
      const mLoc = content.match(/location:\s*"([^"]+)"/);
      if (mDesc) description = mDesc[1];
      if (mVer) version = mVer[1];
      if (mLoc) location = mLoc[1];
    } catch {}
    results.push({ name: entry.name, location, description, version, skillDir });
  }
  return results.sort((a,b) => a.name.localeCompare(b.name));
}

// ====== HTTP 路由 ======
async function handleRequest(req, res) {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = url.pathname;
  const method = req.method;

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  function json(data, code = 200) {
    res.writeHead(code, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  }

  function error(msg, code = 500) {
    json({ ok: false, error: msg }, code);
  }

  try {
    // ====== 记忆库统计 ======
    if (pathname === '/api/stats') {
      const s1 = db.exec("SELECT COUNT(*) as n FROM files")[0];
      const s2 = db.exec("SELECT COUNT(*) as n FROM chunks")[0];
      const s4 = db.exec("SELECT COUNT(*) as n FROM embedding_cache")[0];
      const s5 = db.exec("SELECT COUNT(DISTINCT model) as n FROM chunks")[0];

      json({
        ok: true,
        stats: {
          files: s1.values[0][0],
          chunks: s2.values[0][0],
          fts_entries: s2.values[0][0],
          embedding_cache: s4.values[0][0],
          models: s5.values[0][0],
          name: getIdentityName(),
          dbPath: DB_PATH,
          dbSize: (statSync(DB_PATH).size / 1024 / 1024).toFixed(1) + ' MB',
          workspaceDir: WORKSPACE_DIR,
        }
      });
      return;
    }

    // ====== 记忆库文件列表 ======
    if (pathname === '/api/files') {
      const stmt = db.prepare("SELECT path, source, hash, mtime, size FROM files ORDER BY path");
      const files = [];
      while (stmt.step()) files.push(stmt.getAsObject());
      stmt.free();

      const stmt2 = db.prepare("SELECT path, COUNT(*) as cnt FROM chunks GROUP BY path");
      const chunkCounts = {};
      while (stmt2.step()) {
        const row = stmt2.getAsObject();
        chunkCounts[row.path] = row.cnt;
      }
      stmt2.free();

      files.forEach(f => f.chunks = chunkCounts[f.path] || 0);

      json({ ok: true, files, total: files.length });
      return;
    }

    // ====== 记忆库分块查询 ======
    if (pathname === '/api/chunks') {
      const filePath = url.searchParams.get('path');
      const q = url.searchParams.get('search') || '';
      const limit = parseInt(url.searchParams.get('limit')) || 1000;

      if (!filePath) { error('path required', 400); return; }

      let stmt;
      if (q) {
        const likeQ = '%' + q.replace(/'/g, "''") + '%';
        stmt = db.prepare(
          `SELECT id, path, source, start_line, end_line, model, text
           FROM chunks WHERE path = $path AND text LIKE $q
           ORDER BY start_line LIMIT $limit`
        );
        stmt.bind({ $path: filePath, $q: likeQ, $limit: limit });
      } else {
        stmt = db.prepare(
          `SELECT id, path, source, start_line, end_line, model, text
           FROM chunks WHERE path = $path ORDER BY start_line LIMIT $limit`
        );
        stmt.bind({ $path: filePath, $limit: limit });
      }

      const chunks = [];
      while (stmt.step()) chunks.push(stmt.getAsObject());
      stmt.free();

      json({ ok: true, chunks, total: chunks.length });
      return;
    }

    // ====== 记忆库源码重建 ======
    if (pathname === '/api/raw') {
      const filePath = url.searchParams.get('path');
      if (!filePath) { error('path required', 400); return; }

      const stmt = db.prepare(
        `SELECT start_line, end_line, text FROM chunks
         WHERE path = $path ORDER BY start_line, end_line`
      );
      stmt.bind({ $path: filePath });

      const lines = new Map();
      while (stmt.step()) {
        const row = stmt.getAsObject();
        const textLines = (row.text || '').split('\n');
        for (let i = 0; i < textLines.length; i++) {
          const lineNo = row.start_line + i;
          if (!lines.has(lineNo)) lines.set(lineNo, textLines[i]);
        }
      }
      stmt.free();

      const sorted = [...lines.entries()].sort((a, b) => a[0] - b[0]);
      const content = sorted.map(([no, txt]) => txt).join('\n');

      json({ ok: true, content, lineCount: sorted.length });
      return;
    }

    // ====== 工作区文件列表（仅根目录 .md） ======
    if (pathname === '/api/workspace-files') {
      const files = collectRootWorkspaceFiles(WORKSPACE_DIR);
      json({ ok: true, files, total: files.length });
      return;
    }

    // ====== memory/ 目录文件列表 ======
    if (pathname === '/api/memory-files') {
      const files = collectMemoryDirFiles();
      json({ ok: true, files, total: files.length });
      return;
    }

    // ====== 技能列表 ======
    if (pathname === '/api/skills') {
      const skills = collectSkills();
      json({ ok: true, skills, total: skills.length });
      return;
    }

    // ====== 技能 SKILL.md 读取 ======
    if (pathname === '/api/skill-read') {
      const name = url.searchParams.get('name');
      if (!name) { error('name required', 400); return; }
      const skillPath = path.join(WORKSPACE_DIR, 'skills', name, 'SKILL.md');
      if (!existsSync(skillPath)) { error('skill not found', 404); return; }
      const content = readFileSync(skillPath, 'utf-8');
      json({ ok: true, content, name });
      return;
    }

    // ====== 技能目录删除 ======
    if (pathname === '/api/skill-delete' && method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk);
      await new Promise(resolve => req.on('end', resolve));
      const { name } = JSON.parse(body);
      if (!name) { error('name required', 400); return; }
      const skillDir = path.join(WORKSPACE_DIR, 'skills', name);
      if (!existsSync(skillDir)) { error('skill not found', 404); return; }
      fs.rmSync(skillDir, { recursive: true, force: true });
      console.log(`🗑️ 已删除技能: ${name}`);
      json({ ok: true, message: `已删除技能: ${name}` });
      return;
    }

    // ====== 技能目录内文件列表 ======
    if (pathname === '/api/skill-files') {
      const name = url.searchParams.get('name');
      if (!name) { error('name required', 400); return; }
      const skillDir = path.join(WORKSPACE_DIR, 'skills', name);
      if (!existsSync(skillDir)) { error('skill not found', 404); return; }
      const files = [];
      try {
        const entries = readdirSync(skillDir, { withFileTypes: true });
        for (const e of entries) {
          if (e.name.startsWith('.')) continue;
          const fp = path.join(skillDir, e.name);
          const s = statSync(fp);
          files.push({ name: e.name, path: `skills/${name}/${e.name}`, size: s.size, mtime: s.mtimeMs, isDir: e.isDirectory() });
        }
      } catch {}
      files.sort((a,b) => a.name.localeCompare(b.name));
      json({ ok: true, files, total: files.length });
      return;
    }

    // ====== 技能文件读取 ======
    if (pathname === '/api/skill-file-read') {
      const relPath = url.searchParams.get('path');
      if (!relPath) { error('path required', 400); return; }
      const safePath = path.normalize(relPath);
      const fullPath = path.join(WORKSPACE_DIR, safePath);
      if (!fullPath.startsWith(WORKSPACE_DIR)) { error('路径越权', 403); return; }
      if (!existsSync(fullPath) || statSync(fullPath).isDirectory()) { error('文件不存在', 404); return; }
      const content = readFileSync(fullPath, 'utf-8');
      json({ ok: true, content, path: safePath });
      return;
    }

    // ====== 技能文件保存 ======
    if (pathname === '/api/skill-file-save' && method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk);
      await new Promise(resolve => req.on('end', resolve));
      const { path: filePath, content } = JSON.parse(body);
      if (!filePath || content === undefined) { error('path and content required', 400); return; }
      const safePath = path.normalize(filePath);
      const fullPath = path.join(WORKSPACE_DIR, safePath);
      if (!fullPath.startsWith(WORKSPACE_DIR)) { error('路径越权', 403); return; }
      const BACKUP_DIR = path.join(WORKSPACE_DIR, CONFIG.backupDirName);
      if (!existsSync(BACKUP_DIR)) mkdirSync(BACKUP_DIR, { recursive: true });
      if (existsSync(fullPath)) {
        // 技能文件备份带技能名前缀
        const bakName = safePath.replace(/\//g, '_') + '.bak';
        try { copyFileSync(fullPath, path.join(BACKUP_DIR, bakName)); } catch {}
      }
      writeFileSync(fullPath, content, 'utf-8');
      console.log(`💾 已保存技能文件: ${safePath}`);
      json({ ok: true, message: '已保存' });
      return;
    }

    // ====== 工作区文件读取 ======
    if (pathname === '/api/workspace-read') {
      const fileName = url.searchParams.get('path');
      if (!fileName) { error('path required', 400); return; }
      const safeName = path.basename(fileName);
      const fullPath = path.join(WORKSPACE_DIR, safeName);
      if (!fullPath.startsWith(WORKSPACE_DIR)) { error('路径越权', 403); return; }
      if (!existsSync(fullPath)) { error('文件不存在', 404); return; }
      const content = readFileSync(fullPath, 'utf-8');
      const s = statSync(fullPath);
      json({ ok: true, content, path: safeName, size: s.size, mtime: s.mtimeMs });
      return;
    }

    // ====== 工作区文件保存 ======
    if (pathname === '/api/workspace-save' && method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk);
      await new Promise(resolve => req.on('end', resolve));

      const { path: filePath, content } = JSON.parse(body);
      if (!filePath || content === undefined) { error('path and content required', 400); return; }

      const safeName = path.basename(filePath);
      const fullPath = path.join(WORKSPACE_DIR, safeName);
      if (!fullPath.startsWith(WORKSPACE_DIR)) { error('路径越权', 403); return; }

      // 自动创建备份到 backups/ 目录（只保留最新一份）
      const BACKUP_DIR = path.join(WORKSPACE_DIR, CONFIG.backupDirName);
      if (!existsSync(BACKUP_DIR)) mkdirSync(BACKUP_DIR, { recursive: true });
      if (existsSync(fullPath)) {
        const bakName = safeName + '.bak';
        try { copyFileSync(fullPath, path.join(BACKUP_DIR, bakName)); } catch {}
      }

      writeFileSync(fullPath, content, 'utf-8');
      console.log(`💾 已保存: ${safeName} (备份 → backups/)`);

      json({ ok: true, message: '已保存' });
      return;
    }

    // ====== 记忆文件读取（memory/ 子目录） ======
    if (pathname === '/api/memory-read') {
      const filePath = url.searchParams.get('path');
      if (!filePath) { error('path required', 400); return; }
      // 只允许 memory/ 子目录
      if (!filePath.startsWith('memory/')) { error('仅允许 memory/ 子目录', 400); return; }
      const safePath = path.normalize(filePath);
      const fullPath = path.join(WORKSPACE_DIR, safePath);
      if (!fullPath.startsWith(WORKSPACE_DIR)) { error('路径越权', 403); return; }
      if (!existsSync(fullPath)) { error('文件不存在', 404); return; }
      const content = readFileSync(fullPath, 'utf-8');
      const s = statSync(fullPath);
      json({ ok: true, content, path: safePath, size: s.size, mtime: s.mtimeMs });
      return;
    }

    // ====== 记忆文件保存（memory/ 子目录，不备份） ======
    if (pathname === '/api/memory-save' && method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk);
      await new Promise(resolve => req.on('end', resolve));
      const { path: filePath, content } = JSON.parse(body);
      if (!filePath || content === undefined) { error('path and content required', 400); return; }
      if (!filePath.startsWith('memory/')) { error('仅允许 memory/ 子目录', 400); return; }
      const safePath = path.normalize(filePath);
      const fullPath = path.join(WORKSPACE_DIR, safePath);
      if (!fullPath.startsWith(WORKSPACE_DIR)) { error('路径越权', 403); return; }
      writeFileSync(fullPath, content, 'utf-8');
      console.log('💾 已保存记忆文件:', safePath);

      // 异步索引完成后自动重启服务
      const { execSync, exec } = require('child_process');
      setTimeout(() => {
        try {
          console.log('📚 触发记忆索引同步:', safePath);
          execSync('openclaw memory index --agent ' + AGENT_ID, { cwd: WORKSPACE_DIR, timeout: CONFIG.indexTimeoutMs, stdio: 'pipe' });
          console.log('✅ 记忆索引已同步，2秒后自动重启服务...');
          // 直接杀掉自己，guard 会自动拉起新进程
          setTimeout(() => {
            console.log('🔄 自动重启（由 guard 拉起）...');
            exec('fuser -k ' + PORT + '/tcp 2>/dev/null', { shell: true });
          }, CONFIG.restartDelayMs);
        } catch (e) {
          console.error('⚠️ 记忆索引同步失败:', e.message);
        }
      }, 500);

      json({ ok: true, message: '已保存' });
      return;
    }

    // ====== 前端静态文件 ======
    if (pathname === '/' || pathname === '/index.html') {
      const htmlPath = path.join(__dirname, 'dist', 'index.html');
      if (!existsSync(htmlPath)) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`<!DOCTYPE html><html><body><h2>⚖️ ${getIdentityName()} 记忆库</h2><p>请先运行 <code>npm run build</code> 构建前端。</p></body></html>`);
        return;
      }
      let html = readFileSync(htmlPath, 'utf-8');
      html = html.replace(/<title>[^<]*<\/title>/, `<title>${getIdentityName()} · 记忆库</title>`);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
      return;
    }

    // 静态资源 (JS/CSS/字体)
    if (pathname.startsWith('/assets/')) {
      const assetPath = path.join(__dirname, 'dist', pathname);
      if (existsSync(assetPath)) {
        const ext = path.extname(assetPath);
        const mime = {
          '.js': 'application/javascript',
          '.css': 'text/css',
          '.woff2': 'font/woff2',
          '.svg': 'image/svg+xml',
          '.png': 'image/png',
        }[ext] || 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': mime });
        res.end(readFileSync(assetPath));
        return;
      }
    }

    error('Not Found', 404);
  } catch (e) {
    console.error('API 错误:', e);
    error(e.message);
  }
}

// ====== 启动 ======
async function main() {
  await initDb();

  const server = http.createServer(handleRequest);
  server.listen(PORT, '0.0.0.0', () => {
    console.log('');
    console.log(`  ⚖️  ${getIdentityName()} · 记忆库服务`);
    console.log('  ──────────────────────');
    console.log(`  📁 记忆库: ${DB_PATH}`);
    console.log(`  📁 工作区: ${WORKSPACE_DIR}`);
    console.log(`  🌐 http://localhost:${PORT}`);
    console.log('');
  });
}

main().catch(e => {
  console.error('启动失败:', e);
  process.exit(1);
});
