FROM python:3.11-slim

WORKDIR /app

# Install dependencies
RUN pip install --no-cache-dir \
    fastapi==0.115.0 \
        uvicorn[standard]==0.30.0 \
            httpx==0.27.0 \
                pydantic==2.9.0

                # Copy Python files (flat structure)
                COPY main.py game_engine.py models.py /app/

                # Expose port
                EXPOSE 8000

                # Run via python so Railway PORT env var is read correctly
                CMD ["python", "main.py"]
