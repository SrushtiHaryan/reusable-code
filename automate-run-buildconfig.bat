@REM updating variables

@REM @echo off
@REM setlocal enabledelayedexpansion

@REM :: Get the current image path from OpenShift BuildConfig
@REM for /f "tokens=*" %%i in ('oc get buildconfig api-src -o=jsonpath="{.spec.output.to.name}"') do set IMAGE_PATH=%%i

@REM :: Extract the tag from the image path (assuming format like myregistry.com/myimage:1.0.X)
@REM for /f "tokens=2 delims=:" %%a in ("%IMAGE_PATH%") do set IMAGE_TAG=%%a

@REM :: Extract the last version number (assuming format 1.0.X)
@REM for /f "tokens=3 delims=." %%b in ("%IMAGE_TAG%") do set LATEST_VERSION=%%b

@REM :: Increment the version
@REM set /a NEW_VERSION=LATEST_VERSION+1
@REM set FULL_TAG=1.0.%NEW_VERSION%

@REM echo Current Image: %IMAGE_PATH%
@REM echo New Tag: %FULL_TAG%

@REM :: Patch OpenShift DeploymentConfig to update the image tag
@REM oc patch deployment api-deployment --type='json' -p="[{'op': 'replace', 'path': '/spec/template/spec/containers/0/image', 'value': 'myregistry.com/myimage:%FULL_TAG%'}]"

@REM :: Start the builds
@REM oc start-build api-src --wait
@REM IF %ERRORLEVEL% NEQ 0 (
@REM     echo API-SRC build failed!
@REM     exit /b %ERRORLEVEL%
@REM )
@REM oc start-build api-runtime



-------------
@REM for patch syntax error

$patch = @(
    @{
        op    = "replace"
        path  = "/spec/source/dockerfile"
        value = "FROM ubuntu:20.04`nRUN apt-get update && apt-get install -y curl`nCMD [\"bash\"]"
    }
) | ConvertTo-Json -Compress

$encodedPatch = [System.Text.Encoding]::UTF8.GetString([System.Text.Encoding]::UTF8.GetBytes($patch))

oc patch bc/<your-build-config> --type='json' -p $encodedPatch
