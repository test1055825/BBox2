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
        document.getElementById('saveAsAnnotations').dataset.fileName = data.file_name; // Updated selector
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
let isDragging = false;
let draggedAnnotationIndex = -1;
let dragStartX, dragStartY;
let originalAnnotation = null;

let isResizing = false;
let resizeHandle = '';
const handleSize = 8;

function drawResizeHandles(x, y, width, height) {
    const handles = {
        'nw': [x - handleSize/2, y - handleSize/2],
        'ne': [x + width - handleSize/2, y - handleSize/2],
        'sw': [x - handleSize/2, y + height - handleSize/2],
        'se': [x + width - handleSize/2, y + height - handleSize/2]
    };

    ctx.fillStyle = 'white';
    ctx.strokeStyle = 'black';
    
    Object.values(handles).forEach(([hx, hy]) => {
        ctx.fillRect(hx, hy, handleSize, handleSize);
        ctx.strokeRect(hx, hy, handleSize, handleSize);
    });
    
    return handles;
}

function getResizeHandle(mouseX, mouseY, annotation) {
    const handles = drawResizeHandles(
        annotation.startX, 
        annotation.startY, 
        annotation.endX - annotation.startX, 
        annotation.endY - annotation.startY
    );
    
    for (const [position, [x, y]] of Object.entries(handles)) {
        if (mouseX >= x && mouseX <= x + handleSize &&
            mouseY >= y && mouseY <= y + handleSize) {
            return position;
        }
    }
    return '';
}

canvas.addEventListener('mousedown', function(event) {
    const mouseX = event.offsetX;
    const mouseY = event.offsetY;

    if (event.button === 2) {
        isDrawing = false;
        canvas.addEventListener('mousemove', deleteAnnotation);
    } else {
        // Check for resize handles first
        for (let i = annotations.length - 1; i >= 0; i--) {
            resizeHandle = getResizeHandle(mouseX, mouseY, annotations[i]);
            if (resizeHandle) {
                isResizing = true;
                draggedAnnotationIndex = i;
                originalAnnotation = {...annotations[i]};
                dragStartX = mouseX;
                dragStartY = mouseY;
                return;
            }
        }

        // Check if clicking on existing annotation
        const clickedAnnotation = annotations.findIndex(annotation => 
            mouseX >= annotation.startX && mouseX <= annotation.endX &&
            mouseY >= annotation.startY && mouseY <= annotation.endY
        );

        if (clickedAnnotation >= 0) {
            isDragging = true;
            draggedAnnotationIndex = clickedAnnotation;
            dragStartX = mouseX;
            dragStartY = mouseY;
            originalAnnotation = {...annotations[clickedAnnotation]};
        } else {
            isDrawing = true;
            startX = mouseX;
            startY = mouseY;
        }
    }
});

canvas.addEventListener('mousemove', function(event) {
    const mouseX = event.offsetX;
    const mouseY = event.offsetY;

    if (isResizing && draggedAnnotationIndex >= 0) {
        const deltaX = mouseX - dragStartX;
        const deltaY = mouseY - dragStartY;
        const annotation = annotations[draggedAnnotationIndex];

        switch(resizeHandle) {
            case 'nw':
                annotation.startX = originalAnnotation.startX + deltaX;
                annotation.startY = originalAnnotation.startY + deltaY;
                break;
            case 'ne':
                annotation.endX = originalAnnotation.endX + deltaX;
                annotation.startY = originalAnnotation.startY + deltaY;
                break;
            case 'sw':
                annotation.startX = originalAnnotation.startX + deltaX;
                annotation.endY = originalAnnotation.endY + deltaY;
                break;
            case 'se':
                annotation.endX = originalAnnotation.endX + deltaX;
                annotation.endY = originalAnnotation.endY + deltaY;
                break;
        }

        redrawImage();
        redrawAnnotations();
        updateAnnotationsList();
    } else if (isDragging && draggedAnnotationIndex >= 0) {
        const deltaX = mouseX - dragStartX;
        const deltaY = mouseY - dragStartY;
        
        const annotation = annotations[draggedAnnotationIndex];
        annotation.startX = originalAnnotation.startX + deltaX;
        annotation.startY = originalAnnotation.startY + deltaY;
        annotation.endX = originalAnnotation.endX + deltaX;
        annotation.endY = originalAnnotation.endY + deltaY;

        redrawImage();
        redrawAnnotations();
        updateAnnotationsList();
    } else if (isDrawing) {
        const currentX = event.offsetX;
        const currentY = event.offsetY;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        redrawImage(); // Redraw image on move
        redrawAnnotations(); // Redraw annotations on move
        ctx.strokeRect(startX, startY, currentX - startX, currentY - startY);
    }
});

canvas.addEventListener('mouseup', function(event) {
    if (isResizing) {
        isResizing = false;
        resizeHandle = '';
    } else if (isDragging) {
        isDragging = false;
        draggedAnnotationIndex = -1;
        originalAnnotation = null;
    } else if (event.button === 2) { // Prawy przycisk myszy
        canvas.removeEventListener('mousemove', deleteAnnotation);
    } else if (isDrawing) {
        isDrawing = false;
        const endX = event.offsetX;
        const endY = event.offsetY;
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

document.getElementById('saveAsAnnotations').addEventListener('click', async function() {
    const fileName = this.dataset.fileName;  // Updated to use 'this' instead
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

        const writable = await handle.createWritable();
        const save_path = await handle.getFile().then(file => file.path);

        fetch('/save_annotations', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                file_name: fileName, 
                annotations: annotations,
                save_path: save_path
            })
        })
        .then(response => response.json())
        .then(async data => {
            // Write the data to the file
            await writable.write(JSON.stringify(data.annotations, null, 2));
            await writable.close();
            alert('Annotations saved successfully!');
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

document.addEventListener('keydown', function(event) {
    if (event.key === 'Delete') {
        deleteSelectedAnnotations();
    }
});

function deleteAnnotation(event) {
    const mouseX = event.offsetX;
    const mouseY = event.offsetY;
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
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
}

function redrawAnnotations() {
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
        
        // Add resize handles for selected annotations
        if (selectedAnnotations.has(index)) {
            drawResizeHandles(
                annotation.startX, 
                annotation.startY, 
                annotation.endX - annotation.startX, 
                annotation.endY - annotation.startY
            );
        }
    });
}

// Zapobiegaj domyślnemu menu kontekstowemu na canvasie
canvas.addEventListener('contextmenu', function(event) {
    event.preventDefault();
});
