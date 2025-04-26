# Use official Node.js image with Debian (for apt support)
FROM node:20

# Install FFmpeg
RUN apt-get update && \
    apt-get install -y ffmpeg && \
    rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy only package files first for caching
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy rest of the backend code
COPY . .

# Expose the port your app runs on (change if needed)
EXPOSE 4000

# Start the app
CMD ["node", "src/index.js"]
