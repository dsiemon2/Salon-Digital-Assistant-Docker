import { indexDbDocs } from '../src/services/kb.js';

async function main() {
  console.log('Re-indexing knowledge base documents...');
  const result = await indexDbDocs();
  console.log(`Indexed ${result.indexed} documents with embeddings`);
}

main()
  .catch(console.error)
  .finally(() => process.exit(0));
