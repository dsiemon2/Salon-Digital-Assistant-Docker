import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { prisma } from '../db/prisma.js';

const EMB_MODEL = process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small';

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function splitIntoChunks(text: string, size = 700, overlap = 120) {
  const words = text.split(/\s+/);
  const chunks: string[] = [];
  let start = 0;
  while (start < words.length) {
    const chunk = words.slice(start, start + size).join(' ');
    chunks.push(chunk);
    start += size - overlap;
    if (start < 0) break;
  }
  return chunks;
}

async function embed(texts: string[]): Promise<number[][]> {
  const resp = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ model: EMB_MODEL, input: texts })
  });
  if (!resp.ok) {
    const msg = await resp.text();
    throw new Error(`Embedding error: ${resp.status} ${msg}`);
  }
  const data = await resp.json();
  return data.data.map((d: any) => d.embedding);
}

export async function indexLocalKB(kbDir = 'kb') {
  const dir = path.resolve(kbDir);
  if (!fs.existsSync(dir)) return { ok: false, error: 'KB_DIR_MISSING' };
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'));
  for (const file of files) {
    const content = fs.readFileSync(path.join(dir, file), 'utf-8');
    const title = (content.split('\n')[0] || '').replace(/^#\s*/, '') || file;
    const langMatch = file.match(/\.(..)\.md$/);
    const language = langMatch ? langMatch[1] : 'en';
    const slug = slugify(file.replace(/\.md$/, ''));
    const doc = await prisma.knowledgeDoc.upsert({
      where: { slug },
      update: { title, content, language },
      create: { slug, title, content, language }
    });
    // Remove old chunks
    await prisma.knowledgeChunk.deleteMany({ where: { docId: doc.id } });

    const chunks = splitIntoChunks(content, 180, 30);
    const embs = await embed(chunks);
    for (let i = 0; i < chunks.length; i++) {
      await prisma.knowledgeChunk.create({
        data: {
          docId: doc.id,
          index: i,
          text: chunks[i],
          embedding: JSON.stringify(embs[i])
        }
      });
    }
  }
  return { ok: true, count: files.length };
}

function cosine(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-9);
}

export async function askKB(question: string, language: string = 'en') {
  // embed question
  const [qvec] = await embed([question]);
  // fetch candidate chunks in same language first, fallback to any
  let chunks = await prisma.knowledgeChunk.findMany({
    where: { doc: { language } },
    include: { doc: true }
  });
  if (!chunks.length) {
    chunks = await prisma.knowledgeChunk.findMany({ include: { doc: true } });
  }
  // score
  const scored = chunks.map(ch => {
    const emb = JSON.parse(ch.embedding);
    const score = cosine(qvec, emb);
    return { ch, score };
  }).sort((a,b)=> b.score - a.score).slice(0, 4);

  const context = scored.map(s => `### ${s.ch.doc.title}\n${s.ch.text}`).join('\n\n---\n\n');
  return { ok: true, context, sources: Array.from(new Set(scored.map(s => s.ch.doc.title))) };
}


export async function indexDbDocs(docId?: string) {
  // Get docs from DB (optionally single doc)
  const docs = docId
    ? await prisma.knowledgeDoc.findMany({ where: { id: docId } })
    : await prisma.knowledgeDoc.findMany({});

  for (const d of docs) {
    // delete old chunks
    await prisma.knowledgeChunk.deleteMany({ where: { docId: d.id } });
    // chunk & embed
    const chunks = splitIntoChunks(d.content, 180, 30);
    if (!chunks.length) continue;
    const embs = await embed(chunks);
    for (let i = 0; i < chunks.length; i++) {
      await prisma.knowledgeChunk.create({
        data: {
          docId: d.id,
          index: i,
          text: chunks[i],
          embedding: JSON.stringify(embs[i])
        }
      });
    }
  }
  return { ok: true, count: docs.length };
}
