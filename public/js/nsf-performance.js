// API Configuration
const API_BASE_URL = 'http://localhost:3001/api';

// Function to fetch NSF performance data
async function fetchNSFPerformance(county, dateFrom, dateTo) {
    try {
        console.log('Fetching NSF performance data:', { county, dateFrom, dateTo });
        
        const response = await fetch(`${API_BASE_URL}/nsf-performance?county=${encodeURIComponent(county)}&dateFrom=${dateFrom}&dateTo=${dateTo}`);
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }
        
        const data = await response.json();
        console.log('API Response:', data);
        return data;
    } catch (error) {
        console.error('Error fetching NSF performance data:', error);
        throw error;
    }
}

// Function to show/hide loading state
function showLoading(show) {
    const applyButton = document.querySelector('.btn-primary');
    if (applyButton) {
        applyButton.disabled = show;
        applyButton.innerHTML = show ? 
            '<i class="fas fa-spinner fa-spin"></i> Loading...' : 
            '<i class="fas fa-search"></i> Apply Filters';
    }
    
    // Show/hide loading overlay on facilities grid
    const facilitiesGrid = document.querySelector('.facilities-grid');
    if (facilitiesGrid) {
        if (show) {
            facilitiesGrid.innerHTML = '<div class="loading-spinner">Loading facilities...</div>';
        }
    }
}

// Function to show error message
function showError(message) {
    const facilitiesGrid = document.querySelector('.facilities-grid');
    if (facilitiesGrid) {
        facilitiesGrid.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <p>${message}</p>
            </div>
        `;
    }
}

// Global function for selectProvince
window.selectProvince = function(province) {
    console.log('Selected province:', province);
    
    // Update the filter dropdown to match selection
    const provinceFilter = document.getElementById('provinceFilter');
    if (provinceFilter) {
        provinceFilter.value = province.toLowerCase();
    }
    
    // Remove active class from all cards
    const provinceCards = document.querySelectorAll('.province-card');
    provinceCards.forEach(card => {
        card.classList.remove('active');
        card.style.borderColor = 'transparent';
    });
    
    // Highlight selected province
    let selectedCard = document.querySelector(`[onclick="selectProvince('${province}')"]`);
    if (!selectedCard) {
        selectedCard = document.querySelector(`[onclick="selectProvince('${province.toLowerCase()}')"]`);
    }
    
    if (selectedCard) {
        selectedCard.classList.add('active');
        selectedCard.style.borderColor = '#667eea';
    }
    
    // Show facilities section
    document.getElementById('facilitiesSection').style.display = 'block';
    document.getElementById('performanceSection').style.display = 'none';
};

// Global function for applyFilters
window.applyFilters = async function() {
    const province = document.getElementById('provinceFilter').value;
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    
    console.log('Applying filters:', { province, startDate, endDate });
    
    // Validate inputs
    if (!province) {
        alert('Please select a province');
        return;
    }
    
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
        
        // Handle different response types
        if (performanceData.message && performanceData.message.includes('no rows')) {
            showError(`No data found for ${province} in the selected date range.`);
            updateProvinceCard(province, []);
        } else if (Array.isArray(performanceData) && performanceData.length > 0) {
            // Update the display with real data
            updateProvinceCard(province, performanceData);
            updateFacilitiesGrid(performanceData);
            
            // Auto-select the filtered province
            selectProvince(province);
        } else {
            showError(`No facilities found for ${province} in the selected date range.`);
            updateProvinceCard(province, []);
        }
        
    } catch (error) {
        console.error('Filter application error:', error);
        showError(`Error loading data: ${error.message}`);
    } finally {
        showLoading(false);
    }
};

// Function to update province card with real data
function updateProvinceCard(province, data) {
    // Calculate aggregated statistics
    const totalFacilities = data.length;
    const totalSamples = data.reduce((sum, facility) => sum + (facility.TOTAL_SAMPLE_COUNT || 0), 0);
    const avgUnsatRate = data.length > 0 ? 
        (data.reduce((sum, facility) => sum + (facility.TOTAL_UNSAT_RATE || 0), 0) / data.length).toFixed(1) : 0;
    
    console.log('Province card stats:', { totalFacilities, totalSamples, avgUnsatRate });
    
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
    
    if (!data || data.length === 0) {
        facilitiesGrid.innerHTML = '<div class="no-data">No facilities found for the selected criteria.</div>';
        return;
    }
    
    // Create facility cards from API data
    data.forEach(facility => {
        const facilityCard = document.createElement('div');
        facilityCard.className = 'facility-card';
        facilityCard.onclick = () => showFacilityPerformance(facility);
        
        // Calculate outborn percentage with safe fallbacks
        const totalSamples = Number(facility.TOTAL_SAMPLE_COUNT) || 0;
        const outbornTotal = Number(facility.OUTBORN_TOTAL) || 0;
        const outbornPercentage = totalSamples > 0 ? ((outbornTotal / totalSamples) * 100).toFixed(1) : 0;
        
        facilityCard.innerHTML = `
            <div class="facility-header">
                <div class="facility-icon">
                    <i class="fas fa-hospital"></i>
                </div>
                <div class="facility-info">
                    <h4>${facility.SUBMID || 'Unknown'}</h4>
                    <p>${facility.FACILITY_NAME || 'Unknown Facility'}</p>
                    <span class="facility-location">${document.getElementById('provinceFilter').value}</span>
                </div>
            </div>
            <div class="facility-stats">
                <div class="stat-item">
                    <div class="stat-number">${totalSamples.toLocaleString()}</div>
                    <div class="stat-label">Total Samples</div>
                </div>
                <div class="stat-item">
                    <div class="stat-number">${(Number(facility.TOTAL_UNSAT_RATE) || 0).toFixed(1)}%</div>
                    <div class="stat-label">Unsat Rate</div>
                </div>
                <div class="stat-item">
                    <div class="stat-number">${outbornPercentage}%</div>
                    <div class="stat-label">Outborn</div>
                </div>
            </div>
        `;
        
        facilitiesGrid.appendChild(facilityCard);
    });
}

// Helper function to safely get number value
function safeNumber(value, defaultValue = 0) {
    const num = Number(value);
    return isNaN(num) ? defaultValue : num;
}

// Helper function to safely format number
function safeFormat(value, decimals = 1) {
    const num = safeNumber(value);
    return num.toFixed(decimals);
}

// Global function for showFacilityPerformance - FIXED VERSION
window.showFacilityPerformance = function(facility) {
    console.log('Showing facility performance for:', facility);
    console.log('Facility object keys:', Object.keys(facility));
    
    // Hide facilities section and show performance section
    document.getElementById('facilitiesSection').style.display = 'none';
    document.getElementById('performanceSection').style.display = 'block';
    
    // Update facility information
    const facilityCodeEl = document.getElementById('facilityCode');
    const facilityNameEl = document.getElementById('facilityName');
    const selectedFacilityTitleEl = document.getElementById('selectedFacilityTitle');
    
    if (facilityCodeEl) facilityCodeEl.textContent = facility.SUBMID || 'N/A';
    if (facilityNameEl) facilityNameEl.textContent = facility.FACILITY_NAME || 'N/A';
    if (selectedFacilityTitleEl) {
        selectedFacilityTitleEl.textContent = `${facility.FACILITY_NAME || 'Unknown Facility'} Performance Overview`;
    }
    
    // Update sample statistics
    const totalSamplesEl = document.getElementById('totalSamples');
    const averageAOCEl = document.getElementById('averageAOC');
    const avgTransitTimeEl = document.getElementById('avgTransitTime');
    
    if (totalSamplesEl) totalSamplesEl.textContent = safeNumber(facility.TOTAL_SAMPLE_COUNT).toLocaleString();
    if (averageAOCEl) averageAOCEl.textContent = safeFormat(facility.AVE_AOC);
    if (avgTransitTimeEl) avgTransitTimeEl.textContent = safeFormat(facility.TRANSIT_TIME) + 'd';
    
    // Update birth classification
    const inbornTotalEl = document.getElementById('inbornTotal');
    const outbornTotalEl = document.getElementById('outbornTotal');
    const avgAOCInbornEl = document.getElementById('avgAOCInborn');
    const avgAOCOutbornEl = document.getElementById('avgAOCOutborn');
    
    if (inbornTotalEl) inbornTotalEl.textContent = safeNumber(facility.TOTAL_INBORN).toLocaleString();
    if (outbornTotalEl) outbornTotalEl.textContent = safeNumber(facility.OUTBORN_TOTAL).toLocaleString();
    if (avgAOCInbornEl) avgAOCInbornEl.textContent = safeFormat(facility.INBORN_AVERAGE);
    if (avgAOCOutbornEl) avgAOCOutbornEl.textContent = safeFormat(facility.OUTBORN_AVERAGE);
    
    // Update breakdown of outborn
    const homebirthEl = document.getElementById('homebirth');
    const hobNotEqualHOEl = document.getElementById('hobNotEqualHO');
    const unknownEl = document.getElementById('unknown');
    
    if (homebirthEl) homebirthEl.textContent = safeNumber(facility.TOTAL_HOMEBIRTH).toLocaleString();
    if (hobNotEqualHOEl) hobNotEqualHOEl.textContent = safeNumber(facility.TOTAL_HOB).toLocaleString();
    if (unknownEl) unknownEl.textContent = safeNumber(facility.TOTAL_UNKNOWN).toLocaleString();
    
    // Update unsatisfactory samples - FIXED FIELD MAPPING
    const contaminatedEl = document.getElementById('contaminated');
    const insufficientEl = document.getElementById('insufficient');
    const lessThan24hEl = document.getElementById('lessThan24h');
    const dataErasuresEl = document.getElementById('dataErasures');
    const missingInfoEl = document.getElementById('missingInfo');
    const totalUnsatCountEl = document.getElementById('totalUnsatCount');
    const totalUnsatRateEl = document.getElementById('totalUnsatRate');
    
    if (contaminatedEl) contaminatedEl.textContent = safeNumber(facility.CONTAMINATED);
    if (insufficientEl) insufficientEl.textContent = safeNumber(facility.INSUFFICIENT);
    if (lessThan24hEl) lessThan24hEl.textContent = safeNumber(facility.LESS_THAN_24_HOURS);
    if (dataErasuresEl) dataErasuresEl.textContent = safeNumber(facility.DATA_ERASURES);
    if (missingInfoEl) missingInfoEl.textContent = safeNumber(facility.MISSING_INFORMATION);
    if (totalUnsatCountEl) totalUnsatCountEl.textContent = safeNumber(facility.TOTAL_UNSAT_COUNT);
    if (totalUnsatRateEl) totalUnsatRateEl.textContent = safeFormat(facility.TOTAL_UNSAT_RATE) + '%';
    
    // Debug logging
    console.log('Updated facility performance display with:', {
        contaminated: facility.CONTAMINATED,
        insufficient: facility.INSUFFICIENT,
        lessThan24h: facility.LESS_THAN_24_HOURS,
        dataErasures: facility.DATA_ERASURES,
        missingInfo: facility.MISSING_INFORMATION,
        totalUnsatCount: facility.TOTAL_UNSAT_COUNT,
        totalUnsatRate: facility.TOTAL_UNSAT_RATE
    });
};

// Global function to go back to facilities list
window.backToFacilities = function() {
    document.getElementById('performanceSection').style.display = 'none';
    document.getElementById('facilitiesSection').style.display = 'block';
};

// Function to refresh data
async function refreshData() {
    const province = document.getElementById('provinceFilter').value;
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    
    if (province && startDate && endDate) {
        await applyFilters();
    }
}

// Debug function to check API response structure
async function debugAPIResponse() {
    try {
        const response = await fetchNSFPerformance('BATANGAS', '2024-01-01', '2024-12-31');
        console.log('Debug API Response:', response);
        console.log('Response type:', typeof response);
        console.log('Is array:', Array.isArray(response));
        if (Array.isArray(response) && response.length > 0) {
            console.log('First item keys:', Object.keys(response[0]));
            console.log('First item values:', response[0]);
        }
    } catch (error) {
        console.error('Debug API Error:', error);
    }
}

// DOM Content Loaded Event
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM Content Loaded - Initializing NSF Performance Dashboard');
    
    // Add click handlers for province cards
    const cards = document.querySelectorAll('.province-card');
    cards.forEach(card => {
        card.addEventListener('click', function() {
            // Remove active class from all cards
            cards.forEach(c => c.classList.remove('active'));
            // Add active class to clicked card
            this.classList.add('active');
        });
    });
    
    // Set default dates (last 30 days)
    const today = new Date();
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
    
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    
    if (startDateInput) {
        startDateInput.value = lastMonth.toISOString().split('T')[0];
        console.log('Set start date:', startDateInput.value);
    }
    if (endDateInput) {
        endDateInput.value = today.toISOString().split('T')[0];
        console.log('Set end date:', endDateInput.value);
    }
    
    // Add event listeners for form elements
    const applyButton = document.querySelector('.btn-primary');
    if (applyButton) {
        applyButton.addEventListener('click', applyFilters);
        console.log('Apply button event listener added');
    }
    
    // Add keyboard support for Enter key
    document.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            applyFilters();
        }
    });
    
    // Inject additional styles
    const additionalStyles = `
        .loading-spinner {
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 2rem;
            color: #666;
            font-size: 1.1rem;
        }
        
        .loading-spinner::before {
            content: '';
            display: inline-block;
            width: 20px;
            height: 20px;
            border: 2px solid #f3f3f3;
            border-top: 2px solid #667eea;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-right: 10px;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        .error-message {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 2rem;
            color: #d32f2f;
            text-align: center;
        }
        
        .error-message i {
            font-size: 2rem;
            margin-bottom: 1rem;
        }
        
        .no-data {
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 2rem;
            color: #666;
            font-style: italic;
        }
        
        .facility-card {
            cursor: pointer;
            transition: all 0.3s ease;
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            padding: 1rem;
            margin-bottom: 1rem;
        }
        
        .facility-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            border-color: #667eea;
        }
        
        .province-card.active {
            border: 2px solid #667eea !important;
            background-color: #f0f2ff;
        }
        
        .metric-item {
            text-align: center;
            padding: 0.5rem;
        }
        
        .metric-value {
            font-size: 1.5rem;
            font-weight: bold;
            color: #333;
        }
        
        .metric-label {
            font-size: 0.9rem;
            color: #666;
            margin-top: 0.25rem;
        }
    `;
    
    const styleSheet = document.createElement('style');
    styleSheet.innerText = additionalStyles;
    document.head.appendChild(styleSheet);
    
    console.log('NSF Performance Dashboard initialized successfully');
});

// Uncomment for debugging
// debugAPIResponse();