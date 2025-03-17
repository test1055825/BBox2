from flask import Flask, url_for
import os

app = Flask(__name__, static_url_path='/static', static_folder='static')

# Read upload directory from environment variable or use default
UPLOAD_DIR = os.getenv('UPLOAD_DIR', 'static/uploads')
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Import routes
from routes import index, upload, save_annotations

# Register routes
app.register_blueprint(index)
app.register_blueprint(upload)
app.register_blueprint(save_annotations)

if __name__ == '__main__':
    app.run(debug=True)
