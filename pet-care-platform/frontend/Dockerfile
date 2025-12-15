# Dockerfile for React Frontend
#
# Build: docker build -t pitomets-frontend .
# Run:   docker run -p 5173:5173 pitomets-frontend

FROM node:20-alpine

# Set work directory
WORKDIR /app

# Copy package files
COPY package.json .

# Install dependencies
RUN npm install

# Copy project files
COPY . .

# Expose port
EXPOSE 5173

# Run dev server
CMD ["npm", "run", "dev", "--", "--host"]

