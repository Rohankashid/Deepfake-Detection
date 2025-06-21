import multiprocessing
import os

# Server socket
# Bind to 0.0.0.0 and the port Render provides
bind = f"0.0.0.0:{os.environ.get('PORT', '5001')}"

# Worker processes
# Render's free instances are single-core, so 1 worker is often sufficient.
# You can increase this on paid plans.
workers = int(os.environ.get('WEB_CONCURRENCY', 1))
worker_class = 'gevent'
worker_connections = 1000
timeout = 120
keepalive = 5

# Logging
accesslog = '-'
errorlog = '-'
loglevel = 'info'

# Process naming
proc_name = 'deepfake_detection_backend'

# Server mechanics
daemon = False
pidfile = None
umask = 0
user = None
group = None
tmp_upload_dir = None

# SSL
keyfile = None
certfile = None 