echo "HELLO CDK ---BEGINNING OF CONFIGURATION SCRIPT---"

sudo yum update

#sudo yum install gcc-c++ make
#
#curl -O https://nodejs.org/dist/v19.5.0/node-v19.5.0-linux-x64.tar.xz
#
#tar -xf node-v19.5.0-linux-x64.tar.xz
#
#sudo mv node-v19.5.0-linux-x64 bin/node
#
#chmod +x ~/bin/node/bin/node

curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash

. ~/.nvm/nvm.sh

#nvm install 19.5.0

nvm install 16 # Amazon Linux 2 does not currently support the current LTS release (version 18.x) of Node.js. Use Node.js version 16.x with this command instead.

node -v

#sudo yum install -y npm

nvm install-latest-npm

npm -v

echo "$1"

cd "$1" || (echo "cd failed" && exit)

npm ci

npm start
