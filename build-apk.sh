#!/bin/bash
cd "$(dirname "$0")"
npx eas-cli build --platform android --profile preview
