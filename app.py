from flask import Flask, render_template, request, jsonify
import os
import json

app = Flask(__name__)

# Ensure the upload directory exists
os.makedirs('static/uploads', exist_ok=True)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
def upload():
    file = request.files['file']
    if file:
        file_path = os.path.join('static/uploads', file.filename)
        file.save(file_path)
        return jsonify({'file_path': file_path, 'file_name': file.filename})
    return 'File not uploaded', 400

@app.route('/save_annotations', methods=['POST'])
def save_annotations():
    data = request.json
    file_name = data.get('file_name')
    if file_name:
        annotations_path = os.path.join('static/uploads', f"{os.path.splitext(file_name)[0]}_annotations.json")
        with open(annotations_path, 'w') as f:
            json.dump(data['annotations'], f)
        return jsonify({'message': f'Annotations saved successfully at {annotations_path}'}), 200
    return jsonify({'error': 'File name not provided'}), 400

if __name__ == '__main__':
    app.run(debug=True)
