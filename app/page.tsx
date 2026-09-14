import { redirect } from 'next/navigation';
import { getUnits } from '@/lib/content';

export default function HomePage() {
  const [firstUnit] = getUnits();
  const firstSituation = firstUnit?.situations[0];
  if (!firstUnit || !firstSituation) {
    return <p className="p-6">학습 콘텐츠가 없습니다.</p>;
  }
  redirect(`/learn/${firstUnit.id}/${firstSituation.id}`);
}
