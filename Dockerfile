# Use the official lightweight Node.js 18 image.
FROM node:18-alpine

# Set the working directory
WORKDIR /usr/src/app

# Copy package.json files
COPY package*.json ./

# Install only production dependencies for a lightweight image
RUN npm ci --only=production

# Copy the rest of your backend source code
COPY . .

# IMPORTANT: Cloud Run injects a PORT environment variable dynamically (usually 8080)
# Make sure your app listens to it.
EXPOSE 8080

# Start the Node backend server
CMD [ "node", "server.js" ]
