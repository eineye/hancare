import { NextResponse, type NextRequest } from 'next/server';
import { getUnits } from '@/lib/content';
import { cleanRoleplayConfig, getRoleplayConfig, saveRoleplayConfig } from '@/lib/contentStore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// 역할극 편집기(public/hancare-roleplay-editor.html) 연동.
// GET: 상황 목록(content/*.json) + content/roleplays.json 설정 / PUT: 설정 전체 저장
export async function GET() {
  const [units, config] = await Promise.all([getUnits(), getRoleplayConfig()]);
  const situations = units.flatMap((u) =>
    u.situations.map((s) => ({
      unitId: u.id,
      unitTitleKo: u.titleKo,
      category: u.category,
      situationId: s.id,
      menuLabelKo: s.menuLabelKo,
      titleKo: s.titleKo,
      terms: s.terms.map((t) => ({ hangul: t.hangul, glossEn: t.glossEn })),
      sentences: s.sentences.map((x) => x.textKo),
    })),
  );
  return NextResponse.json({ situations, config });
}

export async function PUT(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON 본문을 읽을 수 없습니다.' }, { status: 400 });
  }
  const config = cleanRoleplayConfig(body);
  if (typeof config === 'string') return NextResponse.json({ error: config }, { status: 400 });
  try {
    await saveRoleplayConfig(config);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[roleplays] 저장 실패:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
