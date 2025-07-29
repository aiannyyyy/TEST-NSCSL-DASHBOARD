/*
// Facility Performance Frontend Script
let facilityData = [];
let currentProvinceData = {};
let allProvincesData = {}; // Store data for all provinces

// Province mapping for consistent naming
const PROVINCE_MAPPING = {
    'cavite': 'CAVITE',
    'laguna': 'LAGUNA', 
    'batangas': 'BATANGAS',
    'rizal': 'RIZAL',
    'quezon': 'QUEZON'
};

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
    
    // Load data for all provinces initially
    loadAllProvincesData();
    
    // Load initial data for default province (Batangas)
    loadProvinceData('BATANGAS');
});

// Load data for all provinces to display on cards
async function loadAllProvincesData(dateFrom = null, dateTo = null) {
    try {
        showLoading(true);
        
        // Set default dates if not provided
        if (!dateFrom || !dateTo) {
            const today = new Date();
            const year = today.getFullYear();
            const month = today.getMonth();
            
            const lastDayOfMonth = new Date(year, month + 1, 0);
            
            dateFrom = `${year}-${String(month + 1).padStart(2, '0')}-01`;
            dateTo = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDayOfMonth.getDate()).padStart(2, '0')}`;
        }

        // Load data for each province
        const provinces = Object.keys(PROVINCE_MAPPING);
        const promises = provinces.map(async (province) => {
            try {
                const county = PROVINCE_MAPPING[province];
                const url = `http://localhost:3001/api/nsf-performance?county=${encodeURIComponent(county)}&dateFrom=${dateFrom}&dateTo=${dateTo}`;
                console.log(`Fetching data for ${province}:`, url);

                const response = await fetch(url);
                
                if (!response.ok) {
                    console.warn(`Failed to fetch data for ${province}: ${response.status}`);
                    return { province, data: [] };
                }

                const data = await response.json();
                return { 
                    province, 
                    data: Array.isArray(data) ? data : [] 
                };
            } catch (error) {
                console.error(`Error fetching data for ${province}:`, error);
                return { province, data: [] };
            }
        });

        const results = await Promise.all(promises);
        
        // Store all provinces data
        allProvincesData = {};
        results.forEach(({ province, data }) => {
            allProvincesData[province] = aggregateProvinceData(data, PROVINCE_MAPPING[province]);
        });

        // Update all province cards
        updateAllProvinceCards();
        
        console.log('All provinces data loaded:', allProvincesData);

    } catch (error) {
        console.error('Error loading all provinces data:', error);
    } finally {
        showLoading(false);
    }
}

async function applyFilters() {
    const province = document.getElementById('provinceFilter').value.toUpperCase();
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    const loading = document.getElementById('loadingIndicator');

    if (!startDate || !endDate) {
        alert('Please select both start and end dates');
        return;
    }

    if (new Date(startDate) > new Date(endDate)) {
        alert('Start date cannot be after end date');
        return;
    }

    // Show loading indicator
    if (loading) loading.style.display = 'block';

    try {
        // Load data for all provinces with new date range
        await loadAllProvincesData(startDate, endDate);

        // Load detailed data for selected province
        await loadProvinceData(province, startDate, endDate);
    } catch (error) {
        console.error('Error loading data:', error);
        alert('An error occurred while loading data.');
    } finally {
        // Hide loading indicator
        if (loading) loading.style.display = 'none';
    }
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
            updateProvinceSelection();
            updateFacilitiesDisplay(data);
            console.log('Data loaded successfully:', data.length, 'facilities');
        } else {
            console.warn('No data found for the selected criteria');
            facilityData = [];
            currentProvinceData = aggregateProvinceData([], county);
            updateProvinceSelection();
            showNoDataMessage();
        }

    } catch (error) {
        console.error('Error loading province data:', error);
        alert('Error loading data: ' + error.message);
        facilityData = [];
        currentProvinceData = aggregateProvinceData([], county);
        updateProvinceSelection();
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
    const unsatRate = totalSamples > 0 ? ((totalUnsat / totalSamples) * 100) : 0;

    return {
        name: county.toLowerCase(),
        facilities: totalFacilities,
        samples: totalSamples,
        unsatRate: unsatRate,
        unsatCount: totalUnsat
    };
}

// Update all province cards with their respective data
function updateAllProvinceCards() {
    const provinces = Object.keys(PROVINCE_MAPPING);
    
    provinces.forEach(province => {
        const card = document.querySelector(`.province-card[onclick*="${province}"]`);
        if (card && allProvincesData[province]) {
            const data = allProvincesData[province];
            
            // Update the province card with its own data
            const facilityCount = card.querySelector('.stat-item:nth-child(1) .stat-number');
            const sampleCount = card.querySelector('.stat-item:nth-child(2) .stat-number');
            const unsatRate = card.querySelector('.stat-item:nth-child(3) .stat-number');

            if (facilityCount) facilityCount.textContent = data.facilities;
            if (sampleCount) sampleCount.textContent = data.samples.toLocaleString();
            if (unsatRate) unsatRate.textContent = data.unsatRate.toFixed(1) + '%';
        }
    });
}

// Update province selection highlighting
function updateProvinceSelection() {
    const provinces = Object.keys(PROVINCE_MAPPING);
    
    provinces.forEach(province => {
        const card = document.querySelector(`.province-card[onclick*="${province}"]`);
        if (card) {
            if (currentProvinceData.name === province) {
                card.classList.add('selected');
            } else {
                card.classList.remove('selected');
            }
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

    // Update section title with search input
    const sectionTitle = document.querySelector('#facilitiesSection .section-title');
    if (sectionTitle) {
        sectionTitle.innerHTML = `
            <div class="d-flex align-items-center gap-2 mb-2 mb-md-0">
                <div class="section-icon">
                    <i class="fas fa-hospital fa-lg text-primary"></i>
                </div>
                <span class="fw-semibold fs-5">${currentProvinceData.name.charAt(0).toUpperCase() + currentProvinceData.name.slice(1)} Facilities - Select to View Performance</span>
            </div>
            <div class="d-flex align-items-center gap-2">
                <label for="searchCode" class="form-label mb-0 fw-semibold">Search:</label>
                <input type="text" id="searchCode" class="form-control" style="width: 200px;" placeholder="Search Facility Code...">
            </div>
        `;
        
        // Re-attach the search event listener after updating the HTML
        const searchInput = document.getElementById('searchCode');
        if (searchInput) {
            searchInput.addEventListener('input', filterFacilities);
        }
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

// FIXED SEARCH FUNCTIONALITY
function filterFacilities() {
    const searchValue = document.getElementById('searchCode').value.toLowerCase().trim();
    const facilitiesGrid = document.querySelector('.facilities-grid');
    
    if (!facilitiesGrid) {
        console.error('Facilities grid not found');
        return;
    }

    // Get all facility cards
    const facilityCards = facilitiesGrid.querySelectorAll('.facility-card');
    
    // If search is empty, show all facilities
    if (!searchValue) {
        facilityCards.forEach(card => {
            card.style.display = '';
            card.style.visibility = '';
        });
        showNoResultsMessage(false);
        return;
    }

    // Filter facilities based on search term
    let visibleCount = 0;
    facilityCards.forEach(card => {
        const facilityCode = card.querySelector('h4')?.textContent.toLowerCase() || '';
        const facilityName = card.querySelector('p')?.textContent.toLowerCase() || '';
        
        // Show card if facility code or name contains search term
        if (facilityCode.includes(searchValue) || facilityName.includes(searchValue)) {
            card.style.display = '';
            card.style.visibility = '';
            visibleCount++;
        } else {
            card.style.display = 'none';
            card.style.visibility = 'hidden';
        }
    });

    // Show "no results" message if no facilities match
    showNoResultsMessage(visibleCount === 0, searchValue);
}

function showNoResultsMessage(show, searchTerm = '') {
    const facilitiesGrid = document.querySelector('.facilities-grid');
    let noResultsDiv = document.getElementById('noSearchResults');
    
    if (show) {
        // Create "no results" message if it doesn't exist
        if (!noResultsDiv) {
            noResultsDiv = document.createElement('div');
            noResultsDiv.id = 'noSearchResults';
            noResultsDiv.className = 'no-results-message';
            noResultsDiv.style.cssText = `
                grid-column: 1 / -1; 
                text-align: center; 
                padding: 2rem;
                background: #f8f9fa;
                border: 2px dashed #dee2e6;
                border-radius: 8px;
                margin-top: 1rem;
            `;
            facilitiesGrid.appendChild(noResultsDiv);
        }
        
        noResultsDiv.innerHTML = `
            <i class="fas fa-search" style="font-size: 3rem; color: #6c757d; margin-bottom: 1rem;"></i>
            <h3>No Facilities Found</h3>
            <p>No facilities match the search term "<strong>${searchTerm}</strong>"</p>
            <p>Try searching by facility code (e.g., "F001") or facility name.</p>
        `;
        noResultsDiv.style.display = 'block';
    } else {
        // Hide "no results" message
        if (noResultsDiv) {
            noResultsDiv.style.display = 'none';
        }
    }
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
    const titleElement = document.getElementById('selectedFacilityTitle');
    if (titleElement) {
        titleElement.textContent = `${facilityName} (${facilityId}) - Performance Overview`;
    }

    // Update facility information
    const facilityCodeElement = document.getElementById('facilityCode');
    const facilityNameElement = document.getElementById('facilityName');
    if (facilityCodeElement) facilityCodeElement.textContent = facility.PROVIDER_ID;
    if (facilityNameElement) facilityNameElement.textContent = facility.FACILITY_NAME;

    // Update sample statistics
    const totalSamplesElement = document.getElementById('totalSamples');
    const averageAOCElement = document.getElementById('averageAOC');
    const avgTransitTimeElement = document.getElementById('avgTransitTime');
    
    if (totalSamplesElement) totalSamplesElement.textContent = (facility.TOTAL_SAMPLE_COUNT || 0).toLocaleString();
    if (averageAOCElement) averageAOCElement.textContent = facility.AVE_AOC || '0.0';
    if (avgTransitTimeElement) avgTransitTimeElement.textContent = facility.TRANSIT_TIME ? facility.TRANSIT_TIME + 'd' : '0.0d';

    // Update birth classification
    const inbornTotalElement = document.getElementById('inbornTotal');
    const outbornTotalElement = document.getElementById('outbornTotal');
    const avgAOCInbornElement = document.getElementById('avgAOCInborn');
    const avgAOCOutbornElement = document.getElementById('avgAOCOutborn');
    
    if (inbornTotalElement) inbornTotalElement.textContent = (facility.TOTAL_INBORN || 0).toLocaleString();
    if (outbornTotalElement) outbornTotalElement.textContent = (facility.OUTBORN_TOTAL || 0).toLocaleString();
    if (avgAOCInbornElement) avgAOCInbornElement.textContent = facility.INBORN_AVERAGE || '0.0';
    if (avgAOCOutbornElement) avgAOCOutbornElement.textContent = facility.OUTBORN_AVERAGE || '0.0';

    // Update breakdown of outborn
    const homebirthElement = document.getElementById('homebirth');
    const hobNotEqualHOElement = document.getElementById('hobNotEqualHO');
    const unknownElement = document.getElementById('unknown');
    
    if (homebirthElement) homebirthElement.textContent = (facility.TOTAL_HOMEBIRTH || 0).toLocaleString();
    if (hobNotEqualHOElement) hobNotEqualHOElement.textContent = (facility.TOTAL_HOB || 0).toLocaleString();
    if (unknownElement) unknownElement.textContent = (facility.TOTAL_UNKNOWN || 0).toLocaleString();

    // Update unsatisfactory samples
    const contaminatedElement = document.getElementById('contaminated');
    const insufficientElement = document.getElementById('insufficient');
    const lessThan24hElement = document.getElementById('lessThan24h');
    const dataErasuresElement = document.getElementById('dataErasures');
    const missingInfoElement = document.getElementById('missingInfo');
    const totalUnsatCountElement = document.getElementById('totalUnsatCount');
    const totalUnsatRateElement = document.getElementById('totalUnsatRate');
    
    if (contaminatedElement) contaminatedElement.textContent = facility.CONTAMINATED || 0;
    if (insufficientElement) insufficientElement.textContent = facility.INSUFFICIENT || 0;
    if (lessThan24hElement) lessThan24hElement.textContent = facility.LESS_THAN_24_HOURS || 0;
    if (dataErasuresElement) dataErasuresElement.textContent = facility.DATA_ERASURES || 0;
    if (missingInfoElement) missingInfoElement.textContent = facility.MISSING_INFORMATION || 0;
    if (totalUnsatCountElement) totalUnsatCountElement.textContent = facility.TOTAL_UNSAT_COUNT || 0;
    if (totalUnsatRateElement) totalUnsatRateElement.textContent = (facility.TOTAL_UNSAT_RATE || 0).toFixed(1) + '%';
}

// Go back to facilities view
function backToFacilities() {
    const performanceSection = document.getElementById('performanceSection');
    const facilitiesSection = document.getElementById('facilitiesSection');
    
    if (performanceSection) performanceSection.style.display = 'none';
    if (facilitiesSection) facilitiesSection.style.display = 'block';
}

// Select province (called from province card onclick)
function selectProvince(province) {
    const provinceFilter = document.getElementById('provinceFilter');
    if (provinceFilter) {
        provinceFilter.value = province;
    }
    
    // Load detailed data for the selected province
    const county = PROVINCE_MAPPING[province];
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    
    loadProvinceData(county, startDate, endDate);
}

// Show/hide loading indicator
function showLoading(show) {
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
        transform: scale(1.02);
    }
    
    .province-card {
        transition: all 0.3s ease;
    }
    
    .no-data-message {
        background: #f8f9fa;
        border: 2px dashed #dee2e6;
        border-radius: 8px;
    }
    
    .no-results-message {
        background: #f8f9fa;
        border: 2px dashed #dee2e6;
        border-radius: 8px;
    }
    
    .facility-card {
        transition: all 0.3s ease;

        min-height: fit-content;
        width: 100%;
        box-sizing: border-box;
    }
    
    .facility-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        transition: all 0.3s ease;
    }
    
    .facilities-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        gap: 1rem;
    }
    

    .facility-card[style*="display: none"] {
        display: none !important;
    }
    

    .province-card.loading .stat-number::after {
        content: '...';
        animation: loading 1.5s infinite;
    }
    
    @keyframes loading {
        0%, 66% { content: '...'; }
        33% { content: '..'; }
        66% { content: '.'; }
    }
`;

document.head.appendChild(style);

*/
let facilityData = [];
let currentProvinceData = {};
let allProvincesData = {}; // Store data for all provinces
let currentFacilityId = null; // Store the currently selected facility ID

// Province mapping for consistent naming
const PROVINCE_MAPPING = {
    'cavite': 'CAVITE',
    'laguna': 'LAGUNA', 
    'batangas': 'BATANGAS',
    'rizal': 'RIZAL',
    'quezon': 'QUEZON'
};

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
    
    // Load data for all provinces initially
    loadAllProvincesData();
    
    // Load initial data for default province (Batangas)
    loadProvinceData('BATANGAS');
});

// Load data for all provinces to display on cards
async function loadAllProvincesData(dateFrom = null, dateTo = null) {
    try {
        showLoading(true);
        
        // Set default dates if not provided
        if (!dateFrom || !dateTo) {
            const today = new Date();
            const year = today.getFullYear();
            const month = today.getMonth();
            
            const lastDayOfMonth = new Date(year, month + 1, 0);
            
            dateFrom = `${year}-${String(month + 1).padStart(2, '0')}-01`;
            dateTo = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDayOfMonth.getDate()).padStart(2, '0')}`;
        }

        // Load data for each province
        const provinces = Object.keys(PROVINCE_MAPPING);
        const promises = provinces.map(async (province) => {
            try {
                const county = PROVINCE_MAPPING[province];
                const url = `http://localhost:3001/api/nsf-performance?county=${encodeURIComponent(county)}&dateFrom=${dateFrom}&dateTo=${dateTo}`;
                console.log(`Fetching data for ${province}:`, url);

                const response = await fetch(url);
                
                if (!response.ok) {
                    console.warn(`Failed to fetch data for ${province}: ${response.status}`);
                    return { province, data: [] };
                }

                const data = await response.json();
                return { 
                    province, 
                    data: Array.isArray(data) ? data : [] 
                };
            } catch (error) {
                console.error(`Error fetching data for ${province}:`, error);
                return { province, data: [] };
            }
        });

        const results = await Promise.all(promises);
        
        // Store all provinces data
        allProvincesData = {};
        results.forEach(({ province, data }) => {
            allProvincesData[province] = aggregateProvinceData(data, PROVINCE_MAPPING[province]);
        });

        // Update all province cards
        updateAllProvinceCards();
        
        console.log('All provinces data loaded:', allProvincesData);

    } catch (error) {
        console.error('Error loading all provinces data:', error);
    } finally {
        showLoading(false);
    }
}

async function applyFilters() {
    const province = document.getElementById('provinceFilter').value.toUpperCase();
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    const loading = document.getElementById('loadingIndicator');

    if (!startDate || !endDate) {
        alert('Please select both start and end dates');
        return;
    }

    if (new Date(startDate) > new Date(endDate)) {
        alert('Start date cannot be after end date');
        return;
    }

    // Show loading indicator
    if (loading) loading.style.display = 'block';

    try {
        // Load data for all provinces with new date range
        await loadAllProvincesData(startDate, endDate);

        // Load detailed data for selected province
        await loadProvinceData(province, startDate, endDate);
    } catch (error) {
        console.error('Error loading data:', error);
        alert('An error occurred while loading data.');
    } finally {
        // Hide loading indicator
        if (loading) loading.style.display = 'none';
    }
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
            updateProvinceSelection();
            updateFacilitiesDisplay(data);
            console.log('Data loaded successfully:', data.length, 'facilities');
        } else {
            console.warn('No data found for the selected criteria');
            facilityData = [];
            currentProvinceData = aggregateProvinceData([], county);
            updateProvinceSelection();
            showNoDataMessage();
        }

    } catch (error) {
        console.error('Error loading province data:', error);
        alert('Error loading data: ' + error.message);
        facilityData = [];
        currentProvinceData = aggregateProvinceData([], county);
        updateProvinceSelection();
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
    const unsatRate = totalSamples > 0 ? ((totalUnsat / totalSamples) * 100) : 0;

    return {
        name: county.toLowerCase(),
        facilities: totalFacilities,
        samples: totalSamples,
        unsatRate: unsatRate,
        unsatCount: totalUnsat
    };
}

// Update all province cards with their respective data
function updateAllProvinceCards() {
    const provinces = Object.keys(PROVINCE_MAPPING);
    
    provinces.forEach(province => {
        const card = document.querySelector(`.province-card[onclick*="${province}"]`);
        if (card && allProvincesData[province]) {
            const data = allProvincesData[province];
            
            // Update the province card with its own data
            const facilityCount = card.querySelector('.stat-item:nth-child(1) .stat-number');
            const sampleCount = card.querySelector('.stat-item:nth-child(2) .stat-number');
            const unsatRate = card.querySelector('.stat-item:nth-child(3) .stat-number');

            if (facilityCount) facilityCount.textContent = data.facilities;
            if (sampleCount) sampleCount.textContent = data.samples.toLocaleString();
            if (unsatRate) unsatRate.textContent = data.unsatRate.toFixed(1) + '%';
        }
    });
}

// Update province selection highlighting
function updateProvinceSelection() {
    const provinces = Object.keys(PROVINCE_MAPPING);
    
    provinces.forEach(province => {
        const card = document.querySelector(`.province-card[onclick*="${province}"]`);
        if (card) {
            if (currentProvinceData.name === province) {
                card.classList.add('selected');
            } else {
                card.classList.remove('selected');
            }
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

    // Update section title with search input
    const sectionTitle = document.querySelector('#facilitiesSection .section-title');
    if (sectionTitle) {
        sectionTitle.innerHTML = `
            <div class="d-flex align-items-center gap-2 mb-2 mb-md-0">
                <div class="section-icon">
                    <i class="fas fa-hospital fa-lg text-primary"></i>
                </div>
                <span class="fw-semibold fs-5">${currentProvinceData.name.charAt(0).toUpperCase() + currentProvinceData.name.slice(1)} Facilities - Select to View Performance</span>
            </div>
            <div class="d-flex align-items-center gap-2">
                <label for="searchCode" class="form-label mb-0 fw-semibold">Search:</label>
                <input type="text" id="searchCode" class="form-control" style="width: 200px;" placeholder="Search Facility Code...">
            </div>
        `;
        
        // Re-attach the search event listener after updating the HTML
        const searchInput = document.getElementById('searchCode');
        if (searchInput) {
            searchInput.addEventListener('input', filterFacilities);
        }
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

// FIXED SEARCH FUNCTIONALITY
function filterFacilities() {
    const searchValue = document.getElementById('searchCode').value.toLowerCase().trim();
    const facilitiesGrid = document.querySelector('.facilities-grid');
    
    if (!facilitiesGrid) {
        console.error('Facilities grid not found');
        return;
    }

    // Get all facility cards
    const facilityCards = facilitiesGrid.querySelectorAll('.facility-card');
    
    // If search is empty, show all facilities
    if (!searchValue) {
        facilityCards.forEach(card => {
            card.style.display = '';
            card.style.visibility = '';
        });
        showNoResultsMessage(false);
        return;
    }

    // Filter facilities based on search term
    let visibleCount = 0;
    facilityCards.forEach(card => {
        const facilityCode = card.querySelector('h4')?.textContent.toLowerCase() || '';
        const facilityName = card.querySelector('p')?.textContent.toLowerCase() || '';
        
        // Show card if facility code or name contains search term
        if (facilityCode.includes(searchValue) || facilityName.includes(searchValue)) {
            card.style.display = '';
            card.style.visibility = '';
            visibleCount++;
        } else {
            card.style.display = 'none';
            card.style.visibility = 'hidden';
        }
    });

    // Show "no results" message if no facilities match
    showNoResultsMessage(visibleCount === 0, searchValue);
}

function showNoResultsMessage(show, searchTerm = '') {
    const facilitiesGrid = document.querySelector('.facilities-grid');
    let noResultsDiv = document.getElementById('noSearchResults');
    
    if (show) {
        // Create "no results" message if it doesn't exist
        if (!noResultsDiv) {
            noResultsDiv = document.createElement('div');
            noResultsDiv.id = 'noSearchResults';
            noResultsDiv.className = 'no-results-message';
            noResultsDiv.style.cssText = `
                grid-column: 1 / -1; 
                text-align: center; 
                padding: 2rem;
                background: #f8f9fa;
                border: 2px dashed #dee2e6;
                border-radius: 8px;
                margin-top: 1rem;
            `;
            facilitiesGrid.appendChild(noResultsDiv);
        }
        
        noResultsDiv.innerHTML = `
            <i class="fas fa-search" style="font-size: 3rem; color: #6c757d; margin-bottom: 1rem;"></i>
            <h3>No Facilities Found</h3>
            <p>No facilities match the search term "<strong>${searchTerm}</strong>"</p>
            <p>Try searching by facility code (e.g., "F001") or facility name.</p>
        `;
        noResultsDiv.style.display = 'block';
    } else {
        // Hide "no results" message
        if (noResultsDiv) {
            noResultsDiv.style.display = 'none';
        }
    }
}

// Show individual facility performance
function showFacilityPerformance(facilityId, facilityName, province) {
    const facility = facilityData.find(f => f.PROVIDER_ID === facilityId);
    
    if (!facility) {
        console.error('Facility not found:', facilityId);
        return;
    }

    // Store the current facility ID for report generation
    currentFacilityId = facilityId;

    // Hide facilities section and show performance section
    document.getElementById('facilitiesSection').style.display = 'none';
    document.getElementById('performanceSection').style.display = 'block';

    // Update section title
    const titleElement = document.getElementById('selectedFacilityTitle');
    if (titleElement) {
        titleElement.textContent = `${facilityName} (${facilityId}) - Performance Overview`;
    }

    // Update facility information
    const facilityCodeElement = document.getElementById('facilityCode');
    const facilityNameElement = document.getElementById('facilityName');
    if (facilityCodeElement) facilityCodeElement.textContent = facility.PROVIDER_ID;
    if (facilityNameElement) facilityNameElement.textContent = facility.FACILITY_NAME;

    // Update sample statistics
    const totalSamplesElement = document.getElementById('totalSamples');
    const averageAOCElement = document.getElementById('averageAOC');
    const avgTransitTimeElement = document.getElementById('avgTransitTime');
    
    if (totalSamplesElement) totalSamplesElement.textContent = (facility.TOTAL_SAMPLE_COUNT || 0).toLocaleString();
    if (averageAOCElement) averageAOCElement.textContent = facility.AVE_AOC || '0.0';
    if (avgTransitTimeElement) avgTransitTimeElement.textContent = facility.TRANSIT_TIME ? facility.TRANSIT_TIME + 'd' : '0.0d';

    // Update birth classification
    const inbornTotalElement = document.getElementById('inbornTotal');
    const outbornTotalElement = document.getElementById('outbornTotal');
    const avgAOCInbornElement = document.getElementById('avgAOCInborn');
    const avgAOCOutbornElement = document.getElementById('avgAOCOutborn');
    
    if (inbornTotalElement) inbornTotalElement.textContent = (facility.TOTAL_INBORN || 0).toLocaleString();
    if (outbornTotalElement) outbornTotalElement.textContent = (facility.OUTBORN_TOTAL || 0).toLocaleString();
    if (avgAOCInbornElement) avgAOCInbornElement.textContent = facility.INBORN_AVERAGE || '0.0';
    if (avgAOCOutbornElement) avgAOCOutbornElement.textContent = facility.OUTBORN_AVERAGE || '0.0';

    // Update breakdown of outborn
    const homebirthElement = document.getElementById('homebirth');
    const hobNotEqualHOElement = document.getElementById('hobNotEqualHO');
    const unknownElement = document.getElementById('unknown');
    
    if (homebirthElement) homebirthElement.textContent = (facility.TOTAL_HOMEBIRTH || 0).toLocaleString();
    if (hobNotEqualHOElement) hobNotEqualHOElement.textContent = (facility.TOTAL_HOB || 0).toLocaleString();
    if (unknownElement) unknownElement.textContent = (facility.TOTAL_UNKNOWN || 0).toLocaleString();

    // Update unsatisfactory samples
    const contaminatedElement = document.getElementById('contaminated');
    const insufficientElement = document.getElementById('insufficient');
    const lessThan24hElement = document.getElementById('lessThan24h');
    const dataErasuresElement = document.getElementById('dataErasures');
    const missingInfoElement = document.getElementById('missingInfo');
    const totalUnsatCountElement = document.getElementById('totalUnsatCount');
    const totalUnsatRateElement = document.getElementById('totalUnsatRate');
    
    if (contaminatedElement) contaminatedElement.textContent = facility.CONTAMINATED || 0;
    if (insufficientElement) insufficientElement.textContent = facility.INSUFFICIENT || 0;
    if (lessThan24hElement) lessThan24hElement.textContent = facility.LESS_THAN_24_HOURS || 0;
    if (dataErasuresElement) dataErasuresElement.textContent = facility.DATA_ERASURES || 0;
    if (missingInfoElement) missingInfoElement.textContent = facility.MISSING_INFORMATION || 0;
    if (totalUnsatCountElement) totalUnsatCountElement.textContent = facility.TOTAL_UNSAT_COUNT || 0;
    if (totalUnsatRateElement) totalUnsatRateElement.textContent = (facility.TOTAL_UNSAT_RATE || 0).toFixed(1) + '%';
}

// Generate Report function - opens PDF in new tab
function generateReport() {
    // Check if a facility is currently selected
    if (!currentFacilityId) {
        alert('Please select a facility first to generate a report.');
        return;
    }

    // Get the date range from the filter inputs
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;

    // Validate dates
    if (!startDate || !endDate) {
        alert('Please select both start and end dates.');
        return;
    }

    if (new Date(startDate) > new Date(endDate)) {
        alert('Start date cannot be after end date.');
        return;
    }

    // Show loading message
    const originalText = 'Generate Report';
    const generateButton = document.querySelector('button[onclick="generateReport()"]');
    if (generateButton) {
        generateButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating Report...';
        generateButton.disabled = true;
    }

    // Build the report URL
    const reportUrl = `http://localhost:3001/api/generate-report?submid=${encodeURIComponent(currentFacilityId)}&from=${startDate}&to=${endDate}`;
    
    console.log('Generating report with URL:', reportUrl);

    // Open the PDF in a new tab
    const newWindow = window.open(reportUrl, '_blank');
    
    // Check if popup was blocked
    if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
        alert('Popup blocked! Please allow popups for this site to view the report, or manually navigate to:\n' + reportUrl);
    }

    // Reset button after a delay
    setTimeout(() => {
        if (generateButton) {
            generateButton.innerHTML = '<i class="fas fa-file-pdf"></i> Generate Report';
            generateButton.disabled = false;
        }
    }, 2000);
}

// Go back to facilities view
function backToFacilities() {
    // Clear the current facility ID when going back
    currentFacilityId = null;
    
    const performanceSection = document.getElementById('performanceSection');
    const facilitiesSection = document.getElementById('facilitiesSection');
    
    if (performanceSection) performanceSection.style.display = 'none';
    if (facilitiesSection) facilitiesSection.style.display = 'block';
}

// Select province (called from province card onclick)
function selectProvince(province) {
    const provinceFilter = document.getElementById('provinceFilter');
    if (provinceFilter) {
        provinceFilter.value = province;
    }
    
    // Load detailed data for the selected province
    const county = PROVINCE_MAPPING[province];
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    
    loadProvinceData(county, startDate, endDate);
}

// Show/hide loading indicator
function showLoading(show) {
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
        transform: scale(1.02);
    }
    
    .province-card {
        transition: all 0.3s ease;
    }
    
    .no-data-message {
        background: #f8f9fa;
        border: 2px dashed #dee2e6;
        border-radius: 8px;
    }
    
    .no-results-message {
        background: #f8f9fa;
        border: 2px dashed #dee2e6;
        border-radius: 8px;
    }
    
    .facility-card {
        transition: all 0.3s ease;
        /* Maintain original size and position in grid */
        min-height: fit-content;
        width: 100%;
        box-sizing: border-box;
    }
    
    .facility-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        transition: all 0.3s ease;
    }
    
    /* Ensure grid layout remains consistent during search */
    .facilities-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        gap: 1rem;
    }
    
    /* Keep the space for hidden cards to maintain grid layout */
    .facility-card[style*="display: none"] {
        display: none !important;
    }
    
    /* Loading spinner for province cards */
    .province-card.loading .stat-number::after {
        content: '...';
        animation: loading 1.5s infinite;
    }
    
    @keyframes loading {
        0%, 66% { content: '...'; }
        33% { content: '..'; }
        66% { content: '.'; }
    }
`;

document.head.appendChild(style);