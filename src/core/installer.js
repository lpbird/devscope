import { run, runOrThrow, IS_MAC, IS_LINUX, IS_WIN } from '../utils/platform.js';

const INSTALL_RECIPES = {
  node: {
    label: 'Node.js',
    mac: { brew: 'brew install node', manual: 'https://nodejs.org' },
    linux: { apt: 'curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash - && sudo apt-get install -y nodejs', manual: 'https://nodejs.org' },
    win: { winget: 'winget install OpenJS.NodeJS.LTS', manual: 'https://nodejs.org' },
  },
  go: {
    label: 'Go',
    mac: { brew: 'brew install go', manual: 'https://go.dev/dl/' },
    linux: { snap: 'sudo snap install go --classic', manual: 'https://go.dev/dl/' },
    win: { winget: 'winget install GoLang.Go', manual: 'https://go.dev/dl/' },
  },
  python: {
    label: 'Python',
    mac: { brew: 'brew install python', manual: 'https://python.org' },
    linux: { apt: 'sudo apt-get install -y python3 python3-pip', manual: 'https://python.org' },
    win: { winget: 'winget install Python.Python.3.12', manual: 'https://python.org' },
  },
  rust: {
    label: 'Rust',
    all: 'curl --proto \'=https\' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y',
    win: { manual: 'https://rustup.rs' },
  },
  java: {
    label: 'Java',
    mac: { brew: 'brew install openjdk', manual: 'https://adoptium.net' },
    linux: { apt: 'sudo apt-get install -y default-jdk', manual: 'https://adoptium.net' },
    win: { winget: 'winget install EclipseAdoptium.Temurin.21.JDK', manual: 'https://adoptium.net' },
  },
  ruby: {
    label: 'Ruby',
    mac: { brew: 'brew install ruby', manual: 'https://ruby-lang.org' },
    linux: { apt: 'sudo apt-get install -y ruby-full', manual: 'https://ruby-lang.org' },
    win: { winget: 'winget install RubyInstallerTeam.Ruby.3.3', manual: 'https://rubyinstaller.org' },
  },
  php: {
    label: 'PHP',
    mac: { brew: 'brew install php', manual: 'https://php.net' },
    linux: { apt: 'sudo apt-get install -y php', manual: 'https://php.net' },
    win: { manual: 'https://windows.php.net/download/' },
  },
  dotnet: {
    label: '.NET',
    mac: { brew: 'brew install dotnet', manual: 'https://dot.net' },
    linux: { apt: 'sudo apt-get install -y dotnet-sdk-8.0', manual: 'https://dot.net' },
    win: { winget: 'winget install Microsoft.DotNet.SDK.8', manual: 'https://dot.net' },
  },
  bun: {
    label: 'Bun',
    all: 'curl -fsSL https://bun.sh/install | bash',
    win: { manual: 'https://bun.sh' },
  },
  pnpm: {
    label: 'pnpm',
    all: 'npm install -g pnpm',
  },
  yarn: {
    label: 'yarn',
    all: 'npm install -g yarn',
  },
  uv: {
    label: 'uv',
    all: 'curl -LsSf https://astral.sh/uv/install.sh | sh',
    win: { manual: 'https://docs.astral.sh/uv/getting-started/installation/' },
  },
  brew: {
    label: 'Homebrew',
    mac: { manual: '/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"' },
    linux: { manual: '/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"' },
  },
};

export function getInstallCommand(toolId) {
  const recipe = INSTALL_RECIPES[toolId];
  if (!recipe) return null;

  if (recipe.all && !IS_WIN) return { cmd: recipe.all, method: 'script' };
  if (recipe.all && IS_WIN && !recipe.win) return { cmd: recipe.all, method: 'script' };

  const osRecipe = IS_MAC ? recipe.mac : IS_LINUX ? recipe.linux : recipe.win;
  if (!osRecipe) return null;

  if (IS_MAC && osRecipe.brew) return { cmd: osRecipe.brew, method: 'brew' };
  if (IS_LINUX && osRecipe.apt) return { cmd: osRecipe.apt, method: 'apt' };
  if (IS_WIN && osRecipe.winget) return { cmd: osRecipe.winget, method: 'winget' };
  if (osRecipe.manual) return { cmd: osRecipe.manual, method: 'manual' };

  return null;
}

export async function installTool(toolId, { onLog } = {}) {
  const info = getInstallCommand(toolId);
  if (!info) throw new Error(`No install recipe for "${toolId}" on ${process.platform}`);

  if (info.method === 'manual') {
    return { success: false, manual: true, url: info.cmd };
  }

  onLog?.(`Running: ${info.cmd}`);
  try {
    const output = await runOrThrow(info.cmd, { timeout: 120000 });
    onLog?.(output);
    return { success: true, output };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export function getAvailableTools() {
  return Object.entries(INSTALL_RECIPES).map(([id, r]) => ({
    id,
    label: r.label,
    hasRecipe: !!getInstallCommand(id),
  }));
}
