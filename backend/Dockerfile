FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . ./

# Cloud Run injeta a porta automaticamente, mas deixamos um padrão
ENV PORT=8080

# MUDANÇA AQUI: Removemos os colchetes para o $PORT funcionar
CMD gunicorn --bind 0.0.0.0:$PORT --worker-class uvicorn.workers.UvicornWorker server:app
