# Use official lightweight Node.js Alpine image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy application files
COPY package*.json ./
COPY server.js ./
COPY index.html ./
COPY styles.css ./
COPY AGENT.md ./
COPY .agent/ ./.agent/
COPY docs/ ./docs/
COPY src/ ./src/

# Expose default workspace port
EXPOSE 8080

# Run static zero-dependency server
CMD ["node", "server.js"]
