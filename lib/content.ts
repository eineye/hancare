import unitsData from '@/data/units.json';
import type { Sentence, Situation, Unit } from './types';

const units = unitsData as Unit[];

export function getUnits(): Unit[] {
  return units;
}

export function getUnit(unitId: string): Unit | undefined {
  return units.find((u) => u.id === unitId);
}

export function getSituation(
  unitId: string,
  situationId: string,
): { unit: Unit; situation: Situation } | undefined {
  const unit = getUnit(unitId);
  const situation = unit?.situations.find((s) => s.id === situationId);
  if (!unit || !situation) return undefined;
  return { unit, situation };
}

export function findAdjacentSituation(
  unitId: string,
  situationId: string,
  direction: 1 | -1,
): { unitId: string; situationId: string } | undefined {
  const unit = getUnit(unitId);
  if (!unit) return undefined;
  const index = unit.situations.findIndex((s) => s.id === situationId);
  const nextIndex = index + direction;
  if (nextIndex < 0 || nextIndex >= unit.situations.length) return undefined;
  return { unitId: unit.id, situationId: unit.situations[nextIndex].id };
}

export function getFirstSentence(situation: Situation): Sentence {
  return situation.sentences[0];
}

export function unitProgress(unitId: string, situationId: string) {
  const unit = getUnit(unitId);
  if (!unit) return { current: 0, total: 0 };
  const index = unit.situations.findIndex((s) => s.id === situationId);
  return { current: index + 1, total: unit.situations.length };
}
