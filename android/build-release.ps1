param(
    [string]$SigningDirectory = (
        Join-Path `
            ([Environment]::GetFolderPath('UserProfile')) `
            '.todaytable-signing'
    )
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$keystorePath = Join-Path $SigningDirectory 'todaytable-upload.jks'
$credentialPath = Join-Path `
    $SigningDirectory `
    'todaytable-upload-credential.clixml'

if (-not (Test-Path -LiteralPath $keystorePath -PathType Leaf)) {
    throw "Upload keystore was not found at the configured signing directory."
}

if (-not (Test-Path -LiteralPath $credentialPath -PathType Leaf)) {
    throw "DPAPI-protected signing credential was not found."
}

$credential = Import-Clixml -LiteralPath $credentialPath
if ($credential.UserName -ne 'todaytable-upload') {
    throw 'Unexpected upload key alias in the signing credential.'
}

$password = $credential.GetNetworkCredential().Password
if ([string]::IsNullOrWhiteSpace($password)) {
    throw 'The upload key credential could not be decrypted.'
}

$env:TODAYTABLE_UPLOAD_KEYSTORE = $keystorePath
$env:TODAYTABLE_UPLOAD_PASSWORD = $password

Push-Location $PSScriptRoot
try {
    & .\gradlew.bat --no-daemon bundleRelease
    if ($LASTEXITCODE -ne 0) {
        throw "Android release bundle failed with exit code $LASTEXITCODE."
    }
}
finally {
    Pop-Location
    Remove-Item Env:TODAYTABLE_UPLOAD_KEYSTORE -ErrorAction SilentlyContinue
    Remove-Item Env:TODAYTABLE_UPLOAD_PASSWORD -ErrorAction SilentlyContinue
    $password = $null
    $credential = $null
}
