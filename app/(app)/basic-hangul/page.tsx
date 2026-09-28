import { getUnitsByCategory } from '@/lib/content';
import { getVocabCards } from '@/lib/vocab';
import BasicHangulView from '@/components/BasicHangulView';

export const dynamic = 'force-dynamic';

export default async function BasicHangulPage() {
  const [units, vocabCards] = await Promise.all([getUnitsByCategory('basic'), getVocabCards()]);
  return <BasicHangulView units={units} vocabCards={vocabCards} />;
}
