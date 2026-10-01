import { getVocabCards } from '@/lib/vocab';
import VocabView from '@/components/VocabView';

export const dynamic = 'force-dynamic';

export default async function VocabPage() {
  const vocabCards = await getVocabCards();
  return <VocabView cards={vocabCards} />;
}
