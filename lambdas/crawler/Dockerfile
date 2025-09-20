FROM python:3.12-slim

ENV DEBIAN_FRONTEND=noninteractive
ENV EXIFTOOL_PATH=/usr/bin/exiftool
ENV FFMPEG_PATH=/usr/bin/ffmpeg

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg exiftool curl \
    && pip --no-cache-dir install 'markitdown[all]' awslambdaric mangum fastapi uvicorn python-multipart \
    && curl -Lo /usr/local/bin/aws-lambda-rie https://github.com/aws/aws-lambda-runtime-interface-emulator/releases/latest/download/aws-lambda-rie \
    && chmod +x /usr/local/bin/aws-lambda-rie \
    && apt-get clean \
    && apt-get autoremove -y \
    && rm -rf /var/lib/apt/lists/* \
    && mkdir -p /app && ln -s /usr/local/bin/markitdown /app/markitdown

COPY main.py /app/main.py

WORKDIR /app

# CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "80"]

COPY entry.sh /app/entry.sh
RUN chmod +x /app/entry.sh
ENTRYPOINT ["/app/entry.sh", "main.handler"]
