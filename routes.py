from flask import Blueprint, render_template, request, jsonify
import os
import json

UPLOAD_DIR = os.getenv('UPLOAD_DIR', 'static/uploads')

# Define blueprints for routes
index = Blueprint('index', __name__)
upload = Blueprint('upload', __name__)
save_annotations = Blueprint('save_annotations', __name__)

@index.route('/')
def index_route():
    return render_template('index.html')

@upload.route('/upload', methods=['POST'])
def upload_route():
    file = request.files['file']
    if file:
        file_path = os.path.join(UPLOAD_DIR, file.filename)
        file.save(file_path)
        return jsonify({'file_path': file_path, 'file_name': file.filename})
    return 'File not uploaded', 400

@save_annotations.route('/save_annotations', methods=['POST'])
def save_annotations_route():
    data = request.json
    file_name = data.get('file_name')
    if file_name:
        annotations_path = os.path.join(UPLOAD_DIR, f"{os.path.splitext(file_name)[0]}_annotations.json")
        with open(annotations_path, 'w') as f:
            json.dump(data['annotations'], f)
        return jsonify({'message': f'Annotations saved successfully at {annotations_path}'}), 200
    return jsonify({'error': 'File name not provided'}), 400
