param([ValidateRange(5,120)][int]$Seconds = 30)
$ErrorActionPreference = 'Stop'
function Get-LifeOSUsage {
    $instances = @(Get-CimInstance Win32_Process -Filter "Name='lifeos.exe' OR Name='msedgewebview2.exe'")
    $roots = @($instances | Where-Object { $_.Name -eq 'lifeos.exe' })
    if ($roots.Count -ne 1) { throw 'Open exactly one installed LifeOS process before measuring.' }
    $selected = [System.Collections.Generic.HashSet[uint32]]::new()
    [void]$selected.Add([uint32]$roots[0].ProcessId)
    do {
        $added = $false
        foreach ($instance in $instances) {
            if ($selected.Contains([uint32]$instance.ParentProcessId) -and $selected.Add([uint32]$instance.ProcessId)) { $added = $true }
        }
    } while ($added)
    @($instances | Where-Object { $selected.Contains([uint32]$_.ProcessId) } | ForEach-Object {
        $process = Get-Process -Id $_.ProcessId -ErrorAction SilentlyContinue
        if ($process) { [pscustomobject]@{
            Pid = $process.Id
            Name = $process.ProcessName
            WorkingMiB = [math]::Round($process.WorkingSet64 / 1MB, 2)
            PrivateMiB = [math]::Round($process.PrivateMemorySize64 / 1MB, 2)
            CPUSeconds = $process.CPU
        } }
    })
}
$before = @(Get-LifeOSUsage)
$watch = [Diagnostics.Stopwatch]::StartNew()
Start-Sleep -Seconds $Seconds
$after = @(Get-LifeOSUsage)
$watch.Stop()
$cpuDelta = 0.0
foreach ($process in $after) {
    $previous = $before | Where-Object Pid -eq $process.Pid
    if ($previous) { $cpuDelta += [math]::Max(0, $process.CPUSeconds - $previous.CPUSeconds) }
}
[ordered]@{
    measuredAt = [DateTimeOffset]::Now.ToString('o')
    intervalSeconds = [math]::Round($watch.Elapsed.TotalSeconds, 2)
    processCount = $after.Count
    totalWorkingMiB = [math]::Round(($after | Measure-Object WorkingMiB -Sum).Sum, 2)
    totalPrivateMiB = [math]::Round(($after | Measure-Object PrivateMiB -Sum).Sum, 2)
    cpuOneCorePercent = [math]::Round(100 * $cpuDelta / $watch.Elapsed.TotalSeconds, 3)
    processesChanged = [bool]((Compare-Object ($before.Pid | Sort-Object) ($after.Pid | Sort-Object)))
    processes = $after
} | ConvertTo-Json -Depth 4
