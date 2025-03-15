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
        return jsonify({'file_path': file_path})
    return 'File not uploaded', 400

@app.route('/save_annotations', methods=['POST'])
def save_annotations():
    data = request.json
    with open('annotations.json', 'w') as f:
        json.dump(data, f)
    return 'Annotations saved', 200

if __name__ == '__main__':
    app.run(debug=True)
