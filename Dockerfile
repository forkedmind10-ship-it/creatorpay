FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci --only=production

# Copy app source
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S creatorpay -u 1001

# Change ownership of the app directory
RUN chown -R creatorpay:nodejs /app
USER creatorpay

EXPOSE 3000

ENV NODE_ENV=production

CMD ["npm", "start"]