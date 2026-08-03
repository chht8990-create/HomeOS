# 오늘식탁 Android 서명 정책

## Upload key 저장

업로드 키는 Git 저장소 밖의 다음 운영자 전용 위치에 보관합니다.

- keystore: `C:\Users\chht8\.todaytable-signing\todaytable-upload.jks`
- alias: `todaytable-upload`
- 자격 증명: `C:\Users\chht8\.todaytable-signing\todaytable-upload-credential.clixml`

자격 증명 파일은 Windows DPAPI로 현재 사용자 계정에 암호화되어 있습니다. 비밀번호는 명령줄·문서·Git에 기록하지 않습니다. keystore와 복구 가능한 비밀번호 백업은 별도 안전한 위치에도 보관해야 합니다.

## Upload key 지문 확인

```powershell
& "$env:JAVA_HOME/bin/keytool.exe" -list -v -keystore "<outside-repository>/todaytable-upload.jks" -alias todaytable-upload
```

출력의 SHA-256 지문을 `assetlinks.template.json`의 upload key 자리와 `twa-manifest.json`의 `fingerprints`에 반영합니다. keystore 비밀번호나 개인키는 반영하지 않습니다.

## Signed release AAB 빌드

저장소의 빌드 스크립트가 DPAPI 자격 증명을 현재 프로세스에서만 복호화하고, Gradle에 환경변수로 전달합니다. 빌드 종료 시 환경변수를 제거합니다.

```powershell
./android/build-release.ps1
```

결과 파일은 `android/app/build/outputs/bundle/release/app-release.aab`입니다. `bundleRelease`를 직접 실행하면 서명 환경변수가 없을 때 빌드가 중단되므로 unsigned release AAB가 실수로 생성되지 않습니다.

## Play App Signing

Google Play App Signing을 활성화하면 Play Console의 **App signing key certificate** SHA-256 지문을 Production `assetlinks.json`에 추가합니다. Upload key 지문과 App signing key 지문은 서로 다를 수 있습니다. 내부 테스트 설치본과 Play 배포본을 모두 검증하려면 필요한 두 지문을 함께 유지합니다.

## Git 보호

루트 `.gitignore`는 `android/*.jks`, `android/*.keystore`, 자격 증명 CLIXML, `keystore.properties`, APK/AAB와 build 폴더를 제외합니다. 빌드 전에는 다음 명령으로 추적 여부를 다시 확인합니다.

```powershell
git ls-files "*.jks" "*.keystore" "*credential*.clixml" "*keystore.properties" "*.apk" "*.aab"
```
