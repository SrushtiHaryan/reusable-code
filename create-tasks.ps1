param (
    [Parameter(Mandatory = $true)]
    [string]$ClientName
)

# Task script path (generic script that accepts $ClientName as argument)
$ScriptPath = "C:\Scripts\RunForClient.ps1"

# Define locations
$BasePaths = @(
    "\Autodoc_Stream3\PDF_INGESTION\DAILIES\",
    "\Autodoc_Stream3\ZIP_STREAMING\DAILIES\"
)

# Loop through both locations and create tasks
foreach ($Path in $BasePaths) {
    # Task name includes client
    $TaskName = "${ClientName}_Task"

    # Create trigger: daily, repeats every 10 mins for 1 day
    $Trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).Date `
               -RepetitionInterval (New-TimeSpan -Minutes 10) `
               -RepetitionDuration (New-TimeSpan -Days 1)

    # Action: Run powershell with script path and client argument
    $Action = New-ScheduledTaskAction -Execute "powershell.exe" `
              -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$ScriptPath`" -ClientName `"$ClientName`""

    # Register the task
    Register-ScheduledTask -TaskName $TaskName `
        -TaskPath $Path `
        -Trigger $Trigger `
        -Action $Action `
        -Description "Auto-generated task for client $ClientName under $Path" `
        -User "SYSTEM" -RunLevel Highest -Force
}

Write-Host "Scheduled tasks created for client: $ClientName"

command to run:  .\create-tasks.ps1 -ClientName "AcmeCorp" 

sample internal script: 

param (
    [string]$ClientName
)

# Log the execution to a file
$logFile = "C:\Scripts\Logs\$ClientName-TaskLog.txt"
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
Add-Content -Path $logFile -Value "[$timestamp] Task executed for client: $ClientName"
if (-not (Test-Path "C:\Scripts\Logs")) {
    New-Item -ItemType Directory -Path "C:\Scripts\Logs" | Out-Null
}


