import { prisma } from '../db/prisma.js';
import OpenAI from 'openai';
import * as fs from 'fs';
import * as path from 'path';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const EMBEDDING_MODEL = 'text-embedding-3-small';
const CHUNK_SIZE = 500; // characters per chunk

/**
 * Split text into chunks for embedding
 */
function chunkText(text: string, maxChars: number = CHUNK_SIZE): string[] {
  const paragraphs = text.split(/\n\n+/);
  const chunks: string[] = [];
  let currentChunk = '';

  for (const para of paragraphs) {
    if (currentChunk.length + para.length + 2 <= maxChars) {
      currentChunk += (currentChunk ? '\n\n' : '') + para;
    } else {
      if (currentChunk) chunks.push(currentChunk);
      currentChunk = para.slice(0, maxChars);
    }
  }

  if (currentChunk) chunks.push(currentChunk);
  return chunks;
}

/**
 * Get embedding for text
 */
async function getEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text,
  });
  return response.data[0].embedding;
}

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Index a knowledge base document
 */
export async function indexDocument(docId: string): Promise<{ indexed: number }> {
  const doc = await prisma.knowledgeDoc.findUnique({ where: { id: docId } });
  if (!doc) throw new Error('Document not found');

  // Delete existing chunks
  await prisma.knowledgeChunk.deleteMany({ where: { docId } });

  // Create new chunks
  const textChunks = chunkText(doc.content);
  let indexed = 0;

  for (let i = 0; i < textChunks.length; i++) {
    const embedding = await getEmbedding(textChunks[i]);
    await prisma.knowledgeChunk.create({
      data: {
        docId,
        index: i,
        text: textChunks[i],
        embedding: JSON.stringify(embedding),
      }
    });
    indexed++;
  }

  return { indexed };
}

/**
 * Index all local KB markdown files
 */
export async function indexLocalKB(kbDir: string): Promise<{ total: number; indexed: number }> {
  const fullPath = path.resolve(kbDir);
  if (!fs.existsSync(fullPath)) {
    console.log(`KB directory not found: ${fullPath}`);
    return { total: 0, indexed: 0 };
  }

  const files = fs.readdirSync(fullPath).filter(f => f.endsWith('.md'));
  let indexed = 0;

  for (const file of files) {
    const content = fs.readFileSync(path.join(fullPath, file), 'utf-8');
    const slug = file.replace('.md', '');
    const title = slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

    // Extract language from filename (e.g., events.es.md)
    const langMatch = slug.match(/\.([a-z]{2})$/);
    const language = langMatch ? langMatch[1] : 'en';
    const cleanSlug = slug.replace(/\.[a-z]{2}$/, '');

    // Upsert document
    const doc = await prisma.knowledgeDoc.upsert({
      where: { slug: `${cleanSlug}-${language}` },
      create: {
        slug: `${cleanSlug}-${language}`,
        title,
        language,
        content,
      },
      update: {
        title,
        content,
      }
    });

    await indexDocument(doc.id);
    indexed++;
  }

  return { total: files.length, indexed };
}

/**
 * Search the knowledge base
 */
export async function askKB(
  question: string,
  language: string = 'en',
  topK: number = 3
): Promise<{
  answer?: string;
  context: string;
  sources: Array<{ title: string; score: number; confidence: number }>;
}> {
  // Get question embedding
  const questionEmbedding = await getEmbedding(question);

  // Get all chunks (in production, use a vector DB)
  const chunks = await prisma.knowledgeChunk.findMany({
    include: { doc: true },
  });

  // Filter by language if specified
  const relevantChunks = chunks.filter(c =>
    c.doc.language === language || c.doc.language === 'en'
  );

  // Calculate similarities
  const scored = relevantChunks.map(chunk => {
    const embedding = JSON.parse(chunk.embedding);
    const score = cosineSimilarity(questionEmbedding, embedding);
    return { chunk, score };
  });

  // Sort by score and take top K
  scored.sort((a, b) => b.score - a.score);
  const topChunks = scored.slice(0, topK);

  if (topChunks.length === 0) {
    return {
      context: '',
      sources: [],
    };
  }

  // Build context from top chunks
  const context = topChunks
    .map(item => item.chunk.text)
    .join('\n\n---\n\n');

  // Normalize scores to confidence (0-1)
  const maxScore = Math.max(...topChunks.map(c => c.score));
  const sources = topChunks.map(item => ({
    title: item.chunk.doc.title,
    score: item.score,
    confidence: item.score / Math.max(maxScore, 0.01),
  }));

  return {
    context,
    sources,
  };
}

/**
 * Index a document from the database
 */
export async function indexDbDocs(docId?: string): Promise<{ indexed: number }> {
  if (docId) {
    return indexDocument(docId);
  }

  const docs = await prisma.knowledgeDoc.findMany();
  let indexed = 0;

  for (const doc of docs) {
    await indexDocument(doc.id);
    indexed++;
  }

  return { indexed };
}
