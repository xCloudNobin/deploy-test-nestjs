import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

export interface AppConfig {
  port: number;
  bindHost: string;
  dataDir: string;
  dbPath: string;
  buildMarker: string;
  projectRoot: string;
}

function resolveProjectRoot(fromModuleDir: string): string {
  // ESM entry runs from dist/ in production and from src/ in dev; in both
  // cases the project root is one level up.
  const candidate = resolve(fromModuleDir, '..');
  const probe = join(candidate, 'public');
  if (existsSync(probe)) return candidate;
  const upper = resolve(fromModuleDir, '../..');
  return existsSync(join(upper, 'public')) ? upper : candidate;
}

export function defaultConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  // Compiled to CommonJS, so `__dirname` is available at runtime (dist/ in
  // production, the source directory under the test runner).
  const projectRoot = resolveProjectRoot(__dirname);

  const dataDir = env.DATA_DIR ? resolve(env.DATA_DIR) : join(projectRoot, 'data');
  const dbPath = env.DATABASE_PATH
    ? resolve(env.DATABASE_PATH)
    : join(dataDir, 'taskboard.db');

  let buildMarker = (env.BUILD_MARKER || '').trim();
  if (!buildMarker) {
    const versionFile = join(projectRoot, 'VERSION');
    if (existsSync(versionFile)) {
      const value = readFileSync(versionFile, 'utf8').trim();
      if (value) buildMarker = value;
    }
  }
  if (!buildMarker) buildMarker = 'develop';

  const port = Number.parseInt(env.PORT || '8080', 10);
  const bindHost = env.BIND_HOST || '0.0.0.0';

  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error(`PORT must be an integer in [0, 65535], got "${env.PORT}"`);
  }

  return { port, bindHost, dataDir, dbPath, buildMarker, projectRoot };
}