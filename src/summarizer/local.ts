import { Summary, createEmptySummary } from './schema';

export async function summarizeLocal(text: string): Promise<Summary> {
  return createEmptySummary();
}