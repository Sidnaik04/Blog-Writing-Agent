#!/usr/bin/env bash

# Use PORT from environment, default to 10000 if not set
PORT=${PORT:-10000}

# Start uvicorn server
uvicorn app.main:app --host 0.0.0.0 --port $PORT