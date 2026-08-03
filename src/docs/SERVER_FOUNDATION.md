# 오늘식탁 Server Foundation

## 목표와 현재 범위

이 문서는 Google Play Billing 전에 필요한 서버 Identity, Session,
Entitlement, Device 경계를 정의한다. 이번 Sprint는 모델·순수 엔진·API
진입점과 Repository 계약까지 구현한다.

아직 구현하지 않는 항목:

- Google Play purchase token 검증
- 기존 AI endpoint 권한 guard 연결
- Subscription UI

Google OAuth/JWK 검증, PostgreSQL adapter, 로그인 UI와 account snapshot
동기화 경계는 R4에서 연결했다. 환경변수나 schema가 설정되지 않은
endpoint는 가짜 성공이나 메모리 저장을 하지 않고 명확한 `503`을 반환한다.

## Server Identity 모델

### User

- 내부 `id`
- Google 계정의 불변 식별자인 `googleSubject`
- 검증된 email과 표시 정보
- 생성·수정 시각

email은 변경될 수 있으므로 계정 식별자로 사용하지 않는다. 데이터베이스
adapter는 `googleSubject`에 unique constraint를 두어야 한다.

### Device

- 내부 `id`, `userId`
- 클라이언트가 만든 비밀이 아닌 `deviceKey`
- 표시 이름, 최초 등록·마지막 사용·폐기 시각

Device는 세션과 감사 경계를 제공하며 권한의 근거가 아니다.

### Session

- 원문 token 대신 SHA-256 `tokenHash` 저장
- User와 Device 연결
- 생성·마지막 사용·회전·만료·폐기 시각

브라우저에는 `__Host-today_table_session` cookie만 저장한다.

```text
HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=2592000
```

- 기본 만료: 30일
- 회전 주기: 24시간
- 회전 시 기존 세션 폐기 후 새 opaque token 발급
- 로그아웃 시 서버 세션 폐기와 cookie `Max-Age=0`
- 브라우저 LocalStorage에 session token 저장 금지

영구 저장소 adapter는 회전·로그아웃 갱신을 transaction으로 처리해야 한다.

### Entitlement

`ServerEntitlement`가 `FREE`, `TRIAL`, `PREMIUM`의 단일 진실이다.

- `trialConsumedAt`은 한 번 Trial을 시작한 계정에서 영구 유지
- 만료된 Trial은 `FREE`로 전환하되 소비 기록은 삭제하지 않음
- `PREMIUM`은 추후 서버 Billing 검증만 갱신
- optimistic concurrency를 위해 `version` 사용
- AI 사용량은 `mealPlanCount`, `recipeCount`,
  `recommendationCount`로 분리

## 로그인과 Trial 흐름

```text
POST /api/auth/login
→ Google authorization code 서버 검증
→ googleSubject 기준 User 조회/생성
→ Device 조회/생성
→ Entitlement 조회
→ trialConsumedAt이 없을 때만 7일 Trial 원자적 시작
→ Session 저장
→ HttpOnly Secure cookie 발급
```

앱 최초 실행, 재설치, 로그아웃, LocalStorage 삭제는 Trial 시작 조건이
아니다. Google 로그인이 서버에서 성공한 시점만 시작 조건이다.

## API 목록

| Endpoint | Method | 역할 | 현재 상태 |
| --- | --- | --- | --- |
| `/api/auth/login` | GET | Google code flow 시작·callback, User/Device/Trial/Session 생성 | 환경 설정 필요 |
| `/api/auth/logout` | POST | 세션 폐기, cookie 제거 | cookie 제거 동작 제공 |
| `/api/auth/session` | GET | 세션 확인·24시간 회전·권한 반환 | anonymous 응답 제공 |
| `/api/account/sync` | GET/POST | 계정 snapshot 병합·revision 저장 | PostgreSQL |
| `/api/entitlement` | GET | 서버 권한·사용량 읽기 | PostgreSQL |

모든 응답은 `Cache-Control: no-store`이며 인증되지 않은 account·entitlement
요청은 `401 AUTH_REQUIRED`를 사용한다. 서버 adapter가 없는 상태에서는
신뢰할 수 없는 클라이언트 identity나 LocalStorage 권한을 받아들이지 않는다.

## 동기화 정책

Server 우선:

- Entitlement
- Trial 사용 여부와 기간
- Subscription
- AI 사용량

Client 우선:

- 튜토리얼 설정
- 섹션 접힘 상태
- 도움말 표시 여부
- 기타 UI 전용 상태

Inventory, Shopping, Planner 등 계정 데이터는 R1의 record timestamp,
slot timestamp, tombstone 정책으로 병합하되 실제 원격 저장은 이후
Sprint에서 연결한다.

## Billing 연결 준비

Repository와 Entitlement Engine은 Billing SDK와 분리되어 있다. 다음
Sprint의 Billing adapter는 서버에서 검증된 purchase 결과만
`ServerEntitlement`에 반영해야 한다. 클라이언트 plan 변경, purchase
token 원문 LocalStorage 저장, 미검증 Premium 승격은 허용하지 않는다.
