FROM python:3.12-slim

WORKDIR /app

COPY apps/ai /app
RUN pip install --no-cache-dir . \
    && mkdir -p /app/data \
    && groupadd --system appuser \
    && useradd --system --gid appuser --home-dir /app --no-create-home appuser \
    && chown -R appuser:appuser /app

USER appuser

ENV AI_DATA_DIR=/app/data
EXPOSE 8000

CMD ["uvicorn", "knowledge_ai.main:app", "--host", "0.0.0.0", "--port", "8000"]
