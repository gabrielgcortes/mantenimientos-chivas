FROM python:3.12-slim-bookworm

# Variables de entorno para evitar la escritura de bytecode y mantener el flujo de salida limpio
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Crear un usuario no-root para ejecutar la app
RUN adduser --disabled-password --gecos "" appuser

# Establecer el directorio de trabajo
WORKDIR /app

# Instalar dependencias necesarias
RUN apt-get update && apt-get install -y --no-install-recommends \
        gcc \
        libpq-dev \
        libjpeg-dev \
        zlib1g-dev \
        libfreetype6-dev \
        libffi-dev \
        libcairo2-dev \
        pkg-config \
    && rm -rf /var/lib/apt/lists/*

# Copiar los requisitos e instalar dependencias
COPY requirements.txt .
RUN pip install --no-cache-dir --retries 10 --timeout 120 -r requirements.txt

# Copiar todo el código de la aplicación
COPY . .

# Crear directorios necesarios si no existen
RUN mkdir -p /app/mantenimientos/migrations

# Establecer los permisos adecuados para todo el directorio de la aplicación
RUN chown -R appuser:appuser /app

# Establecer los permisos para entrypoint.sh
RUN chmod +x entrypoint.sh

# Cambiar al usuario no-root
USER appuser

# Exponer el puerto necesario
EXPOSE 8000

# Hacer la aplicación inmutable
ENTRYPOINT ["sh", "entrypoint.sh"]
CMD ["gunicorn", "config.wsgi:application", \
     "--bind", "0.0.0.0:8000", \
     "--workers", "3", \
     "--threads", "2", \
     "--access-logfile", "-", \
     "--error-logfile", "-"]