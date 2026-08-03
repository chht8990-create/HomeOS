# 오늘식탁 Android TWA

이 프로젝트는 `@bubblewrap/cli` 1.25.0으로 생성한 오늘식탁의 Trusted Web Activity 셸입니다.

## 확정 설정

- Production origin: `https://home-os-one.vercel.app`
- Web Manifest: `https://home-os-one.vercel.app/manifest.webmanifest`
- applicationId: `com.todaytable.app`
- versionName: `1.0.0`
- versionCode: `1`
- display: `standalone`
- minSdk: `23`
- targetSdk: `36`
- Play Billing delegate: 활성화

Play Billing delegate가 사용하는 `com.google.androidbrowserhelper:billing:1.2.0`의 최소 SDK가 23이므로 TWA의 `minSdkVersion`도 23으로 맞춥니다.

## 프로젝트 갱신

Bubblewrap가 사용하는 JDK와 Android SDK 경로를 로컬 설정에 지정한 뒤 다음 명령을 실행합니다.

```powershell
npx.cmd --yes @bubblewrap/cli update --skipVersionUpgrade --manifest="android/twa-manifest.json"
```

Bubblewrap 갱신은 생성 파일을 덮어쓸 수 있으므로 직접 수정은 `twa-manifest.json`에 먼저 반영합니다.

## Debug APK

```powershell
cd android
./gradlew.bat --no-daemon assembleDebug
```

결과 파일은 `android/app/build/outputs/apk/debug/app-debug.apk`입니다. Debug 인증서는 Play 업로드 키나 Play App Signing 키가 아니며 최종 `assetlinks.json`에 사용하지 않습니다.

## Release AAB

Release upload key를 저장소 밖에 만든 뒤 [SIGNING.md](./SIGNING.md)의 절차를 수행합니다. 서명키가 준비되기 전에는 Play에 업로드할 수 없는 임시 AAB를 만들지 않습니다.

```powershell
./android/build-release.ps1
```

## Digital Asset Links

`assetlinks.template.json`은 배포 전 템플릿입니다. upload key와 Play App Signing key의 SHA-256 지문을 모두 실제 값으로 교체한 뒤에만 Production origin의 `/.well-known/assetlinks.json`에 공개합니다.
