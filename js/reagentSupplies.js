document.addEventListener('DOMContentLoaded', function() {
    const REAGENT_DEFAULT_CRITICAL_TRESHOLD = 10;
    const REAGENT_DEFAULT_WARNING_TRESHOLD = 20;

    const itemThresholds = {
        'REA005': {critical: 5, warning: 7, unit:'boxes'},
        'REA006': {critical: 10, warning: 12, unit:'kits'},
        'REA007': {critical: 10, warning: 12, unit:'kits'},
        'REA008': {critical: 5, warning: 7, unit:'boxes'},
        'REA019': {critical: 10, warning: 12, unit:'kits'},
        'REA025': {critical: 2, warning: 4, unit:'bottles'},
        'REA028': {critical: 15, warning: 17, unit:'kits'},
        'REA029': {critical: 10, warning: 12, unit:'kits'},
        'REA030': {critical: 15, warning: 17, unit:'kits'},
        'REA031': {critical: 15, warning: 17, unit:'kits'},
        'REA032': {critical: 10, warning: 12, unit:'kits'},
        'REA033': {critical: 15, warning: 17, unit:'kits'},
        'REA036': {critical: 2, warning: 4, unit:'bottles'},
        'REA051': {critical: 1 , warning: 2, unit:'box'},
        'REA052': {critical: 1, warning: 2, unit:'box'},
        'REA053': {critical: 10, warning: 12, unit:'kits'},
        'REA054': {critical: 10, warning: 12, unit:'kits'},
        'REA057': {critical: 0.25, warning: 0.50, unit:'bottle'},
    }

    function fetchReagentSupplies() {
        // Try to fetch from the API, but use mock data if it fails
        fetch('http://localhost:3000/api/lab-reagents')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                // Map the data to the expected format
                const formattedData = data.map(item => ({
                    itemCode: item.itemcode,
                    description: item.description,
                    stocks_on_hand: item.stocks_on_hand
                }));
                
                displayReagentSupplies(formattedData);
                setupReagentSearch(formattedData);
            })
            .catch(error => {
                console.error('Error fetching reagent supplies:', error);
                console.log('Using mock data instead');
                // In a real application, you'd define mock data here
                const mockData = [];
                displayReagentSupplies(mockData);
                setupReagentSearch(mockData);
            });
    }

    function getItemThresholds(itemCode) {
        return itemThresholds[itemCode] || {
            critical: REAGENT_DEFAULT_CRITICAL_TRESHOLD,
            warning: REAGENT_DEFAULT_WARNING_TRESHOLD,
            unit: 'units'
        };
    }

    function getReagentStatusClass(stockLevel, itemCode) {
        const thresholds = getItemThresholds(itemCode);

        if (stockLevel <= thresholds.critical) {
            return 'reagent-status-critical';
        } else if (stockLevel <= thresholds.warning) {
            return 'reagent-status-warning';
        } else {
            return 'reagent-status-normal';
        }
    }

    function getReagentStockClass(stockLevel, itemCode) {
        const thresholds = getItemThresholds(itemCode);
        return stockLevel <= thresholds.critical ? 'reagent-low-stock' : '';
    }

    function displayReagentSupplies(supplies) {
        const tableBody = document.getElementById('reagent-supplies-data');

        let criticalCount = 0;

        if (!supplies || supplies.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="4" style="text-align: center;">No reagent supplies found</td>
                </tr>
            `;
            return;
        }

        let tableContent = '';

        supplies.forEach(item => {
            const stockLevel = Number(item.stocks_on_hand);
            const itemCode = item.itemCode;
            const thresholds = getItemThresholds(itemCode);
            const statusClass = getReagentStatusClass(stockLevel, itemCode);
            const stockClass = getReagentStockClass(stockLevel, itemCode);

            if (stockLevel <= thresholds.critical) {
                criticalCount++;
            }

            tableContent += `
                <tr>
                    <td><span class="reagent-status-indicator ${statusClass}"></span></td>
                    <td>${itemCode}</td>
                    <td>${item.description}</td>
                    <td class="${stockClass}">${stockLevel} <span class="reagent-unit-label">${thresholds.unit}</span></td>
                </tr>
            `;
        });

        tableBody.innerHTML = tableContent;

        document.getElementById('reagent-total-count').textContent = supplies.length;
        document.getElementById('reagent-critical-count').textContent = criticalCount;
        
        // Apply the critical styling to the count if there are critical items
        const criticalCountElement = document.getElementById('reagent-critical-count');
        if (criticalCount > 0) {
            criticalCountElement.classList.add('reagent-critical-count');
        } else {
            criticalCountElement.classList.remove('reagent-critical-count');
        }
    }

    function setupReagentSearch(originalData) {
        const searchInput = document.getElementById('reagent-search-supplies');

        searchInput.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase().trim();

            if (searchTerm === '') {
                displayReagentSupplies(originalData);
                return;
            }

            const filteredData = originalData.filter(item =>
                item.itemCode.toLowerCase().includes(searchTerm) || 
                item.description.toLowerCase().includes(searchTerm)
            );

            displayReagentSupplies(filteredData);
        });
    }

    fetchReagentSupplies();
});