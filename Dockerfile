FROM python:3.11-slim

WORKDIR /app

RUN pip install --no-cache-dir fastapi==0.115.0 uvicorn[standard]==0.30.0 httpx==0.27.0 pydantic==2.9.0

COPY main.py game_engine.py models.py /app/
COPY index.html /app/
RUN mkdir -p /app/static
COPY swarmforge_godview.jsx /app/static/

EXPOSE 8000

CMD ["python", "main.py"]
