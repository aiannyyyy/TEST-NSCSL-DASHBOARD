document.addEventListener('DOMContentLoaded', function() {
    const saveNotebookBtn = document.getElementById('saveNotebookBtn');
    const addNotebookModalEl = document.getElementById('addNotebookModal');
    const addNotebookModal = new bootstrap.Modal(addNotebookModalEl);
    const notebookContainer = document.getElementById('notebookContainer');
    const closeAddNotebookBtn = document.getElementById('closeAddNotebookBtn');
    const cancelAddNotebookBtn = document.getElementById('cancelAddNotebookBtn');

    // Save notebook entry
    saveNotebookBtn.addEventListener('click', function() {
        const notesText = document.getElementById('notebookNotes').value.trim();

        if (notesText === '') {
            alert('Please enter some notes before saving.');
            return;
        }

        const notebookEntry = document.createElement('div');
        notebookEntry.className = 'mb-2 p-2 bg-light border rounded';
        notebookEntry.innerHTML = `
            <div class="d-flex justify-content-between align-items-start">
                <div class="flex-grow-1">
                    <small class="text-muted">${new Date().toLocaleString()}</small>
                    <p class="mb-0 mt-1" style="font-size: 13px;">${notesText}</p>
                </div>
                <button type="button" class="btn btn-sm btn-outline-danger ms-2" onclick="removeNotebookEntry(this)">
                    <i class="fas fa-trash-alt"></i> Remove
                </button>
            </div>
        `;

        notebookContainer.appendChild(notebookEntry);

        document.getElementById('notebookNotes').value = '';
        addNotebookModal.hide();

        console.log('Notebook entry added successfully');
    });

    // Handle close and cancel buttons
    closeAddNotebookBtn.addEventListener('click', function() {
        addNotebookModal.hide();
    });

    cancelAddNotebookBtn.addEventListener('click', function() {
        addNotebookModal.hide();
    });

    // Reset form when modal is fully hidden
    addNotebookModalEl.addEventListener('hidden.bs.modal', function () {
        document.getElementById('notebookNotes').value = '';
    });
});
