  // Initialize the notes array from localStorage or create empty array
  let notes = JSON.parse(localStorage.getItem('stickyNotes')) || [];
  let currentNoteIndex = 0;
  
  // Define color options for notes
  const colors = ['#fff9c4', '#ffcc80', '#81d4fa', '#a5d6a7', '#ce93d8', '#ef9a9a'];
  
  // Initialize the application
  function initApp() {
    // Create default note if none exists
    if (notes.length === 0) {
      addNewNote();
    }
    
    // Set up event listeners for buttons
    document.getElementById('noteSection_addBtn').addEventListener('click', addNewNote);
    document.getElementById('scrollLeft').addEventListener('click', scrollTabsLeft);
    document.getElementById('scrollRight').addEventListener('click', scrollTabsRight);
    document.getElementById('clearNote').addEventListener('click', clearCurrentNote);
    document.getElementById('saveNote').addEventListener('click', saveCurrentNote);
    
    // Render the notes
    renderNotes();
    
    // Setup color selector
    setupColorSelector();
  }
  
  // Save notes to localStorage
  function saveNotes() {
    localStorage.setItem('stickyNotes', JSON.stringify(notes));
    updateLastSavedTime();
  }
  
  // Add a new note
  function addNewNote() {
    const newColor = colors[notes.length % colors.length];
    notes.push({ 
      content: '', 
      color: newColor,
      lastSaved: new Date().toISOString()
    });
    currentNoteIndex = notes.length - 1;
    saveNotes();
    renderNotes();
    
    // Focus the new note
    setTimeout(() => {
      const textarea = document.querySelector('.note-textarea');
      if (textarea) textarea.focus();
    }, 100);
  }
  
  // Clear the current note
  function clearCurrentNote() {
    if (notes[currentNoteIndex]) {
      if (confirm('Are you sure you want to clear this note?')) {
        notes[currentNoteIndex].content = '';
        notes[currentNoteIndex].lastSaved = new Date().toISOString();
        saveNotes();
        renderNotes();
      }
    }
  }
  
  // Save the current note
  function saveCurrentNote() {
    const textarea = document.querySelector('.note-textarea');
    if (textarea && notes[currentNoteIndex]) {
      notes[currentNoteIndex].content = textarea.value;
      notes[currentNoteIndex].lastSaved = new Date().toISOString();
      saveNotes();
      updateLastSavedTime();
    }
  }
  
  // Update the last saved time display
  function updateLastSavedTime() {
    const lastSavedEl = document.getElementById('lastSaved');
    if (lastSavedEl && notes[currentNoteIndex]) {
      const date = new Date(notes[currentNoteIndex].lastSaved);
      const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      lastSavedEl.textContent = `Last saved: ${timeString}`;
    }
  }
  
  // Setup the color selector
  function setupColorSelector() {
    const colorSelector = document.getElementById('colorSelector');
    colorSelector.innerHTML = '';
    
    colors.forEach((color, index) => {
      const colorOption = document.createElement('div');
      colorOption.className = 'color-option';
      colorOption.style.backgroundColor = color;
      
      if (notes[currentNoteIndex] && notes[currentNoteIndex].color === color) {
        colorOption.classList.add('selected');
      }
      
      colorOption.addEventListener('click', () => {
        if (notes[currentNoteIndex]) {
          notes[currentNoteIndex].color = color;
          saveNotes();
          renderNotes();
        }
      });
      
      colorSelector.appendChild(colorOption);
    });
  }
  
  // Render tabs for each note
  function renderTabs() {
    const tabContainer = document.getElementById('noteSection_tabs');
    tabContainer.innerHTML = '';
    
    notes.forEach((note, index) => {
      const tab = document.createElement('div');
      tab.className = 'tab' + (index === currentNoteIndex ? ' active-tab' : '');
      
      // Create tab title from note content or use default
      let tabTitle = `Note ${index + 1}`;
      if (note.content) {
        // Use first line of content as title, truncate if needed
        const firstLine = note.content.split('\n')[0].trim();
        if (firstLine) {
          tabTitle = firstLine.length > 10 ? firstLine.substring(0, 10) + '...' : firstLine;
        }
      }
      
      tab.innerText = tabTitle;
      
      // Add click handler to switch notes
      tab.addEventListener('click', () => {
        currentNoteIndex = index;
        renderNotes();
      });
      
      // Add close button
      const closeBtn = document.createElement('span');
      closeBtn.className = 'close-btn';
      closeBtn.innerHTML = '×';
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm('Are you sure you want to delete this note?')) {
          notes.splice(index, 1);
          if (notes.length === 0) {
            addNewNote();
          } else if (currentNoteIndex >= notes.length) {
            currentNoteIndex = notes.length - 1;
          }
          saveNotes();
          renderNotes();
        }
      });
      
      tab.appendChild(closeBtn);
      tabContainer.appendChild(tab);
    });
  }
  
  // Render the current note
  function renderNoteContent() {
    const noteContainer = document.getElementById('noteContainer');
    noteContainer.innerHTML = '';
    
    if (!notes[currentNoteIndex]) return;
    
    const noteTextarea = document.createElement('textarea');
    noteTextarea.className = 'note-textarea';
    noteTextarea.value = notes[currentNoteIndex].content;
    noteTextarea.style.backgroundColor = notes[currentNoteIndex].color;
    noteTextarea.placeholder = 'Type your note here...';
    
    // Auto-save when the note content changes
    noteTextarea.addEventListener('input', debounce(() => {
      notes[currentNoteIndex].content = noteTextarea.value;
      notes[currentNoteIndex].lastSaved = new Date().toISOString();
      saveNotes();
    }, 500));
    
    noteContainer.appendChild(noteTextarea);
  }
  
  // Render the entire notes section
  function renderNotes() {
    renderTabs();
    renderNoteContent();
    setupColorSelector();
    updateLastSavedTime();
  }
  
  // Scroll the tabs left
  function scrollTabsLeft() {
    document.getElementById('noteSection_tabs').scrollBy({
      left: -200,
      behavior: 'smooth'
    });
  }
  
  // Scroll the tabs right
  function scrollTabsRight() {
    document.getElementById('noteSection_tabs').scrollBy({
      left: 200,
      behavior: 'smooth'
    });
  }
  
  // Debounce function to limit how often a function is called
  function debounce(func, wait) {
    let timeout;
    return function() {
      const context = this, args = arguments;
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        func.apply(context, args);
      }, wait);
    };
  }
  
  // Initialize the app when the DOM is loaded
  document.addEventListener('DOMContentLoaded', initApp);
  // If the DOM is already loaded, initialize now
  if (document.readyState === 'interactive' || document.readyState === 'complete') {
    initApp();
  }