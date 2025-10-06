#!/bin/bash

# Check if macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
  echo "This script runs on macOS only."
  exit 1
fi

# Step 1: Ensure required command line tools are installed
if ! command -v brew &> /dev/null; then
  echo "brew not found. Please install Homebrew first: https://brew.sh/"
  exit 1
fi

if ! command -v node &> /dev/null; then
  echo "node not found. Please install Node.js first: https://nodejs.org/"
  exit 1
fi

if ! command -v yarn &> /dev/null; then
  echo "yarn not found. Please install Yarn first: https://yarnpkg.com/getting-started/install"
  exit 1
fi

if ! command -v conda &> /dev/null; then
  echo "conda not found. Please install Conda first: https://www.anaconda.com/docs/getting-started/miniconda/install#macos-2"
  exit 1
fi

if ! command -v watchman &> /dev/null; then
  echo "watchman not found. Please install Watchman first: https://facebook.github.io/watchman/docs/install.html#macos"
  exit 1
fi

# Step 2: Python backend environment
if conda info --envs | grep -q 'bloom'; then
  echo "Activating existing conda environment 'bloom'"
  source "$(conda info --base)/etc/profile.d/conda.sh"
  conda activate bloom
else
  echo "Creating new conda environment 'bloom' with Python 3.12"
  conda create --name bloom python=3.12 -y
  source "$(conda info --base)/etc/profile.d/conda.sh"
  conda activate bloom
fi

# Install or update Python dependencies
echo "Installing Python dependencies..."
cd backend
pip install -r requirements.txt
cd ..

# Step 3: Frontend environment
echo "Cleaning node modules and caches..."
rm -rf node_modules
corepack enable
yarn cache clean
watchman watch-del-all

echo "Installing node packages with yarn..."
yarn install


# Step 4: iOS environment

# Clean Xcode caches
echo "Cleaning Xcode cache/build folders..."
rm -rf ~/Library/Developer/Xcode/DerivedData/Bloom-*
rm -rf ios/build

# Install Ruby gems
echo "Installing Ruby gems with Bundler..."
bundle install

# Clean CocoaPods cache
echo "Cleaning CocoaPods cache..."
bundle exec pod cache clean --all

echo "Installing iOS dependencies with CocoaPods..."
cd ios
bundle exec pod update
bundle exec pod install

echo "Setup complete."
