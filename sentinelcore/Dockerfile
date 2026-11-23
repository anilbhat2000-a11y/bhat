# 3C ITS VisionOps — single image for the web/API server and health collector.
FROM python:3.13-slim
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY sentinel ./sentinel
RUN useradd -r -u 10001 sentinel && mkdir -p /data && chown sentinel /data
USER sentinel
ENV SC_DATABASE_URL=sqlite:////data/sentinel.db
EXPOSE 8080
CMD ["uvicorn", "sentinel.main:app", "--host", "0.0.0.0", "--port", "8080", "--proxy-headers"]
