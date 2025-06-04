// // tracy_main.js

// function renderTracyViz(containerSelector) {
//   // 1. Load data once
//   fetch("data/tracy.json")
//     .then(res => res.json())
//     .then(data => {
//       const outcomes    = ["Survived", "Died"];
//       const riskLevels  = ["low", "medium", "high"];
//       const color       = { Survived: "#597ac4", Died: "#f56e39" };
//       const metrics     = [
//         { id: "age",          label: "Age" },
//         { id: "asa",          label: "ASA Score" },
//         { id: "bmi",          label: "BMI" },
//         { id: "preop_hb",     label: "Pre-op Hemoglobin" },
//         { id: "intraop_ebl",  label: "Intra-op Blood Loss (mL)" },
//         { id: "preop_cr",     label: "Pre-op Creatinine" },
//         { id: "preop_alb",    label: "Pre-op Albumin" },
//         { id: "preop_na",     label: "Pre-op Sodium" },
//         { id: "preop_k",      label: "Pre-op Potassium" },
//         { id: "preop_gluc",   label: "Pre-op Glucose" },
//         { id: "intraop_uo",   label: "Intra-op Urine Output (mL)" }
//       ];

//       // Map each optype to a body‐region
//       const optypeToRegion = {
//         "Colorectal":      "abdomen",
//         "Stomach":         "abdomen",
//         "Major resection": "abdomen",
//         "Minor resection": "abdomen",
//         "Biliary/Pancreas":"thorax",
//         "Hepatic":         "thorax",
//         "Breast":          "thorax",
//         "Vascular":        "thorax",
//         "Thyroid":         "head_neck",
//         "Transplantation": "pelvis",
//         "Others":          "pelvis"
//       };

//       // 2. Build the HTML UI (metric dropdown, reset button, SVG, details box)
//       const container = d3.select(containerSelector);
//       container.html(`
//         <h2>Risk & Demographic Patterns</h2>
//         <p>
//           You can start by selecting the metric that you’d like to explore further such as Age, ASA Score, or BMI.
//           You can then click on a legend item and/or axis label to filter the data and explore even deeper.
//           Once you select, you will see descriptive text with statistical summaries and key factors to be considered.
//         </p>
//         <label>
//           Metric:
//           <select id="metricSelector"></select>
//         </label>
//         <button id="resetButton" style="margin-left: 12px;">Reset</button>
//         <svg id="plot" width="560" height="400"></svg>
//         <div id="detailsBox" style="margin-top:1em;"></div>
//       `);

//       // 3. Populate the metric dropdown
//       const metricSelector = container.select("#metricSelector");
//       metrics.forEach(m =>
//         metricSelector.append("option")
//           .attr("value", m.id)
//           .text(m.label)
//       );

//       // 4. If we previously stored a metric in window.currentMetric, use that; otherwise default to "age"
//       if (window.currentMetric) {
//         metricSelector.property("value", window.currentMetric);
//       } else {
//         metricSelector.property("value", metrics[0].id);
//         window.currentMetric = metrics[0].id;
//       }

//       // 5. redrawPlot(): re‐apply both filters (region + metric) and update the boxplot
//       function redrawPlot() {
//         // 5a. Figure out which metric is selected right now
//         const chosenMetric = metricSelector.property("value");
//         window.currentMetric = chosenMetric;  // remember it globally so region‐clicks don’t reset it

//         // 5b. Determine the currently selected region (if any)
//         const region = window.selectedRegion || null;

//         // 5c. Filter the raw data by region first
//         let filteredData = data;
//         if (region) {
//           filteredData = filteredData.filter(d =>
//             optypeToRegion[d.optype] === region
//           );
//         }

//         // 5d. Now pass this region‐filtered data to drawBoxPlot for the chosen metric
//         drawBoxPlot(filteredData, chosenMetric);
//         updateDetailsBoxFromFilter();
//       }


//       // 6. When the metric dropdown changes, re‐draw with the new metric + current region
//       metricSelector.on("change", () => {
//         redrawPlot();
//       });

//       // 7. Reset button: clear the region filter and redraw
//       container.select("#resetButton")
//         .on("click", () => {
//           if (window.resetRegion) {
//             window.resetRegion();    // your existing region‐reset logic
//           }
//           // After resetting window.selectedRegion, re‐draw using current metric
//           redrawPlot();
//         });

//       // 8. The actual function that draws a boxplot for a given metric on a given subset
//       function drawBoxPlot(subset, variable) {
//         // 8a. Update / clear the details box
//         d3.select("#detailsBox").html(
//           `Choose a metric to filter by and use the body map to see details`
//         );

//         // 8b. Clear existing SVG contents
//         const svg = container.select("#plot");
//         svg.selectAll("*").remove();

//         const width  = 560;
//         const height = 400;
//         const margin = { top: 40, right: 10, bottom: 40, left: 40 };
//         const boxWidth = 30;

//         // 8c. Build the Y‐scale based on the chosen variable’s min/max in the filtered subset
//         const yScale = d3.scaleLinear()
//           .domain([
//             d3.min(subset, d => +d[variable]),
//             d3.max(subset, d => +d[variable])
//           ]).nice()
//           .range([height - margin.bottom, margin.top]);

//         // 8d. X‐scale is simply the three risk levels
//         const xScale = d3.scaleBand()
//           .domain(riskLevels)
//           .range([margin.left, width - margin.right])
//           .paddingInner(0.3)
//           .paddingOuter(0.2);

//         // 8e. Color scale for Survived vs. Died
//         const colorScale = d3.scaleSequential()
//           .interpolator(d3.interpolateViridis)
//           .domain([1, 0]);

//         // 8f. Draw axes
//         svg.append("g")
//           .attr("transform", `translate(0,${height - margin.bottom})`)
//           .call(d3.axisBottom(xScale));

//         svg.append("g")
//           .attr("transform", `translate(${margin.left},0)`)
//           .call(d3.axisLeft(yScale));

//         // 8g. Y‐axis label (rotated)
//         svg.append("text")
//           .attr("text-anchor", "middle")
//           .attr("transform", `translate(${margin.left - 30},${height / 2}) rotate(-90)`)
//           .text(metrics.find(m => m.id === variable).label);

//         // 8h. Title at top
//         svg.append("text")
//           .attr("x", width / 2)
//           .attr("y", margin.top / 2)
//           .attr("text-anchor", "middle")
//           .attr("font-size", "16px")
//           .attr("font-weight", "bold")
//           .text(`${metrics.find(m => m.id === variable).label} by Risk and Outcome`);

//         // 8i. For each risk × outcome, compute boxplot stats and draw
//         riskLevels.forEach((risk, i) => {
//           outcomes.forEach((outcome, j) => {
//             const relevantRows = subset.filter(d =>
//               d.risk === risk &&
//               d.death_inhosp === (outcome === "Died" ? 1 : 0) &&
//               d[variable] != null
//             );
//             const values = relevantRows.map(d => +d[variable]);
//             if (!values.length) return;

//             // Compute quartiles + whiskers
//             const stats = getBoxStats(values);

//             // Center‐x for this (risk, outcome) combination
//             const cx = xScale(risk)
//                      + j * boxWidth
//                      - boxWidth / 2
//                      + xScale.bandwidth() / 2;

//             const g = svg.append("g")
//               .attr("class", `boxplot boxplot-${outcome}`)
//               .attr("data-group", `${risk}-${outcome}`);

//             // Whisker line
//             g.append("line")
//               .attr("x1", cx)
//               .attr("x2", cx)
//               .attr("y1", yScale(stats.min))
//               .attr("y2", yScale(stats.max))
//               .attr("stroke", "#333");

//             // Box (IQR)
//             g.append("rect")
//               .attr("x", cx - boxWidth / 2)
//               .attr("width", boxWidth)
//               .attr("y", yScale(stats.q3))
//               .attr("height", yScale(stats.q1) - yScale(stats.q3))
//               .attr("fill", color[outcome])
//               .attr("stroke", "#000");

//             // Median line
//             g.append("line")
//               .attr("x1", cx - boxWidth / 2)
//               .attr("x2", cx + boxWidth / 2)
//               .attr("y1", yScale(stats.median))
//               .attr("y2", yScale(stats.median))
//               .attr("stroke", "#000");
//           });
//         });
//       }

//       // 9. Helper to compute quartiles, IQR, whiskers
//       function getBoxStats(values) {
//         const sorted = values.slice().sort(d3.ascending);
//         const q1 = d3.quantile(sorted, 0.25);
//         const median = d3.quantile(sorted, 0.5);
//         const q3 = d3.quantile(sorted, 0.75);
//         const iqr = q3 - q1;
//         const min = d3.min(sorted.filter(v => v >= q1 - 1.5 * iqr));
//         const max = d3.max(sorted.filter(v => v <= q3 + 1.5 * iqr));
//         return { min, q1, median, q3, max };
//       }

//       // 11. Initial draw: use whatever window.currentMetric is, plus any pre‐set region
//       redrawPlot();

//       // 12. If your body‐map click code calls window.renderAll or re‐invokes renderTracyViz(),
//       //     this logic above will re‐populate the same metricSelector and redraw with
//       //     window.currentMetric instead of defaulting back to “age.”
//     });
// }

// tracy_main.js

function renderTracyViz(containerSelector) {
  // 1. Load data once
  fetch("data/tracy.json")
    .then(res => res.json())
    .then(data => {
      // ───────────────────────────────────────────────────────
      //  A) Define shared state & constants
      // ───────────────────────────────────────────────────────
      const outcomes   = ["Survived", "Died"];
      const riskLevels = ["low", "medium", "high"];
      const color      = { Survived: "#597ac4", Died: "#f56e39" };
      const metrics    = [
        { id: "age",        label: "Age" },
        { id: "asa",        label: "ASA Score" },
        { id: "bmi",        label: "BMI" },
        { id: "preop_hb",   label: "Pre-op Hemoglobin" },
        { id: "intraop_ebl",label: "Intra-op Blood Loss (mL)" },
        { id: "preop_cr",   label: "Pre-op Creatinine" },
        { id: "preop_alb",  label: "Pre-op Albumin" },
        { id: "preop_na",   label: "Pre-op Sodium" },
        { id: "preop_k",    label: "Pre-op Potassium" },
        { id: "preop_gluc", label: "Pre-op Glucose" },
        { id: "intraop_uo", label: "Intra-op Urine Output (mL)" }
      ];

      // These variables hold current filter/highlight state:
      let currentMetric    = window.currentMetric || metrics[0].id;
      let selectedBox      = null;
      let highlightedOutcome = null;
      let highlightedRisk    = null;
      let selectedOptype     = "";
      let selectedRegion     = window.selectedRegion || null;

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

      // ───────────────────────────────────────────────────────
      //  B) Set up region‐click listeners on the small body map
      // ───────────────────────────────────────────────────────
      // Ensure global variable exists
      window.selectedRegion = selectedRegion;

      d3.selectAll("#body-map .region")
        .on("click", function () {
          // Toggle selection: if clicked again, clear
          const regionId = this.id;
          if (window.selectedRegion === regionId) {
            window.selectedRegion = null;
            d3.selectAll("#body-map .region").classed("region--selected", false);
          } else {
            window.selectedRegion = regionId;
            d3.selectAll("#body-map .region").classed("region--selected", false);
            d3.select(this).classed("region--selected", true);
          }
          selectedRegion = window.selectedRegion;
          selectedOptype = ""; // clear optype dropdown (if you had one)
          // Redraw with new region filter
          redrawPlot();
        });

      // Allow external "reset" for region (e.g., from a separate button)
      window.resetRegion = function() {
        window.selectedRegion = null;
        d3.selectAll("#body-map .region").classed("region--selected", false);
        selectedRegion = null;
        redrawPlot();
      };

      // ───────────────────────────────────────────────────────
      //  C) Build the HTML UI for this section
      // ───────────────────────────────────────────────────────
      const container = d3.select(containerSelector);
      container.html(`
        <h2>Risk & Demographic Patterns</h2>
        <p>
          You can start by selecting the metric that you’d like to explore further such as Age, ASA Score, or BMI.
          You can then click on a legend item and/or axis label to filter the data and explore even deeper.
          Once you select, you will see descriptive text with statistical summaries and key factors to be considered.
        </p>
        <label>
          Metric:
          <select id="metricSelector"></select>
        </label>
        <button id="optypeResetButton" style="margin-left: 12px;">Reset All Filters</button>
        <svg id="plot" width="560" height="400"></svg>
        <div id="detailsBox" style="margin-top:1em; color:#fff;"><strong>Click a boxplot</strong> or filter to see details</div>
      `);

      // ───────────────────────────────────────────────────────
      //  D) Populate the metric dropdown
      // ───────────────────────────────────────────────────────
      const metricSelector = container.select("#metricSelector");
      metrics.forEach(m =>
        metricSelector.append("option")
          .attr("value", m.id)
          .text(m.label)
      );

      // Set initial value
      metricSelector.property("value", currentMetric);

      // ───────────────────────────────────────────────────────
      //  E) Handle metric‐change & reset button
      // ───────────────────────────────────────────────────────
      metricSelector.on("change", function() {
        currentMetric = this.value;
        window.currentMetric = currentMetric; // persist globally
        drawBoxPlot(data, currentMetric);
        updateDetailsBoxFromFilter();
      });

      container.select("#optypeResetButton")
        .on("click", () => {
          // Clear all filters/selection
          highlightedOutcome = null;
          highlightedRisk    = null;
          selectedBox        = null;
          selectedOptype     = "";
          selectedRegion     = null;
          window.selectedRegion = null;

          // Clear region highlight on body map
          d3.selectAll("#body-map .region").classed("region--selected", false);

          // Reset detail box
          d3.select("#detailsBox").html(`<strong>Click a boxplot</strong> or filter to see details`);
          redrawPlot();
        });

      // ───────────────────────────────────────────────────────
      //  F) drawBoxPlot: Draws the boxplot and attaches all handlers
      // ───────────────────────────────────────────────────────
      function drawBoxPlot(allDataSubset, variable) {
        // 1) Update/clear the details box prompt
        d3.select("#detailsBox").html(`<strong>Filter by mortality, risk, op type, or use the body map</strong> to see details`);

        // 2) Clear existing SVG content
        const svg = container.select("#plot");
        svg.selectAll("*").remove();

        // 3) Dimensions & margins
        const width  = 560;
        const height = 400;
        const margin = { top: 40, right: 10, bottom: 40, left: 40 };
        const boxWidth = 30;
        const title = metrics.find(m => m.id === variable).label;

        // 4) Draw axes scales
        const yScale = d3.scaleLinear()
          .domain([
            d3.min(allDataSubset, d => +d[variable]),
            d3.max(allDataSubset, d => +d[variable])
          ]).nice()
          .range([height - margin.bottom, margin.top]);

        const xScale = d3.scaleBand()
          .domain(riskLevels)
          .range([margin.left, width - margin.right])
          .paddingInner(0.3)
          .paddingOuter(0.2);

        // 5) Append x‐axis with clickable labels to filter by risk
        svg.append("g")
          .attr("transform", `translate(0,${height - margin.bottom})`)
          .call(d3.axisBottom(xScale))
          .selectAll("text")
          .style("cursor", "pointer")
          .style("font-weight", "bold")
          .on("click", function(event, d) {
            // Toggle highlightedRisk
            highlightedRisk = (highlightedRisk === d) ? null : d;
            updateOpacity();
            updateDetailsBoxFromFilter();
          });

        // 6) Append y‐axis
        svg.append("g")
          .attr("transform", `translate(${margin.left},0)`)
          .call(d3.axisLeft(yScale));

        // 7) Y‐axis label
        svg.append("text")
          .attr("text-anchor", "middle")
          .attr("transform", `translate(${margin.left - 30},${height / 2}) rotate(-90)`)
          .attr("fill", "#fff")
          .text(title);

        // 8) Chart title
        svg.append("text")
          .attr("x", width / 2)
          .attr("y", margin.top / 2)
          .attr("text-anchor", "middle")
          .attr("font-size", "16px")
          .attr("font-weight", "bold")
          .attr("fill", "#fff")
          .text(`${title} by Risk and Outcome`);

        // 9) Draw one box per (risk × outcome)
        riskLevels.forEach((risk, i) => {
          outcomes.forEach((outcome, j) => {
            // Filter rows by current risk, outcome, selectedOptype, selectedRegion, and non-null variable
            const filtered = allDataSubset.filter(d =>
              d.risk === risk &&
              d.death_inhosp === (outcome === "Died" ? 1 : 0) &&
              d[variable] != null &&
              (!selectedOptype || d.optype === selectedOptype) &&
              (!selectedRegion || optypeToRegion[d.optype] === selectedRegion)
            );
            const values = filtered.map(d => +d[variable]);
            if (!values.length) return;

            // Compute quartiles + whiskers
            const stats = getBoxStats(values);

            // Center‐x for this (risk, outcome) combination
            const cx = xScale(risk)
                     + j * boxWidth
                     - boxWidth / 2
                     + xScale.bandwidth() / 2;

            // Create container <g> for this box
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
              .attr("stroke", "#000")
              .style("cursor", "pointer")
              .on("click", () => {
                // Toggle selection for this (risk-outcome-variable)
                selectedBox = `${risk}-${outcome}-${variable}`;
                updateDetailsBoxFromFilter();
              });

            // Median line
            g.append("line")
              .attr("x1", cx - boxWidth / 2)
              .attr("x2", cx + boxWidth / 2)
              .attr("y1", yScale(stats.median))
              .attr("y2", yScale(stats.median))
              .attr("stroke", "#000");
          });
        });

        // 10) Add legend for outcomes (click to filter by outcome)
        const legend = svg.append("g")
          .attr("transform", `translate(${width - margin.right - 100}, ${margin.top})`);

        outcomes.forEach((outcome, i) => {
          const legendRow = legend.append("g")
            .attr("transform", `translate(0, ${i * 20})`)
            .style("cursor", "pointer")
            .on("click", () => {
              highlightedOutcome = (highlightedOutcome === outcome) ? null : outcome;
              updateOpacity();
              updateDetailsBoxFromFilter();
            });

          legendRow.append("rect")
            .attr("width", 12)
            .attr("height", 12)
            .attr("fill", color[outcome])
            .attr("stroke", "#000");

          legendRow.append("text")
            .attr("x", 18)
            .attr("y", 10)
            .text(outcome)
            .attr("font-size", "12px")
            .attr("fill", "#fff")
            .attr("alignment-baseline", "middle");
        });

        // 11) Finally, set initial opacity based on any filters
        updateOpacity();
      }

      // ───────────────────────────────────────────────────────
      //  G) updateOpacity: Dim non‐matching boxes
      // ───────────────────────────────────────────────────────
      function updateOpacity() {
        d3.selectAll(".boxplot")
          .transition().duration(200)
          .style("opacity", function () {
            const [boxRisk, boxOutcome] = d3.select(this).attr("data-group").split("-");
            const riskMatch    = !highlightedRisk    || highlightedRisk === boxRisk;
            const outcomeMatch = !highlightedOutcome || highlightedOutcome === boxOutcome;
            return (riskMatch && outcomeMatch) ? 1 : 0.2;
          });
      }

      // ───────────────────────────────────────────────────────
      //  H) updateDetailsBoxFromFilter: Show statistics for current filters
      // ───────────────────────────────────────────────────────
      function updateDetailsBoxFromFilter() {
        let filtered = data;

        if (highlightedRisk) {
          filtered = filtered.filter(d => d.risk === highlightedRisk);
        }
        if (highlightedOutcome) {
          filtered = filtered.filter(d => d.death_inhosp === (highlightedOutcome === "Died" ? 1 : 0));
        }
        if (selectedOptype) {
          filtered = filtered.filter(d => d.optype === selectedOptype);
        }
        if (selectedRegion) {
          filtered = filtered.filter(d => optypeToRegion[d.optype] === selectedRegion);
        }

        if (!filtered.length) {
          d3.select("#detailsBox").html(`<em>No data matching current filters.</em>`);
          return;
        }

        const values = filtered.map(d => +d[currentMetric]).filter(v => !isNaN(v));
        if (!values.length) {
          d3.select("#detailsBox").html(`<em>No values for selected metric.</em>`);
          return;
        }

        const stats = getBoxStats(values);
        const opDurations = filtered
          .map(d => (+d.opend - +d.opstart) / 60)
          .filter(v => !isNaN(v));
        const medianDuration = d3.median(opDurations)?.toFixed(1);

        const anestheticCounts = d3.rollup(
          filtered.filter(d => d.ane_type),
          v => v.length,
          d => d.ane_type
        );
        const commonAnes = Array.from(anestheticCounts.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([type]) => type)
          .join(", ");

        const bloodLoss = filtered.map(d => +d.intraop_ebl).filter(v => !isNaN(v));
        const medianEBL = d3.median(bloodLoss)?.toFixed(1);

        const icuCount = filtered.filter(d => +d.icu_days > 0).length;
        const icuPercent = ((icuCount / filtered.length) * 100).toFixed(1);

        d3.select("#detailsBox").html(`
          <strong>Filtered Stats:</strong><br>
          Risk: ${highlightedRisk || "All"}<br>
          Outcome: ${highlightedOutcome || "All"}<br>
          Operation Type: ${selectedOptype || "All"}<br>
          Body Region: ${selectedRegion || "All"}<br><br>
          <table>
            <tr><td>Min:</td><td>${stats.min.toFixed(1)}</td></tr>
            <tr><td>Q1:</td><td>${stats.q1.toFixed(1)}</td></tr>
            <tr><td>Median:</td><td>${stats.median.toFixed(1)}</td></tr>
            <tr><td>Q3:</td><td>${stats.q3.toFixed(1)}</td></tr>
            <tr><td>Max:</td><td>${stats.max.toFixed(1)}</td></tr>
          </table><br>
          <strong>Additional Info:</strong><br>
          Median Surgery Duration: ${medianDuration} min<br>
          Common Anesthetics: ${commonAnes}<br>
          Median Blood Loss: ${medianEBL} mL<br>
          ICU Admission: ${icuPercent}% of patients
        `);
      }

      // ───────────────────────────────────────────────────────
      //  I) getBoxStats: Compute quartiles & whiskers
      // ───────────────────────────────────────────────────────
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

      // ───────────────────────────────────────────────────────
      //  J) Initial draw
      // ───────────────────────────────────────────────────────
      drawBoxPlot(data, currentMetric);
      updateDetailsBoxFromFilter();
    });
}
