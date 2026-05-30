#!/bin/zsh
export PATH="$HOME/.local/bin:$HOME/.local/node/bin:$PATH"
cd "$(dirname "$0")/.."
exec npm run dev
