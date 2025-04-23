document.addEventListener("DOMContentLoaded", function () {
    const showTableButton = document.getElementById("kitsSoldShowTableButton");
    const chartWrapper = document.getElementById("kitsSoldChartWrapper");
    const tableContainer = document.getElementById("kitsSoldTableContainer");
  
    fetch("http://localhost:3000/api/cumulative-kits-sold")
      .then(response => response.json())
      .then(data => {
        const monthlyDataByYear = {};
  
        data.forEach(item => {
          const [year, month] = item.month.split("-");
          if (!monthlyDataByYear[year]) {
            monthlyDataByYear[year] = Array(12).fill(0);
          }
          monthlyDataByYear[year][parseInt(month) - 1] = item.total_qty;
        });
  
        const monthLabels = [
          "Jan", "Feb", "Mar", "Apr", "May", "Jun",
          "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
        ];
  
        const colors = [
          "#007bff", "#dc3545", "#28a745", "#ffc107",
          "#17a2b8", "#6f42c1", "#fd7e14", "#20c997"
        ];
  
        const datasets = Object.entries(monthlyDataByYear).map(([year, monthlyTotals], index) => ({
          label: year,
          data: monthlyTotals,
          borderColor: colors[index % colors.length],
          fill: false,
          tension: 0.3
        }));
  
        const ctx = document.getElementById("kitsSoldChart").getContext("2d");
  
        new Chart(ctx, {
          type: "line",
          data: {
            labels: monthLabels,
            datasets: datasets
          },
          options: {
            responsive: true,
            plugins: {
              legend: { position: "bottom" }
            },
            scales: {
              y: {
                beginAtZero: true,
                title: { display: true, text: "Total Qty" }
              },
              x: {
                offset: true,
                title: { display: true, text: "Month" },
                ticks: { align: 'center' }
              }
            }
          }
        });
  
        // Table setup
        const tableHeader = document.getElementById("kitsSoldTableHeader");
        const tableBody = document.getElementById("kitsSoldTableBody");
  
        let headerHTML = "<th>Year</th>";
        monthLabels.forEach(month => {
          headerHTML += `<th>${month}</th>`;
        });
        tableHeader.innerHTML = headerHTML;
  
        tableBody.innerHTML = Object.entries(monthlyDataByYear)
          .map(([year, monthlyTotals]) => {
            const row = monthlyTotals.map(val => `<td>${val}</td>`).join("");
            return `<tr><td>${year}</td>${row}</tr>`;
          })
          .join("");
  
        // Toggle
        let showTable = false;
        showTableButton.addEventListener("click", () => {
          showTable = !showTable;
          chartWrapper.style.display = showTable ? "none" : "block";
          tableContainer.style.display = showTable ? "block" : "none";
          showTableButton.textContent = showTable ? "Show Chart" : "Show Table";
        });
  
      })
      .catch(error => console.error("Error fetching chart data:", error));
  });
  