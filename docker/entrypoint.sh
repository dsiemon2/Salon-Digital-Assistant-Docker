#!/bin/sh
set -e

echo "Starting Salon Digital Assistant..."

# Check if database exists
if [ ! -f /app/data/app.db ]; then
    echo "Database not found. Initializing..."
    npx prisma db push --skip-generate
    echo "Running seed..."
    npx prisma db seed
    echo "Database initialized."
else
    echo "Database found. Skipping initialization."
fi

# Start the application
exec "$@"
