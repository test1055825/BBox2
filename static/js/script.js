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
            redrawImage(); // Redraw image on load
            redrawAnnotations(); // Redraw annotations on load
        };
        document.getElementById('saveAnnotations').dataset.fileName = data.file_name; // Store file name
    });
});

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
ctx.font = '16px Arial'; // Ustaw większy rozmiar tekstu
let isDrawing = false;
let startX, startY;
const annotations = [];
const labels = new Set();
let currentLabel = null;
let lastChosenLabel = null; // Zmienna do przechowywania ostatnio wybranej etykiety
let selectedAnnotations = new Set(); // Zbiór zaznaczonych anotacji
let scale = 1; // Zmienna do przechowywania skali zoomu
const zoomFactor = 1.1; // Współczynnik zoomu

canvas.addEventListener('mousedown', function(event) {
    if (event.button === 2) { // Prawy przycisk myszy
        isDrawing = false;
        canvas.addEventListener('mousemove', deleteAnnotation);
    } else {
        isDrawing = true;
        startX = event.offsetX / scale;
        startY = event.offsetY / scale;
    }
});

canvas.addEventListener('mousemove', function(event) {
    if (isDrawing) {
        const currentX = event.offsetX / scale;
        const currentY = event.offsetY / scale;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        redrawImage(); // Redraw image on move
        redrawAnnotations(); // Redraw annotations on move
        ctx.strokeRect(startX, startY, currentX - startX, currentY - startY);
    }
});

canvas.addEventListener('mouseup', function(event) {
    if (event.button === 2) { // Prawy przycisk myszy
        canvas.removeEventListener('mousemove', deleteAnnotation);
    } else if (isDrawing) {
        isDrawing = false;
        const endX = event.offsetX / scale;
        const endY = event.offsetY / scale;
        const labelSelect = document.getElementById('labelSelect');
        const label = labelSelect.value;
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
            redrawImage(); // Redraw image on mouse up
            redrawAnnotations(); // Redraw annotations on mouse up
        }
    }
});

canvas.addEventListener('wheel', function(event) {
    event.preventDefault();
    const mouseX = event.offsetX;
    const mouseY = event.offsetY;
    const zoom = event.deltaY < 0 ? zoomFactor : 1 / zoomFactor;
    scale *= zoom;
    ctx.translate(mouseX, mouseY);
    ctx.scale(zoom, zoom);
    ctx.translate(-mouseX, -mouseY);
    redrawImage();
    redrawAnnotations();
});

document.getElementById('saveAnnotations').addEventListener('click', function() {
    const fileName = this.dataset.fileName; // Get stored file name
    fetch('/save_annotations', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ file_name: fileName, annotations: annotations })
    })
    .then(response => response.json())
    .then(data => {
        alert(data.message || data.error);
    });
});

document.getElementById('saveAsAnnotations').addEventListener('click', async function() {
    const fileName = document.getElementById('saveAnnotations').dataset.fileName;
    if (!fileName) {
        alert('Please upload an image first');
        return;
    }

    try {
        const handle = await window.showSaveFilePicker({
            suggestedName: `${fileName.split('.')[0]}_annotations_coco.json`,
            types: [{
                description: 'JSON Files',
                accept: {
                    'application/json': ['.json'],
                },
            }],
        });

        fetch('/save_annotations', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                file_name: fileName, 
                annotations: annotations,
                save_path: handle.name
            })
        })
        .then(response => response.json())
        .then(data => {
            alert(data.message || data.error);
        });
    } catch (err) {
        if (err.name !== 'AbortError') {
            console.error('Failed to save file:', err);
        }
    }
});

document.getElementById('addLabel').addEventListener('click', function() {
    const newLabel = document.getElementById('newLabel').value;
    if (newLabel) {
        labels.add(newLabel);
        updateLabelSelect();
        updateLabelsList(); // Aktualizujemy listę etykiet
        document.getElementById('newLabel').value = '';
    }
});

document.getElementById('labelSelect').addEventListener('change', function() {
    currentLabel = this.value;
    lastChosenLabel = this.value; // Zapisz ostatnio wybraną etykietę
    redrawImage();
    redrawAnnotations();
});

document.getElementById('zoomIn').addEventListener('click', function() {
    scale *= zoomFactor;
    redrawImage();
    redrawAnnotations();
});

document.getElementById('zoomOut').addEventListener('click', function() {
    scale /= zoomFactor;
    redrawImage();
    redrawAnnotations();
});

document.addEventListener('keydown', function(event) {
    if (event.key === 'Delete') {
        deleteSelectedAnnotations();
    }
});

function deleteAnnotation(event) {
    const mouseX = event.offsetX / scale;
    const mouseY = event.offsetY / scale;
    annotations.forEach((annotation, index) => {
        if (mouseX >= annotation.startX && mouseX <= annotation.endX && mouseY >= annotation.startY && mouseY <= annotation.endY) {
            annotations.splice(index, 1);
            updateAnnotationsList();
            redrawImage();
            redrawAnnotations();
        }
    });
}

function deleteSelectedAnnotations() {
    const newAnnotations = annotations.filter((annotation, index) => !selectedAnnotations.has(index));
    annotations.length = 0;
    annotations.push(...newAnnotations);
    selectedAnnotations.clear();
    updateAnnotationsList();
    redrawImage();
    redrawAnnotations();
}

function updateAnnotationsList() {
    const annotationsList = document.getElementById('annotationsList');
    annotationsList.innerHTML = '';
    annotations.forEach((annotation, index) => {
        const li = document.createElement('li');
        li.className = 'list-group-item d-flex justify-content-between align-items-center';
        //li.textContent = `Label: ${annotation.label}, Coordinates: (${annotation.startX}, ${annotation.startY}) - (${annotation.endX}, ${annotation.endY})`;
        li.textContent = `${annotation.label}, Coordinates: (${annotation.startX}, ${annotation.startY}) - (${annotation.endX}, ${annotation.endY})`;
        li.style.cursor = 'pointer';
        li.addEventListener('click', function() {
            if (selectedAnnotations.has(index)) {
                selectedAnnotations.delete(index);
                li.style.backgroundColor = '';
            } else {
                selectedAnnotations.add(index);
                li.style.backgroundColor = 'lightblue';
            }
            redrawAnnotations(); // Redraw annotations to update selected state
        });
        const deleteButton = document.createElement('button');
        deleteButton.className = 'btn btn-danger btn-sm';
        deleteButton.textContent = 'X';
        deleteButton.addEventListener('click', function(event) {
            event.stopPropagation();
            annotations.splice(index, 1);
            updateAnnotationsList();
            redrawImage();
            redrawAnnotations();
        });
        li.appendChild(deleteButton);
        annotationsList.appendChild(li);
    });
}

function updateLabelSelect() {
    const labelSelect = document.getElementById('labelSelect');
    labelSelect.innerHTML = '<option value="" disabled>Select a label</option>';
    labels.forEach(label => {
        const option = document.createElement('option');
        option.value = label;
        option.textContent = label;
        if (label === lastChosenLabel) {
            option.selected = true; // Ustaw ostatnio wybraną etykietę jako domyślną
        }
        labelSelect.appendChild(option);
    });
}

function updateLabelsList() {
    const labelsList = document.getElementById('labelsList');
    labelsList.innerHTML = '';
    labels.forEach(label => {
        const li = document.createElement('li');
        li.className = 'list-group-item';
        li.textContent = label;
        labelsList.appendChild(li);
    });
}

function redrawImage() {
    const img = document.getElementById('image');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'white'; // Ustaw tło na biały kolor
    ctx.fillRect(0, 0, canvas.width, canvas.height); // Wypełnij tło białym kolorem
    ctx.save();
    ctx.scale(scale, scale);
    ctx.drawImage(img, 0, 0, canvas.width / scale, canvas.height / scale);
    ctx.restore();
}

function redrawAnnotations() {
    ctx.save();
    ctx.scale(scale, scale);
    annotations.forEach((annotation, index) => {
        if (selectedAnnotations.has(index)) {
            ctx.strokeStyle = 'blue'; // Ustaw kolor na niebieski dla zaznaczonej anotacji
        } else if (annotation.label === currentLabel) {
            ctx.strokeStyle = 'yellow'; // Ustaw kolor na zielony dla wybranej etykiety
        } else {
            ctx.strokeStyle = 'red'; // Ustaw domyślny kolor na czerwony
        }
        ctx.strokeRect(annotation.startX, annotation.startY, annotation.endX - annotation.startX, annotation.endY - annotation.startY);
        ctx.fillText(annotation.label, annotation.startX, annotation.startY - 5); // Draw text above the rectangle
    });
    ctx.restore();
}

// Zapobiegaj domyślnemu menu kontekstowemu na canvasie
canvas.addEventListener('contextmenu', function(event) {
    event.preventDefault();
});
