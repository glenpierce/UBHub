echo "HELLO CDK ---BEGINNING OF CONFIGURATION SCRIPT---"

pwd

sleep 60

echo "waking"

cd ~/

#sudo yum update

#echo "yum update complete"

curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash

echo "curl complete"

. ~/.nvm/nvm.sh

echo "nvm initialized"

nvm install 16 # Amazon Linux 2 does not currently support the current LTS release (version 18.x) of Node.js. Use Node.js version 16.x with this command instead.

node -v

nvm install v8.19.4

npm -v

echo "$1" # this is the zip file the contains our source code. This zip needs to be created in your repo and should not be committed

sudo yum install unzip

unzip "$1"

cd "$1"

npm ci

echo "dependencies installed"

npm start PORT=80
