// daniel_main.js – Heatmap: “Clinical Complexity by ASA & Surgery”
// Renamed variables with a “d” prefix to avoid collisions with other scripts.
// Expose window.renderDanielViz, but do NOT call it here–dashboard_main.js will do that.

(function() {
  const dLowRisk   = "Cholecystectomy";
  const dHighRisk  = "Exploratory laparotomy";
  const dSurgeries = [dLowRisk, dHighRisk];
  const dAsaLevels = ["1","2","3","4","5"];

  // Color scale for average death_score
  function drawDanielHeatmap(data) {
    const container = document.getElementById("heatmap-container");
    if (!container) return;
    container.innerHTML = "";

    // Filter to our two surgeries, ensure ASA & death_inhosp exist
    const filtered = (data || []).filter(d =>
      (d.opname === dLowRisk || d.opname === dHighRisk) &&
      d.asa_score !== undefined &&
      d.death_score !== undefined
    );

    if (filtered.length === 0) {
      container.innerHTML = "<div style='color:#aaa'>No data available for those surgeries.</div>";
      return;
    }

    // Group by ASA → surgery, compute mean death_score
    const nested = d3.rollups(
      filtered,
      vals => d3.mean(vals, v => +v.death_score),
      v => String(Math.round(v.asa_score)),
      v => v.opname
    );
    // Build avgDeath lookup: avgDeath[asa][surgery] = mean
    const avgDeath = {};
    for (const [asa, group] of nested) {
      avgDeath[asa] = {};
      for (const [surg, meanVal] of group) {
        avgDeath[asa][surg] = meanVal;
      }
    }

    // Build cell data
    const cells = [];
    dAsaLevels.forEach(asa => {
      dSurgeries.forEach(surg => {
        const val = avgDeath[asa] && avgDeath[asa][surg] != null
          ? avgDeath[asa][surg]
          : 0;
        cells.push({ asa, surgery: surg, value: val });
      });
    });

    // Measure container dims
    const margin = { top: 60, right: 20, bottom: 50, left: 60 };
    const rect = container.getBoundingClientRect();
    const fullWidth  = rect.width;
    const fullHeight = rect.height;
    const width  = fullWidth  - margin.left - margin.right;
    const height = fullHeight - margin.top  - margin.bottom;

    // Create SVG that fills container
    const svg = d3.select(container)
      .append("svg")
        .attr("width", fullWidth)
        .attr("height", fullHeight)
      .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Scales
    const x = d3.scaleBand()
      .domain(dSurgeries)
      .range([0, width])
      .padding(0.1);

    const y = d3.scaleBand()
      .domain(dAsaLevels)
      .range([0, height])
      .padding(0.1);

    // Color domain: 0 to max death_score
    const maxDeath = d3.max(cells, d => d.value);
    const colorScale = d3.scaleSequential(d3.interpolateViridis)
      .domain([0, maxDeath || 1]);

    // Draw axes
    svg.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x))
      .selectAll("text")
        .attr("font-size", "1rem")
        .attr("dy", "1.2em");

    svg.append("g")
      .call(d3.axisLeft(y))
      .selectAll("text")
        .attr("font-size", "1rem");

    // Tooltip
    let tooltip = d3.select("body").select(".daniel-tooltip");
    if (tooltip.empty()) {
      tooltip = d3.select("body")
        .append("div")
        .attr("class", "daniel-tooltip")
        .style("position", "absolute")
        .style("background", "#fff")
        .style("padding", "8px 14px")
        .style("border", "1.5px solid #999")
        .style("border-radius", "8px")
        .style("pointer-events", "none")
        .style("font-size", "15px")
        .style("display", "none")
        .style("z-index", "9999");
    }

    // Draw heatmap cells
    svg.selectAll("rect")
      .data(cells)
      .join("rect")
        .attr("x", d => x(d.surgery))
        .attr("y", d => y(d.asa))
        .attr("width", x.bandwidth())
        .attr("height", y.bandwidth())
        .attr("fill", d => colorScale(d.value))
        .attr("stroke", "#333")
        .attr("stroke-width", 1)
        .on("mouseover", function(event, d) {
          d3.select(this).attr("stroke-width", 2);
          tooltip.style("display", "block")
            .html(
              `<strong>Surgery:</strong> ${d.surgery}<br>
               <strong>ASA:</strong> ${d.asa}<br>
               <strong>Avg Death Score:</strong> ${d.value.toFixed(3)}`
            )
            .style("left", (event.pageX + 12) + "px")
            .style("top", (event.pageY - 18) + "px");
        })
        .on("mouseout", function() {
          d3.select(this).attr("stroke-width", 1);
          tooltip.style("display", "none");
        });

    // Titles and labels
    svg.append("text")
      .attr("x", width / 2)
      .attr("y", -30)
      .attr("text-anchor", "middle")
      .style("font-size", "1.45rem")
      .style("font-weight", "bold")
      .text("Clinical Complexity Heatmap");

    svg.append("text")
      .attr("x", width / 2)
      .attr("y", -8)
      .attr("text-anchor", "middle")
      .style("font-size", "1rem")
      .text("X: Surgery (Low vs High Risk) · Y: ASA Level · Color: Avg Death Score");

    svg.append("text")
      .attr("x", width / 2)
      .attr("y", height + 40)
      .attr("text-anchor", "middle")
      .attr("font-size", "1rem")
      .text("Surgery");

    svg.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -height / 2)
      .attr("y", -45)
      .attr("text-anchor", "middle")
      .attr("font-size", "1rem")
      .text("ASA Level");

    // Legend (gradient)
    const legendWidth  = 200;
    const legendHeight = 10;
    const defs = svg.append("defs");
    const gradient = defs.append("linearGradient")
      .attr("id", "deathGradient")
      .attr("x1", "0%").attr("y1", "0%")
      .attr("x2", "100%").attr("y2", "0%");
    gradient.append("stop")
      .attr("offset", "0%")
      .attr("stop-color", colorScale(0));
    gradient.append("stop")
      .attr("offset", "100%")
      .attr("stop-color", colorScale(maxDeath || 1));

    const legend = svg.append("g")
      .attr("transform", `translate(${(width - legendWidth) / 2}, ${height + 60})`);

    legend.append("rect")
      .attr("width",  legendWidth)
      .attr("height", legendHeight)
      .style("fill", "url(#deathGradient)")
      .style("stroke", "#333");

    legend.append("text")
      .attr("x", 0)
      .attr("y", legendHeight + 15)
      .attr("font-size", "0.9rem")
      .text("Low");

    legend.append("text")
      .attr("x", legendWidth)
      .attr("y", legendHeight + 15)
      .attr("text-anchor", "end")
      .attr("font-size", "0.9rem")
      .text("High");
  }

  // Expose global function; dashboard_main.js will call this
  window.renderDanielViz = function(containerSelector) {
    d3.json("data/daniel.json")
      .then(data => {
        try {
          drawDanielHeatmap(data);
        } catch (e) {
          const container = document.getElementById("heatmap-container");
          if (container) {
            container.innerHTML = "<div style='color:#faa'>Could not render Daniel's chart: " + e.message + "</div>";
          }
          console.error("Daniel visualization error:", e);
        }
      })
      .catch(err => {
        const container = document.getElementById("heatmap-container");
        if (container) {
          container.innerHTML = "<div style='color:#faa'>Could not load daniel.json: " + err.message + "</div>";
        }
        console.error("Error loading daniel.json:", err);
      });
  };
})();
