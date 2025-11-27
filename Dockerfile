FROM node:18-alpine

WORKDIR /app

# Install dependencies for both projects
COPY ui/package*.json ./ui/
COPY mcp-server/package*.json ./mcp-server/

RUN cd ui && npm install
RUN cd mcp-server && npm install

# Copy source files
COPY ui ./ui
COPY mcp-server ./mcp-server

# Build UI
RUN cd ui && npm run build

# Copy UI build to mcp-server public folder
RUN mkdir -p mcp-server/public
RUN cp -r ui/dist/* mcp-server/public/

# Build mcp-server TypeScript
RUN cd mcp-server && npm install -g typescript && tsc

# Set working directory to mcp-server
WORKDIR /app/mcp-server

# Expose port
EXPOSE 3000

# Start server
CMD ["node", "dist/index.js"]
