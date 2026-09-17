import AuthGuard from '@/components/AuthGuard';
import XrModuleGrid from '@/components/XrModuleGrid';
import { getXrModules } from '@/lib/content';

// content/xr-modules.json이 재배포 없이 수시로 바뀔 수 있으므로 매 요청마다 새로 읽는다.
export const dynamic = 'force-dynamic';

export default async function XrListPage() {
  const modules = await getXrModules();
  return (
    <AuthGuard role="any">
      <XrModuleGrid modules={modules} />
    </AuthGuard>
  );
}
