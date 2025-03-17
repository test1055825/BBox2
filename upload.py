import os
from flask import url_for

def handle_file_upload(file, upload_dir):
    if file:
        file_path = os.path.join(upload_dir, file.filename)
        file.save(file_path)
        return {
            'file_path': url_for('static', filename=f'uploads/{file.filename}'),
            'file_name': file.filename
        }
    return None
