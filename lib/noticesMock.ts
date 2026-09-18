/**
 * 알림(/notices) 목데이터. 실제 푸시/알림 발송 백엔드가 없어 고정된 예시
 * 목록이다 — 상단바 알림 배지 숫자도 이 목록의 unread 개수를 그대로 쓴다.
 */
export interface NoticeItem {
  id: string;
  groupKo: '오늘' | '이번 주';
  titleKo: string;
  detailKo: string;
  timeKo: string;
  unread: boolean;
}

export const NOTICES: NoticeItem[] = [
  {
    id: 'n1',
    groupKo: '오늘',
    titleKo: '복습 세트가 준비되었습니다',
    detailKo: '발음 점수가 낮은 용어 위주로 골랐습니다',
    timeKo: '07:00',
    unread: true,
  },
  {
    id: 'n2',
    groupKo: '오늘',
    titleKo: 'XR실습 새 모듈이 열렸습니다',
    detailKo: 'content/xr-modules.json에 추가된 모듈은 자동으로 노출됩니다',
    timeKo: '08:30',
    unread: true,
  },
  {
    id: 'n3',
    groupKo: '이번 주',
    titleKo: '9월 23일 중간 평가가 예정되어 있습니다',
    detailKo: '회화 실기 · 실습교육실',
    timeKo: '9월 16일',
    unread: true,
  },
];
