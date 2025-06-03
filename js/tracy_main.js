// tracy_main.js

function renderTracyViz(containerSelector) {
  // 1. Load data once
  fetch("data/tracy.json")
    .then(res => res.json())
    .then(data => {
      const outcomes    = ["Survived", "Died"];
      const riskLevels  = ["low", "medium", "high"];
      const color       = { Survived: "#597ac4", Died: "#f56e39" };
      const metrics     = [
        { id: "age",          label: "Age" },
        { id: "asa",          label: "ASA Score" },
        { id: "bmi",          label: "BMI" },
        { id: "preop_hb",     label: "Pre-op Hemoglobin" },
        { id: "intraop_ebl",  label: "Intra-op Blood Loss (mL)" },
        { id: "preop_cr",     label: "Pre-op Creatinine" },
        { id: "preop_alb",    label: "Pre-op Albumin" },
        { id: "preop_na",     label: "Pre-op Sodium" },
        { id: "preop_k",      label: "Pre-op Potassium" },
        { id: "preop_gluc",   label: "Pre-op Glucose" },
        { id: "intraop_uo",   label: "Intra-op Urine Output (mL)" }
      ];

      // Map each optype to a body‐region
      const optypeToRegion = {
        "Colorectal":      "abdomen",
        "Stomach":         "abdomen",
        "Major resection": "abdomen",
        "Minor resection": "abdomen",
        "Biliary/Pancreas":"thorax",
        "Hepatic":         "thorax",
        "Breast":          "thorax",
        "Vascular":        "thorax",
        "Thyroid":         "head_neck",
        "Transplantation": "pelvis",
        "Others":          "pelvis"
      };

      // 2. Build the HTML UI (metric dropdown, reset button, SVG, details box)
      const container = d3.select(containerSelector);
      container.html(`
        <h2>Risk & Demographic Patterns</h2>
        <label>
          Metric:
          <select id="metricSelector"></select>
        </label>
        <button id="resetButton" style="margin-left: 12px;">Reset</button>
        <svg id="plot" width="320" height="360"></svg>
        <div id="detailsBox" style="margin-top:1em;"></div>
      `);

      // 3. Populate the metric dropdown
      const metricSelector = container.select("#metricSelector");
      metrics.forEach(m =>
        metricSelector.append("option")
          .attr("value", m.id)
          .text(m.label)
      );

      // 4. If we previously stored a metric in window.currentMetric, use that; otherwise default to "age"
      if (window.currentMetric) {
        metricSelector.property("value", window.currentMetric);
      } else {
        metricSelector.property("value", metrics[0].id);
        window.currentMetric = metrics[0].id;
      }

      // 5. redrawPlot(): re‐apply both filters (region + metric) and update the boxplot
      function redrawPlot() {
        // 5a. Figure out which metric is selected right now
        const chosenMetric = metricSelector.property("value");
        window.currentMetric = chosenMetric;  // remember it globally so region‐clicks don’t reset it

        // 5b. Determine the currently selected region (if any)
        const region = window.selectedRegion || null;

        // 5c. Filter the raw data by region first
        let filteredData = data;
        if (region) {
          filteredData = filteredData.filter(d =>
            optypeToRegion[d.optype] === region
          );
        }

        // 5d. Now pass this region‐filtered data to drawBoxPlot for the chosen metric
        drawBoxPlot(filteredData, chosenMetric);
        updateDetailsBoxFromFilter();
      }

      // 6. When the metric dropdown changes, re‐draw with the new metric + current region
      metricSelector.on("change", () => {
        redrawPlot();
      });

      // 7. Reset button: clear the region filter and redraw
      container.select("#resetButton")
        .on("click", () => {
          if (window.resetRegion) {
            window.resetRegion();    // your existing region‐reset logic
          }
          // After resetting window.selectedRegion, re‐draw using current metric
          redrawPlot();
        });

      // 8. The actual function that draws a boxplot for a given metric on a given subset
      function drawBoxPlot(subset, variable) {
        // 8a. Update / clear the details box
        d3.select("#detailsBox").html(
          `<strong>Filter by mortality and risk level and use the body map</strong> to see details`
        );

        // 8b. Clear existing SVG contents
        const svg = container.select("#plot");
        svg.selectAll("*").remove();

        const width  = 300;
        const height = 350;
        const margin = { top: 40, right: 10, bottom: 40, left: 40 };
        const boxWidth = 30;

        // 8c. Build the Y‐scale based on the chosen variable’s min/max in the filtered subset
        const yScale = d3.scaleLinear()
          .domain([
            d3.min(subset, d => +d[variable]),
            d3.max(subset, d => +d[variable])
          ]).nice()
          .range([height - margin.bottom, margin.top]);

        // 8d. X‐scale is simply the three risk levels
        const xScale = d3.scaleBand()
          .domain(riskLevels)
          .range([margin.left, width - margin.right])
          .paddingInner(0.3)
          .paddingOuter(0.2);

        // 8e. Color scale for Survived vs. Died
        const colorScale = d3.scaleSequential()
          .interpolator(d3.interpolateViridis)
          .domain([1, 0]);

        // 8f. Draw axes
        svg.append("g")
          .attr("transform", `translate(0,${height - margin.bottom})`)
          .call(d3.axisBottom(xScale));

        svg.append("g")
          .attr("transform", `translate(${margin.left},0)`)
          .call(d3.axisLeft(yScale));

        // 8g. Y‐axis label (rotated)
        svg.append("text")
          .attr("text-anchor", "middle")
          .attr("transform", `translate(${margin.left - 30},${height / 2}) rotate(-90)`)
          .text(metrics.find(m => m.id === variable).label);

        // 8h. Title at top
        svg.append("text")
          .attr("x", width / 2)
          .attr("y", margin.top / 2)
          .attr("text-anchor", "middle")
          .attr("font-size", "16px")
          .attr("font-weight", "bold")
          .text(`${metrics.find(m => m.id === variable).label} by Risk and Outcome`);

        // 8i. For each risk × outcome, compute boxplot stats and draw
        riskLevels.forEach((risk, i) => {
          outcomes.forEach((outcome, j) => {
            const relevantRows = subset.filter(d =>
              d.risk === risk &&
              d.death_inhosp === (outcome === "Died" ? 1 : 0) &&
              d[variable] != null
            );
            const values = relevantRows.map(d => +d[variable]);
            if (!values.length) return;

            // Compute quartiles + whiskers
            const stats = getBoxStats(values);

            // Center‐x for this (risk, outcome) combination
            const cx = xScale(risk)
                     + j * boxWidth
                     - boxWidth / 2
                     + xScale.bandwidth() / 2;

            const g = svg.append("g")
              .attr("class", `boxplot boxplot-${outcome}`)
              .attr("data-group", `${risk}-${outcome}`);

            // Whisker line
            g.append("line")
              .attr("x1", cx)
              .attr("x2", cx)
              .attr("y1", yScale(stats.min))
              .attr("y2", yScale(stats.max))
              .attr("stroke", "#333");

            // Box (IQR)
            g.append("rect")
              .attr("x", cx - boxWidth / 2)
              .attr("width", boxWidth)
              .attr("y", yScale(stats.q3))
              .attr("height", yScale(stats.q1) - yScale(stats.q3))
              .attr("fill", color[outcome])
              .attr("stroke", "#000");

            // Median line
            g.append("line")
              .attr("x1", cx - boxWidth / 2)
              .attr("x2", cx + boxWidth / 2)
              .attr("y1", yScale(stats.median))
              .attr("y2", yScale(stats.median))
              .attr("stroke", "#000");
          });
        });
      }

      // 9. Helper to compute quartiles, IQR, whiskers
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

      // 10. Details‐box placeholder
      function updateDetailsBoxFromFilter() {
        d3.select("#detailsBox").html("<em>Click a box to see stats.</em>");
      }

      // 11. Initial draw: use whatever window.currentMetric is, plus any pre‐set region
      redrawPlot();

      // 12. If your body‐map click code calls window.renderAll or re‐invokes renderTracyViz(),
      //     this logic above will re‐populate the same metricSelector and redraw with
      //     window.currentMetric instead of defaulting back to “age.”
    });
}
