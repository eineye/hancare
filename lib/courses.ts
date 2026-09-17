import { getUnitsByCategory, getXrModules } from './content';
import type { Unit } from './types';

export type CourseItemStatus = 'available' | 'coming-soon';

export interface CourseItem {
  id: string;
  labelKo: string;
  labelEn: string;
  status: CourseItemStatus;
  /** status가 'available'일 때만 존재. 실제 학습 화면으로 이동하는 경로. */
  href?: string;
}

export interface CourseSection {
  id: string;
  titleKo: string;
  titleEn: string;
  descriptionKo: string;
  descriptionEn: string;
  items: CourseItem[];
}

const EMPTY_PLACEHOLDER: CourseItem = {
  id: 'empty',
  labelKo: '아직 등록된 콘텐츠가 없습니다',
  labelEn: 'No content yet',
  status: 'coming-soon',
};

function itemsFromUnits(units: Unit[]): CourseItem[] {
  const items = units.flatMap((unit) =>
    unit.situations.map((situation) => ({
      id: situation.id,
      labelKo: situation.menuLabelKo,
      labelEn: situation.menuLabelEn,
      status: 'available' as const,
      href: `/learn/${unit.id}/${situation.id}`,
    })),
  );
  return items.length ? items : [EMPTY_PLACEHOLDER];
}

/**
 * 진도관리(코스 선택) 화면의 메뉴 구조.
 * 기초한글/실습한글 항목은 content/*.json(lib/content.ts)에서 매 호출마다 새로
 * 읽어오므로, 그 파일들을 수정하면 재배포 없이 바로 반영된다. XR실습은 아직
 * 실제 콘텐츠가 없어 고정 placeholder로 둔다.
 */
export async function getCourseSections(): Promise<CourseSection[]> {
  const [basicUnits, practiceUnits, xrModules] = await Promise.all([
    getUnitsByCategory('basic'),
    getUnitsByCategory('practice'),
    getXrModules(),
  ]);

  // XR실습 화면(/xr/...)은 아직 구현 전(docs/XR_MODULE_DESIGN.md 로드맵 참고)이라
  // "coming-soon"으로 표시하되, 실제 5대 모듈명·법정 실습시간은 미리 보여준다.
  const xrItems: CourseItem[] = xrModules.length
    ? xrModules.map((m) => ({
        id: m.id,
        labelKo: `${m.titleKo} (${m.legalHours}h)`,
        labelEn: `${m.titleEn} (${m.legalHours}h)`,
        status: 'coming-soon' as const,
      }))
    : [EMPTY_PLACEHOLDER];

  return [
    {
      id: 'basic',
      titleKo: '기초한글',
      titleEn: 'Basic Hangul',
      descriptionKo: '자음·모음, 받침, 기초 낱말 등 한글 자체를 처음부터 배웁니다.',
      descriptionEn: 'Learn Hangul itself from the basics — consonants, vowels, batchim, simple words.',
      items: itemsFromUnits(basicUnits),
    },
    {
      id: 'practice',
      titleKo: '실습한글',
      titleEn: 'Practical Hangul (Nursing)',
      descriptionKo: '간호조무 실습 현장에서 바로 쓰는 의료 용어와 회화를 연습합니다.',
      descriptionEn: 'Practice the medical terms and conversations used on the nursing-assistant floor.',
      items: itemsFromUnits(practiceUnits),
    },
    {
      id: 'xr',
      titleKo: 'XR실습',
      titleEn: 'XR Practice',
      descriptionKo: '브라우저에서 설치 없이 실행하는 3D 가상 병실 실습(HnaCare XR)입니다.',
      descriptionEn: 'Browser-based, install-free 3D virtual ward practice (HnaCare XR).',
      items: xrItems,
    },
  ];
}
