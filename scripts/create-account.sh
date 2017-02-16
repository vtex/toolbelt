#!/usr/bin/env bash
if [ $# -ne 2 ]
  then
    echo "Usage: ./create-account.sh accountName hostname"
    exit 1
fi

curl -X PUT http://router.aws-us-east-1.vtex.io/$1 \
  -H "Content-Type: application/json" \
  -d "{\"hostName\": \"$2\", \"region\": \"aws-us-east-1\"}"
