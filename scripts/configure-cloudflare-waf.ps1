[CmdletBinding()]
param(
    [string]$ZoneName = "dunes-insolites.com",
    [string]$TokenFile = (Join-Path $PSScriptRoot "..\.env.cloudflare.local")
)

$ErrorActionPreference = "Stop"
$ApiBase = "https://api.cloudflare.com/client/v4"

if (-not (Test-Path -LiteralPath $TokenFile)) {
    throw "Cloudflare token file not found: $TokenFile"
}

$tokenLine = Get-Content -LiteralPath $TokenFile -Raw
$token = ($tokenLine -replace '^\s*CLOUDFLARE_API_TOKEN\s*=\s*', '').Trim()
if ([string]::IsNullOrWhiteSpace($token)) {
    throw "CLOUDFLARE_API_TOKEN is empty"
}

$headers = @{
    Authorization  = "Bearer $token"
    "Content-Type" = "application/json"
}

function Invoke-CloudflareApi {
    param(
        [Parameter(Mandatory)][ValidateSet("GET", "POST", "PATCH")][string]$Method,
        [Parameter(Mandatory)][string]$Path,
        [object]$Body
    )

    $request = @{
        Method  = $Method
        Uri     = "$ApiBase$Path"
        Headers = $headers
    }
    if ($null -ne $Body) {
        $request.Body = $Body | ConvertTo-Json -Depth 20 -Compress
    }

    $response = Invoke-RestMethod @request
    if (-not $response.success) {
        throw "Cloudflare API request failed: $Method $Path"
    }
    return $response.result
}

function Get-PhaseEntryPoint {
    param(
        [Parameter(Mandatory)][string]$ZoneId,
        [Parameter(Mandatory)][string]$Phase
    )

    try {
        return Invoke-CloudflareApi -Method GET -Path "/zones/$ZoneId/rulesets/phases/$Phase/entrypoint"
    }
    catch {
        if ($_.Exception.Response.StatusCode.value__ -eq 404) {
            return $null
        }
        throw
    }
}

function Set-PhaseRule {
    param(
        [Parameter(Mandatory)][string]$ZoneId,
        [Parameter(Mandatory)][string]$Phase,
        [Parameter(Mandatory)][string]$RulesetName,
        [Parameter(Mandatory)][hashtable]$Rule
    )

    $entryPoint = Get-PhaseEntryPoint -ZoneId $ZoneId -Phase $Phase
    if ($null -eq $entryPoint) {
        $body = @{
            name        = $RulesetName
            description = "Managed by scripts/configure-cloudflare-waf.ps1"
            kind        = "zone"
            phase       = $Phase
            rules       = @($Rule)
        }
        $created = Invoke-CloudflareApi -Method POST -Path "/zones/$ZoneId/rulesets" -Body $body
        return $created
    }

    $existing = $entryPoint.rules | Where-Object { $_.ref -eq $Rule.ref } | Select-Object -First 1
    if ($null -eq $existing) {
        return Invoke-CloudflareApi -Method POST -Path "/zones/$ZoneId/rulesets/$($entryPoint.id)/rules" -Body $Rule
    }

    return Invoke-CloudflareApi -Method PATCH -Path "/zones/$ZoneId/rulesets/$($entryPoint.id)/rules/$($existing.id)" -Body $Rule
}

$verification = Invoke-CloudflareApi -Method GET -Path "/user/tokens/verify"
if ($verification.status -ne "active") {
    throw "Cloudflare API token is not active"
}

$zones = @(Invoke-CloudflareApi -Method GET -Path "/zones?name=$ZoneName&status=active")
if ($zones.Count -ne 1) {
    throw "Expected exactly one active zone named $ZoneName; found $($zones.Count)"
}
$zoneId = $zones[0].id

# The origin presents a publicly trusted certificate for both apex and www.
Invoke-CloudflareApi -Method PATCH -Path "/zones/$zoneId/settings/ssl" -Body @{ value = "strict" } | Out-Null
Invoke-CloudflareApi -Method PATCH -Path "/zones/$zoneId/settings/min_tls_version" -Body @{ value = "1.2" } | Out-Null

$sensitivePathsRule = @{
    ref         = "dunes_block_sensitive_paths"
    description = "Dunes - block sensitive files and common admin probes"
    expression  = '(starts_with(http.request.uri.path, "/.env") or starts_with(http.request.uri.path, "/.git") or starts_with(http.request.uri.path, "/actuator") or starts_with(http.request.uri.path, "/server-status") or starts_with(http.request.uri.path, "/phpmyadmin") or starts_with(http.request.uri.path, "/wp-admin"))'
    action      = "block"
    enabled     = $true
}
Set-PhaseRule -ZoneId $zoneId -Phase "http_request_firewall_custom" -RulesetName "Dunes Insolites custom WAF" -Rule $sensitivePathsRule | Out-Null

# Free plan: one rate limiting rule, path-only expression, 10-second period and
# 10-second mitigation. The origin application remains the slower second layer.
$rateLimitRule = @{
    ref         = "dunes_rate_limit_sensitive_api"
    description = "Dunes - rate limit authentication and public write endpoints"
    expression  = '(http.request.uri.path in {"/api/auth/login" "/api/auth/login/" "/api/auth/register" "/api/auth/register/" "/api/contact" "/api/contact/" "/api/subscribe" "/api/subscribe/" "/api/stay-bookings" "/api/stay-bookings/" "/api/tour-bookings" "/api/tour-bookings/" "/api/bookings" "/api/bookings/"})'
    action      = "block"
    enabled     = $true
    ratelimit   = @{
        characteristics    = @("cf.colo.id", "ip.src")
        period              = 10
        requests_per_period = 10
        mitigation_timeout  = 10
    }
}
Set-PhaseRule -ZoneId $zoneId -Phase "http_ratelimit" -RulesetName "Dunes Insolites rate limiting" -Rule $rateLimitRule | Out-Null

Write-Output "Cloudflare baseline applied to $ZoneName"
