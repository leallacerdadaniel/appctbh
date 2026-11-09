// Gera supabase/functions/app-assistant/knowledge.ts a partir do conteúdo do app.
// Uso: node scripts/assistant/build.mjs   (rodar de novo quando regras ou guia mudarem, e republicar a função)
import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const out = join(mkdtempSync(join(tmpdir(), 'ctbh-kb-')), 'entry.cjs');
execFileSync('npx', ['-y', 'esbuild@0.24.0', 'scripts/assistant/entry.ts', '--bundle', '--platform=node',
  '--format=cjs', `--outfile=${out}`, '--alias:react-native=./scripts/assistant/rn-stub.js',
  '--loader:.png=empty', '--loader:.jpg=empty', '--loader:.webp=empty', '--loader:.pdf=empty', '--log-level=warning'],
  { stdio: 'inherit' });
const text = execFileSync('node', [out], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const file = `// GERADO por scripts/assistant/build.mjs a partir do conteúdo do app. Não editar à mão.\n` +
  `export const KNOWLEDGE = ${JSON.stringify(text)};\n`;
writeFileSync('supabase/functions/app-assistant/knowledge.ts', file);
console.log(`knowledge.ts: ${text.length} caracteres (~${Math.round(text.length / 4)} tokens)`);
