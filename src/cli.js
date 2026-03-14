#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { createInterface } from 'node:readline';
import { detectEnvironment } from './core/detector.js';
import { installTool, getInstallCommand } from './core/installer.js';
import { scanDirectory } from './core/scanner.js';
import { JsonlWriter, getDefaultOutputPath, readJsonl } from './utils/writer.js';
import * as ui from './ui/terminal.js';

const program = new Command();

program
  .name('devscope')
  .description('Development environment at a glance — detect, install, and scan.')
  .version('0.1.0');

// ── devscope env ────────────────────────────────────────────────
program
  .command('env')
  .description('Detect installed runtimes, package managers, and version managers')
  .action(async () => {
    ui.banner();
    const spinner = ora({ text: 'Detecting environment...', indent: 2 }).start();

    const env = await detectEnvironment();
    spinner.stop();

    ui.printEnvTable(env.runtimes, env.packageManagers, env.versionManagers);
    console.log('');
  });

// ── devscope setup ──────────────────────────────────────────────
program
  .command('setup')
  .description('Interactively install missing runtimes and tools')
  .option('--all', 'Install all missing tools without prompting')
  .option('--only <tools>', 'Comma-separated list of tool IDs to install', '')
  .action(async (opts) => {
    ui.banner();
    const spinner = ora({ text: 'Detecting environment...', indent: 2 }).start();
    const env = await detectEnvironment();
    spinner.stop();

    ui.printEnvTable(env.runtimes, env.packageManagers, env.versionManagers);

    const missing = ui.printMissing(env.runtimes, env.packageManagers);
    if (!missing.length) return;

    const installable = missing.filter(t => {
      const info = getInstallCommand(t.id);
      return info && info.method !== 'manual';
    });

    if (!installable.length) {
      ui.info('No automatic install recipes available for missing tools on this platform.');
      return;
    }

    let toInstall = [];

    if (opts.only) {
      const ids = opts.only.split(',').map(s => s.trim());
      toInstall = installable.filter(t => ids.includes(t.id));
    } else if (opts.all) {
      toInstall = installable;
    } else {
      ui.printInstallMenu(installable);
      const answer = await prompt('  Select (numbers separated by space, a=all, q=skip): ');

      if (answer.toLowerCase() === 'q' || !answer.trim()) return;
      if (answer.toLowerCase() === 'a') {
        toInstall = installable;
      } else {
        const indices = answer.split(/[\s,]+/).map(Number).filter(n => n >= 1 && n <= installable.length);
        toInstall = indices.map(i => installable[i - 1]);
      }
    }

    if (!toInstall.length) {
      ui.info('Nothing selected.');
      return;
    }

    console.log('');
    for (const tool of toInstall) {
      const sp = ora({ text: `Installing ${tool.label}...`, indent: 2 }).start();
      const result = await installTool(tool.id, {
        onLog: (msg) => sp.text = msg.slice(0, 60),
      });

      if (result.success) {
        sp.succeed(`${tool.label} installed`);
      } else if (result.manual) {
        sp.info(`${tool.label}: manual install → ${result.url}`);
      } else {
        sp.fail(`${tool.label}: ${result.error}`);
      }
    }

    console.log('');
    ui.success('Setup complete. Run ' + chalk.cyan('devscope env') + ' to verify.');
    console.log('');
  });

// ── devscope scan ───────────────────────────────────────────────
program
  .command('scan')
  .description('Scan directories to discover code projects')
  .argument('[dirs...]', 'Directories to scan (defaults to ~/Desktop ~/Documents ~/Projects)')
  .option('-o, --output <path>', 'Output JSONL path')
  .action(async (dirs, opts) => {
    ui.banner();

    if (!dirs.length) {
      const home = (await import('node:os')).homedir();
      const { join } = await import('node:path');
      const { exists } = await import('./utils/platform.js');
      const candidates = ['Desktop', 'Documents', 'Projects', 'workspace', 'src', 'code', 'dev'];
      for (const d of candidates) {
        const full = join(home, d);
        if (await exists(full)) dirs.push(full);
      }
      if (!dirs.length) dirs.push(home);
    }

    ui.info(`Scanning: ${dirs.join(', ')}`);

    const outputPath = opts.output || getDefaultOutputPath();
    const writer = new JsonlWriter(outputPath);
    await writer.init();

    let total = 0;
    const spinner = ora({ text: 'Scanning...', indent: 2 }).start();

    for (const dir of dirs) {
      try {
        await scanDirectory(dir, {
          onProject: (p) => {
            writer.write(p);
            total++;
          },
          onProgress: (n) => {
            spinner.text = `Found ${total} projects...`;
          },
        });
      } catch (err) {
        ui.warn(`Error scanning ${dir}: ${err.message}`);
      }
    }

    await writer.close();
    spinner.succeed(`Found ${total} projects`);
    ui.info(`Results saved to ${chalk.cyan(outputPath)}`);
    console.log('');
  });

// ── devscope list ───────────────────────────────────────────────
program
  .command('list')
  .description('List scanned projects')
  .option('--sub', 'Include sub-projects')
  .option('--lang <language>', 'Filter by language')
  .option('--active', 'Show only active projects')
  .option('--json', 'Output as JSON')
  .action(async (opts) => {
    const records = await readJsonl();
    if (!records.length) {
      ui.banner();
      ui.warn('No scan results. Run ' + chalk.cyan('devscope scan') + ' first.');
      return;
    }

    let filtered = records;
    if (!opts.sub) filtered = filtered.filter(p => !p.isSubProject);
    if (opts.lang) filtered = filtered.filter(p => (p.languages || []).includes(opts.lang));
    if (opts.active) filtered = filtered.filter(p => p.git?.activity === 'active');

    if (opts.json) {
      console.log(JSON.stringify(filtered, null, 2));
      return;
    }

    ui.banner();
    ui.heading(`Projects (${filtered.length})`);
    ui.printProjectList(filtered, { showSub: opts.sub });
    console.log('');
  });

// ── devscope show <name> ────────────────────────────────────────
program
  .command('show <name>')
  .description('Show detailed info for a project')
  .action(async (name) => {
    const records = await readJsonl();
    const match = records.find(p =>
      p.dirName === name || p.name === name || p.path?.endsWith('/' + name)
    );

    if (!match) {
      ui.banner();
      ui.error(`Project "${name}" not found. Run ${chalk.cyan('devscope list')} to see available projects.`);
      return;
    }

    ui.banner();
    ui.printProjectCard(match);
  });

// ── devscope report ─────────────────────────────────────────────
program
  .command('report')
  .description('Generate a visual HTML report and open in browser')
  .option('--no-open', 'Do not auto-open in browser')
  .action(async (opts) => {
    ui.banner();
    const spinner = ora({ text: 'Generating report...', indent: 2 }).start();

    try {
      const { generateReport } = await import('./ui/report.js');
      const env = await detectEnvironment();
      const result = await generateReport(null, null, env);
      spinner.succeed(`Report generated (${result.projectCount} projects)`);
      ui.info(`File: ${chalk.cyan(result.path)}`);

      if (opts.open !== false) {
        const { exec } = await import('node:child_process');
        exec(`open "${result.path}"`);
      }
    } catch (err) {
      spinner.fail(err.message);
    }
    console.log('');
  });

// ── devscope mcp ────────────────────────────────────────────────
program
  .command('mcp')
  .description('Start as MCP Server (stdio transport)')
  .action(async () => {
    const { startMcpServer } = await import('./mcp.js');
    await startMcpServer();
  });

// ── helpers ─────────────────────────────────────────────────────
function prompt(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

program.parse();
