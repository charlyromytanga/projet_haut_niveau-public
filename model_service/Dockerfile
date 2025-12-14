FROM python:3.11-slim
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends build-essential && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt
COPY . /app
ENV BENTOML_HOME=/app/bentoml_store
# train model at build time and save to BentoML model store located at $BENTOML_HOME
RUN python train_and_save.py || true
EXPOSE 8502
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8502"]

