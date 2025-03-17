@echo off
setlocal enabledelayedexpansion

set /A TOTAL_TESTS=0
set /A FAILED_TESTS=0

for %%F in (target\surefire-reports\TEST-*.xml) do (
    for /F "tokens=2 delims==<> " %%A in ('findstr /C:"tests=" %%F') do set /A TOTAL_TESTS+=%%A
    for /F "tokens=2 delims==<> " %%A in ('findstr /C:"failures=" %%F') do set /A FAILED_TESTS+=%%A
)

if %TOTAL_TESTS%==0 (
    set PASS_PERCENTAGE=100
) else (
    set /A PASS_PERCENTAGE=(TOTAL_TESTS - FAILED_TESTS) * 100 / TOTAL_TESTS
)

echo Total Tests: %TOTAL_TESTS%
echo Failed Tests: %FAILED_TESTS%
echo Pass Percentage: %PASS_PERCENTAGE%%

if %PASS_PERCENTAGE% LSS 75 (
    echo Build failed! Test pass percentage is below 75%.
    exit /b 1
) else (
    echo Build passed! Test pass percentage is %PASS_PERCENTAGE%%.
)







-------


@echo off
setlocal enabledelayedexpansion

set "totalTests=0"
set "failures=0"
set "errors=0"

:: Loop through all Surefire reports to extract test summary
for /f "tokens=3,5,7 delims=:," %%A in ('findstr /C:"Tests run:" target\surefire-reports\*.txt') do (
    set /A totalTests+=%%A
    set /A failures+=%%B
    set /A errors+=%%C
)

:: Calculate pass percentage
set /A passedTests=totalTests-failures-errors
set /A passPercentage=(passedTests*100)/totalTests

echo ========================================
echo Total Tests: %totalTests%
echo Passed: %passedTests%
echo Failures: %failures%
echo Errors: %errors%
echo Pass Percentage: %passPercentage%% 
echo ========================================

:: Check if pass rate is below 75%
if %passPercentage% LSS 75 (
    echo ❌ Build failed! Test pass percentage is below 75%.
    exit /b 1
) else (
    echo ✅ Build passed!
    exit /b 0
)
