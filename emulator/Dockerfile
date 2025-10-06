# Use the official Node.js LTS image
FROM node:20

# Install Firebase CLI globally
RUN npm install -g firebase-tools

# Install Java 
RUN apt-get update && apt-get install -y openjdk-17-jre-headless

# Output Node.js and Firebase CLI versions
RUN node -v
RUN firebase --version

# Set the working directory inside the container
WORKDIR /app

# Copy your local files into the container
COPY . .

# Expose the necessary emulator ports
EXPOSE 4000 4400 4500 8080 9099 9199

# Start the Firebase emulators
CMD ["firebase", "emulators:start"]
