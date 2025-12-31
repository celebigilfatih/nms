FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install minimal system dependencies (network-safe)
RUN apt-get update --no-install-recommends && apt-get install -y --no-install-recommends \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/* || true

# Copy project files
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Create logs directory
RUN mkdir -p /app/logs

# Environment variables (can be overridden)
ENV NMS_ENV=production
ENV NMS_LOG_LEVEL=INFO
ENV DB_HOST=postgres
ENV DB_PORT=5432
ENV DB_USER=nms_user
ENV DB_NAME=nms_db
ENV BACKEND_API_URL=http://backend:3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "from nms_service.api.client import APIClient; c = APIClient(); exit(0 if c.health_check() else 1)"

# Run NMS service
CMD ["python", "-m", "nms_service.orchestrator"]
