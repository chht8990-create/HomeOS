# 오늘식탁 Google Play 구독 설정

이 문서는 오늘식탁 PWA를 Google Play의 Trusted Web Activity(TWA)로 배포하고, Google Play 구독을 서버에서 검증하기 위한 운영 절차입니다.

## 운영 연락처

- 공식 운영 이메일: [todaytable.help@gmail.com](mailto:todaytable.help@gmail.com)
- 개인정보, 계정 삭제, 서비스 이용과 Google Play 관련 문의에 동일한 운영 이메일을 사용합니다.

## 현재 준비 상태

- 웹 클라이언트는 TWA의 Digital Goods API와 Payment Request API를 우선 사용합니다.
- 별도 Android 셸을 사용하는 경우 `window.TodayTablePlayBilling` 어댑터로 BillingClient를 연결할 수 있습니다.
- 구매 토큰은 `/api/billing/verify` 또는 `/api/billing/restore`에서만 Google Android Publisher API로 검증합니다.
- 구매 토큰 원문은 데이터베이스에 저장하지 않고 SHA-256 해시만 저장합니다.
- 2026-08-01 현재 Play Console 계정 생성 전 2단계 인증 단계가 남아 있어 실제 상품과 테스트 구매는 아직 만들지 않았습니다.

## 1. Play Console 및 TWA 준비

1. 운영자 Google 계정의 2단계 인증을 직접 활성화합니다.
2. Play Console 개발자 계정과 결제 프로필을 완료합니다.
3. 오늘식탁 앱의 Android package name은 `com.todaytable.app`을 사용합니다.
4. Bubblewrap으로 현재 Production URL을 감싸는 TWA 앱을 만듭니다.
5. Production origin의 `/.well-known/assetlinks.json`에 릴리스 서명 인증서 지문을 등록합니다.
6. Play App Signing을 사용하는 경우 Play Console에 표시되는 App signing key 지문을 Digital Asset Links에 사용합니다.
7. 내부 테스트 트랙에 AAB를 업로드하고 라이선스 테스터를 등록합니다.

공식 참고 문서:

- https://developer.chrome.com/docs/android/trusted-web-activity/receive-payments-play-billing
- https://developer.android.com/google/play/billing/
- https://developer.android.com/google/play/billing/backend
- https://developer.android.com/google/play/billing/security

## 2. 구독 상품

1. Play Console에서 구독 상품과 base plan을 생성합니다.
2. 활성 product ID를 서버 환경변수와 클라이언트 공개 환경변수에 동일하게 등록합니다.
3. 서버 로그인 Trial과 Google Play 무료 체험이 중복되지 않도록, 최초 출시에서는 Play 무료 체험을 별도로 켜지 않는 것을 권장합니다.
4. 월간·연간 등 둘 이상의 base plan을 제공하면 Android BillingClient 어댑터가 offer token과 `ReplacementMode`를 전달해야 합니다.

## 3. 서비스 계정

1. Google Cloud에서 Android Publisher API를 활성화합니다.
2. 전용 서비스 계정을 만들고 JSON 키를 발급합니다.
3. Play Console의 사용자 및 권한에서 해당 서비스 계정에 오늘식탁 앱의 구독 조회·관리와 주문 관리에 필요한 최소 권한만 부여합니다.
4. 키 파일 자체는 저장소에 넣지 않습니다. Vercel 환경변수에 이메일과 private key 값만 분리해 저장합니다.
5. 키가 노출되면 즉시 폐기하고 교체합니다.

## 4. 환경변수

Vercel Preview와 Production을 구분해 아래 값을 등록합니다.

### 서버 전용

```text
GOOGLE_PLAY_PACKAGE_NAME=com.todaytable.app
GOOGLE_PLAY_PREMIUM_PRODUCT_IDS=<허용할 product ID를 쉼표로 구분>
GOOGLE_PLAY_SERVICE_ACCOUNT_EMAIL=<서비스 계정 이메일>
GOOGLE_PLAY_SERVICE_ACCOUNT_PRIVATE_KEY=<PKCS#8 private key, 줄바꿈은 \\n>
DATABASE_URL=<Neon 연결 문자열>
ADMIN_USER_IDS=<운영자 내부 user id>
```

서버 전용 값에는 `VITE_` 접두사를 붙이지 않습니다.

### 클라이언트 공개값

```text
VITE_GOOGLE_PLAY_PREMIUM_PRODUCT_ID=<기본 Premium product ID>
```

Product ID는 Play 앱에서 공개되는 식별자입니다. 서비스 계정 이메일, private key, 구매 토큰은 클라이언트 변수에 넣지 않습니다.

## 5. BillingClient 어댑터 계약

TWA는 기본적으로 Digital Goods API와 Payment Request API를 사용합니다. 별도 Android 셸을 추가할 때만 `window.TodayTablePlayBilling`을 주입합니다.

필수/선택 메서드:

```text
version = 2
purchaseSubscription({ productId, offerToken? })
queryPurchases()
restoreSubscriptions()
changeSubscription({ productId, oldPurchaseToken, replacementMode, offerToken? })
queryProductDetails(productIds)
```

Android 구현에서는 BillingClient의 `queryProductDetailsAsync`, `launchBillingFlow`, `queryPurchasesAsync`를 사용하고 구매 성공 직후 원본 구매 토큰을 오늘식탁 서버로 보냅니다. 서버 검증과 acknowledgement가 끝나기 전에는 Premium UI를 확정하지 않습니다.

구독 변경은 네이티브 어댑터에서 기존 purchase token과 Google Play `ReplacementMode`를 사용합니다. TWA 웹 결제 경로에서 교체 모드가 제공되지 않는 환경은 변경 버튼을 노출하지 않고 기존 구독 관리 화면을 사용합니다.

## 6. 서버 검증 흐름

```text
BillingClient 또는 TWA 결제
→ 구매 토큰을 same-origin API로 전달
→ 로그인 세션 확인
→ Android Publisher subscriptionsv2 조회
→ package/product/state/expiry 검증
→ 미승인 활성 구매 acknowledge
→ 토큰 해시의 계정 소유권 확인
→ 사용자 전체 구매 상태 reconcile
→ Entitlement 및 Account Sync 갱신
```

- `ACTIVE`, `GRACE_PERIOD`, 만료 전 `CANCELED`: Premium 유지
- `EXPIRED`, `ON_HOLD`, `PAUSED`, `PENDING`: Premium 미부여
- 동일 토큰을 다른 오늘식탁 계정에 연결: HTTP 409
- Google Play Premium 만료 시간이 지난 경우 세션/권한 조회 시 FREE로 전환

## 7. 내부 테스트 절차

1. 내부 테스트 트랙 설치 링크로 실제 Android 기기에 설치합니다.
2. 테스트 Google 계정으로 오늘식탁에 로그인합니다.
3. 구매 화면에서 테스트 결제수단으로 구독합니다.
4. `/api/billing/verify`가 200이고 `granted=true`, `acknowledged=true`인지 확인합니다.
5. 앱을 완전히 종료한 뒤 재실행하고 Premium이 유지되는지 확인합니다.
6. 앱 데이터 삭제 또는 다른 기기에서 로그인한 뒤 `구매 복원`을 실행합니다.
7. 동일 구매를 다른 오늘식탁 계정에 연결하면 거부되는지 확인합니다.
8. Play 테스트 도구로 취소, 유예, 계정 보류, 일시정지, 만료, 대기 상태를 각각 확인합니다.
9. 관리자 화면의 Active/Expired/Pending 집계와 사용자 Entitlement를 대조합니다.
10. 월간·연간 상품이 모두 있을 때 업그레이드·다운그레이드와 교체 시점을 확인합니다.

## 8. 출시 전 남은 운영 작업

- Play Console 계정/결제 프로필 완료
- package name `com.todaytable.app` 확인 및 release upload key 생성
- TWA AAB 생성과 Digital Asset Links 검증
- 구독 상품/base plan 활성화
- 서비스 계정 권한 및 Vercel 환경변수 설정
- Real-time Developer Notifications(RTDN) 또는 정기 재검증 작업 추가
- 내부 테스트 구매·복원·상태 전이·다른 계정 시나리오 통과

RTDN이 연결되기 전에는 앱이 구매 토큰을 다시 제시하거나 저장된 Premium 만료 시각에 도달할 때 상태가 갱신됩니다. Play Console 상태 변경을 즉시 서버에 반영하려면 RTDN이 필요합니다.
