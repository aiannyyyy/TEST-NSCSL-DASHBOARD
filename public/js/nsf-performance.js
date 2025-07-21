// Facility Performance Frontend Script
let facilityData = [];
let currentProvinceData = {};

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    // Set default date range (current month - first day to last day)
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth(); // 0-based month (July = 6)
    
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0); // Day 0 of next month = last day of current month
    
    // Format dates to YYYY-MM-DD for input fields
    const startDateStr = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const endDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDayOfMonth.getDate()).padStart(2, '0')}`;
    
    console.log('Today:', today);
    console.log('Month (0-based):', month);
    console.log('First day of month:', firstDayOfMonth);
    console.log('Last day of month:', lastDayOfMonth);
    console.log('Start date string:', startDateStr);
    console.log('End date string:', endDateStr);
    
    document.getElementById('startDate').value = startDateStr;
    document.getElementById('endDate').value = endDateStr;
    
    // Set default province in dropdown
    document.getElementById('provinceFilter').value = 'batangas';
    
    // Load initial data for default province (Batangas)
    loadProvinceData('BATANGAS');
});

// Apply filters and fetch data
async function applyFilters() {
    const province = document.getElementById('provinceFilter').value.toUpperCase();
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;

    if (!startDate || !endDate) {
        alert('Please select both start and end dates');
        return;
    }

    if (new Date(startDate) > new Date(endDate)) {
        alert('Start date cannot be after end date');
        return;
    }

    await loadProvinceData(province, startDate, endDate);
}

// Load data for a specific province
async function loadProvinceData(county, dateFrom = null, dateTo = null) {
    try {
        // Show loading indicator
        showLoading(true);

        // Set default dates if not provided (current month - first day to last day)
        if (!dateFrom || !dateTo) {
            const today = new Date();
            const year = today.getFullYear();
            const month = today.getMonth();
            
            const lastDayOfMonth = new Date(year, month + 1, 0);
            
            dateFrom = `${year}-${String(month + 1).padStart(2, '0')}-01`;
            dateTo = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDayOfMonth.getDate()).padStart(2, '0')}`;
        }

        const url = `http://localhost:3001/api/nsf-performance?county=${encodeURIComponent(county)}&dateFrom=${dateFrom}&dateTo=${dateTo}`;
        console.log('Fetching data from:', url);

        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (Array.isArray(data) && data.length > 0) {
            facilityData = data;
            currentProvinceData = aggregateProvinceData(data, county);
            updateProvinceDisplay();
            updateFacilitiesDisplay(data);
            console.log('Data loaded successfully:', data.length, 'facilities');
        } else {
            console.warn('No data found for the selected criteria');
            facilityData = [];
            showNoDataMessage();
        }

    } catch (error) {
        console.error('Error loading province data:', error);
        alert('Error loading data: ' + error.message);
        facilityData = [];
        showNoDataMessage();
    } finally {
        showLoading(false);
    }
}

// Aggregate data for province overview
function aggregateProvinceData(facilities, county) {
    const totalFacilities = facilities.length;
    const totalSamples = facilities.reduce((sum, f) => sum + (f.TOTAL_SAMPLE_COUNT || 0), 0);
    const totalUnsat = facilities.reduce((sum, f) => sum + (f.TOTAL_UNSAT_COUNT || 0), 0);
    const unsatRate = totalSamples > 0 ? ((totalUnsat / totalSamples) * 100).toFixed(1) : '0.0';

    return {
        name: county.toLowerCase(),
        facilities: totalFacilities,
        samples: totalSamples,
        unsatRate: unsatRate + '%'
    };
}

// Update province cards with real data
function updateProvinceDisplay() {
    const provinces = ['cavite', 'laguna', 'batangas', 'rizal', 'quezon'];
    
    provinces.forEach(province => {
        const card = document.querySelector(`.province-card[onclick*="${province}"]`);
        if (card && currentProvinceData.name === province) {
            // Update the selected province card
            const facilityCount = card.querySelector('.stat-item:nth-child(1) .stat-number');
            const sampleCount = card.querySelector('.stat-item:nth-child(2) .stat-number');
            const unsatRate = card.querySelector('.stat-item:nth-child(3) .stat-number');

            if (facilityCount) facilityCount.textContent = currentProvinceData.facilities;
            if (sampleCount) sampleCount.textContent = currentProvinceData.samples.toLocaleString();
            if (unsatRate) unsatRate.textContent = currentProvinceData.unsatRate;

            // Add visual indication for selected province
            card.classList.add('selected');
        } else if (card) {
            card.classList.remove('selected');
        }
    });
}

// Update facilities display with real data
function updateFacilitiesDisplay(facilities) {
    const facilitiesGrid = document.querySelector('.facilities-grid');
    
    if (!facilitiesGrid) {
        console.error('Facilities grid element not found');
        return;
    }

    // Clear existing facility cards
    facilitiesGrid.innerHTML = '';

    facilities.forEach(facility => {
        const facilityCard = createFacilityCard(facility);
        facilitiesGrid.appendChild(facilityCard);
    });

    // Update section title
    const sectionTitle = document.querySelector('#facilitiesSection .section-title');
    if (sectionTitle) {
        sectionTitle.innerHTML = `
            <div class="section-icon">
                <i class="fas fa-hospital"></i>
            </div>
            ${currentProvinceData.name.charAt(0).toUpperCase() + currentProvinceData.name.slice(1)} Facilities - Select to View Performance
        `;
    }
}

// Create facility card element
function createFacilityCard(facility) {
    const card = document.createElement('div');
    card.className = 'facility-card';
    card.onclick = () => showFacilityPerformance(
        facility.PROVIDER_ID, 
        facility.FACILITY_NAME, 
        currentProvinceData.name.charAt(0).toUpperCase() + currentProvinceData.name.slice(1)
    );

    const unsatRate = facility.TOTAL_UNSAT_RATE || 0;
    
    card.innerHTML = `
        <div class="facility-header">
            <div class="facility-icon">
                <i class="fas fa-hospital"></i>
            </div>
            <div class="facility-info">
                <h4>${facility.PROVIDER_ID}</h4>
                <p>${facility.FACILITY_NAME}</p>
                <span class="facility-location">${currentProvinceData.name.charAt(0).toUpperCase() + currentProvinceData.name.slice(1)}</span>
            </div>
        </div>
        <div class="facility-stats">
            <div class="stat-item">
                <div class="stat-number">${(facility.TOTAL_SAMPLE_COUNT || 0).toLocaleString()}</div>
                <div class="stat-label">Total Samples</div>
            </div>
            <div class="stat-item">
                <div class="stat-number">${unsatRate.toFixed(1)}%</div>
                <div class="stat-label">Unsat Rate</div>
            </div>
        </div>
    `;

    return card;
}

// Show individual facility performance
function showFacilityPerformance(facilityId, facilityName, province) {
    const facility = facilityData.find(f => f.PROVIDER_ID === facilityId);
    
    if (!facility) {
        console.error('Facility not found:', facilityId);
        return;
    }

    // Hide facilities section and show performance section
    document.getElementById('facilitiesSection').style.display = 'none';
    document.getElementById('performanceSection').style.display = 'block';

    // Update section title
    document.getElementById('selectedFacilityTitle').textContent = 
        `${facilityName} (${facilityId}) - Performance Overview`;

    // Update facility information
    document.getElementById('facilityCode').textContent = facility.PROVIDER_ID;
    document.getElementById('facilityName').textContent = facility.FACILITY_NAME;

    // Update sample statistics
    document.getElementById('totalSamples').textContent = (facility.TOTAL_SAMPLE_COUNT || 0).toLocaleString();
    document.getElementById('averageAOC').textContent = facility.AVE_AOC || '0.0';
    document.getElementById('avgTransitTime').textContent = facility.TRANSIT_TIME ? facility.TRANSIT_TIME + 'd' : '0.0d';

    // Update birth classification
    document.getElementById('inbornTotal').textContent = (facility.TOTAL_INBORN || 0).toLocaleString();
    document.getElementById('outbornTotal').textContent = (facility.OUTBORN_TOTAL || 0).toLocaleString();
    document.getElementById('avgAOCInborn').textContent = facility.INBORN_AVERAGE || '0.0';
    document.getElementById('avgAOCOutborn').textContent = facility.OUTBORN_AVERAGE || '0.0';

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

// Go back to facilities view
function backToFacilities() {
    document.getElementById('performanceSection').style.display = 'none';
    document.getElementById('facilitiesSection').style.display = 'block';
}

// Select province (called from province card onclick)
function selectProvince(province) {
    const provinceFilter = document.getElementById('provinceFilter');
    provinceFilter.value = province;
    applyFilters();
}

// Show/hide loading indicator
function showLoading(show) {
    // You can implement a loading spinner here
    const loadingClass = 'loading';
    const body = document.body;
    
    if (show) {
        body.classList.add(loadingClass);
        console.log('Loading data...');
    } else {
        body.classList.remove(loadingClass);
    }
}

// Show no data message
function showNoDataMessage() {
    const facilitiesGrid = document.querySelector('.facilities-grid');
    if (facilitiesGrid) {
        facilitiesGrid.innerHTML = `
            <div class="no-data-message" style="grid-column: 1 / -1; text-align: center; padding: 2rem;">
                <i class="fas fa-exclamation-circle" style="font-size: 3rem; color: #ffc107; margin-bottom: 1rem;"></i>
                <h3>No Data Available</h3>
                <p>No facility data found for the selected criteria. Please try different filters.</p>
            </div>
        `;
    }
}

// Utility function to format numbers
function formatNumber(num) {
    if (num === null || num === undefined) return '0';
    return parseInt(num).toLocaleString();
}

// Utility function to format percentages
function formatPercentage(num) {
    if (num === null || num === undefined) return '0.0%';
    return parseFloat(num).toFixed(1) + '%';
}

// Add some CSS for loading state and selected province
const style = document.createElement('style');
style.textContent = `
    .loading {
        cursor: wait;
    }
    
    .province-card.selected {
        border: 2px solid #007bff;
        box-shadow: 0 4px 12px rgba(0, 123, 255, 0.3);
    }
    
    .no-data-message {
        background: #f8f9fa;
        border: 2px dashed #dee2e6;
        border-radius: 8px;
    }
    
    .facility-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        transition: all 0.3s ease;
    }
`;
document.head.appendChild(style);