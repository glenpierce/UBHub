FROM node:22

RUN apt-get update || : && apt-get install -y

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
#COPY nodeServer/package*.json nodeServer/

# Bundle app source
COPY . .

RUN chmod a+rx start.sh

RUN cd nodeServer && npm install --ignore-scripts
# If you are building your code for production
# RUN npm ci --only=production

EXPOSE 3000
CMD ./start.sh