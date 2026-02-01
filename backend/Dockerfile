FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . ./

ENV PORT=8000
EXPOSE 8000

CMD ["gunicorn", "--bind", ":${PORT}", "--worker-class", "uvicorn.workers.UvicornWorker", "server:app"]
