# Use a Node.js image
FROM node:lts

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install Node.js dependencies
RUN npm install 
RUN npm i puppeteer

# Copy the rest of the app
COPY . .

# Expose the application port (if needed)
EXPOSE 3000

# Command to start the application
CMD ["node", "index.js"]