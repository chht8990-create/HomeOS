# 오늘식탁 Google Auth Integration

## 실행 전 설정

다음 값은 Vercel Environment Variables 또는 로컬 `.env.local`에만
설정한다. 실제 값은 Git에 커밋하지 않는다.

```text
GOOGLE_OAUTH_CLIENT_ID
GOOGLE_OAUTH_CLIENT_SECRET
GOOGLE_OAUTH_REDIRECT_URI
AUTH_COOKIE_SECRET
DATABASE_URL
```

- `AUTH_COOKIE_SECRET`은 최소 32자의 임의 비밀값이어야 한다.
- `GOOGLE_OAUTH_REDIRECT_URI`는 HTTPS 절대 URL이며 Google Cloud Console에
  등록된 Authorized redirect URI와 정확히 같아야 한다.
- 현재 단일 callback endpoint는 `/api/auth/login`이다.
- PostgreSQL에는 `scripts/server-schema.sql`을 먼저 적용한다.

## OAuth 흐름

```text
GET /api/auth/login?returnTo=/settings
→ state, nonce, PKCE verifier 생성
→ OAuth transaction을 AES-GCM으로 암호화해 HttpOnly cookie 저장
→ Google Authorization endpoint로 302
→ GET /api/auth/login?code=...&state=...
→ transaction 만료·state·issuer·redirect URI 검증
→ code + PKCE verifier를 Google token endpoint에서 교환
→ Google JWK로 ID Token 서명 검증
→ iss, aud/azp, exp, iat, nonce, email_verified 검증
→ sub 기준 User 연결
→ Device·Entitlement·Session 저장
→ 앱 내부 returnTo로 302
```

OAuth transaction cookie는 10분 뒤 만료되고 callback 성공·실패 시
삭제한다. `returnTo`는 `/`로 시작하는 앱 내부 경로만 허용한다.

## ID Token

Google ID Token과 access token은 LocalStorage·SessionStorage·DB에 저장하지
않는다. code 교환 직후 ID Token을 검증하고 다음 정보만 User에 반영한다.

- `sub`: 불변 계정 식별자
- 검증된 email과 표시 이름
- 선택 profile image URL

email은 조회·표시 정보일 뿐 User 연결 키가 아니다.

## Session과 Trial

- browser: `__Host-today_table_session` opaque cookie
- server: SHA-256 token hash만 저장
- cookie: HttpOnly, Secure, SameSite=Lax, Path=/
- session expiration: 30일
- rotation: 마지막 회전 후 24시간
- logout: DB session revoke 후 cookie 만료

첫 Google 로그인 transaction에서 User의 Entitlement가 없고
`trialConsumedAt`도 없을 때만 7일 Trial을 저장한다. Entitlement write는
version 조건을 사용하므로 DB adapter가 중복 발급 경쟁을 거부한다.

## Account Sync

로그인 세션 복원 뒤 다음 순서로 동기화한다.

1. 계정 범위 LocalStorage만 snapshot으로 캡처
2. entitlement·trial과 UI 전용 key 제외
3. 서버 snapshot과 record/slot `updatedAt` 기준 병합
4. key 삭제는 tombstone으로 전달
5. optimistic revision으로 저장
6. 최종 snapshot을 LocalStorage에 적용

튜토리얼, 접힘 상태, 도움말은 기기 우선으로 유지한다. 네트워크가 없거나
동기화가 실패하면 앱은 기존 LocalStorage를 그대로 사용하며 온라인 복귀
시 세션과 동기화를 다시 시도한다.

## 현재 외부 검증 상태

자동 테스트는 OAuth transaction, PKCE, JWK 서명, claim 검증, Trial 중복
방지, Session cookie, snapshot 병합을 mock으로 검증한다. 실제 Google
로그인과 PostgreSQL round-trip은 위 환경변수와 DB가 현재 작업환경에 없어
수행하지 않는다. 이 설정 없이 endpoint는 `503 AUTH_NOT_CONFIGURED`로
안전하게 닫힌다.
