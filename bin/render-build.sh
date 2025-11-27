#!/usr/bin/env bash
# exit on error
set -o errexit

# Install dependencies
bundle install

# Install Node.js dependencies for Puppeteer (used by Grover for PDF generation)
npm install

# Note: Render has Chromium pre-installed, no need to install it

# Precompile assets
bundle exec rails assets:precompile

# Clean old assets
bundle exec rails assets:clean

# Run database migrations
echo "Running database migrations..."
bundle exec rails db:migrate

# Rails 8 Solid gems (Cache, Queue, Cable) use the same database
echo "Setting up Solid Cache..."
bundle exec rails solid_cache:install:migrations
bundle exec rails db:migrate

echo "Setting up Solid Queue..."
bundle exec rails solid_queue:install:migrations
bundle exec rails db:migrate

# Seed database with default data (only runs on first deploy or when tables are empty)
echo "Seeding database..."
bundle exec rails db:seed

echo "Build completed successfully!"
