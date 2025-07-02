let expandedChart = null;

function toggleChart(chartId) {
    const container = document.getElementById(chartId + 'Container');
    const column = document.getElementById(chartId + 'Column');
    const otherChartId = chartId === 'chart1' ? 'chart2' : 'chart1';
    const otherContainer = document.getElementById(otherChartId + 'Container');
    const otherColumn = document.getElementById(otherChartId + 'Column');
    const button = container.querySelector('.expand-btn');
    const controls = container.querySelector('.chart-controls');
    const otherControls = otherContainer.querySelector('.chart-controls');
    const tableWrapper = document.getElementById(chartId + 'TableWrapper');

    if (expandedChart === chartId) {
        // Collapse
        container.classList.remove('expanded');
        otherContainer.classList.remove('collapsed');

        column.className = 'col-lg-6 col-md-12 chart-column';
        otherColumn.className = 'col-lg-6 col-md-12 chart-column';

        button.innerHTML = '<i class="mdi mdi-arrow-expand-all"></i> Expand';
        expandedChart = null;

        if (controls) controls.style.display = 'none';
        if (otherControls) otherControls.style.display = 'none';
        if (tableWrapper) tableWrapper.classList.add('d-none');  // 🔴 Hide table
    } else {
        // Collapse previously expanded chart if needed
        if (expandedChart) {
            const prevContainer = document.getElementById(expandedChart + 'Container');
            const prevColumn = document.getElementById(expandedChart + 'Column');
            const prevButton = prevContainer.querySelector('.expand-btn');
            const prevControls = prevContainer.querySelector('.chart-controls');
            const prevTableWrapper = document.getElementById(expandedChart + 'TableWrapper');

            prevContainer.classList.remove('expanded');
            prevColumn.className = 'col-lg-6 col-md-12 chart-column';
            prevButton.innerHTML = '<i class="mdi mdi-arrow-expand-all"></i> Expand';

            if (prevControls) prevControls.style.display = 'none';
            if (prevTableWrapper) prevTableWrapper.classList.add('d-none'); // 🔴 Hide previous table
        }

        container.classList.add('expanded');
        otherContainer.classList.add('collapsed');

        column.className = 'col-lg-8 col-md-12 chart-column expanding';
        otherColumn.className = 'col-lg-4 col-md-12 chart-column shrinking';

        button.innerHTML = '<i class="mdi mdi-arrow-collapse-all"></i> Collapse';
        expandedChart = chartId;

        if (controls) controls.style.display = 'block';
        if (otherControls) otherControls.style.display = 'none';
        if (tableWrapper) tableWrapper.classList.remove('d-none'); // ✅ Show table
    }
}
