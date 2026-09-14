import { getUnits } from './content';

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

/**
 * 진도관리(코스 선택) 화면의 메뉴 구조.
 * docs/PROGRAM_DESIGN.md의 학습 콘텐츠 계층(유닛 > 상황)을 사용자가 먼저
 * 고를 수 있게 감싼 것으로, 상세 커리큘럼은 추후 확정 예정 — 지금은
 * 기초한글 / 실습한글(간호조무) / XR실습 3개 큰 분류만 잡아둔다.
 */
export function getCourseSections(): CourseSection[] {
  const practiceItems: CourseItem[] = getUnits().flatMap((unit) =>
    unit.situations.map((situation) => ({
      id: situation.id,
      labelKo: situation.menuLabelKo,
      labelEn: situation.menuLabelEn,
      status: 'available' as const,
      href: `/learn/${unit.id}/${situation.id}`,
    })),
  );

  return [
    {
      id: 'basic',
      titleKo: '기초한글',
      titleEn: 'Basic Hangul',
      descriptionKo: '자음·모음, 받침, 기초 낱말 등 한글 자체를 처음부터 배웁니다.',
      descriptionEn: 'Learn Hangul itself from the basics — consonants, vowels, batchim, simple words.',
      items: [
        { id: 'basic-jamo', labelKo: '자음·모음 익히기', labelEn: 'Consonants & vowels', status: 'coming-soon' },
        { id: 'basic-batchim', labelKo: '받침 연습', labelEn: 'Batchim practice', status: 'coming-soon' },
        { id: 'basic-words', labelKo: '기초 낱말', labelEn: 'Basic words', status: 'coming-soon' },
      ],
    },
    {
      id: 'practice',
      titleKo: '실습한글',
      titleEn: 'Practical Hangul (Nursing)',
      descriptionKo: '간호조무 실습 현장에서 바로 쓰는 의료 용어와 회화를 연습합니다.',
      descriptionEn: 'Practice the medical terms and conversations used on the nursing-assistant floor.',
      items: practiceItems,
    },
    {
      id: 'xr',
      titleKo: 'XR실습',
      titleEn: 'XR Practice',
      descriptionKo: 'VR/AR 가상 병실에서 실습 상황을 몸으로 연습하는 과정입니다.',
      descriptionEn: 'Practice situations hands-on in a VR/AR virtual patient room.',
      items: [
        { id: 'xr-ward', labelKo: '가상 병실 실습', labelEn: 'Virtual ward practice', status: 'coming-soon' },
      ],
    },
  ];
}
