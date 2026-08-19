import { Block, ExerciseLog } from './types';

export function makeBlockId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `block_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function defaultBlockName(index: number): string {
  return `Block ${index + 1}`;
}

export function normalizeBlocks(raw: { blocks?: unknown; exerciseIds?: unknown }): Block[] {
  if (Array.isArray(raw.blocks) && raw.blocks.length > 0) {
    return raw.blocks as Block[];
  }
  const exerciseIds = Array.isArray(raw.exerciseIds) ? (raw.exerciseIds as string[]) : [];
  return [{ id: 'block-1', name: 'Block 1', exerciseIds }];
}

export function flattenBlockExerciseIds(blocks: Block[]): string[] {
  return blocks.flatMap((b) => b.exerciseIds);
}

export interface LogGroup {
  blockId?: string;
  blockName?: string;
  logs: ExerciseLog[];
}

export function groupLogsByBlock(logs: ExerciseLog[]): LogGroup[] {
  const groups: LogGroup[] = [];
  for (const log of logs) {
    const last = groups[groups.length - 1];
    if (last && last.blockId === log.blockId) {
      last.logs.push(log);
    } else {
      groups.push({ blockId: log.blockId, blockName: log.blockName, logs: [log] });
    }
  }
  return groups;
}
