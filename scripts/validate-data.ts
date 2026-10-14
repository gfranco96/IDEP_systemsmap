import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateData } from '../src/data/validate';
import type { MapData } from '../src/model/types';

const dataDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'data');
const load = (f: string) => JSON.parse(readFileSync(join(dataDir, f), 'utf8'));

const data: MapData = {
  meta: load('meta.json'),
  nodes: load('nodes.json'),
  edges: load('edges.json'),
  chains: load('chains.json'),
  loops: load('loops.json'),
  references: load('references.json'),
};

const errors = validateData(data);
if (errors.length) {
  console.error(`✗ Data validation failed (${errors.length} problem${errors.length === 1 ? '' : 's'}):`);
  for (const e of errors) console.error('  - ' + e);
  process.exit(1);
}
console.log(
  `✓ Data valid: ${data.nodes.length} nodes, ${data.edges.length} edges, ${data.chains.length} chains, ` +
    `${data.loops.length} loops, ${data.references.length} references; counts match §2 and meta.counts.`,
);
