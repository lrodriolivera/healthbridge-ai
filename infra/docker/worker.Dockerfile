FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY src/ ./src/
COPY alembic.ini .
COPY alembic/ ./alembic/

CMD ["celery", "-A", "src.workers", "worker", "--loglevel=info", "--concurrency=2"]
