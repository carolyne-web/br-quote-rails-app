#!/usr/bin/env bash
# exit on error
set -o errexit

# Install dependencies
bundle install

# Install Node.js dependencies for Puppeteer (used by Grover for PDF generation)
npm install

# Install Chromium for Puppeteer on Render
# Render uses Ubuntu, so we need to install chromium-browser
echo "Installing Chromium dependencies..."

# Install required packages for Chromium
apt-get update || true
apt-get install -y chromium-browser || true

# Precompile assets
bundle exec rails assets:precompile

# Clean old assets
bundle exec rails assets:clean

# Run database migrations for all databases
echo "Running primary database migrations..."
bundle exec rails db:migrate

echo "Running cache database migrations..."
bundle exec rails db:migrate:cache

echo "Running queue database migrations..."
bundle exec rails db:migrate:queue

echo "Running cable database migrations..."
bundle exec rails db:migrate:cable

echo "Build completed successfully!"
