FROM node:22-bullseye-slim

# Optional build-time flag to install build tools (set to 1 when native modules or git deps are required)
ARG INSTALL_BUILD_TOOLS=0

# Create app directory
WORKDIR /usr/src/app

# Install minimal system packages only when explicitly requested (keeps builds fast by default)
RUN if [ "$INSTALL_BUILD_TOOLS" = "1" ]; then \
      apt-get update && apt-get install -y --no-install-recommends ca-certificates git && rm -rf /var/lib/apt/lists/*; \
    fi

# Copy package manifests first for better layer caching
COPY package.json package-lock.json* ./

# Install dependencies without running lifecycle scripts (faster, more hermetic)
RUN npm i --ignore-scripts --no-fund

# Copy the rest of the application source
COPY . ./

# Default command runs tests; using npm ensures the project's test script from package.json is used
CMD ["npm", "test"]
