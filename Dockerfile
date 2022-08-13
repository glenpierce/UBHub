FROM node:16

RUN apt-get update || : && apt-get install -y \
    python \
    python-pip

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY nodeServer/package*.json ./nodeServer

# Bundle app source
COPY . .

RUN chmod a+rx start.sh

RUN cd nodeServer && npm install
RUN cd pythonServer && pip install -r requirements.txt
# If you are building your code for production
# RUN npm ci --only=production

EXPOSE 3000
CMD ./start.sh