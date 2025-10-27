#!/bin/bash

# Server Keep-Alive Script
# This script monitors and keeps your Rails server and ngrok tunnel running

PROJECT_DIR="/Users/michaelkleynhans/Documents/code/br-quote-rails-app"
LOG_FILE="$PROJECT_DIR/server_monitor.log"

log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

check_and_start_rails() {
    if ! pgrep -f "rails server" > /dev/null; then
        log_message "Rails server not running, starting..."
        cd "$PROJECT_DIR"
        nohup bin/rails server > rails_server.log 2>&1 &
        sleep 3
        if pgrep -f "rails server" > /dev/null; then
            log_message "✅ Rails server started successfully"
        else
            log_message "❌ Failed to start Rails server"
        fi
    else
        log_message "✅ Rails server is running"
    fi
}

check_and_start_ngrok() {
    if ! pgrep -f "ngrok http" > /dev/null; then
        log_message "Ngrok not running, starting..."
        nohup ngrok http 3000 > ngrok.log 2>&1 &
        sleep 5
        if pgrep -f "ngrok http" > /dev/null; then
            log_message "✅ Ngrok started successfully"
            # Get the new URL
            sleep 2
            NEW_URL=$(curl -s http://127.0.0.1:4040/api/tunnels | grep -o 'https://[^"]*\.ngrok-free\.app')
            if [ ! -z "$NEW_URL" ]; then
                log_message "🌐 New ngrok URL: $NEW_URL"
            fi
        else
            log_message "❌ Failed to start ngrok"
        fi
    else
        log_message "✅ Ngrok is running"
    fi
}

check_and_start_caffeinate() {
    if ! pgrep -f "caffeinate" > /dev/null; then
        log_message "Caffeinate not running, starting..."
        nohup caffeinate -d -i -m -s > /dev/null 2>&1 &
        sleep 1
        if pgrep -f "caffeinate" > /dev/null; then
            log_message "✅ Caffeinate started successfully"
        else
            log_message "❌ Failed to start caffeinate"
        fi
    else
        log_message "✅ Caffeinate is running"
    fi
}

# Main monitoring loop
log_message "🚀 Starting server monitoring..."

while true; do
    check_and_start_caffeinate
    check_and_start_rails
    check_and_start_ngrok

    # Wait 30 seconds before next check
    sleep 30
done