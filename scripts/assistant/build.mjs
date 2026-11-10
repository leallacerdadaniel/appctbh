// Gera supabase/functions/app-assistant/knowledge.ts a partir do conteúdo do app.
// Uso: node scripts/assistant/build.mjs   (rodar de novo quando regras ou guia mudarem, e republicar a função)
import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const out = join(mkdtempSync(join(tmpdir(), 'ctbh-kb-')), 'entry.cjs');
execFileSync('npx', ['-y', 'esbuild@0.24.0', 'scripts/assistant/entry.ts', '--bundle', '--platform=node',
  '--format=cjs', `--outfile=${out}`, '--alias:react-native=./scripts/assistant/rn-stub.js',
  // phone-stolen.ts guarda as marcações no celular; aqui só os textos interessam.
  '--alias:@react-native-async-storage/async-storage=./scripts/assistant/rn-stub.js',
  '--loader:.png=empty', '--loader:.jpg=empty', '--loader:.webp=empty', '--loader:.pdf=empty', '--log-level=warning'],
  { stdio: 'inherit' });
const text = execFileSync('node', [out], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  // A tipografia das telas não serve à IA e atrapalha conferir a publicação: o espaço que não quebra vira espaço
  // e o hífen que não quebra vira hífen.
  .replace(/[\u00a0\u202f]/g, ' ')
  .replace(/\u2011/g, '-');
// Texto em várias linhas (crase), para o diff ser legível e para publicar a função sem sequências de escape
// (o conector do Supabase troca \uXXXX pelo caractere, e aí o publicado deixa de ser igual ao arquivo).
// Só barra, crase e ${ precisam de escape.
if (/[\u0000-\u0008\u000b-\u001f\u2028\u2029]/.test(text)) throw new Error('knowledge: caractere de controle no texto.');
const literal = text.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
const file = `// GERADO por scripts/assistant/build.mjs a partir do conteúdo do app. Não editar à mão.\n` +
  `export const KNOWLEDGE = \`${literal}\`;\n`;
writeFileSync('supabase/functions/app-assistant/knowledge.ts', file);
console.log(`knowledge.ts: ${text.length} caracteres (~${Math.round(text.length / 4)} tokens)`);
