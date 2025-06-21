# Use a more complete base image for better compatibility with C++ extensions
FROM python:3.9-buster

# Set environment variables to prevent interactive prompts during build
ENV DEBIAN_FRONTEND=noninteractive

# Install system dependencies required for dlib, OpenCV, etc.
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    cmake \
    pkg-config \
    libx11-dev \
    libatlas-base-dev \
    libgtk-3-dev \
    libboost-python-dev \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Set the working directory
WORKDIR /app

# Copy requirements file first to leverage Docker's layer caching
COPY requirements.txt .

# Upgrade pip and install Python packages
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code
COPY . .

# Render will set the PORT environment variable, which gunicorn_config.py uses.
# EXPOSE is not required by Render but is good practice.
EXPOSE 10000

# The command to start the Gunicorn server
CMD ["gunicorn", "--config", "gunicorn_config.py", "wsgi:app"] 