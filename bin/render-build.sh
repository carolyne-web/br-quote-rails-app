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

# Run database migrations (includes Solid Cache, Queue, Cable)
echo "Running database migrations..."
bundle exec rails db:migrate

# Seed missing territories (safe to run multiple times)
echo "Seeding missing territories..."
bundle exec rake territories:seed_missing

# Note: Seeds are NOT run automatically on deployment to preserve production data
# To seed the database manually (first time only), run: bundle exec rails db:seed

echo "Build completed successfully!"
