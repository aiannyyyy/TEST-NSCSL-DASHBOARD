document.addEventListener('DOMContentLoaded', function() {
    // Define default thresholds for stock levels
    const LAB_DEFAULT_CRITICAL_THRESHOLD = 10;
    const LAB_DEFAULT_WARNING_THRESHOLD = 20;
    
    // Define item-specific thresholds
    const itemThresholds = {
      // Format: 'ITEMCODE': { critical: X, warning: Y, unit: 'unit_name' }
      'LAB002': { critical: 1000, warning: 1200, unit: 'pcs' },
      'LAB003': { critical: 3, warning: 5, unit: 'boxes' },
      'LAB004': { critical: 5, warning: 7, unit: 'boxes' },
      'LAB008': { critical: 2, warning: 4, unit: 'boxes' },
      'LAB010': { critical: 4, warning: 6, unit: 'boxes' },
      'LAB012': { critical: 2, warning: 4, unit: 'boxes' },
      'LAB013': { critical: 2, warning: 4, unit: 'boxes' },
      'LAB015': { critical: 1, warning: 2, unit: 'box' },
      'LAB034': { critical: 2, warning: 4, unit: 'rolls' },
      'LAB035': { critical: 1, warning: 2, unit: 'box' },
      'LAB047': { critical: 0.5, warning: 1, unit: 'pack' },
      'LAB051': { critical: 0.5, warning: 1, unit: 'pack' },
      'LAB049': { critical: 110, warning: 130, unit: 'plates' },
      'LAB052': { critical: 2, warning: 4, unit: 'boxes' },
      'LAB062': { critical: 1, warning: 2, unit: 'pack' },
      'LAB064': { critical: 1, warning: 2, unit: 'box' },
      'LAB068': { critical: 20, warning: 40, unit: 'boxes' },
      'LAB071': { critical: 1, warning: 2, unit: 'pack' },
      'LAB073': { critical: 1, warning: 2, unit: 'pack' },
      'LAB080': { critical: 1, warning: 2, unit: 'pack' },
      'LAB081': { critical: 1, warning: 2, unit: 'pack' },
      'LAB128': { critical: 1, warning: 2, unit: 'pack' },
      'LAB129': { critical: 0.60, warning: 1.2, unit: 'pack' },
      'LAB130': { critical: 1, warning: 2, unit: 'pack' },
    };
    
    // Function to fetch laboratory supplies data
    function fetchLabSupplies() {
      fetch('http://localhost:3001/api/lab-supplies')
        .then(response => {
          if (!response.ok) {
            throw new Error('Network response was not ok');
          }
          return response.json();
        })
        .then(data => {
          displayLabSupplies(data);
          setupLabSearch(data);
        })
        .catch(error => {
          console.error('Error fetching lab supplies:', error);
          document.getElementById('lab-supplies-data').innerHTML = `
            <tr>
              <td colspan="4" style="text-align: center; color: #dc3545;">
                Error loading data. Please try again later.
              </td>
            </tr>
          `;
        });
    }

    function getItemThresholds(itemCode) {
      // Get item-specific thresholds or use defaults
      return itemThresholds[itemCode] || { 
        critical: LAB_DEFAULT_CRITICAL_THRESHOLD, 
        warning: LAB_DEFAULT_WARNING_THRESHOLD,
        unit: 'units'
      };
    }

    function getLabStatusClass(stockLevel, itemCode) {
      const thresholds = getItemThresholds(itemCode);
      
      if (stockLevel <= thresholds.critical) {
        return 'lab-status-critical';
      } else if (stockLevel <= thresholds.warning) {
        return 'lab-status-warning';
      } else {
        return 'lab-status-normal';
      }
    }

    function getLabStockClass(stockLevel, itemCode) {
      const thresholds = getItemThresholds(itemCode);
      return stockLevel <= thresholds.critical ? 'lab-low-stock' : '';
    }

    function displayLabSupplies(supplies) {
      const tableBody = document.getElementById('lab-supplies-data');
      let criticalCount = 0;
      
      if (!supplies || supplies.length === 0) {
        tableBody.innerHTML = `
          <tr>
            <td colspan="4" style="text-align: center;">No laboratory supplies found</td>
          </tr>
        `;
        return;
      }
      
      let tableContent = '';
      
      supplies.forEach(item => {
        const stockLevel = Number(item.stocks_on_hand);
        const itemCode = item.itemcode;
        const thresholds = getItemThresholds(itemCode);
        const statusClass = getLabStatusClass(stockLevel, itemCode);
        const stockClass = getLabStockClass(stockLevel, itemCode);
        
        if (stockLevel <= thresholds.critical) {
          criticalCount++;
        }
        
        tableContent += `
          <tr>
            <td><span class="lab-status-indicator ${statusClass}"></span></td>
            <td>${item.itemcode}</td>
            <td>${item.description}</td>
            <td class="${stockClass}">${stockLevel} <span class="lab-unit-label">${thresholds.unit}</span></td>
          </tr>
        `;
      });
      
      tableBody.innerHTML = tableContent;
      
      // Update counts
      document.getElementById('lab-total-count').textContent = supplies.length;
      document.getElementById('lab-critical-count').textContent = criticalCount;
    }
    
    function setupLabSearch(originalData) {
      const searchInput = document.getElementById('lab-search-supplies');
      
      searchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase().trim();
        
        if (searchTerm === '') {
          displayLabSupplies(originalData);
          return;
        }
        
        const filteredData = originalData.filter(item => 
          item.itemcode.toLowerCase().includes(searchTerm) || 
          item.description.toLowerCase().includes(searchTerm)
        );
        
        displayLabSupplies(filteredData);
      });
    }
    
    // Initialize
    fetchLabSupplies();
  });