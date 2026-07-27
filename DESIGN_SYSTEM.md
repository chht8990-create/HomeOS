# HomeOS Design System

HomeOS v2 디자인 시스템은 기존 모바일 UI를 깨지 않고 다음 기능
Sprint부터 일관된 화면을 만들기 위한 기준이다. 구현 방식은 Tailwind가
아닌 CSS Custom Properties이며, 토큰은
`src/styles/theme.css`, 컴포넌트 스타일은
`src/components/ui/ui.css`에 둔다.

## 1. 현재 UI 분석

| 영역 | 현재 구조 | 디자인 시스템 적용 방향 |
| --- | --- | --- |
| Dashboard | `TodayPage`에서 Meal, Planner, Shopping, Inventory 요약 블록을 세로 배치 | 요약 수치는 Number 스타일, 상태는 Badge로 통일 |
| Planner | 날짜·식사·메뉴 폼, 추천 필터, 추천 목록, 저장 목록 | Input/Select/Badge/Progress를 단계적으로 적용 |
| Shopping | sticky 진행률, 카테고리 그룹, 체크 전환, 장바구니, Quick Add | Progress/FloatingButton 및 Check motion의 기준 화면 |
| Inventory | 추가·수정 폼과 목록 | 공통 Input/Select/Button을 우선 적용할 화면 |
| Recommendation | Planner 내부 필터와 재료 부족 상태 | Badge tone과 숫자 스타일로 상태 위계 통일 |
| Settings | Meal Pack과 전체 백업/복원의 긴 폼·미리보기 | Dialog/BottomSheet/Toast 적용 후보 |

현재 공통 골격은 `ScreenHeader → Section → Card`이고, 모바일 앱
셸은 최대 480px이다. Planner, Inventory, Settings는
`inventory-form` 스타일을 공유하고 있으며 Shopping에는 sticky/FAB처럼
고유한 상호작용이 있다.

확인된 개선 지점은 다음과 같다.

- Primary 외 상태 색상이 의미 토큰으로 분리되어 있지 않았다.
- 4/8/16/24/32 간격만 있어 12px 중간 단계가 없었다.
- Input, Select, Progress, Badge, Toast, Dialog, Bottom Sheet의
  공통 API가 없었다.
- 포커스 링과 상태 배경에 개별 RGBA 값이 반복된다.
- 다크 모드로 교체 가능한 의미 색상 계층이 없었다.

이번 기준선에서는 기존 화면이 쓰는 변수의 실제 값과 클래스 이름을
유지한다. 새 컴포넌트는 아직 기존 페이지에 연결하지 않는다.

## 2. Color System

색상은 원시 팔레트가 아니라 역할을 나타내는 의미 토큰만 화면에서
사용한다.

| 역할 | Light | Dark | 토큰 |
| --- | --- | --- | --- |
| Primary | `#4f8f63` | `#73b486` | `--color-primary` |
| Primary hover | `#3f7451` | `#87c397` | `--color-primary-hover` |
| Secondary | `#66756b` | `#9aaba0` | `--color-secondary` |
| Success | `#2f7d4a` | `#6fc487` | `--color-success` |
| Warning | `#a86316` | `#e2ad5f` | `--color-warning` |
| Danger | `#ba3f3b` | `#e88782` | `--color-danger` |
| Background | `#f7f5ef` | `#171915` | `--color-background` |
| Surface | `#ffffff` | `#20231e` | `--color-surface` |
| Raised surface | `#ffffff` | `#282c26` | `--color-surface-raised` |
| Border | `#e6e0d5` | `#363b33` | `--color-border` |
| Text | `#25231f` | `#f1eee7` | `--color-text` |
| Muted | `#777167` | `#aaa99f` | `--color-text-muted` |

상태 색상은 각각 `*-subtle` 배경 토큰을 함께 제공한다. 흰색을 직접
쓰는 대신 Primary 위 텍스트에는 `--color-on-primary`를 사용한다.
오버레이와 키보드 포커스에는 각각 `--color-overlay`,
`--color-focus-ring`을 사용한다.

기존 코드 호환을 위해 `--color-primary-dark`,
`--color-text-light`는 새 토큰의 별칭으로 유지한다.

## 3. Typography

기본 글꼴은 Pretendard 우선 시스템 산세리프 스택이다. 숫자는
`font-variant-numeric: tabular-nums`를 사용해 진행률이나 수량 변화 시
폭이 흔들리지 않게 한다.

| 용도 | 크기 / 행간 | 굵기 | 토큰 또는 클래스 |
| --- | --- | --- | --- |
| H1 | 32 / 1.3 | 800 | `--font-size-h1`, `.ui-type-h1` |
| H2 | 20 / 1.3 | 800 | `--font-size-h2`, `.ui-type-h2` |
| H3 | 18 / 1.3 | 800 | `--font-size-h3`, `.ui-type-h3` |
| Body | 16 / 1.6 | 400 | `--font-size-body`, `.ui-type-body` |
| Caption | 14 / 1.6 | 400–700 | `--font-size-caption`, `.ui-type-caption` |
| Button | 16 / 1.3 | 800 | `--font-size-button` |
| Number | 24 / 1.3 | 800 | `--font-size-number`, `.ui-number` |

제목에는 `--letter-spacing-heading: -0.02em`, 숫자에는
`--letter-spacing-number: -0.02em`을 사용한다. 본문은 16px를
유지해 모바일 브라우저의 입력창 자동 확대를 피한다.

## 4. Spacing

4px 단위의 제한된 스케일만 사용한다.

| 값 | 토큰 | 권장 용도 |
| --- | --- | --- |
| 4px | `--space-1` | 아이콘 내부, 라벨과 짧은 보조 정보 |
| 8px | `--space-2` | 인접 컨트롤, 필드 라벨 간격 |
| 12px | `--space-3` | 컨트롤 내부 패딩, 조밀한 카드 요소 |
| 16px | `--space-4` | 모바일 기본 여백, 필드 그룹 |
| 24px | `--space-6` | 카드 패딩, 섹션 내부 그룹 |
| 32px | `--space-8` | 주요 섹션 사이 |

`--space-xs/sm/md/lg/xl`은 기존 화면 호환 별칭이다. 새 코드에서는
숫자 스케일을 우선 사용한다.

## 5. Radius

| 대상 | 값 | 토큰 |
| --- | --- | --- |
| Card | 24px | `--radius-card` |
| Button | 18px | `--radius-button` |
| Input / Select | 18px | `--radius-input` |
| Dialog / Bottom Sheet | 24px | `--radius-dialog` |
| Badge / Floating Button | pill | `--radius-pill` |

하위 호환용 `--radius-sm/md/lg`는 각각 12/18/24px로 유지한다.

## 6. Shadow

| 단계 | 토큰 | 용도 |
| --- | --- | --- |
| Small | `--shadow-sm` | 작은 부유 요소, hover |
| Medium | `--shadow-md` | Card |
| Large | `--shadow-lg` | Dialog, Toast, Floating Button |

다크 테마에서는 검은색 불투명도를 높인 동일 의미 토큰으로 자동
교체된다. 구분이 가능한 경우 그림자보다 Border를 먼저 사용한다.

## 7. Components

모든 컴포넌트는 `src/components/ui`에 있고
`src/components/ui/index.ts`에서 다시 export한다.

| 컴포넌트 | 상태 | 핵심 규칙 |
| --- | --- | --- |
| Button | 기존 확장 | primary/secondary/ghost/danger, 높이 48px |
| IconButton | 신규 | 접근 가능한 이름 필수, 48×48px 원형 |
| Card | 기존 유지 | Surface, Border, medium shadow |
| Section | 기존 유지 | 제목·설명·action·content 구조 |
| Input | 신규 | label 필수, description/error 연결 |
| Select | 신규 | label 필수, Input과 동일한 높이·상태 |
| Progress | 신규 | label 필수, 선택적 퍼센트 숫자 |
| Badge | 신규 | neutral/primary/success/warning/danger |
| Toast | 신규 | status 또는 alert, 선택적 닫기 동작 |
| Dialog | 신규 | controlled open, Escape/배경/닫기 동작 |
| FloatingButton | 신규 | safe-area 및 하단 내비게이션 회피 |
| BottomSheet | 신규 | Dialog API 재사용, 모바일 하단 진입 |

기본 사용 예:

```tsx
import {
  Badge,
  Button,
  Input,
  Progress,
} from './components/ui'

<Input
  label="재료명"
  description="Inventory 비교에 사용할 이름이에요."
/>
<Badge tone="warning">재료 구매 필요</Badge>
<Progress label="구매 진행률" value={3} max={8} />
<Button variant="danger">삭제</Button>
```

컴포넌트 적용은 페이지별 후속 Sprint에서 진행한다. 현재 페이지의
HTML, 이벤트, LocalStorage 흐름은 이번 기준선에서 변경하지 않는다.

## 8. Motion

| 동작 | 시간 | 표현 |
| --- | --- | --- |
| Hover | 160ms | 색·Border·1px elevation |
| Press | 160ms | 이동 복귀 또는 0.98 scale |
| Check | 600ms | 확인 표시 후 상태 영역 이동 |
| Dialog | 320ms | fade + 8px translate + 0.98 scale |
| Bottom Sheet | 320ms | 아래에서 위로 진입 |
| Page Transition | 240ms | 4px translate + fade |

토큰은 `--motion-duration-*`, `--motion-ease-*`를 사용한다.
`prefers-reduced-motion: reduce`에서는 모든 신규 duration 토큰이
1ms가 된다. 애니메이션이 완료돼야만 데이터가 바뀌는 구조는 만들지
않는다.

## 9. Responsive

CSS 변수에 breakpoint 값을 문서화하지만, CSS Media Query에서는
Custom Property를 사용할 수 없으므로 숫자 값을 직접 사용한다.

| 기준 | 역할 | 레이아웃 규칙 |
| --- | --- | --- |
| 360px | 최소 지원 모바일 | 단일 열, 14–16px gutter, 긴 버튼 줄바꿈 |
| 390px | 기본 모바일 | 단일 열, 16px gutter, 48px 컨트롤 |
| 430px | 넓은 모바일 | 단일 열, action 병렬 배치 허용 |
| 768px | Tablet | 최대 720px content, Dialog 중앙 배치 |
| 1200px | Desktop | 최대 1120px content, 2열은 명시적 화면에서만 |

현재 `.app`의 480px 최대 너비는 유지한다. 768/1200 토큰은 v2 화면
확장 시 사용하며 이번 작업에서는 레이아웃을 넓히지 않는다.

모든 고정 UI는 다음을 지켜야 한다.

- 좌우 `env(safe-area-inset-*)` 반영
- 하단 내비게이션 위 최소 88px 확보
- 터치 대상 최소 44×44px
- 360px에서 가로 스크롤 금지

## 10. Theme

기본값은 Light이며 루트 요소에 명시적으로 테마를 지정할 수 있다.

```html
<html data-theme="light">
<html data-theme="dark">
```

테마 전환은 의미 토큰만 교체한다. 컴포넌트에서 테마별 hex 값을 직접
사용하지 않는다. 사용자 선택 저장과 실제 전환 UI는 별도 기능
Sprint 범위다. 시스템 설정에 따른 자동 다크 모드는 기존 화면이
예고 없이 바뀌지 않도록 이번 기준선에서 활성화하지 않는다.

## 11. Accessibility

- Button/IconButton/FloatingButton은 실제 `button` 요소를 사용한다.
- IconButton은 `aria-label`을 필수로 받는다.
- Input/Select는 label과 설명 또는 오류를 ID로 연결한다.
- Progress는 접근 가능한 label을 필수로 받는다.
- Toast는 중요도에 따라 `status` 또는 `alert`를 사용한다.
- Dialog/BottomSheet는 `role="dialog"`, `aria-modal`, 제목 연결,
  Escape와 명시적 닫기 동작을 제공한다.
- 포커스는 `--color-focus-ring`으로 표시하며 색상만으로 상태를
  전달하지 않는다.
- 본문과 입력 글자는 최소 16px, 보조 글자는 최소 12px를 사용한다.

## 12. 적용 원칙

1. 비즈니스 로직과 디자인 컴포넌트를 분리한다.
2. 기존 화면을 한 번에 재작성하지 않고 컴포넌트 단위로 교체한다.
3. 새 색상·간격·그림자 값을 페이지 CSS에 직접 추가하지 않는다.
4. Dark Theme은 의미 토큰만으로 동작해야 한다.
5. 각 페이지 마이그레이션마다 360/390/430/768/1200px,
   키보드 포커스, reduced motion을 확인한다.
