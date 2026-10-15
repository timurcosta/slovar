#!/usr/bin/env bash
# Тесты API против настоящей YDB в облаке (во временной таблице, она удаляется в конце).
# Токен берётся из вашего входа в yc на лету и нигде не сохраняется.
set -euo pipefail
export PATH="$HOME/yandex-cloud/bin:$PATH"
YDB_CONNECTION_STRING="$(yc ydb database get repetitor --format json | node -e 'process.stdout.write(JSON.parse(require("fs").readFileSync(0)).endpoint)')"
YDB_ACCESS_TOKEN="$(yc iam create-token)"
export YDB_CONNECTION_STRING YDB_ACCESS_TOKEN
cd "$(dirname "$0")/../../apps/api"
npx vitest run "$@"
