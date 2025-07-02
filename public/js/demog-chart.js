let expandedChart = null;

function toggleChart(chartId) {
    const container = document.getElementById(chartId + 'Container');
    const column = document.getElementById(chartId + 'Column');
    const button = container.querySelector('.expand-btn');
    const controls = container.querySelector('.chart-controls');
    const tableWrapper = document.getElementById(chartId + 'TableWrapper');

    // Define chart groups
    const chartGroups = {
        group1: ['chart1', 'chart2'],
        group2: ['chart3', 'chart4']
    };

    // Determine which group the clicked chart belongs to
    let group = null;
    for (const key in chartGroups) {
        if (chartGroups[key].includes(chartId)) {
            group = chartGroups[key];
            break;
        }
    }

    if (!group) return; // chartId doesn't belong to any group

    if (expandedChart === chartId) {
        // Collapse current chart
        container.classList.remove('expanded');
        column.className = 'col-lg-6 col-md-12 chart-column';
        button.innerHTML = '<i class="mdi mdi-arrow-expand-all"></i> Expand';
        if (controls) controls.style.display = 'none';
        if (tableWrapper) tableWrapper.classList.add('d-none');

        // Restore others in the same group
        group.forEach(id => {
            if (id !== chartId) {
                const col = document.getElementById(id + 'Column');
                const cont = document.getElementById(id + 'Container');
                const ctrls = cont.querySelector('.chart-controls');
                if (col) col.className = 'col-lg-6 col-md-12 chart-column';
                if (cont) cont.classList.remove('collapsed');
                if (ctrls) ctrls.style.display = 'none';
            }
        });

        expandedChart = null;
    } else {
        // Collapse previous expanded chart in the same group
        if (expandedChart && group.includes(expandedChart)) {
            const prevContainer = document.getElementById(expandedChart + 'Container');
            const prevColumn = document.getElementById(expandedChart + 'Column');
            const prevButton = prevContainer.querySelector('.expand-btn');
            const prevControls = prevContainer.querySelector('.chart-controls');
            const prevTableWrapper = document.getElementById(expandedChart + 'TableWrapper');

            prevContainer.classList.remove('expanded');
            prevColumn.className = 'col-lg-6 col-md-12 chart-column';
            prevButton.innerHTML = '<i class="mdi mdi-arrow-expand-all"></i> Expand';
            if (prevControls) prevControls.style.display = 'none';
            if (prevTableWrapper) prevTableWrapper.classList.add('d-none');
        }

        // Expand selected chart
        container.classList.add('expanded');
        column.className = 'col-lg-8 col-md-12 chart-column expanding';
        button.innerHTML = '<i class="mdi mdi-arrow-collapse-all"></i> Collapse';
        if (controls) controls.style.display = 'block';
        if (tableWrapper) tableWrapper.classList.remove('d-none');
        expandedChart = chartId;

        // Shrink the other chart in the group
        group.forEach(id => {
            if (id !== chartId) {
                const col = document.getElementById(id + 'Column');
                const cont = document.getElementById(id + 'Container');
                const ctrls = cont.querySelector('.chart-controls');
                if (col) col.className = 'col-lg-4 col-md-12 chart-column shrinking';
                if (cont) cont.classList.add('collapsed');
                if (ctrls) ctrls.style.display = 'none';
            }
        });
    }
}
