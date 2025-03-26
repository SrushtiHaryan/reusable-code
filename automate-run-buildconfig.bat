@echo off
setlocal enabledelayedexpansion

:: Get the current image path from OpenShift BuildConfig
for /f "tokens=*" %%i in ('oc get buildconfig api-src -o=jsonpath="{.spec.output.to.name}"') do set IMAGE_PATH=%%i

:: Extract the tag from the image path (assuming format like myregistry.com/myimage:1.0.X)
for /f "tokens=2 delims=:" %%a in ("%IMAGE_PATH%") do set IMAGE_TAG=%%a

:: Extract the last version number (assuming format 1.0.X)
for /f "tokens=3 delims=." %%b in ("%IMAGE_TAG%") do set LATEST_VERSION=%%b

:: Increment the version
set /a NEW_VERSION=LATEST_VERSION+1
set FULL_TAG=1.0.%NEW_VERSION%

echo Current Image: %IMAGE_PATH%
echo New Tag: %FULL_TAG%

:: Patch OpenShift DeploymentConfig to update the image tag
oc patch deployment api-deployment --type='json' -p="[{'op': 'replace', 'path': '/spec/template/spec/containers/0/image', 'value': 'myregistry.com/myimage:%FULL_TAG%'}]"

:: Start the builds
oc start-build api-src --wait
IF %ERRORLEVEL% NEQ 0 (
    echo API-SRC build failed!
    exit /b %ERRORLEVEL%
)
oc start-build api-runtime
