import { exec as execCb } from 'node:child_process';
import { access } from 'node:fs/promises';
import { platform, arch } from 'node:os';

export const OS = platform();
export const ARCH = arch();
export const IS_MAC = OS === 'darwin';
export const IS_LINUX = OS === 'linux';
export const IS_WIN = OS === 'win32';

export function run(cmd, opts = {}) {
  return new Promise((resolve) => {
    execCb(cmd, {
      timeout: opts.timeout ?? 8000,
      shell: true,
      env: { ...process.env, PATH: process.env.PATH },
      ...opts,
    }, (err, stdout, stderr) => {
      if (err) return resolve(null);
      resolve((stdout || stderr || '').trim());
    });
  });
}

export function runOrThrow(cmd, opts = {}) {
  return new Promise((resolve, reject) => {
    execCb(cmd, {
      timeout: opts.timeout ?? 30000,
      shell: true,
      env: { ...process.env, PATH: process.env.PATH },
      ...opts,
    }, (err, stdout, stderr) => {
      if (err) return reject(new Error(stderr || err.message));
      resolve((stdout || '').trim());
    });
  });
}

export async function exists(p) {
  try { await access(p); return true; } catch { return false; }
}

export function getPackageManagerCmd() {
  if (IS_MAC) return 'brew';
  if (IS_LINUX) return 'apt';
  if (IS_WIN) return 'winget';
  return null;
}
