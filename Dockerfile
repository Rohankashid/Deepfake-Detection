# Use a specific linux/amd64 base image to ensure architecture compatibility
FROM --platform=linux/amd64 continuumio/miniconda3

# Create a Conda environment and install key dependencies from conda-forge
# This includes python, dlib, and the build tools needed by other packages
RUN conda create -n deepfake-env python=3.9 -y
RUN echo "conda activate deepfake-env" >> ~/.bashrc
SHELL ["/bin/bash", "-l", "-c"]
RUN conda install -n deepfake-env -c conda-forge dlib cmake pkg-config -y

# Set the working directory
WORKDIR /app

# Install the rest of the packages from requirements.txt using pip
COPY requirements.txt .
RUN conda run -n deepfake-env pip install --no-cache-dir -r requirements.txt

# Copy the application code
COPY . .

# Create and switch to a non-root user
RUN useradd --create-home app && \
    chown -R app:app /app
USER app

EXPOSE 8000

# The CMD needs to run within the conda environment
CMD conda run -n deepfake-env gunicorn --bind 0.0.0.0:8000 --workers 1 --timeout 120 app:app 