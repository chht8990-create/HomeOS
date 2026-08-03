# 오늘식탁 AI Access Engine

## 범위

AI Access Engine은 `FREE`, `TRIAL`, `PREMIUM` 상태와 AI 생성 사용량을
표현한다. 기존 AI 화면과 호출 흐름에는 아직 연결하지 않는다. Google Play
Billing, 결제, 구매 검증도 이 엔진에 포함하지 않는다.

Sprint R3부터 권한·Trial·Subscription의 단일 진실은 서버
`ServerEntitlement`이다. LocalStorage 값은 오프라인 표시와 이전 버전
마이그레이션을 위한 캐시일 뿐 권한 상승의 근거로 사용하지 않는다.

## 로컬 캐시

Key: `today-table.ai-access.v1`

```json
{
  "formatVersion": "1.1",
  "trialStart": null,
  "trialEnd": null,
  "plan": "FREE",
  "mealPlanCount": 0,
  "recipeCount": 0,
  "recommendationCount": 0,
  "lastGenerationAt": null
}
```

- 로그인하지 않은 신규 기기는 `FREE`로 초기화한다.
- 앱 실행만으로 Trial을 시작하지 않는다.
- 기존 `1.0`의 `aiGenerationCount`는 `mealPlanCount`로 보존하여
  `1.1`로 마이그레이션한다.
- 기존 `today-table.aiMealPlanTrial.v1` 데이터는 읽거나 삭제하지 않는다.
- 서버 동기화 시 이 key는 `server-authoritative` 정책을 사용한다.

## Trial 정책

Trial은 서버가 검증한 Google 로그인 직후 해당 Google `sub`에 연결된
내부 User 기준으로 한 번만 시작한다. 서버 Entitlement의
`trialConsumedAt`은 만료 후에도 유지하여 로그아웃, 재설치, 다른 기기,
LocalStorage 초기화로 Trial이 다시 시작되지 않게 한다.

로그인 API와 서버 저장소가 연결되기 전에는 실제 Trial을 발급하지 않는다.

## 사용량

AI 사용량은 기능별로 분리한다.

- `mealPlanCount`
- `recipeCount`
- `recommendationCount`
- `lastGenerationAt`

서버에서는 성공한 생성만 `recordServerAiGeneration`으로 기록한다. 현재 AI
호출부와 연결하지 않았으므로 기존 기능 동작은 바뀌지 않는다.

## Billing 연결 경계

Google Play Billing 연결 시 클라이언트 구매 결과를 직접 신뢰하지 않는다.
서버 구매 검증 adapter가 `ServerEntitlement`의 `plan`, `source`,
`premiumExpiresAt`을 갱신하고 `/api/entitlement`가 클라이언트에 읽기 전용
상태를 제공한다.
