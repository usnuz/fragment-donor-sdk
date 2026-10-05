#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
unformatted=$(gofmt -l client.go client_test.go smoke/main.go scripts/verify.go)
if [ -n "$unformatted" ]; then
  printf '%s\n' "gofmt required:" "$unformatted" >&2
  exit 1
fi
go test ./...
go vet ./...
go build ./...
go run ./scripts
