#!/bin/sh
if [ -z "${AWS_LAMBDA_RUNTIME_API}" ]; then
  echo "Running in local environment"
  exec /usr/local/bin/python -m uvicorn "main:app" --host 0.0.0.0 --port ${PORT:-8000}
else
  echo "Running in AWS Lambda environment"
  exec /usr/local/bin/python -m awslambdaric "main.handler"
fi
