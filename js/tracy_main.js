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
    const optypeSelector = d3.select("#optypeSelector")
      .on("change", function() {
        selectedOptype = this.value;
        drawBoxPlot(currentMetric);
        updateDetailsBoxFromFilter();
      });

    // Populate surgery-type dropdown
    const allOptypes = Array.from(new Set(data.map(d => d.optype).filter(d=>d))); 
    allOptypes.sort().forEach(op => {
      optypeSelector.append("option")
        .attr("value", op)
        .text(op);
    });

    let currentMetric = metrics[0].id;
    const metricSelector = d3.select("#metricSelector")
      .on("change", function() {
        currentMetric = this.value;
        drawBoxPlot(currentMetric);
        updateDetailsBoxFromFilter();
      });
    metrics.forEach(m => metricSelector.append("option").attr("value", m.id).text(m.label));

    drawBoxPlot(currentMetric);

    function drawBoxPlot(variable) {
      d3.selectAll(".boxplot").remove();

      // Filter by optype if chosen
      let filtered = data;
      if (selectedOptype) filtered = data.filter(d => d.optype === selectedOptype);

      const statsByGroup = [];
      // Group by risk/outcome
      riskLevels.forEach(r => {
        outcomes.forEach(o => {
          const groupData = filtered
            .filter(d => d.risk === r && d.death_inhosp === (o === "Died" ? 1 : 0))
            .map(d => +d[variable]);
          if (groupData.length) {
            statsByGroup.push({ risk: r, outcome: o, values: groupData });
          }
        });
      });

      // Draw each box using statsByGroup...
      // (rest of your box-plot drawing code remains unchanged)
    }
    function updateDetailsBoxFromFilter() {
      // your existing detail-box update logic
    }
  });