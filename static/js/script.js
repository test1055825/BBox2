document.getElementById('imageUpload').addEventListener('change', function(event) {
    const file = event.target.files[0];
    const formData = new FormData();
    formData.append('file', file);

    fetch('/upload', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        const img = document.getElementById('image');
        img.src = data.file_path;
        img.onload = function() {
            const canvas = document.getElementById('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
        };
    });
});

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
let isDrawing = false;
let startX, startY;
const annotations = [];
const labels = new Set();

canvas.addEventListener('mousedown', function(event) {
    isDrawing = true;
    startX = event.offsetX;
    startY = event.offsetY;
});

canvas.addEventListener('mousemove', function(event) {
    if (isDrawing) {
        const currentX = event.offsetX;
        const currentY = event.offsetY;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.strokeRect(startX, startY, currentX - startX, currentY - startY);
    }
});

canvas.addEventListener('mouseup', function(event) {
    if (isDrawing) {
        isDrawing = false;
        const endX = event.offsetX;
        const endY = event.offsetY;
        const labelSelect = document.getElementById('labelSelect');
        const label = labelSelect.value || prompt('Enter label for this bounding box:');
        if (label) {
            labels.add(label);
            updateLabelSelect();
            const annotation = {
                startX,
                startY,
                endX,
                endY,
                label
            };
            annotations.push(annotation);
            updateAnnotationsList();
        }
    }
});

document.getElementById('saveAnnotations').addEventListener('click', function() {
    fetch('/save_annotations', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(annotations)
    })
    .then(response => response.text())
    .then(data => {
        alert(data);
    });
});

document.getElementById('addLabel').addEventListener('click', function() {
    const newLabel = document.getElementById('newLabel').value;
    if (newLabel) {
        labels.add(newLabel);
        updateLabelSelect();
        document.getElementById('newLabel').value = '';
    }
});

function updateAnnotationsList() {
    const annotationsList = document.getElementById('annotationsList');
    annotationsList.innerHTML = '';
    annotations.forEach((annotation, index) => {
        const li = document.createElement('li');
        li.textContent = `Label: ${annotation.label}, Coordinates: (${annotation.startX}, ${annotation.startY}) - (${annotation.endX}, ${annotation.endY})`;
        li.addEventListener('click', function() {
            const newLabel = prompt('Enter new label:', annotation.label);
            if (newLabel) {
                annotation.label = newLabel;
                updateAnnotationsList();
            }
        });
        annotationsList.appendChild(li);
    });
}

function updateLabelSelect() {
    const labelSelect = document.getElementById('labelSelect');
    labelSelect.innerHTML = '<option value="" disabled selected>Select a label</option>';
    labels.forEach(label => {
        const option = document.createElement('option');
        option.value = label;
        option.textContent = label;
        labelSelect.appendChild(option);
    });
}
