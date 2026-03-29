# Use Python 3.12 (recommended for 2026 LangChain/LangGraph ecosystem)
FROM python:3.12-slim

# Install system dependencies (needed for some packages like psycopg2, cryptography, etc.)
RUN apt-get update && apt-get install -y \
    gcc \
    python3-dev \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

ENV PYTHONUNBUFFERED=True
ENV APP_HOME=/app
WORKDIR $APP_HOME

# Copy requirements first → better Docker layer caching
COPY requirements.txt .

# Upgrade pip and install dependencies
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy the rest of your application
COPY . .

# Cloud Run expects the app to listen on $PORT (default 8080)
ENV PORT=8080
EXPOSE 8080

# Run with uvicorn (standard for FastAPI)
CMD exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT} --timeout-keep-alive 0