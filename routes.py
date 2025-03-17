from flask import Blueprint, render_template, request, jsonify, url_for
from upload import handle_file_upload
from annotations import save_annotations
import os

UPLOAD_DIR = os.getenv('UPLOAD_DIR', 'static/uploads')

# Define blueprints for routes
index = Blueprint('index', __name__)
upload = Blueprint('upload', __name__)
save_annotations_blueprint = Blueprint('save_annotations', __name__)  # renamed from save_annotations_bp

@index.route('/')
def index_route():
    return render_template('index.html')

@upload.route('/upload', methods=['POST'])
def upload_route():
    result = handle_file_upload(request.files['file'], UPLOAD_DIR)
    if result:
        return jsonify(result)
    return 'File not uploaded', 400

@save_annotations_blueprint.route('/save_annotations', methods=['POST'])  # updated route decorator
def save_annotations_route():
    data = request.json
    annotations_path, result = save_annotations(
        data.get('file_name'),
        data.get('annotations', []),
        data.get('save_path'),
        UPLOAD_DIR
    )
    
    if annotations_path:
        return jsonify({
            'message': f'Annotations saved successfully at {annotations_path}',
            'annotations': result
        }), 200
    return jsonify({'error': result}), 400
