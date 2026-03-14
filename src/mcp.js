#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import * as z from 'zod/v4';
import { detectEnvironment } from './core/detector.js';
import { installTool, getInstallCommand } from './core/installer.js';
import { scanDirectory } from './core/scanner.js';
import { JsonlWriter, readJsonl, getDefaultOutputPath } from './utils/writer.js';

export async function startMcpServer() {
  const server = new McpServer({
    name: 'devscope',
    version: '0.1.0',
  });

  // ── Tool: detect_environment ────────────────────────────────────
  server.registerTool('detect_environment', {
    title: 'Detect Environment',
    description:
      'Detect installed runtimes (Node, Go, Python, Rust, Java, Ruby, PHP, .NET, Swift, Dart), ' +
      'package managers (npm, yarn, pnpm, bun, cargo, pip, uv, composer, gem, brew), ' +
      'and version managers (nvm, fnm, volta, pyenv, rustup, mise, asdf).',
    inputSchema: {},
  }, async () => {
    const env = await detectEnvironment();

    const lines = ['# Development Environment\n'];

    lines.push('## Runtimes');
    for (const rt of env.runtimes) {
      lines.push(`- ${rt.installed ? '✔' : '✘'} **${rt.label}**: ${rt.installed ? rt.version : 'not installed'}`);
    }

    lines.push('\n## Package Managers');
    for (const pm of env.packageManagers) {
      if (pm.installed) lines.push(`- ✔ **${pm.label}**: ${pm.version}`);
    }

    if (env.versionManagers.length) {
      lines.push('\n## Version Managers');
      lines.push(env.versionManagers.join(', '));
    }

    return { content: [{ type: 'text', text: lines.join('\n') }] };
  });

  // ── Tool: install_tool ──────────────────────────────────────────
  server.registerTool('install_tool', {
    title: 'Install Tool',
    description:
      'Install a development runtime or tool. Supported: node, go, python, rust, java, ruby, php, dotnet, bun, pnpm, yarn, uv.',
    inputSchema: {
      tool: z.string().describe('Tool ID to install (e.g. "node", "go", "rust", "pnpm")'),
    },
  }, async ({ tool }) => {
    const info = getInstallCommand(tool);
    if (!info) {
      return { content: [{ type: 'text', text: `No install recipe for "${tool}" on ${process.platform}` }], isError: true };
    }

    if (info.method === 'manual') {
      return { content: [{ type: 'text', text: `Manual install required: ${info.cmd}` }] };
    }

    const result = await installTool(tool);
    if (result.success) {
      return { content: [{ type: 'text', text: `✔ ${tool} installed successfully.\n${result.output || ''}` }] };
    }
    return { content: [{ type: 'text', text: `✘ Failed to install ${tool}: ${result.error}` }], isError: true };
  });

  // ── Tool: scan_directories ──────────────────────────────────────
  server.registerTool('scan_directories', {
    title: 'Scan Directories',
    description:
      'Scan directories to discover code projects (Node.js, Python, Go, Java, Rust). ' +
      'Extracts runtime requirements, frameworks, dependencies, Git status. ' +
      'Results are written to a local .jsonl file.',
    inputSchema: {
      directories: z.array(z.string()).describe('Absolute paths to scan'),
    },
  }, async ({ directories }) => {
    const outputPath = getDefaultOutputPath();
    const writer = new JsonlWriter(outputPath);
    await writer.init();

    let totalProjects = 0;
    const errors = [];

    for (const dir of directories) {
      try {
        await scanDirectory(dir, {
          onProject: (project) => {
            writer.write(project);
            totalProjects++;
          },
        });
      } catch (err) {
        errors.push(`Error scanning ${dir}: ${err.message}`);
      }
    }

    await writer.close();

    const lines = [
      `Scanned ${directories.length} director${directories.length > 1 ? 'ies' : 'y'}, found ${totalProjects} project(s).`,
      `Results: ${outputPath}`,
    ];
    if (errors.length) lines.push('\nErrors:\n' + errors.join('\n'));

    return { content: [{ type: 'text', text: lines.join('\n') }] };
  });

  // ── Tool: generate_report ───────────────────────────────────────
  server.registerTool('generate_report', {
    title: 'Generate Report',
    description: 'Generate a visual HTML report from scan results. Opens in browser.',
    inputSchema: {},
  }, async () => {
    try {
      const { generateReport } = await import('./ui/report.js');
      const env = await detectEnvironment();
      const result = await generateReport(null, null, env);
      return {
        content: [{
          type: 'text',
          text: `Report generated: ${result.projectCount} projects.\nOpen: file://${result.path}`,
        }],
      };
    } catch (err) {
      return { content: [{ type: 'text', text: `Failed: ${err.message}` }], isError: true };
    }
  });

  // ── Resource: scan results ──────────────────────────────────────
  server.registerResource('scan_results', `file://${getDefaultOutputPath()}`, {
    title: 'Scan Results',
    description: 'Latest scan results (JSONL)',
    mimeType: 'application/jsonl',
  }, async () => {
    const records = await readJsonl();
    if (!records.length) {
      return {
        contents: [{
          uri: `file://${getDefaultOutputPath()}`,
          text: 'No scan results. Use the scan_directories tool first.',
          mimeType: 'text/plain',
        }],
      };
    }
    return {
      contents: [{
        uri: `file://${getDefaultOutputPath()}`,
        text: records.map(r => JSON.stringify(r)).join('\n'),
        mimeType: 'application/jsonl',
      }],
    };
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('devscope MCP Server running on stdio');
}

// Direct invocation support
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'))) {
  startMcpServer().catch((err) => {
    console.error('Fatal:', err);
    process.exit(1);
  });
}
