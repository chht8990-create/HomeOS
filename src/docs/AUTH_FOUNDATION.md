# 오늘식탁 Google Account Foundation

## 범위

이 문서는 Google 계정 인증과 계정 동기화의 서비스 경계를
정의한다. 이번 단계에서는 로그인 UI, Google OAuth endpoint,
서버 데이터베이스, 실제 동기화를 연결하지 않는다. 기존 Hook,
LocalStorage key와 데이터 객체는 변경하지 않는다.

## 현재 구조

오늘식탁은 Vite SPA와 Vercel Functions로 구성되어 있다. 사용자
데이터는 브라우저 LocalStorage가 원본이며, Hook이 각 저장 key를
직접 읽고 쓴다. 현재 사용자 계정, 서버 세션, 데이터베이스는 없다.

### 계정 동기화 대상

| 데이터 | LocalStorage | 충돌 기준 |
| --- | --- | --- |
| 냉장고 | `homeos.inventory` | id별 최신 `updatedAt` |
| 장보기 | `homeos.shopping.items` | id별 최신 `updatedAt` |
| 이번 주 식사 | `homeos.mealPlan.items` | 날짜·끼니 slot의 최신 `updatedAt` |
| 오늘 식사 | `homeos.meal.*` | 날짜·끼니 slot의 최신 `updatedAt` |
| 가져온 레시피 | `homeos.recipes.imported` | id별 최신 데이터 |
| Meal Pack | `homeos.mealPack.*` | id별 최신 데이터 |
| 추천 설정 | `homeos.recommendation.*` | 최신 데이터 |
| AI 체험 결과 | `today-table.aiMealPlanTrial.v1` | 서버 우선 |
| 계량도구 | `today-table.measurement-tools.v1` | 최신 데이터 |

기본 제공 레시피는 앱 배포 자산이므로 동기화하지 않는다. 튜토리얼
확인, Planner 접힘 상태, 장보기 도움말 확인 여부는 기기 전용으로
유지한다.

## User 모델

`AuthUser.id`는 오늘식탁 내부 UUID다. Google ID token의 `sub`는
`providerSubject`로 별도 저장한다. 이메일은 변경될 수 있으므로
사용자 식별자나 데이터 소유권 key로 사용하지 않는다.

```text
AuthUser
├─ id: 오늘식탁 내부 사용자 ID
├─ provider: google
├─ providerSubject: 검증된 Google sub
├─ email / emailVerified
├─ displayName / avatarUrl / locale
└─ createdAt / updatedAt
```

## 인증 흐름

1. 사용자가 Google 로그인을 선택한다.
2. 클라이언트는 `/api/auth/google/start`로 이동한다.
3. 서버는 state, nonce와 PKCE 정보를 짧은 수명의 보안 쿠키로
   보관하고 Google 인증을 시작한다.
4. callback 서버가 ID token의 서명, `aud`, `iss`, `exp`, nonce를
   검증한다.
5. 검증된 `sub`로 Google identity와 오늘식탁 User를 연결한다.
6. 서버가 오늘식탁 세션을 만들고 `HttpOnly`, `Secure`,
   `SameSite=Lax` 쿠키를 발급한다.
7. 앱은 `/api/auth/session`으로 사용자와 만료시각만 읽는다.
8. 로그아웃은 `/api/auth/logout`에서 서버 세션과 쿠키를 폐기한다.

Google ID token, access token, refresh token과 앱 session token은
LocalStorage에 저장하지 않는다. 로그인과 Google API 권한 요청은
별도 흐름으로 유지한다.

## 로그인 상태 관리

UI 상태는 `loading → ready` 또는 `error`로 관리하고, ready 상태는
`anonymous` 또는 `authenticated` session을 가진다. 새로고침 시
항상 서버 session endpoint로 복원한다. 브라우저의 Google 로그인
상태만으로 오늘식탁 로그인 상태를 추정하지 않는다.

이번 단계의 `authEngine`은 endpoint 경로, session parser와 안전한
return path만 제공한다. Hook이나 App에는 아직 연결하지 않는다.

## 로컬 데이터에서 계정으로 전환

로그인 직전에 기존 HomeOS backup engine으로 로컬 snapshot을
메모리에 만든다. 로그인 후 서버 데이터 유무에 따라 다음 전략을
선택한다.

| 로컬 | 서버 | 최초 전략 |
| --- | --- | --- |
| 없음 | 없음 | 아무 작업 없음 |
| 있음 | 없음 | 로컬 snapshot 업로드 |
| 없음 | 있음 | 서버 snapshot 복원 |
| 있음 | 있음 | dataset별 병합 |

병합은 객체 id 또는 날짜·끼니 slot별 `updatedAt`을 비교한다.
동일 시각이면 서버 값을 선택해 기기 간 왕복 충돌을 막는다. 삭제는
실제 배열에서 즉시 제거하는 대신 서버에 tombstone을 남겨 다른
기기에서 삭제가 되살아나지 않게 한다.

서버 반영에 성공한 뒤에만 `serverRevision`과 `lastSyncedAt`을
갱신한다. 네트워크 실패 시 LocalStorage를 원본으로 계속 사용하며
사용자의 오프라인 변경을 지우지 않는다.

## 기존 LocalStorage와의 충돌

- 기존 key와 저장 객체를 수정하지 않으므로 현재 기능과 충돌하지
  않는다.
- 동기화 metadata는 추후 `today-table.account-sync.v1` 한 key만
  추가한다.
- metadata는 HomeOS 전체 백업 대상이 아니며 사용자 데이터가
  아니라 기기·revision 상태만 가진다.
- 로그인 전 데이터는 자동 삭제하지 않는다.
- 다른 계정으로 전환할 때는 현재 로컬 snapshot을 먼저 보존하고,
  명시적인 병합 또는 교체 확인이 필요하다.
- AI 무료 체험 사용 여부는 현재 LocalStorage만으로 강제할 수 없다.
  계정 도입 후 서버 기록을 권위 데이터로 사용해야 하며 이번
  Sprint에서는 이용권 정책을 구현하지 않는다.

## 다음 구현 단계

1. Google Cloud Web Client ID와 허용 origin/redirect URI 설정
2. Google ID token 검증 라이브러리 선택
3. `/api/auth/google/start`, callback, session, logout 구현
4. HttpOnly session 저장소와 User/Identity 테이블 구현
5. `useAuth` Provider를 App 최상단에 연결
6. account snapshot API와 revision/tombstone 저장소 구현
7. 로그인 직후 최초 병합 확인 UI와 복구 backup 제공
8. 다중 기기·오프라인·계정 전환 회귀 테스트
