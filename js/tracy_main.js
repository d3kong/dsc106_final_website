fetch("data/tracy.json")
  .then(res => res.json())
  .then(rawData => {
    const data = rawData;
    const outcomes = ["Survived", "Died"];
    const riskLevels = ["low", "medium", "high"];
    const metrics = [
      { id: "age",         label: "Age" },
      { id: "asa",         label: "ASA Score" },
      { id: "bmi",         label: "BMI" },
      { id: "preop_hb",    label: "Pre-op Hemoglobin" },
      { id: "intraop_ebl", label: "Intra-op Blood Loss (mL)" },
      { id: "preop_cr",    label: "Pre-op Creatinine" },
      { id: "preop_alb",   label: "Pre-op Albumin" },
      { id: "preop_na",    label: "Pre-op Sodium" },
      { id: "preop_k",     label: "Pre-op Potassium" },
      { id: "preop_gluc",  label: "Pre-op Glucose" },
      { id: "intraop_uo",  label: "Intra-op Urine Output (mL)" }
    ];

    let selectedOptype = "";
    let currentMetric = metrics[0].id;

    const optypeSelector = d3.select("#optypeSelector")
      .on("change", function() {
        selectedOptype = this.value;
        drawBoxPlot();
        updateDetailsBoxFromFilter(getAllValues(), currentMetric);
      });

    const allOptypes = Array.from(new Set(data.map(d => d.optype).filter(d => d)));
    allOptypes.sort().forEach(op => {
      optypeSelector.append("option").attr("value", op).text(op);
    });

    const metricSelector = d3.select("#metricSelector")
      .on("change", function() {
        currentMetric = this.value;
        drawBoxPlot();
        updateDetailsBoxFromFilter(getAllValues(), currentMetric);
      });
    metrics.forEach(m => metricSelector.append("option").attr("value", m.id).text(m.label));

    // Initial draw & details
    drawBoxPlot();
    updateDetailsBoxFromFilter(getAllValues(), currentMetric);

    // Helper: get all numeric values for current filter+metric
    function getAllValues() {
      let filtered = selectedOptype ? data.filter(d => d.optype === selectedOptype) : data;
      return filtered.map(d => +d[currentMetric]);
    }

    function drawBoxPlot() {
      d3.selectAll(".boxplot").remove();

      // Filtered data by optype
      let filtered = selectedOptype ? data.filter(d => d.optype === selectedOptype) : data;

      // Compute stats groups for each (risk,outcome)
      const statsByGroup = [];
      riskLevels.forEach(r => {
        outcomes.forEach(o => {
          const values = filtered
            .filter(d => d.risk === r && d.death_inhosp === (o === "Died" ? 1 : 0))
            .map(d => +d[currentMetric]);
          if (values.length) statsByGroup.push({ risk: r, outcome: o, values });
        });
      });
    }
  });

function getBoxStats(values) {
  const sorted = values.slice().sort(d3.ascending);
  const q1 = d3.quantile(sorted, 0.25);
  const median = d3.quantile(sorted, 0.5);
  const q3 = d3.quantile(sorted, 0.75);
  const iqr = q3 - q1;
  const min = d3.min(sorted.filter(v => v >= q1 - 1.5 * iqr));
  const max = d3.max(sorted.filter(v => v <= q3 + 1.5 * iqr));
  return { min, q1, median, q3, max };
}

function updateDetailsBoxFromFilter(values, variable) {
  const stats = getBoxStats(values);
  const label = metrics.find(m => m.id === variable).label;
  const html = `
    <h3>${label}</h3>
    <ul>
      <li><strong>Min:</strong> ${stats.min.toFixed(2)}</li>
      <li><strong>Q1:</strong> ${stats.q1.toFixed(2)}</li>
      <li><strong>Median:</strong> ${stats.median.toFixed(2)}</li>
      <li><strong>Q3:</strong> ${stats.q3.toFixed(2)}</li>
      <li><strong>Max:</strong> ${stats.max.toFixed(2)}</li>
    </ul>
  `;
  d3.select('#detailsBox').html(html);
}
