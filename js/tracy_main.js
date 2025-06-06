// tracy_main.js – Swarm Plot that fills its container (#viz1)

const lowRisk = "Cholecystectomy";
const highRisk = "Exploratory laparotomy";
const surgeries = [lowRisk, highRisk];

// Color scale for ASA (convert numeric ASA to string)
const asaColors = d3.scaleOrdinal()
  .domain(["1","2","3","4","5"])
  .range(["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd"]);

function drawTracySwarm(data) {
  const container = document.getElementById("tracy-swarm-container");
  if (!container) return;
  container.innerHTML = "";

  // Filter to our two surgeries, ensure ASA & death_inhosp exist
  const filtered = (data || []).filter(d =>
    (d.opname === lowRisk || d.opname === highRisk) &&
    d.asa !== undefined &&
    d.death_inhosp !== undefined
  );

  if (filtered.length === 0) {
    container.innerHTML = "<div style='color:#aaa'>No data available for those surgeries.</div>";
    return;
  }

  // Map to plotting objects
  const plotData = filtered.map(d => {
    const asaVal = String(Math.round(d.asa)); // e.g. 2.0 → "2"
    const outcome = +d.death_inhosp;          // 0 or 1
    return {
      surgery: d.opname,
      asa: asaVal,
      outcome: outcome,
      age: d.age,
      sex: d.sex
    };
  });

  // Compute dynamic dimensions
  const margin = { top: 70, right: 30, bottom: 70, left: 70 };

  // Get container’s inner width/height from CSS
  // (clientWidth includes padding but not margin/border)
  const rect = container.getBoundingClientRect();
  const fullWidth  = rect.width;
  const fullHeight = rect.height;

  // Deduct margins to get drawing area
  const width  = fullWidth  - margin.left - margin.right;
  const height = fullHeight - margin.top  - margin.bottom;

  // Create SVG sized to fill the container
  const svg = d3.select(container)
    .append("svg")
      .attr("width", fullWidth)
      .attr("height", fullHeight)
    .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

  // Circle radius
  const radius = 6;

  // X-axis: surgeries, with padding so circles stay inside
  const x = d3.scalePoint()
    .domain(surgeries)
    .range([radius, width - radius])
    .padding(0.5);

  // Y-axis: outcome 0 or 1, padded so circles fit
  const y = d3.scaleLinear()
    .domain([-0.1, 1.1])
    .range([height - radius, radius]);

  // Draw axes
  svg.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x).tickSize(0))
    .selectAll("text")
      .attr("font-size", "1rem")
      .attr("dy", "1.5em");

  svg.append("g")
    .call(d3.axisLeft(y).ticks(2).tickFormat(d => d === 1 ? "Yes" : "No"))
    .selectAll("text")
      .attr("font-size", "1rem");

  // Force simulation to position points in a swarm
  const simulation = d3.forceSimulation(plotData)
    .force("x", d3.forceX(d => x(d.surgery)).strength(1))
    .force("y", d3.forceY(d => y(d.outcome)).strength(1))
    .force("collide", d3.forceCollide(radius * 1.1))
    .stop();

  for (let i = 0; i < 200; i++) simulation.tick();

  // Tooltip (reuse or create)
  let tooltip = d3.select("body").select(".tracy-tooltip");
  if (tooltip.empty()) {
    tooltip = d3.select("body")
      .append("div")
      .attr("class", "tracy-tooltip")
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

  // Draw points
  svg.append("g")
    .selectAll("circle")
    .data(plotData)
    .join("circle")
      .attr("cx", d => d.x)
      .attr("cy", d => d.y)
      .attr("r", radius)
      .attr("fill", d => asaColors(d.asa))
      .attr("stroke", "#333")
      .attr("stroke-width", 1.2)
      .on("mouseover", function(event, d) {
        d3.select(this).attr("stroke-width", 2.5);
        tooltip.style("display", "block")
          .html(
            `<strong>Surgery:</strong> ${d.surgery}<br>
             <strong>ASA Score:</strong> ${d.asa}<br>
             <strong>Death in Hosp.:</strong> ${d.outcome === 1 ? "Yes" : "No"}<br>
             <strong>Age:</strong> ${d.age || "N/A"}<br>
             <strong>Sex:</strong> ${d.sex || "N/A"}`
          )
          .style("left", (event.pageX + 15) + "px")
          .style("top", (event.pageY - 18) + "px");
      })
      .on("mouseout", function() {
        d3.select(this).attr("stroke-width", 1.2);
        tooltip.style("display", "none");
      });

  // Titles and labels
  svg.append("text")
    .attr("x", width / 2)
    .attr("y", -35)
    .attr("text-anchor", "middle")
    .style("font-size", "1.45rem")
    .style("font-weight", "bold")
    .text("How Risk Grows with ASA");

  svg.append("text")
    .attr("x", width / 2)
    .attr("y", -10)
    .attr("text-anchor", "middle")
    .style("font-size", "1rem")
    .text("X: Low-risk vs High-risk Surgery · Y: Death in Hospital (Yes/No) · Color: ASA Score");

  svg.append("text")
    .attr("x", width / 2)
    .attr("y", height + 50)
    .attr("text-anchor", "middle")
    .attr("font-size", "1rem")
    .text("Surgery");

  svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", -50)
    .attr("text-anchor", "middle")
    .attr("font-size", "1rem")
    .text("Death in Hospital");

  // Legend for ASA colors
  const legend = svg.append("g")
    .attr("transform", `translate(${width - 100}, -20)`);
  ["1","2","3","4","5"].forEach((asa, i) => {
    legend.append("circle")
      .attr("cx", 0)
      .attr("cy", i * 20)
      .attr("r", 6)
      .attr("fill", asaColors(asa))
      .attr("stroke", "#333");
    legend.append("text")
      .attr("x", 12)
      .attr("y", i * 20 + 4)
      .attr("font-size", "0.9rem")
      .text(`ASA ${asa}`);
  });
}

// Integration with main.js
window.renderTracyViz = function(selector) {
  d3.json("data/tracy.json")
    .then(data => {
      try {
        drawTracySwarm(data);
      } catch (e) {
        const container = document.getElementById("tracy-swarm-container");
        if (container) {
          container.innerHTML = "<div style='color:#faa'>Could not render Tracy's chart: " + e.message + "</div>";
        }
        console.error("Tracy visualization error:", e);
      }
    })
    .catch(err => {
      const container = document.getElementById("tracy-swarm-container");
      if (container) {
        container.innerHTML = "<div style='color:#faa'>Could not load tracy.json: " + err.message + "</div>";
      }
      console.error("Error loading tracy.json:", err);
    });
};

// Initial render
window.renderTracyViz("#viz1");
