$condaPath = "$env:USERPROFILE\miniconda3\Scripts\activate.bat"
$dbtProject = "C:\Users\AidanKeaveny\Documents\github\helioscta-backend\backend\dbt\dbt_azure_postgresql"

$action = New-ScheduledTaskAction `
    -Execute "cmd.exe" `
    -Argument "/c `"call `"$condaPath`" helioscta-backend && cd /d `"$dbtProject`" && dbt run`""

# Define the times
$times1 = @('04:00', '05:00', '18:00')

# Create a separate task for each day
$days = @('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')
foreach ($day in $days) {
    $triggers = @()
    foreach ($time in $times1) {
        $triggers += New-ScheduledTaskTrigger -Weekly -DaysOfWeek $day -At $time
    }

    Register-ScheduledTask `
        -TaskName "dbt run (Azure PostgreSQL) ($($day))" `
        -Action $action `
        -Trigger $triggers `
        -TaskPath "\helioscta-backend\dbt" `
        -Force
}