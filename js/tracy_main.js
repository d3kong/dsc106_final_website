// tracy_main.js - Swarm Plot with X=Region, Y=Age

const surgeryToRegion = {
  "Cholecystectomy":        "abdomen",
  "Lung lobectomy":         "thorax",
  "Low anterior resection": "pelvis",
  "Thyroid lobectomy":      "head_neck"
};

const regionColors = {
  abdomen: "#E57373",
  thorax: "#64B5F6",
  pelvis: "#81C784",
  head_neck: "#FFD54F"
};

function normalizeData(plotData, groupKey) {
  const groups = d3.groups(plotData, d => d[groupKey]);
  const minN = d3.min(groups, ([, arr]) => arr.length);
  let normalized = [];
  for (const [, arr] of groups) {
      if (arr.length > minN) {
          const shuffled = d3.shuffle(arr.slice());
          normalized = normalized.concat(shuffled.slice(0, minN));
      } else {
          normalized = normalized.concat(arr);
      }
  }
  return normalized;
}

// The main drawing function (optionally filter by region)
function drawTracySwarm(data, regionFilter = null) {
  const container = document.getElementById("tracy-swarm-container");
  if (!container) return;
  container.innerHTML = "";

  let filteredData = (data || []).filter(d =>
      d &&
      surgeryToRegion.hasOwnProperty(d.opname) &&
      d.age !== undefined &&
      d.age !== null &&
      d.age !== "" &&
      !isNaN(+d.age)
  );
  if (regionFilter) {
      filteredData = filteredData.filter(d => surgeryToRegion[d.opname] === regionFilter);
  }
  if (filteredData.length === 0) {
      container.innerHTML = "<div style='color:#aaa'>No data available for the selected surgeries.</div>";
      return;
  }

  // Prepare normalized data
  const plotDataRaw = filteredData.map(d => ({
      surgery: d.opname,
      region: surgeryToRegion[d.opname],
      age: +d.age
  }));
  const plotData = normalizeData(plotDataRaw, "region");

  // SVG setup
  const margin = {top: 70, right: 30, bottom: 70, left: 70},
      width = 780 - margin.left - margin.right,
      height = 440 - margin.top - margin.bottom;

  const svg = d3.select(container)
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

  // X-axis: body region (surgery)
  const regions = ["abdomen", "thorax", "pelvis", "head_neck"];
  const regionLabels = {
      abdomen: "Cholecystectomy",
      thorax: "Lung lobectomy",
      pelvis: "Low anterior resection",
      head_neck: "Thyroid lobectomy"
  };
  const x = d3.scalePoint()
      .domain(regions)
      .range([0, width])
      .padding(0.6);

  // Y-axis: age
  const y = d3.scaleLinear()
      .domain(d3.extent(plotData, d => d.age))
      .nice()
      .range([height, 0]);

  // Axes
  svg.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x).tickFormat(region => regionLabels[region]));

  svg.append("g")
      .call(d3.axisLeft(y));

  // Swarm simulation
  const radius = 8;
  const simulation = d3.forceSimulation(plotData)
      .force("x", d3.forceX(d => x(d.region)).strength(1.1))
      .force("y", d3.forceY(d => y(d.age)).strength(1))
      .force("collide", d3.forceCollide(radius * 0.96))
      .stop();

  for (let i = 0; i < 200; ++i) simulation.tick();

  // Tooltip
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

  // Draw dots
  svg.append("g")
      .selectAll("circle")
      .data(plotData)
      .join("circle")
      .attr("cx", d => d.x)
      .attr("cy", d => d.y)
      .attr("r", radius)
      .attr("fill", d => regionColors[d.region])
      .attr("opacity", 0.82)
      .attr("stroke", "#333")
      .attr("stroke-width", 1.2)
      .on("mouseover", function(event, d) {
          d3.select(this).attr("stroke-width", 2.5).attr("opacity", 1);
          tooltip.style("display", "block")
              .html(
                  `<strong>Surgery:</strong> ${d.surgery}<br>
                   <strong>Region:</strong> ${d.region}<br>
                   <strong>Age:</strong> ${d.age}`
              )
              .style("left", (event.pageX + 15) + "px")
              .style("top", (event.pageY - 18) + "px");
      })
      .on("mouseout", function() {
          d3.select(this).attr("stroke-width", 1.2).attr("opacity", 0.82);
          tooltip.style("display", "none");
      });

  // Titles
  svg.append("text")
      .attr("x", width/2)
      .attr("y", -35)
      .attr("text-anchor", "middle")
      .attr("class", "tracy-title")
      .style("font-size", "1.45rem")
      .style("font-weight", "bold")
      .text("Normalized Age Distribution by Body Region (Swarm Plot)");

  svg.append("text")
      .attr("x", width/2)
      .attr("y", -10)
      .attr("text-anchor", "middle")
      .attr("class", "tracy-subtitle")
      .style("font-size", "1.05rem")
      .text("X-axis: Body Region / Surgery · Y-axis: Patient Age · Each region shown with the same number of patients");

  svg.append("text")
      .attr("x", width/2)
      .attr("y", height + 48)
      .attr("text-anchor", "middle")
      .attr("font-size", "1rem")
      .text("Body Region / Surgery");

  svg.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -height/2)
      .attr("y", -45)
      .attr("text-anchor", "middle")
      .attr("font-size", "1rem")
      .text("Patient Age");

  // Legend
  const legend = svg.append("g")
      .attr("transform", `translate(${width - 40},-16)`);
  let i = 0;
  Object.entries(regionColors).forEach(([region, color]) => {
      legend.append("circle")
          .attr("cx", 0)
          .attr("cy", i * 22)
          .attr("r", 9)
          .attr("fill", color)
          .attr("stroke", "#333");
      legend.append("text")
          .attr("x", 18)
          .attr("y", i * 22 + 4)
          .attr("font-size", "0.96rem")
          .text(regionLabels[region]);
      i += 1;
  });
}

// -------- INTEGRATION WITH main.js --------
window.renderTracyViz = function(selector) {
  let regionFilter = null;
  if (window.selectedRegion) {
      regionFilter = window.selectedRegion;
  }
  d3.json("data/tracy.json")
      .then(data => {
          try {
              drawTracySwarm(data, regionFilter);
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

// Render initially when the file loads (no region filter)
window.renderTracyViz("#viz1");
