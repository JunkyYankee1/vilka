FROM node:20-alpine

WORKDIR /usr/src/app

# сначала только зависимости
COPY package*.json ./
RUN npm install && \
    chmod -R +x node_modules/.bin/

# затем весь код
COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]
