# Use a more recent Python base image
FROM python:3.9-slim-bullseye

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Install system dependencies including a newer CMake version
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    cmake \
    pkg-config \
    libx11-dev \
    libatlas-base-dev \
    libgtk-3-dev \
    libboost-python-dev \
    libopencv-dev \
    python3-dev \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Upgrade CMake to a newer version for dlib compatibility
RUN wget -O cmake.sh https://github.com/Kitware/CMake/releases/download/v3.25.0/cmake-3.25.0-linux-x86_64.sh \
    && sh cmake.sh --skip-license --prefix=/usr/local \
    && rm cmake.sh

# Set working directory
WORKDIR /app

# Upgrade pip
RUN pip install --no-cache-dir --upgrade pip

# Install dlib with specific CMake flags to bypass version conflicts
RUN CMAKE_POLICY_VERSION_MINIMUM=3.5 pip install --no-cache-dir dlib==19.24.2

# Copy requirements file and install the rest of the dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the application code
COPY . .

# Create a non-root user
RUN useradd --create-home --shell /bin/bash app \
    && chown -R app:app /app
USER app

# Expose port
EXPOSE 8000

# Run the application
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--workers", "1", "--timeout", "120", "app:app"] 