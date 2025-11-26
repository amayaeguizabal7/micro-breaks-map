FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Build TypeScript
RUN npm install -g typescript
RUN tsc

# Expose port
EXPOSE 3000

# Start server
CMD ["node", "dist/index.js"]
