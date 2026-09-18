import { getUnits } from '@/lib/content';
import { getVocabCards } from '@/lib/vocab';
import HomeContent from '@/components/HomeContent';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [units, vocabCards] = await Promise.all([getUnits(), getVocabCards()]);

  const situations = units.flatMap((unit) =>
    unit.situations.map((situation) => ({
      unitId: unit.id,
      situationId: situation.id,
      titleKo: situation.titleKo,
      unitTitleKo: unit.titleKo,
    })),
  );

  return <HomeContent situations={situations} vocabCards={vocabCards} />;
}
