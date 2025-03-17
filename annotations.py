import os
import json

def create_coco_annotations(file_name, annotations):
    return {
        "images": [
            {
                "file_name": file_name,
                "id": 1
            }
        ],
        "annotations": [
            {
                "id": idx + 1,
                "image_id": 1,
                "category_id": 1,
                "bbox": [
                    annotation['startX'],
                    annotation['startY'],
                    annotation['endX'] - annotation['startX'],
                    annotation['endY'] - annotation['startY']
                ],
                "area": (annotation['endX'] - annotation['startX']) * (annotation['endY'] - annotation['startY']),
                "iscrowd": 0
            }
            for idx, annotation in enumerate(annotations)
        ],
        "categories": [
            {
                "id": 1,
                "name": "default"
            }
        ]
    }

def save_annotations(file_name, annotations, save_path=None, upload_dir='static/uploads'):
    if not file_name:
        return None, 'File name not provided'
        
    coco_annotations = create_coco_annotations(file_name, annotations)
    
    if save_path:
        annotations_path = save_path
    else:
        annotations_path = os.path.join(upload_dir, f"{os.path.splitext(file_name)[0]}_annotations_coco.json")
        
    os.makedirs(os.path.dirname(annotations_path), exist_ok=True)
    with open(annotations_path, 'w') as f:
        json.dump(coco_annotations, f, indent=2)
        
    return annotations_path, coco_annotations
