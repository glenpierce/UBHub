echo "hello cdk"

curl --silent --location https://rpm.nodesource.com/setup_19.5.0 | bash -
yum -y install nodejs

echo "$1"

cd "$1" || (echo "cd failed" && exit)

npm ci

npm start
