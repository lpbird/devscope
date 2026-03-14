import { fdir } from 'fdir';
import { readFile, stat, access } from 'node:fs/promises';
import { join, basename, dirname } from 'node:path';
import { run } from '../utils/platform.js';

const BLACKLIST = new Set([
  'node_modules', '.git', '.svn', 'venv', '.venv', '__pycache__',
  'dist', 'build', '.next', '.nuxt', '.output', 'target', '.idea',
  '.vscode', '.DS_Store', 'vendor', 'Pods', '.gradle',
]);

const FEATURE_FILES = {
  'package.json': 'node',
  'requirements.txt': 'python',
  'pyproject.toml': 'python',
  'go.mod': 'golang',
  'pom.xml': 'java',
  'build.gradle': 'java',
  'Cargo.toml': 'rust',
};

const LOCK_FILE_MAP = {
  'package-lock.json': 'npm',
  'yarn.lock': 'yarn',
  'pnpm-lock.yaml': 'pnpm',
  'bun.lockb': 'bun',
  'Pipfile.lock': 'pipenv',
  'poetry.lock': 'poetry',
  'uv.lock': 'uv',
  'Cargo.lock': 'cargo',
  'go.sum': 'go modules',
};

const VERSION_PIN_FILES = [
  '.nvmrc', '.node-version', '.python-version',
  '.ruby-version', '.java-version',
  '.tool-versions', '.mise.toml',
];

const KEY_NODE_DEPS = [
  'react', 'vue', 'angular', 'next', 'nuxt', 'svelte',
  'typescript', 'electron', '@tauri-apps/cli', '@tauri-apps/api',
  'express', 'koa', 'fastify', 'nest', '@nestjs/core',
  'vite', 'webpack', 'esbuild', 'rollup',
  'tailwindcss', 'antd', 'element-plus', '@arco-design/web-vue',
];

const DEPENDENCY_CACHE_PATTERNS = [
  '/go/pkg/mod/', '/.pub-cache/', '/site-packages/', '/lib/python',
  '/.cargo/registry/', '/.m2/repository/', '/.gradle/caches/', '/.npm/_cacache/',
];

const GIT_SKIP_PATTERNS = ['/go/pkg/mod/', '/.pub-cache/', '/site-packages/'];

async function fileExists(p) {
  try { await access(p); return true; } catch { return false; }
}

function isDependencyCache(dirPath) {
  return DEPENDENCY_CACHE_PATTERNS.some((p) => dirPath.includes(p));
}

function runGit(cwd, args) {
  return run(`git ${args.join(' ')}`, { cwd, timeout: 3000 });
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function pickKeyDeps(allDeps) {
  const result = {};
  for (const dep of KEY_NODE_DEPS) {
    if (allDeps[dep]) result[dep] = allDeps[dep];
  }
  return Object.keys(result).length ? result : undefined;
}

async function calcDirSize(dirPath) {
  try {
    const files = await new fdir()
      .withFullPaths()
      .exclude((name) => BLACKLIST.has(name))
      .crawl(dirPath)
      .withPromise();

    let total = 0;
    const batchSize = 100;
    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);
      const stats = await Promise.allSettled(batch.map((f) => stat(f)));
      for (const s of stats) {
        if (s.status === 'fulfilled') total += s.value.size;
      }
    }
    return total;
  } catch {
    return 0;
  }
}

async function detectGitStatus(projectPath) {
  if (GIT_SKIP_PATTERNS.some((p) => projectPath.includes(p))) return undefined;

  const topLevel = await runGit(projectPath, ['rev-parse', '--show-toplevel']);
  if (!topLevel) return undefined;

  const lastCommitDate = await runGit(projectPath, ['log', '-1', '--format=%aI', '--', '.']);
  if (!lastCommitDate) return undefined;

  const branch = await runGit(projectPath, ['rev-parse', '--abbrev-ref', 'HEAD']);
  const remote = await runGit(projectPath, ['remote', 'get-url', 'origin']);
  const daysSince = Math.floor((Date.now() - new Date(lastCommitDate).getTime()) / 86400000);

  let activity;
  if (daysSince <= 30) activity = 'active';
  else if (daysSince <= 180) activity = 'stale';
  else activity = 'archived';

  const cleanRemote = remote
    ? remote.replace(/\.git$/, '').replace(/^git@([^:]+):/, 'https://$1/')
    : undefined;

  return { lastCommit: lastCommitDate, daysSinceCommit: daysSince, activity, branch, remote: cleanRemote };
}

async function extractMeta(projectPath, lang, featureFiles) {
  const meta = { path: projectPath, language: lang, featureFiles };
  meta.dirName = basename(projectPath);
  meta.runtime = {};

  try {
    if (featureFiles.includes('package.json')) {
      const raw = await readFile(join(projectPath, 'package.json'), 'utf-8');
      const pkg = JSON.parse(raw);
      meta.name = pkg.name || basename(projectPath);
      meta.version = pkg.version;
      meta.description = pkg.description;

      meta.runtime.node = pkg.engines?.node || null;
      meta.runtime.npm = pkg.engines?.npm || null;
      meta.runtime.pnpm = pkg.engines?.pnpm || null;

      const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
      meta.dependencies = Object.keys(pkg.dependencies || {}).length;
      meta.devDependencies = Object.keys(pkg.devDependencies || {}).length;
      meta.keyDependencies = pickKeyDeps(allDeps);

      if (allDeps.typescript) meta.runtime.typescript = allDeps.typescript;

      const frameworks = [];
      if (allDeps.react) frameworks.push('React');
      if (allDeps.vue || allDeps['vue-router']) frameworks.push('Vue');
      if (allDeps['@angular/core']) frameworks.push('Angular');
      if (allDeps.svelte) frameworks.push('Svelte');
      if (allDeps.next) frameworks.push('Next.js');
      if (allDeps.nuxt) frameworks.push('Nuxt');
      if (allDeps.electron) frameworks.push('Electron');
      if (allDeps['@tauri-apps/cli'] || allDeps['@tauri-apps/api']) frameworks.push('Tauri');
      if (allDeps.express) frameworks.push('Express');
      if (allDeps['@nestjs/core']) frameworks.push('NestJS');
      if (allDeps.fastify) frameworks.push('Fastify');
      if (allDeps.koa) frameworks.push('Koa');
      meta.frameworks = frameworks.length ? frameworks : undefined;
    }

    if (featureFiles.includes('go.mod')) {
      const raw = await readFile(join(projectPath, 'go.mod'), 'utf-8');
      const moduleMatch = raw.match(/^module\s+(.+)$/m);
      const goMatch = raw.match(/^go\s+(\S+)/m);
      const toolchainMatch = raw.match(/^toolchain\s+go(\S+)/m);
      if (!meta.name) meta.name = moduleMatch?.[1] || basename(projectPath);
      meta.runtime.go = goMatch?.[1] || null;
      if (toolchainMatch) meta.runtime.goToolchain = toolchainMatch[1];
      const requireMatches = [...raw.matchAll(/^\t(\S+)\s+v(\S+)/gm)];
      meta.goDirectDeps = requireMatches.length || 0;
    }

    if (featureFiles.includes('pyproject.toml')) {
      const raw = await readFile(join(projectPath, 'pyproject.toml'), 'utf-8');
      const nameMatch = raw.match(/^name\s*=\s*"(.+?)"/m);
      if (!meta.name) meta.name = nameMatch?.[1] || basename(projectPath);
      const pyVerMatch = raw.match(/requires-python\s*=\s*"(.+?)"/);
      meta.runtime.python = pyVerMatch?.[1] || null;
    }

    if (featureFiles.includes('requirements.txt')) {
      try {
        const raw = await readFile(join(projectPath, 'requirements.txt'), 'utf-8');
        const lines = raw.split('\n').filter((l) => l.trim() && !l.startsWith('#'));
        meta.pipDependencies = lines.length;
      } catch { /* ignore */ }
    }

    if (featureFiles.includes('Cargo.toml')) {
      const raw = await readFile(join(projectPath, 'Cargo.toml'), 'utf-8');
      const nameMatch = raw.match(/^name\s*=\s*"(.+?)"/m);
      const editionMatch = raw.match(/^edition\s*=\s*"(.+?)"/m);
      const rustVerMatch = raw.match(/^rust-version\s*=\s*"(.+?)"/m);
      if (!meta.name) meta.name = nameMatch?.[1] || basename(projectPath);
      meta.runtime.rustEdition = editionMatch?.[1] || null;
      meta.runtime.rustVersion = rustVerMatch?.[1] || null;
    }

    if (featureFiles.includes('pom.xml')) {
      const raw = await readFile(join(projectPath, 'pom.xml'), 'utf-8');
      const javaVerMatch = raw.match(/<java\.version>(.+?)<\/java\.version>/);
      const sourceMatch = raw.match(/<maven\.compiler\.source>(.+?)<\/maven\.compiler\.source>/);
      meta.runtime.java = javaVerMatch?.[1] || sourceMatch?.[1] || null;
      const artifactMatch = raw.match(/<artifactId>(.+?)<\/artifactId>/);
      if (!meta.name) meta.name = artifactMatch?.[1] || basename(projectPath);
    }

    if (featureFiles.includes('build.gradle')) {
      const raw = await readFile(join(projectPath, 'build.gradle'), 'utf-8');
      const javaMatch = raw.match(/sourceCompatibility\s*=?\s*['"]?(\S+?)['"]?\s*$/m);
      const kotlinMatch = raw.match(/kotlinOptions\s*\{[^}]*jvmTarget\s*=\s*['"](.+?)['"]/s);
      meta.runtime.java = javaMatch?.[1] || null;
      if (kotlinMatch) meta.runtime.kotlin = kotlinMatch[1];
    }

    if (!meta.name) meta.name = basename(projectPath);
  } catch {
    if (!meta.name) meta.name = basename(projectPath);
  }

  const runtimeClean = {};
  for (const [k, v] of Object.entries(meta.runtime)) {
    if (v) runtimeClean[k] = v;
  }
  meta.runtime = Object.keys(runtimeClean).length ? runtimeClean : undefined;

  const detectedPMs = [];
  for (const [lockFile, pm] of Object.entries(LOCK_FILE_MAP)) {
    if (await fileExists(join(projectPath, lockFile))) detectedPMs.push(pm);
  }
  meta.packageManager = detectedPMs.length ? detectedPMs : undefined;

  const pins = {};
  for (const pinFile of VERSION_PIN_FILES) {
    const pinPath = join(projectPath, pinFile);
    try {
      const content = (await readFile(pinPath, 'utf-8')).trim();
      if (content) pins[pinFile] = content.split('\n')[0].trim();
    } catch { /* not found */ }
  }
  meta.versionPinning = Object.keys(pins).length ? pins : undefined;

  meta.git = await detectGitStatus(projectPath);

  return meta;
}

/**
 * @param {string} rootPath
 * @param {{ onProject?: (p: object) => void, onProgress?: (found: number) => void }} opts
 */
export async function scanDirectory(rootPath, opts = {}) {
  const { onProject, onProgress } = opts;

  const allFiles = await new fdir()
    .withFullPaths()
    .exclude((name) => BLACKLIST.has(name))
    .crawl(rootPath)
    .withPromise();

  const discovered = new Map();

  for (const filePath of allFiles) {
    const fileName = basename(filePath);
    const lang = FEATURE_FILES[fileName];
    if (!lang) continue;

    const projectDir = dirname(filePath);
    if (isDependencyCache(projectDir)) continue;

    if (discovered.has(projectDir)) {
      const existing = discovered.get(projectDir);
      if (!existing.languages.includes(lang)) existing.languages.push(lang);
      if (!existing.featureFiles.includes(fileName)) existing.featureFiles.push(fileName);
      continue;
    }

    discovered.set(projectDir, { languages: [lang], featureFiles: [fileName] });
  }

  const dirs = [...discovered.keys()].sort();
  const subProjectOf = new Map();
  for (let i = 0; i < dirs.length; i++) {
    for (let j = i - 1; j >= 0; j--) {
      if (dirs[i].startsWith(dirs[j] + '/')) {
        subProjectOf.set(dirs[i], dirs[j]);
        break;
      }
    }
  }

  const projects = [];
  let count = 0;

  for (const [projectDir, info] of discovered) {
    const meta = await extractMeta(projectDir, info.languages.join(', '), info.featureFiles);
    meta.languages = info.languages;
    meta.sizeBytes = await calcDirSize(projectDir);
    meta.sizeHuman = formatSize(meta.sizeBytes);
    meta.scannedAt = new Date().toISOString();

    const parent = subProjectOf.get(projectDir);
    if (parent) {
      meta.isSubProject = true;
      meta.parentDir = parent;
      meta.parentName = basename(parent);
    }

    projects.push(meta);
    onProject?.(meta);
    count++;
    onProgress?.(count);
  }

  return projects;
}
