// Frontend JavaScript to fetch and display notebook details
class NotebookDetailsManager {
    constructor() {
        this.apiBaseUrl = 'http://localhost:3000/api/'; // Adjust this to match your API base URL
    }

    // Utility function to format date and time
    formatDateTime(dateTimeString) {
        if (!dateTimeString) return { date: 'N/A', time: 'N/A' };
        
        try {
            const date = new Date(dateTimeString);
            const dateStr = date.toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'short', 
                day: '2-digit' 
            }).toUpperCase();
            const timeStr = date.toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit',
                hour12: true 
            });
            
            return { date: dateStr, time: timeStr };
        } catch (error) {
            console.error('Error formatting date:', error);
            return { date: 'N/A', time: 'N/A' };
        }
    }

    // Fetch notebook details from backend
    async fetchNotebookDetails(fname, lname) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/notebook-details?fname=${encodeURIComponent(fname)}&lname=${encodeURIComponent(lname)}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            return result.data;
        } catch (error) {
            console.error('Error fetching notebook details:', error);
            throw error;
        }
    }

    // Update the HTML elements with fetched data
    updateNotebookDisplay(notebookData) {
        if (!notebookData || notebookData.length === 0) {
            this.displayNoDataMessage();
            return;
        }

        // Get the first record (or you might want to handle multiple records differently)
        const record = notebookData[0];

        // Update Specimen No
        const specimenNoElement = document.getElementById('specimenNo');
        if (specimenNoElement) {
            specimenNoElement.textContent = record.LABNO || 'N/A';
        }

        // Update Create Date/Time/Tech
        if (record.CREATE_DT || record.CREATETIME) {
            const createDateTime = this.combineDateTime(record.CREATE_DT, record.CREATETIME);
            const createFormatted = this.formatDateTime(createDateTime);
            
            const createDateElement = document.getElementById('createDate');
            const createTimeElement = document.getElementById('createTime');
            const createTechElement = document.getElementById('createTech');
            
            if (createDateElement) createDateElement.textContent = createFormatted.date;
            if (createTimeElement) createTimeElement.textContent = createFormatted.time;
            if (createTechElement) createTechElement.textContent = record.USER_ID || 'N/A';
        }

        // Update Modify Date/Time/Tech
        if (record.LASTMOD) {
            const modifyFormatted = this.formatDateTime(record.LASTMOD);
            
            const modifyDateElement = document.getElementById('modifyDate');
            const modifyTimeElement = document.getElementById('modifyTime');
            const modifyTechElement = document.getElementById('modifyTech');
            
            if (modifyDateElement) modifyDateElement.textContent = modifyFormatted.date;
            if (modifyTimeElement) modifyTimeElement.textContent = modifyFormatted.time;
            if (modifyTechElement) modifyTechElement.textContent = record.USER_ID || 'N/A';
        }

        // Update Remarks/Notes
        const remarksElement = document.getElementById('remarks');
        if (remarksElement) {
            remarksElement.textContent = record.NOTES || 'No remarks available';
        }
    }

    // Combine separate date and time fields if needed
    combineDateTime(dateField, timeField) {
        if (dateField && timeField) {
            // If you have separate date and time fields, combine them
            const dateStr = new Date(dateField).toISOString().split('T')[0];
            return `${dateStr}T${timeField}`;
        }
        return dateField || timeField;
    }

    // Display message when no data is available
    displayNoDataMessage() {
        const elements = [
            'specimenNo', 'createDate', 'createTime', 'createTech',
            'modifyDate', 'modifyTime', 'modifyTech', 'remarks'
        ];
        
        elements.forEach(elementId => {
            const element = document.getElementById(elementId);
            if (element) {
                element.textContent = 'N/A';
            }
        });
    }

    // Main method to load and display notebook details
    async loadNotebookDetails(fname, lname) {
        try {
            // Show loading state
            this.showLoadingState();
            
            const notebookData = await this.fetchNotebookDetails(fname, lname);
            this.updateNotebookDisplay(notebookData);
            
        } catch (error) {
            console.error('Failed to load notebook details:', error);
            this.displayErrorMessage(error.message);
        }
    }

    // Show loading state
    showLoadingState() {
        const elements = [
            'specimenNo', 'createDate', 'createTime', 'createTech',
            'modifyDate', 'modifyTime', 'modifyTech', 'remarks'
        ];
        
        elements.forEach(elementId => {
            const element = document.getElementById(elementId);
            if (element) {
                element.textContent = 'Loading...';
            }
        });
    }

    // Display error message
    displayErrorMessage(errorMessage) {
        const remarksElement = document.getElementById('remarks');
        if (remarksElement) {
            remarksElement.textContent = `Error loading data: ${errorMessage}`;
            remarksElement.style.color = 'red';
        }
    }
}

// Usage example - How to use this in your page
document.addEventListener('DOMContentLoaded', function() {
    const notebookManager = new NotebookDetailsManager();
    
    // Example: Load notebook details when page loads or when search is performed
    // You'll need to get fname and lname from your form or URL parameters
    
    function loadNotebookForPatient(firstName, lastName) {
        notebookManager.loadNotebookDetails(firstName, lastName);
    }
    
    // Example: If you have a search form
    const searchForm = document.getElementById('searchForm'); // Adjust ID as needed
    if (searchForm) {
        searchForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const fname = document.getElementById('firstName').value; // Adjust ID as needed
            const lname = document.getElementById('lastName').value;  // Adjust ID as needed
            
            if (fname && lname) {
                loadNotebookForPatient(fname, lname);
            }
        });
    }
    
    // Example: Load data immediately if you have the names available
    // loadNotebookForPatient('John', 'Doe');
});

// Alternative: If you prefer a simpler function-based approach
async function loadNotebookDetails(fname, lname) {
    try {
        const response = await fetch(`/api/notebook-details?fname=${encodeURIComponent(fname)}&lname=${encodeURIComponent(lname)}`);
        const result = await response.json();
        
        if (result.data && result.data.length > 0) {
            const record = result.data[0];
            
            // Update specimen number
            document.getElementById('specimenNo').textContent = record.LABNO || 'N/A';
            
            // Format and update create date/time
            if (record.CREATE_DT) {
                const createDate = new Date(record.CREATE_DT);
                document.getElementById('createDate').textContent = createDate.toLocaleDateString('en-US', { 
                    year: 'numeric', month: 'short', day: '2-digit' 
                }).toUpperCase();
                document.getElementById('createTime').textContent = createDate.toLocaleTimeString('en-US', { 
                    hour: '2-digit', minute: '2-digit', hour12: true 
                });
            }
            
            // Format and update modify date/time
            if (record.LASTMOD) {
                const modifyDate = new Date(record.LASTMOD);
                document.getElementById('modifyDate').textContent = modifyDate.toLocaleDateString('en-US', { 
                    year: 'numeric', month: 'short', day: '2-digit' 
                }).toUpperCase();
                document.getElementById('modifyTime').textContent = modifyDate.toLocaleTimeString('en-US', { 
                    hour: '2-digit', minute: '2-digit', hour12: true 
                });
            }
            
            // Update tech/user
            document.getElementById('createTech').textContent = record.USER_ID || 'N/A';
            document.getElementById('modifyTech').textContent = record.USER_ID || 'N/A';
            
            // Update remarks
            document.getElementById('remarks').textContent = record.NOTES || 'No remarks available';
        }
    } catch (error) {
        console.error('Error loading notebook details:', error);
    }
}