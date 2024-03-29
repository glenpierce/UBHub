echo "HELLO CDK ---BEGINNING OF CONFIGURATION SCRIPT---"

sleep 60

sudo yum update

curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash

. ~/.nvm/nvm.sh

nvm install 16 # Amazon Linux 2 does not currently support the current LTS release (version 18.x) of Node.js. Use Node.js version 16.x with this command instead.

node -v

nvm install-latest-npm

npm -v

echo "$1" # this is the zip file the contains our source code

sudo yum install unzip

unzip "$1"

npm ci

npm start
