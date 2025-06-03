// tracy_main.js

function renderTracyViz(containerSelector) {
  fetch("data/tracy.json")
    .then(res => res.json())
    .then(data => {
      const outcomes = ["Survived", "Died"];
      const riskLevels = ["low", "medium", "high"];
      const color = { Survived: "#597ac4", Died: "#f56e39" };
      const metrics = [
        { id: "age", label: "Age" },
        { id: "asa", label: "ASA Score" },
        { id: "bmi", label: "BMI" },
        { id: "preop_hb", label: "Pre-op Hemoglobin" },
        { id: "intraop_ebl", label: "Intra-op Blood Loss (mL)" },
        { id: "preop_cr", label: "Pre-op Creatinine" },
        { id: "preop_alb", label: "Pre-op Albumin" },
        { id: "preop_na", label: "Pre-op Sodium" },
        { id: "preop_k", label: "Pre-op Potassium" },
        { id: "preop_gluc", label: "Pre-op Glucose" },
        { id: "intraop_uo", label: "Intra-op Urine Output (mL)" }
      ];

      // Map optype to region for filtering
      const optypeToRegion = {
        "Colorectal": "abdomen", "Stomach": "abdomen", "Major resection": "abdomen", "Minor resection": "abdomen",
        "Biliary/Pancreas": "thorax", "Hepatic": "thorax", "Breast": "thorax", "Vascular": "thorax",
        "Thyroid": "head_neck", "Transplantation": "pelvis", "Others": "pelvis"
      };

      // Shared region filter
      let region = window.selectedRegion;

      let filtered = data;
      if (region) {
        filtered = filtered.filter(d => optypeToRegion[d.optype] === region);
      }

      // Build UI
      const container = d3.select(containerSelector);
      container.html(`
        <h2>Risk & Demographic Patterns</h2>
        <label>Metric: <select id="metricSelector"></select></label>
        <button id="resetButton" style="margin-left: 12px;">Reset</button>
        <svg id="plot" width="320" height="360"></svg>
        <div id="detailsBox" style="margin-top:1em;"></div>
      `);

      const metricSelector = container.select("#metricSelector");
      metrics.forEach(m =>
        metricSelector.append("option").attr("value", m.id).text(m.label)
      );

      let currentMetric = metrics[0].id;

      metricSelector.on("change", function() {
        currentMetric = this.value;
        drawBoxPlot(currentMetric);
        updateDetailsBoxFromFilter();
      });

      container.select("#resetButton")
        .on("click", () => {
          window.resetRegion();
        });

      function drawBoxPlot(variable) {
        d3.select("#detailsBox").html(`<strong>Filter by mortality and risk level and use the body map</strong> to see details`);
        const svg = container.select("#plot");
        svg.selectAll("*").remove();
        const width = 300, height = 350;
        const margin = { top: 40, right: 10, bottom: 40, left: 40 };
        const boxWidth = 30;
        const yScale = d3.scaleLinear()
          .domain([
            d3.min(filtered, d => +d[variable]),
            d3.max(filtered, d => +d[variable])
          ]).nice()
          .range([height - margin.bottom, margin.top]);
        const xScale = d3.scaleBand()
          .domain(riskLevels)
          .range([margin.left, width - margin.right])
          .paddingInner(0.3)
          .paddingOuter(0.2);

        svg.append("g")
          .attr("transform", `translate(0,${height - margin.bottom})`)
          .call(d3.axisBottom(xScale));
        svg.append("g")
          .attr("transform", `translate(${margin.left},0)`)
          .call(d3.axisLeft(yScale));
        svg.append("text")
          .attr("text-anchor", "middle")
          .attr("transform", `translate(${margin.left - 30},${height / 2})rotate(-90)`)
          .text(metrics.find(m => m.id === variable).label);

        svg.append("text")
          .attr("x", width / 2)
          .attr("y", margin.top / 2)
          .attr("text-anchor", "middle")
          .attr("font-size", "16px")
          .attr("font-weight", "bold")
          .text(`${metrics.find(m => m.id === variable).label} by Risk and Outcome`);

        riskLevels.forEach((risk, i) => {
          outcomes.forEach((outcome, j) => {
            const filt = filtered.filter(d =>
              d.risk === risk &&
              d.death_inhosp === (outcome === "Died" ? 1 : 0) &&
              d[variable] != null
            );
            const values = filt.map(d => +d[variable]);
            if (!values.length) return;
            const stats = getBoxStats(values);
            const cx = xScale(risk) + j * boxWidth - boxWidth / 2 + xScale.bandwidth() / 2;
            const g = svg.append("g")
              .attr("class", `boxplot boxplot-${outcome}`)
              .attr("data-group", `${risk}-${outcome}`);
            g.append("line")
              .attr("x1", cx)
              .attr("x2", cx)
              .attr("y1", yScale(stats.min))
              .attr("y2", yScale(stats.max))
              .attr("stroke", "#333");
            g.append("rect")
              .attr("x", cx - boxWidth / 2)
              .attr("width", boxWidth)
              .attr("y", yScale(stats.q3))
              .attr("height", yScale(stats.q1) - yScale(stats.q3))
              .attr("fill", color[outcome])
              .attr("stroke", "#000");
            g.append("line")
              .attr("x1", cx - boxWidth / 2)
              .attr("x2", cx + boxWidth / 2)
              .attr("y1", yScale(stats.median))
              .attr("y2", yScale(stats.median))
              .attr("stroke", "#000");
          });
        });
      }

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

      function updateDetailsBoxFromFilter() {
        d3.select("#detailsBox").html("<em>Click a box to see stats.</em>");
      }

      // Initial draw
      drawBoxPlot(currentMetric);
    });
}
