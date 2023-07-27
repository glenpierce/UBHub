echo "HELLO CDK ---BEGINNING OF CONFIGURATION SCRIPT---"

sudo yum install gcc-c++ make

curl -O https://nodejs.org/dist/v19.5.0/node-v19.5.0-linux-arm64.tar.gz

tar -xzf node-v19.5.0-linux-arm64.tar.gz

sudo mv node-v19.5.0-linux-arm64 /usr/local/node

sudo ln -s /usr/local/node/bin/node /usr/local/bin/node
sudo ln -s /usr/local/node/bin/npm /usr/local/bin/npm

node -v

sudo yum install -y npm

npm -v

echo "$1"

cd "$1" || (echo "cd failed" && exit)

npm ci

npm start
