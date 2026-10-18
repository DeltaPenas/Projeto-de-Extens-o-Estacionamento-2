$ErrorActionPreference = 'Stop'
Push-Location $PSScriptRoot
try {
    $nodeCommand = Get-Command node.exe -ErrorAction SilentlyContinue
    if ($nodeCommand) {
        $nodePath = $nodeCommand.Source
    } else {
        $portableNode = Get-ChildItem -LiteralPath (Join-Path $PSScriptRoot '.tools') -Directory -Filter 'node-*-win-x64' -ErrorAction SilentlyContinue |
            Sort-Object LastWriteTime -Descending | Select-Object -First 1
        if (-not $portableNode) { throw 'Instale Node.js 22.12 ou superior e execute npm ci e npm start na pasta Front.' }
        $nodePath = Join-Path $portableNode.FullName 'node.exe'
    }
    $nodeDir = Split-Path -Parent $nodePath
    $env:PATH = "$nodeDir;$env:PATH"
    $npmCli = Join-Path $nodeDir 'node_modules\npm\bin\npm-cli.js'
    if (-not (Test-Path -LiteralPath $npmCli)) { throw 'npm não encontrado junto ao Node.js. Execute npm start em um terminal com Node e npm configurados.' }
    $env:NG_CLI_ANALYTICS = 'false'
    if (-not (Test-Path -LiteralPath 'node_modules\@angular\build\package.json')) {
        & $nodePath $npmCli ci --no-audit --no-fund
        if ($LASTEXITCODE -ne 0) { throw 'Não foi possível instalar as dependências do frontend.' }
    }
    & $nodePath $npmCli start
    exit $LASTEXITCODE
} finally {
    Pop-Location
}
