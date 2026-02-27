#!/bin/sh
set -e

echo "Waiting for LocalStack S3..."
for i in $(seq 1 30); do
  if aws --endpoint-url=http://localstack:4566 s3 ls >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

echo "Creating buckets..."
aws --endpoint-url=http://localstack:4566 s3 mb s3://application-tracker-resumes || true
aws --endpoint-url=http://localstack:4566 s3 mb s3://application-tracker-transcripts || true
aws --endpoint-url=http://localstack:4566 s3 mb s3://application-tracker-files || true

echo "LocalStack S3 ready."
