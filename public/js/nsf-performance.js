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


//for generating report
// Simple Generate Report function - opens PDF directly in new tab
function generateReport(event) {
    // Prevent default form submission or page refresh
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }

    // Store current scroll position to maintain user's view
    const currentScrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const currentScrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

    // Ensure performance section remains visible
    const performanceSection = document.getElementById('performanceSection');
    const facilitiesSection = document.getElementById('facilitiesSection');
    
    if (performanceSection) {
        performanceSection.style.display = 'block';
    }
    if (facilitiesSection) {
        facilitiesSection.style.display = 'none';
    }

    // Check if a facility is currently selected
    if (!currentFacilityId) {
        alert('Please select a facility first to generate a report.');
        restorePageState(currentScrollLeft, currentScrollTop);
        return false;
    }

    // Get the date range from the filter inputs
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;

    // Validate dates
    if (!startDate || !endDate) {
        alert('Please select both start and end dates.');
        restorePageState(currentScrollLeft, currentScrollTop);
        return false;
    }

    if (new Date(startDate) > new Date(endDate)) {
        alert('Start date cannot be after end date.');
        restorePageState(currentScrollLeft, currentScrollTop);
        return false;
    }

    // Show loading message on button
    const generateButton = getGenerateButton();
    const originalButtonState = showLoadingState(generateButton);

    // Build the report URL - this will directly return the PDF
    const reportUrl = buildReportUrl(currentFacilityId, startDate, endDate);
    
    console.log('🚀 Generating report with URL:', reportUrl);
    console.log('📊 Report parameters:', {
        facility: currentFacilityId,
        dateRange: `${startDate} to ${endDate}`
    });

    try {
        // Open PDF directly in new tab
        const newWindow = window.open(reportUrl, '_blank', 'noopener,noreferrer');
        
        // Check if popup was blocked
        if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
            alert(`Popup blocked! Please allow popups for this site to view the report.\n\nOr manually open this URL in a new tab:\n${reportUrl}`);
            
            // Copy URL to clipboard as fallback
            copyToClipboard(reportUrl);
            console.log('📋 Report URL copied to clipboard');
        } else {
            console.log('✅ Report opened in new tab successfully');
        }
        
    } catch (error) {
        console.error('❌ Error opening report:', error);
        alert(`Error opening report: ${error.message}\n\nPlease try again or manually navigate to:\n${reportUrl}`);
        
        // Copy URL to clipboard as fallback
        copyToClipboard(reportUrl);
    }

    // Reset button state after a short delay
    setTimeout(() => {
        resetButtonState(generateButton, originalButtonState);
        restorePageState(currentScrollLeft, currentScrollTop);
    }, 2000);

    // Prevent any default behavior
    return false;
}

// Helper function to find the generate button
function getGenerateButton() {
    return document.querySelector('button[onclick*="generateReport"]') || 
           document.querySelector('[onclick*="generateReport"]') ||
           document.querySelector('#generateReportBtn') ||
           document.querySelector('.generate-report-btn');
}

// Show loading state on button
function showLoadingState(button) {
    if (!button) return null;

    const originalState = {
        text: button.innerHTML,
        disabled: button.disabled,
        cursor: button.style.cursor
    };
    
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating PDF...';
    button.disabled = true;
    button.style.cursor = 'wait';
    button.style.pointerEvents = 'none';
    
    return originalState;
}

// Reset button to original state
function resetButtonState(button, originalState) {
    if (!button || !originalState) return;
    
    button.innerHTML = originalState.text;
    button.disabled = originalState.disabled;
    button.style.cursor = originalState.cursor;
    button.style.pointerEvents = 'auto';
}

// Build report URL with proper encoding
function buildReportUrl(facilityId, startDate, endDate) {
    const baseUrl = window.location.protocol === 'https:' ? 
        'https://localhost:3001' : 'http://localhost:3001';
    
    // Encode parameters properly
    const params = new URLSearchParams({
        submid: facilityId.trim(),
        from: startDate,
        to: endDate
    });

    return `${baseUrl}/api/generate-report?${params.toString()}`;
}

// Restore page state (scroll position and section visibility)
function restorePageState(scrollLeft, scrollTop) {
    setTimeout(() => {
        window.scrollTo(scrollLeft, scrollTop);
        
        // Ensure sections remain in correct state
        const performanceSection = document.getElementById('performanceSection');
        const facilitiesSection = document.getElementById('facilitiesSection');
        
        if (performanceSection) {
            performanceSection.style.display = 'block';
        }
        if (facilitiesSection) {
            facilitiesSection.style.display = 'none';
        }
    }, 10);
}

// Copy text to clipboard utility
function copyToClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
        // Modern clipboard API
        navigator.clipboard.writeText(text).then(() => {
            console.log('📋 URL copied to clipboard');
        }).catch(err => {
            console.warn('Failed to copy to clipboard:', err);
            fallbackCopyToClipboard(text);
        });
    } else {
        // Fallback for older browsers
        fallbackCopyToClipboard(text);
    }
}

// Fallback clipboard function for older browsers
function fallbackCopyToClipboard(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
        const successful = document.execCommand('copy');
        if (successful) {
            console.log('📋 URL copied to clipboard (fallback method)');
        }
    } catch (err) {
        console.warn('Fallback copy failed:', err);
    } finally {
        document.body.removeChild(textArea);
    }
}

// Optional: Add a manual test function for debugging
function testReportGeneration() {
    console.log('🧪 Testing report generation...');
    console.log('Current facility ID:', currentFacilityId);
    console.log('Start date:', document.getElementById('startDate')?.value);
    console.log('End date:', document.getElementById('endDate')?.value);
    
    if (currentFacilityId) {
        const testUrl = buildReportUrl(currentFacilityId, '2025-07-01', '2025-07-25');
        console.log('🔗 Test URL:', testUrl);
        
        // You can uncomment this to test the URL directly
        // window.open(testUrl, '_blank');
    } else {
        console.warn('⚠️ No facility selected for testing');
    }
}
//end generating report

 // Global variables for modal functionality
let currentLabDetailsData = [];
let filteredLabDetailsData = [];
let currentModalContext = {};

// Function to show lab details modal
async function showLabDetailsModal(category, facilityId, facilityName, filterValue = null) {
    try {
        // Store context for later use
        currentModalContext = {
            category,
            facilityId,
            facilityName,
            filterValue
        };

        // Get date range from filters
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;

        if (!startDate || !endDate) {
            alert('Please select both start and end dates');
            return;
        }

        // Show modal and loading state
        const modal = new bootstrap.Modal(document.getElementById('labDetailsModal'));
        modal.show();
        
        showModalLoading(true);
        hideModalError();
        hideModalContent();

        // Update modal title
        document.getElementById('labDetailsModalLabel').innerHTML = `
            <i class="fas fa-flask me-2"></i>
            ${getCategoryDisplayName(category)} - Lab Details
        `;

        // Fetch data from API
        const url = `http://localhost:3001/api/nsf-performance-lab-details?submid=${encodeURIComponent(facilityId)}&dateFrom=${startDate}&dateTo=${endDate}`;
        console.log('Fetching lab details from:', url);

        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Lab details data received:', data.length, 'records');

        // Store the full dataset
        currentLabDetailsData = data;

        // Filter data based on category
        filteredLabDetailsData = filterDataByCategory(data, category, filterValue);

        // Update modal with data
        updateModalSummary(facilityName, startDate, endDate, category, filteredLabDetailsData.length);
        populateModalTable(filteredLabDetailsData);
        showModalContent();

    } catch (error) {
        console.error('Error fetching lab details:', error);
        showModalError('Failed to load lab details: ' + error.message);
    } finally {
        showModalLoading(false);
    }
}

// Filter data based on category
function filterDataByCategory(data, category, filterValue = null) {
    let filtered = data;

    switch (category) {
        case 'totalSamples':
            // Return all samples
            break;
            
        case 'inbornTotal':
            filtered = data.filter(item => item.BIRTH_CATEGORY === 'INBORN');
            break;
            
        case 'outbornTotal':
            filtered = data.filter(item => item.BIRTH_CATEGORY !== 'INBORN');
            break;
            
        case 'homebirth':
            filtered = data.filter(item => item.BIRTH_CATEGORY === 'HOMEBIRTH');
            break;
            
        case 'hobNotEqualHO':
            filtered = data.filter(item => item.BIRTH_CATEGORY === 'HOB');
            break;
            
        case 'unknown':
            filtered = data.filter(item => item.BIRTH_CATEGORY === 'UNKNOWN');
            break;
            
        case 'contaminated':
            filtered = data.filter(item => item.ISSUE_DESCRIPTION === 'CONTAMINATED');
            break;
            
        case 'insufficient':
            filtered = data.filter(item => item.ISSUE_DESCRIPTION === 'INSUFFICIENT');
            break;
            
        case 'lessThan24h':
            filtered = data.filter(item => item.ISSUE_DESCRIPTION === 'LESS_THAN_24_HOURS');
            break;
            
        case 'dataErasures':
            filtered = data.filter(item => item.ISSUE_DESCRIPTION === 'DATA_ERASURES');
            break;
            
        case 'missingInfo':
            filtered = data.filter(item => item.ISSUE_DESCRIPTION === 'MISSING_INFORMATION');
            break;
            
        case 'totalUnsatCount':
            filtered = data.filter(item => item.ISSUE_DESCRIPTION && item.ISSUE_DESCRIPTION !== 'NONE');
            break;
            
        default:
            console.warn('Unknown category:', category);
    }

    return filtered;
}

// Get display name for category
function getCategoryDisplayName(category) {
    const categoryNames = {
        'totalSamples': 'All Samples',
        'inbornTotal': 'Inborn Samples',
        'outbornTotal': 'Outborn Samples',
        'homebirth': 'Homebirth Samples',
        'hobNotEqualHO': 'HOB ≠ HO Samples',
        'unknown': 'Unknown Birth Location',
        'contaminated': 'Contaminated Samples',
        'insufficient': 'Insufficient Samples',
        'lessThan24h': 'Samples Collected <24h',
        'dataErasures': 'Samples with Data Erasures',
        'missingInfo': 'Samples with Missing Information',
        'totalUnsatCount': 'All Unsatisfactory Samples'
    };
    
    return categoryNames[category] || category;
}

// Update modal summary section
function updateModalSummary(facilityName, startDate, endDate, category, totalRecords) {
    document.getElementById('summaryFacility').textContent = facilityName;
    document.getElementById('summaryDateRange').textContent = `${startDate} to ${endDate}`;
    document.getElementById('summaryCategory').textContent = getCategoryDisplayName(category);
    document.getElementById('summaryTotal').textContent = totalRecords.toLocaleString();
}

// Populate modal table with data
function populateModalTable(data) {
    const tbody = document.getElementById('modalTableBody');
    tbody.innerHTML = '';

    if (data.length === 0) {
        document.getElementById('noResultsMessage').classList.remove('d-none');
        document.getElementById('modalFooterInfo').textContent = '';
        return;
    }

    document.getElementById('noResultsMessage').classList.add('d-none');

    data.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="font-monospace">${item.LABNO || ''}</td>
            <td>${formatPatientName(item.FNAME, item.LNAME)}</td>
            <td>
                <span class="badge badge-${(item.SPECTYPE_LABEL || '').toLowerCase()} badge-category">
                    ${item.SPECTYPE_LABEL || 'Unknown'}
                </span>
            </td>
        `;
        tbody.appendChild(row);
    });

    // Update footer info
    document.getElementById('modalFooterInfo').textContent = 
        `Showing ${data.length.toLocaleString()} of ${currentLabDetailsData.length.toLocaleString()} total records`;
}

// Format patient name
function formatPatientName(fname, lname) {
    const firstName = fname || '';
    const lastName = lname || '';
    
    if (!firstName && !lastName) return 'N/A';
    
    return `${lastName}, ${firstName}`.replace(/,\s*$/, '');
}

// Format birth category for display
function formatBirthCategory(category) {
    const categories = {
        'INBORN': 'Inborn',
        'HOMEBIRTH': 'Homebirth',
        'HOB': 'HOB ≠ HO',
        'UNKNOWN': 'Unknown',
        'OTHER': 'Other'
    };
    
    return categories[category] || category || 'Unknown';
}

// Format issue description for display
function formatIssueDescription(issue) {
    const issues = {
        'CONTAMINATED': 'Contaminated',
        'INSUFFICIENT': 'Insufficient',
        'LESS_THAN_24_HOURS': '<24 Hours',
        'DATA_ERASURES': 'Data Erasures',
        'MISSING_INFORMATION': 'Missing Info',
        'NONE': 'Satisfactory'
    };
    
    return issues[issue] || 'Satisfactory';
}

// Show/hide loading state
function showModalLoading(show) {
    const indicator = document.getElementById('modalLoadingIndicator');
    if (show) {
        indicator.classList.remove('d-none');
    } else {
        indicator.classList.add('d-none');
    }
}

// Show/hide error message
function showModalError(message) {
    const errorDiv = document.getElementById('modalErrorMessage');
    const errorText = document.getElementById('errorText');
    errorText.textContent = message;
    errorDiv.classList.remove('d-none');
}

function hideModalError() {
    document.getElementById('modalErrorMessage').classList.add('d-none');
}

// Show/hide modal content
function showModalContent() {
    document.getElementById('modalSummary').classList.remove('d-none');
    document.getElementById('modalFilters').classList.remove('d-none');
    document.getElementById('modalDataTable').classList.remove('d-none');
}

function hideModalContent() {
    document.getElementById('modalSummary').classList.add('d-none');
    document.getElementById('modalFilters').classList.add('d-none');
    document.getElementById('modalDataTable').classList.add('d-none');
}

// Filter functionality
function applyModalFilters() {
    const labnoFilter = document.getElementById('filterLabno').value.toLowerCase().trim();
    const nameFilter = document.getElementById('filterName').value.toLowerCase().trim();
    const spectypeFilter = document.getElementById('filterSpectype').value;

    let filtered = filteredLabDetailsData;

    if (labnoFilter) {
        filtered = filtered.filter(item => 
            (item.LABNO || '').toLowerCase().includes(labnoFilter)
        );
    }

    if (nameFilter) {
        filtered = filtered.filter(item => {
            const fullName = `${item.FNAME || ''} ${item.LNAME || ''}`.toLowerCase();
            return fullName.includes(nameFilter);
        });
    }

    if (spectypeFilter) {
        filtered = filtered.filter(item => item.SPECTYPE_LABEL === spectypeFilter);
    }

    populateModalTable(filtered);
}

// Export to CSV functionality
function exportModalDataToCsv() {
    if (!currentLabDetailsData || currentLabDetailsData.length === 0) {
        alert('No data to export');
        return;
    }

    const headers = ['Lab No', 'First Name', 'Last Name', 'Type'];
    const csvContent = [
        headers.join(','),
        ...filteredLabDetailsData.map(item => [
            `"${item.LABNO || ''}"`,
            `"${item.FNAME || ''}"`,
            `"${item.LNAME || ''}"`,
            `"${item.SPECTYPE_LABEL || ''}"`
        ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `lab_details_${currentModalContext.facilityId}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Event listeners for modal filters
document.addEventListener('DOMContentLoaded', function() {
    // Add event listeners for filter inputs
    document.getElementById('filterLabno').addEventListener('input', applyModalFilters);
    document.getElementById('filterName').addEventListener('input', applyModalFilters);
    document.getElementById('filterSpectype').addEventListener('change', applyModalFilters);
    
    // Export CSV button
    document.getElementById('exportCsvBtn').addEventListener('click', exportModalDataToCsv);
});

// Enhanced click handlers for performance metrics (add to your existing code)
function addClickHandlersToMetrics() {
    // Add click handlers to all clickable metrics
    const clickableMetrics = document.querySelectorAll('.clickable-metric');
    clickableMetrics.forEach(metric => {
        metric.addEventListener('click', function() {
            if (!currentFacilityId) {
                alert('Please select a facility first.');
                return;
            }

            const facilityName = document.getElementById('facilityName')?.textContent || 'Unknown Facility';
            const metricId = this.id;
            const metricValue = this.textContent.trim();

            // Only show modal if there are samples to display
            if (metricValue === '0' || metricValue === '-') {
                alert('No data available for this metric.');
                return;
            }

            showLabDetailsModal(metricId, currentFacilityId, facilityName);
        });
    });
}

// Updated showFacilityPerformance function (replace your existing one)
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

    // After updating all the metrics, add click handlers
    setTimeout(() => {
        addClickHandlersToMetrics();
    }, 100);
}


document.head.appendChild(style);