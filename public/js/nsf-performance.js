// API Configuration
const API_BASE_URL = 'http://localhost:3001/api';

// Function to fetch NSF performance data
async function fetchNSFPerformance(county, dateFrom, dateTo) {
    try {
        const response = await fetch(`${API_BASE_URL}/nsf-performance?county=${county}&dateFrom=${dateFrom}&dateTo=${dateTo}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching NSF performance data:', error);
        throw error;
    }
}

// Function to show/hide loading state
function showLoading(show) {
    // You can add a loading spinner or disable buttons here
    const applyButton = document.querySelector('.btn-primary');
    if (applyButton) {
        applyButton.disabled = show;
        applyButton.innerHTML = show ? 
            '<i class="fas fa-spinner fa-spin"></i> Loading...' : 
            '<i class="fas fa-search"></i> Apply Filters';
    }
}

// Updated applyFilters function
async function applyFilters() {
    const province = document.getElementById('provinceFilter').value;
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    
    console.log('Applying filters:', { province, startDate, endDate });
    
    // Validate inputs
    if (!startDate || !endDate) {
        alert('Please select both start and end dates');
        return;
    }
    
    if (new Date(startDate) > new Date(endDate)) {
        alert('Start date cannot be after end date');
        return;
    }
    
    // Show loading state
    showLoading(true);
    
    try {
        // Convert province name to match your API (uppercase)
        const county = province.toUpperCase();
        
        // Fetch data from API
        const performanceData = await fetchNSFPerformance(county, startDate, endDate);
        
        // Update the display with real data
        updateProvinceCard(province, performanceData);
        updateFacilitiesGrid(performanceData);
        
        // Auto-select the filtered province
        selectProvince(province);
        
    } catch (error) {
        alert('Error loading data: ' + error.message);
    } finally {
        showLoading(false);
    }
}

// Function to update province card with real data
function updateProvinceCard(province, data) {
    // Calculate aggregated statistics
    const totalFacilities = data.length;
    const totalSamples = data.reduce((sum, facility) => sum + (facility.TOTAL_SAMPLE_COUNT || 0), 0);
    const avgUnsatRate = data.length > 0 ? 
        (data.reduce((sum, facility) => sum + (facility.TOTAL_UNSAT_RATE || 0), 0) / data.length).toFixed(1) : 0;
    
    // Update the specific province card
    const provinceCard = document.querySelector(`[onclick="selectProvince('${province}')"]`);
    if (provinceCard) {
        const facilityCount = provinceCard.querySelector('.stat-item:nth-child(1) .stat-number');
        const sampleCount = provinceCard.querySelector('.stat-item:nth-child(2) .stat-number');
        const unsatRate = provinceCard.querySelector('.stat-item:nth-child(3) .stat-number');
        
        if (facilityCount) facilityCount.textContent = totalFacilities;
        if (sampleCount) sampleCount.textContent = totalSamples.toLocaleString();
        if (unsatRate) unsatRate.textContent = avgUnsatRate + '%';
    }
}

// Function to update facilities grid with real data
function updateFacilitiesGrid(data) {
    const facilitiesGrid = document.querySelector('.facilities-grid');
    if (!facilitiesGrid) return;
    
    // Clear existing facility cards
    facilitiesGrid.innerHTML = '';
    
    // Create facility cards from API data
    data.forEach(facility => {
        const facilityCard = document.createElement('div');
        facilityCard.className = 'facility-card';
        facilityCard.onclick = () => showFacilityPerformance(facility);
        
        facilityCard.innerHTML = `
            <div class="facility-header">
                <div class="facility-icon">
                    <i class="fas fa-hospital"></i>
                </div>
                <div class="facility-info">
                    <h4>${facility.SUBMID}</h4>
                    <p>${facility.FACILITY_NAME}</p>
                    <span class="facility-location">${document.getElementById('provinceFilter').value}</span>
                </div>
            </div>
            <div class="facility-stats">
                <div class="stat-item">
                    <div class="stat-number">${(facility.TOTAL_SAMPLE_COUNT || 0).toLocaleString()}</div>
                    <div class="stat-label">Total Samples</div>
                </div>
                <div class="stat-item">
                    <div class="stat-number">${(facility.TOTAL_UNSAT_RATE || 0).toFixed(1)}%</div>
                    <div class="stat-label">Unsat Rate</div>
                </div>
            </div>
        `;
        
        facilitiesGrid.appendChild(facilityCard);
    });
}

// Updated showFacilityPerformance function to work with API data
function showFacilityPerformance(facility) {
    // Hide facilities section and show performance section
    document.getElementById('facilitiesSection').style.display = 'none';
    document.getElementById('performanceSection').style.display = 'block';
    
    // Update facility information
    document.getElementById('facilityCode').textContent = facility.SUBMID;
    document.getElementById('facilityName').textContent = facility.FACILITY_NAME;
    document.getElementById('selectedFacilityTitle').textContent = `${facility.FACILITY_NAME} Performance Overview`;
    
    // Update sample statistics
    document.getElementById('totalSamples').textContent = (facility.TOTAL_SAMPLE_COUNT || 0).toLocaleString();
    document.getElementById('averageAOC').textContent = (facility.AVE_AOC || 0).toFixed(1);
    document.getElementById('avgTransitTime').textContent = (facility.TRANSIT_TIME || 0).toFixed(1) + 'd';
    
    // Update birth classification
    document.getElementById('inbornTotal').textContent = (facility.TOTAL_INBORN || 0).toLocaleString();
    document.getElementById('outbornTotal').textContent = (facility.OUTBORN_TOTAL || 0).toLocaleString();
    document.getElementById('avgAOCInborn').textContent = (facility.INBORN_AVERAGE || 0).toFixed(1);
    document.getElementById('avgAOCOutborn').textContent = (facility.OUTBORN_AVERAGE || 0).toFixed(1);
    
    // Update breakdown of outborn
    document.getElementById('homebirth').textContent = (facility.TOTAL_HOMEBIRTH || 0).toLocaleString();
    document.getElementById('hobNotEqualHO').textContent = (facility.TOTAL_HOB || 0).toLocaleString();
    document.getElementById('unknown').textContent = (facility.TOTAL_UNKNOWN || 0).toLocaleString();
    
    // Update unsatisfactory samples
    document.getElementById('contaminated').textContent = facility.CONTAMINATED || 0;
    document.getElementById('insufficient').textContent = facility.INSUFFICIENT || 0;
    document.getElementById('lessThan24h').textContent = facility.LESS_THAN_24_HOURS || 0;
    document.getElementById('dataErasures').textContent = facility.DATA_ERASURES || 0;
    document.getElementById('missingInfo').textContent = facility.MISSING_INFORMATION || 0;
    document.getElementById('totalUnsatCount').textContent = facility.TOTAL_UNSAT_COUNT || 0;
    document.getElementById('totalUnsatRate').textContent = (facility.TOTAL_UNSAT_RATE || 0).toFixed(1) + '%';
}

// Function to go back to facilities list
function backToFacilities() {
    document.getElementById('performanceSection').style.display = 'none';
    document.getElementById('facilitiesSection').style.display = 'block';
}

// Updated selectProvince function
function selectProvince(province) {
    console.log('Selected province:', province);
    
    // Update the filter dropdown to match selection
    document.getElementById('provinceFilter').value = province;
    
    // Remove active class from all cards
    const provinceCards = document.querySelectorAll('.province-card');
    provinceCards.forEach(card => {
        card.classList.remove('active');
        card.style.borderColor = 'transparent';
    });
    
    // Highlight selected province
    const selectedCard = document.querySelector(`[onclick="selectProvince('${province}')"]`);
    if (selectedCard) {
        selectedCard.classList.add('active');
        selectedCard.style.borderColor = '#667eea';
    }
}

// Add some interactivity
document.addEventListener('DOMContentLoaded', function() {
    // Add click handlers for cards
    const cards = document.querySelectorAll('.province-card');
    cards.forEach(card => {
        card.addEventListener('click', function() {
            // Remove active class from all cards
            cards.forEach(c => c.classList.remove('active'));
            // Add active class to clicked card
            this.classList.add('active');
        });
    });
    
    // Set default dates (optional)
    const today = new Date();
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
    
    document.getElementById('startDate').value = lastMonth.toISOString().split('T')[0];
    document.getElementById('endDate').value = today.toISOString().split('T')[0];
});