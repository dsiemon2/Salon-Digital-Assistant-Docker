
import { prisma } from '../db/prisma.js';

export async function getDirectory() {
  const depts = await prisma.department.findMany({ orderBy: { name: 'asc' } });
  return depts;
}
