import { join } from 'node:path';
import { homedir } from 'node:os';
import { run, exists, IS_MAC, IS_LINUX, IS_WIN } from '../utils/platform.js';

const RUNTIMES = [
  { id: 'node',   label: 'Node.js',  cmd: 'node -v',          parse: v => v?.replace(/^v/, '') },
  { id: 'go',     label: 'Go',       cmd: 'go version',       parse: v => v?.match(/go(\d+\.\d+(\.\d+)?)/)?.[1] },
  { id: 'python', label: 'Python',   cmd: 'python3 --version', parse: v => v?.match(/(\d+\.\d+\.\d+)/)?.[1] },
  { id: 'rust',   label: 'Rust',     cmd: 'rustc --version',  parse: v => v?.match(/(\d+\.\d+\.\d+)/)?.[1] },
  { id: 'java',   label: 'Java',     cmd: 'java -version',    parse: v => v?.match(/(?:version\s+)?"?(\d+[\d.]*)/)?.[1] },
  { id: 'ruby',   label: 'Ruby',     cmd: 'ruby -v',          parse: v => v?.match(/(\d+\.\d+\.\d+)/)?.[1] },
  { id: 'php',    label: 'PHP',      cmd: 'php -v',           parse: v => v?.match(/(\d+\.\d+\.\d+)/)?.[1] },
  { id: 'dotnet', label: '.NET',     cmd: 'dotnet --version',  parse: v => v?.match(/(\d+\.\d+\.\d+)/)?.[1] },
  { id: 'swift',  label: 'Swift',    cmd: 'swift --version',  parse: v => v?.match(/(\d+\.\d+(\.\d+)?)/)?.[1] },
  { id: 'dart',   label: 'Dart',     cmd: 'dart --version',   parse: v => v?.match(/(\d+\.\d+\.\d+)/)?.[1] },
];

const PACKAGE_MANAGERS = [
  { id: 'npm',    label: 'npm',    cmd: 'npm -v' },
  { id: 'yarn',   label: 'yarn',   cmd: 'yarn -v' },
  { id: 'pnpm',   label: 'pnpm',   cmd: 'pnpm -v' },
  { id: 'bun',    label: 'bun',    cmd: 'bun -v',    parse: v => v?.match(/(\d+\.\d+\.\d+)/)?.[1] },
  { id: 'cargo',  label: 'cargo',  cmd: 'cargo --version', parse: v => v?.match(/(\d+\.\d+\.\d+)/)?.[1] },
  { id: 'pip',    label: 'pip',    cmd: 'pip3 --version', parse: v => v?.match(/(\d+\.\d+(\.\d+)?)/)?.[1] },
  { id: 'uv',     label: 'uv',     cmd: 'uv --version', parse: v => v?.match(/(\d+\.\d+\.\d+)/)?.[1] },
  { id: 'composer', label: 'composer', cmd: 'composer --version', parse: v => v?.match(/(\d+\.\d+\.\d+)/)?.[1] },
  { id: 'gem',    label: 'gem',    cmd: 'gem -v' },
  { id: 'brew',   label: 'Homebrew', cmd: 'brew --version', parse: v => v?.match(/(\d+\.\d+\.\d+)/)?.[1] },
];

const VERSION_MANAGERS = [
  { name: 'nvm',    check: () => exists(join(homedir(), '.nvm')) },
  { name: 'fnm',    check: () => run('fnm --version') },
  { name: 'volta',  check: () => run('volta --version') },
  { name: 'n',      check: () => run('n --version') },
  { name: 'pyenv',  check: () => run('pyenv --version') },
  { name: 'rustup', check: () => run('rustup --version') },
  { name: 'mise',   check: () => run('mise --version') },
  { name: 'asdf',   check: () => run('asdf --version') },
  { name: 'sdkman', check: () => exists(join(homedir(), '.sdkman')) },
  { name: 'rbenv',  check: () => run('rbenv --version') },
];

export async function detectEnvironment() {
  const [runtimes, packageManagers, versionManagers] = await Promise.all([
    detectRuntimes(),
    detectPackageManagers(),
    detectVersionManagers(),
  ]);

  return {
    runtimes,
    packageManagers,
    versionManagers,
    os: { platform: process.platform, arch: process.arch },
  };
}

async function detectRuntimes() {
  const results = await Promise.all(
    RUNTIMES.map(async (rt) => {
      const raw = await run(rt.cmd);
      const version = rt.parse ? rt.parse(raw) : raw;
      return { id: rt.id, label: rt.label, version: version || null, installed: !!version };
    })
  );
  return results;
}

async function detectPackageManagers() {
  const results = await Promise.all(
    PACKAGE_MANAGERS.map(async (pm) => {
      const raw = await run(pm.cmd);
      const version = pm.parse ? pm.parse(raw) : raw;
      return { id: pm.id, label: pm.label, version: version || null, installed: !!version };
    })
  );
  return results;
}

async function detectVersionManagers() {
  const results = await Promise.all(
    VERSION_MANAGERS.map(async (vm) => {
      const result = await vm.check();
      return result ? vm.name : null;
    })
  );
  return results.filter(Boolean);
}

export function getRuntimeDefs() { return RUNTIMES; }
export function getPackageManagerDefs() { return PACKAGE_MANAGERS; }
