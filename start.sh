#!/bin/bash
set -e

echo "Starting node server..."
exec npm --prefix nodeServer start
