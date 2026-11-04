$ErrorActionPreference = 'Stop'
if (-not $env:PGPASSWORD) {
    $env:PGPASSWORD = if ($env:DB_PASSWORD) { $env:DB_PASSWORD } else { 'postgres' }
    $clearPassword = $true
}
try {
    $dbUser = if ($env:DB_USERNAME) { $env:DB_USERNAME } else { 'postgres' }
    $dbHost = if ($env:PGHOST) { $env:PGHOST } else { 'localhost' }
    $exists = & psql -X -h $dbHost -U $dbUser -d postgres -w -tAc "SELECT 1 FROM pg_database WHERE datname='publication_system'"
    if ($LASTEXITCODE -ne 0) { throw 'Cannot connect to PostgreSQL.' }
    if ($exists -ne '1') {
        & createdb -h $dbHost -U $dbUser -w publication_system
        if ($LASTEXITCODE -ne 0) { throw 'Cannot create database.' }
    }
    Write-Host 'Database publication_system is ready.'
} finally {
    if ($clearPassword) { Remove-Item Env:PGPASSWORD }
}
