/**
 * 관리자 화면(사이드바 "오늘 처리할 일" 카드, /admin, /admin/alerts)이 공유하는
 * 목데이터 숫자. 실제 일지 제출/면담 예약 백엔드가 없어 값이 고정되어 있지만,
 * 여러 화면에서 같은 숫자를 보여주도록 한 곳에 모아둔다.
 */
export const ADMIN_OVERVIEW = {
  pendingJournals: 7,
  pendingJournalsOverdueCount: 2,
  upcomingMeetings: 3,
  unreachedLearners: 3,
  sentNoticesLast7Days: 12,
  sentNoticesReadRate: 83,
};

export const UPCOMING_MEETINGS = [
  { dateKo: '9월 19일 금 14:00', titleKo: 'Aung Kyaw · 학습 부진 면담', detailKo: '4일 미접속, 평균 64점 · 통역 필요', urgent: true },
  { dateKo: '9월 22일 월 10:30', titleKo: 'Sok Chan · 발음 보충 상담', detailKo: '받침 발음 기수 평균 대비 낮음', urgent: false },
  { dateKo: '9월 23일 수 11:00', titleKo: '기수 전체 · 중간 평가 안내', detailKo: '회화 실기 · 실습교육실', urgent: false },
];

export const PENDING_JOURNAL_REVIEWS = [
  { learnerName: 'Maria Santos', department: '내과', submittedKo: '9월 15일', daysAgo: 3 },
  { learnerName: 'Sari Wulandari', department: '재활', submittedKo: '9월 16일', daysAgo: 2 },
  { learnerName: 'Nguyen Thi Lan', department: '외과', submittedKo: '9월 17일', daysAgo: 1 },
];

export const RECENT_NOTICES_SENT = [
  { titleKo: '중간 평가 일정 안내', metaKo: '9월 16일 · 5명 · 열람 4명' },
  { titleKo: '복습 세트 독려 알림', metaKo: '9월 14일 · 2명 · 열람 1명' },
  { titleKo: '일지 제출 안내', metaKo: '9월 11일 · 5명 · 열람 5명' },
];
