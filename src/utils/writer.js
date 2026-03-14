import { createWriteStream } from 'node:fs';
import { mkdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { homedir } from 'node:os';

const DEFAULT_DIR = join(homedir(), '.devscope');
const DEFAULT_FILE = 'results.jsonl';

export function getDefaultOutputPath() {
  return join(DEFAULT_DIR, DEFAULT_FILE);
}

export function getDefaultReportPath() {
  return join(DEFAULT_DIR, 'report.html');
}

export function getDataDir() {
  return DEFAULT_DIR;
}

export class JsonlWriter {
  #stream;
  #path;
  #count = 0;

  constructor(outputPath) {
    this.#path = outputPath || getDefaultOutputPath();
  }

  async init() {
    await mkdir(dirname(this.#path), { recursive: true });
    this.#stream = createWriteStream(this.#path, { flags: 'w' });
    this.#count = 0;
    return this;
  }

  write(record) {
    if (!this.#stream) throw new Error('Writer not initialized. Call init() first.');
    this.#stream.write(JSON.stringify(record) + '\n');
    this.#count++;
  }

  async close() {
    return new Promise((resolve, reject) => {
      if (!this.#stream) return resolve();
      this.#stream.end(() => resolve());
      this.#stream.on('error', reject);
    });
  }

  get count() { return this.#count; }
  get path() { return this.#path; }
}

export async function readJsonl(filePath) {
  const p = filePath || getDefaultOutputPath();
  try {
    const content = await readFile(p, 'utf-8');
    return content
      .split('\n')
      .filter((line) => line.trim())
      .map((line) => JSON.parse(line));
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}
