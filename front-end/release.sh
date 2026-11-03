#!/bin/bash

# project specific parameters
AWS_PROFILE="${AWS_PROFILE:-ga-app}"
DOMAIN_PROD='ga.esncy.org'
DOMAIN_DEV='dev.ga.esncy.org'

# other parameters
ACTION=$1
export SRC_FOLDER="src/"
C='\033[4;32m' # color
NC='\033[0m'   # reset (no color)

# disable pagination in aws cli commands
export AWS_PAGER=""

# set the script to exit in case of errors
set -o errexit

# parameters validation
if [ "${ACTION}" != "dev" ] && [ "${ACTION}" != "prod" ]
then
  echo -e "${C}Target environment: dev|prod${NC}"
  echo -e "${C}\t - dev:    release the front-end in the development environment${NC}"
  echo -e "${C}\t - prod:   release the front-end in the production environment${NC}"
  exit 1
fi

if [ "${ACTION}" == 'prod' ]
then
  DOMAIN=${DOMAIN_PROD}
else
  DOMAIN=${DOMAIN_DEV}
fi
echo -e "${C}Target domain: ${DOMAIN}${NC}"

# configure environment STAGE in environment.idea.ts
echo -e "${C}Setting STAGE to ${ACTION}...${NC}"
sed -i.bak "s/const STAGE = .*/const STAGE = '${ACTION}';/" src/environments/environment.idea.ts && rm -f src/environments/environment.idea.ts.bak

# install the npm modules if node_modules does not exist
if [ ! -d "node_modules" ]; then
  echo -e "${C}Installing npm modules...${NC}"
  npm ci
fi

# lint the code in search for errors
echo -e "${C}Linting...${NC}"
npm run lint

# compile the project's typescript code
echo -e "${C}Compiling...${NC}"
npx ng build --configuration=production

# get the target CloudFront distribution and S3 bucket (from the domain)
DISTRIBUTION=$(aws cloudfront list-distributions --query "DistributionList.Items[*].{Id: Id, Aliases: Aliases.Items[?(@ == '${DOMAIN}')]} | [?Aliases].[Id]" --profile "${AWS_PROFILE}" --output text)
BUCKET=$(aws cloudfront get-distribution --id "${DISTRIBUTION}" --profile "${AWS_PROFILE}" --output text \
 --query "Distribution.DistributionConfig.Origins.Items[0].DomainName" | cut -d "." -f 1)

# upload the project's files to the S3 bucket
echo -e "${C}Uploading to S3 bucket ${BUCKET}...${NC}"
aws s3 sync ./www "s3://${BUCKET}" --profile "${AWS_PROFILE}" --delete --exclude ".well-known/*"

# invalidate old common files from the CloudFront distribution
echo -e "${C}Invalidating CloudFront distribution ${DISTRIBUTION}...${NC}"
aws cloudfront create-invalidation --profile "${AWS_PROFILE}" --distribution-id "${DISTRIBUTION}" \
  --paths "/*" \
  1>/dev/null

echo -e "${C}Done!${NC}"