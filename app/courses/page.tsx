import CoursesView from '@/components/CoursesView';
import { getCourseSections } from '@/lib/courses';

// content/*.json이 재배포 없이 수시로 바뀔 수 있으므로 이 페이지를 정적으로
// 미리 굳히지 않고 매 요청마다 새로 렌더링한다.
export const dynamic = 'force-dynamic';

export default async function CoursesPage() {
  const sections = await getCourseSections();
  return <CoursesView sections={sections} />;
}
