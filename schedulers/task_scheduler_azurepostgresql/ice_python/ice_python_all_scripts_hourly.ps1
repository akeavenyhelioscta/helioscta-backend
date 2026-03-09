$condaPath = "$env:USERPROFILE\miniconda3\Scripts\activate.bat"
$runScript1 = "C:\Users\AidanKeaveny\Documents\github\helioscta-backend\backend\src\ice_python\next_day_gas\runs.py"
$runScript2 = "C:\Users\AidanKeaveny\Documents\github\helioscta-backend\backend\src\ice_python\balmo\runs.py"
$runScript3 = "C:\Users\AidanKeaveny\Documents\github\helioscta-backend\backend\src\ice_python\future_contracts\runs.py"

$action1 = New-ScheduledTaskAction `
    -Execute "cmd.exe" `
    -Argument "/c `"call `"$condaPath`" helioscta-backend && python `"$runScript1`" all`""

$action2 = New-ScheduledTaskAction `
    -Execute "cmd.exe" `
    -Argument "/c `"call `"$condaPath`" helioscta-backend && python `"$runScript2`" all`""

$action3 = New-ScheduledTaskAction `
    -Execute "cmd.exe" `
    -Argument "/c `"call `"$condaPath`" helioscta-backend && python `"$runScript3`" all`""

# Run every hour, 24/7
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).Date -RepetitionInterval (New-TimeSpan -Hours 1)

Register-ScheduledTask `
    -TaskName "ICE Python All Scripts Hourly" `
    -Action $action1, $action2, $action3 `
    -Trigger $trigger `
    -TaskPath "\helioscta-backend\ICE Python\" `
    -Force
