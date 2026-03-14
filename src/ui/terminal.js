import chalk from 'chalk';

const COLS = process.stdout.columns || 80;

export const icons = {
  check: chalk.green('✔'),
  cross: chalk.red('✘'),
  warn: chalk.yellow('⚠'),
  arrow: chalk.cyan('→'),
  dot: chalk.dim('·'),
  bullet: chalk.dim('•'),
  info: chalk.blue('ℹ'),
};

export function banner() {
  console.log('');
  console.log(chalk.bold.cyan('  devscope') + chalk.dim('  — development environment at a glance'));
  console.log(chalk.dim('  ' + '─'.repeat(Math.min(52, COLS - 4))));
  console.log('');
}

export function heading(text) {
  console.log(chalk.bold.white(`\n  ${text}`));
  console.log(chalk.dim('  ' + '─'.repeat(Math.min(text.length + 4, COLS - 4))));
}

export function section(text) {
  console.log(chalk.dim(`\n  ${text.toUpperCase()}`));
}

export function printEnvTable(runtimes, packageManagers, versionManagers) {
  heading('Runtimes');
  const maxLabel = Math.max(...runtimes.map(r => r.label.length), 6);

  for (const rt of runtimes) {
    const icon = rt.installed ? icons.check : icons.cross;
    const label = rt.label.padEnd(maxLabel + 1);
    const ver = rt.installed
      ? chalk.green(rt.version)
      : chalk.dim('not installed');
    console.log(`  ${icon} ${label} ${ver}`);
  }

  heading('Package Managers');
  const maxPmLabel = Math.max(...packageManagers.map(p => p.label.length), 6);

  for (const pm of packageManagers) {
    if (!pm.installed) continue;
    const label = pm.label.padEnd(maxPmLabel + 1);
    console.log(`  ${icons.check} ${label} ${chalk.green(pm.version)}`);
  }

  const notInstalled = packageManagers.filter(p => !p.installed);
  if (notInstalled.length) {
    console.log(chalk.dim(`  ${notInstalled.length} not installed: ${notInstalled.map(p => p.id).join(', ')}`));
  }

  if (versionManagers.length) {
    heading('Version Managers');
    console.log(`  ${versionManagers.map(v => chalk.cyan(v)).join('  ')}`);
  }
}

export function printMissing(runtimes, packageManagers) {
  const missing = [
    ...runtimes.filter(r => !r.installed).map(r => ({ ...r, type: 'runtime' })),
    ...packageManagers.filter(p => !p.installed).map(p => ({ ...p, type: 'package-manager' })),
  ];

  if (!missing.length) {
    console.log(`\n  ${icons.check} ${chalk.green('All common tools are installed!')}`);
    return [];
  }

  return missing;
}

export function printInstallMenu(missing) {
  console.log('');
  heading('Available to Install');
  missing.forEach((tool, i) => {
    const num = chalk.cyan(`[${i + 1}]`);
    console.log(`  ${num} ${tool.label}`);
  });
  console.log(`  ${chalk.cyan('[a]')} Install all`);
  console.log(`  ${chalk.dim('[q]')} Skip`);
  console.log('');
}

export function printProjectList(projects, { showSub = false } = {}) {
  const list = showSub ? projects : projects.filter(p => !p.isSubProject);

  if (!list.length) {
    console.log(chalk.dim('  No projects found.'));
    return;
  }

  const maxName = Math.min(Math.max(...list.map(p => (p.dirName || p.name || '').length), 8), 30);

  for (const p of list) {
    const name = (p.dirName || p.name || '—').slice(0, 30).padEnd(maxName + 1);
    const langs = (p.languages || []).map(l => langTag(l)).join(' ');
    const size = chalk.dim((p.sizeHuman || '').padStart(10));
    const activity = p.git?.activity ? activityTag(p.git.activity) : chalk.dim('—'.padEnd(8));
    const sub = p.isSubProject ? chalk.dim(' ⊂ ' + p.parentName) : '';
    console.log(`  ${chalk.bold(name)} ${langs} ${size} ${activity}${sub}`);
  }

  console.log(chalk.dim(`\n  Total: ${list.length} project${list.length !== 1 ? 's' : ''}`));
}

export function printProjectCard(p) {
  console.log('');
  console.log(chalk.bold.cyan(`  ${p.dirName || p.name}`));
  if (p.description) console.log(chalk.dim(`  ${p.description}`));
  console.log(chalk.dim('  ' + '─'.repeat(40)));

  const row = (label, value) => {
    if (!value) return;
    console.log(`  ${chalk.dim(label.padEnd(14))} ${value}`);
  };

  row('Path', p.path);
  row('Languages', (p.languages || []).join(', '));
  row('Frameworks', (p.frameworks || []).join(', '));
  row('Size', p.sizeHuman);
  row('Pkg Manager', (p.packageManager || []).join(', '));

  if (p.runtime) {
    row('Runtime', Object.entries(p.runtime).map(([k, v]) => `${k}: ${v}`).join(', '));
  }

  if (p.git) {
    row('Branch', p.git.branch);
    row('Remote', p.git.remote);
    row('Activity', `${p.git.activity} (${p.git.daysSinceCommit}d ago)`);
    row('Last Commit', p.git.lastCommit?.split('T')[0]);
  }

  if (p.dependencies || p.devDependencies) {
    row('Dependencies', `${p.dependencies || 0} prod / ${p.devDependencies || 0} dev`);
  }

  console.log('');
}

function langTag(lang) {
  const colors = { node: 'green', python: 'yellow', golang: 'blue', rust: 'red', java: 'magenta' };
  const color = colors[lang] || 'white';
  return chalk[color](lang.padEnd(7));
}

function activityTag(activity) {
  if (activity === 'active') return chalk.green('active'.padEnd(8));
  if (activity === 'stale') return chalk.yellow('stale'.padEnd(8));
  return chalk.red('archived'.padEnd(8));
}

export function success(msg) { console.log(`  ${icons.check} ${msg}`); }
export function error(msg) { console.log(`  ${icons.cross} ${chalk.red(msg)}`); }
export function info(msg) { console.log(`  ${icons.info} ${msg}`); }
export function warn(msg) { console.log(`  ${icons.warn} ${chalk.yellow(msg)}`); }
