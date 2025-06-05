function renderDanielViz(containerSelector) {
  const regionToGroup = {
    head_neck: "Thyroid",
    thorax:    "Breast",
    abdomen:   "Colorectal",
    pelvis:    "Transplantation"
  };

  let currentGroup = null;
  if (window.selectedRegion && regionToGroup[window.selectedRegion]) {
    currentGroup = regionToGroup[window.selectedRegion];
  }

  d3.json("data/daniel.json").then(data => {
    const allData = data;
    const metrics = ["death_score", "asa_score", "commonality_score", "anxiety_score"];

    const container = d3.select(containerSelector);
    container.html(`
      <h2>Patient Profiles: Anxiety Heatmap</h2>
      <div id="heatmap"></div>
      <div id="heatmap-details" style="margin-top:12px; color: #fff;"></div>
      <div class="legend" style="margin-top: 1rem; text-align: center; color: #fff;">

        <div style="
            display: inline-block;
            width: 200px;
            height: 16px;
            background: linear-gradient(to right,
              #440154 0%,
              #3b528b 25%,
              #21918c 50%,
              #5cc863 75%,
              #fde725 100%
            );
            border: 1px solid #fff;
            border-radius: 4px;
          ">
        </div>

        <div style="
            display: flex;
            justify-content: space-between;
            width: 200px;
            margin: 4px auto 0;
            font-size: 0.9rem;
          ">
          <span>Low</span>
          <span>High</span>
        </div>
      </div>
<<<<<<< Updated upstream
=======
<<<<<<< HEAD
      <p>Anxiety score calculated as: (0.6 • death_rate) + (0.2 • asa_score) + (0.2 • commonality_score)</p>
      <p class="theme-text" style="
    margin-top: 0.8rem;
    font-size: 0.9rem;
    font-style: italic;
  ">
  Each color block represents a procedure’s score: 
  <b>death risk</b> (left), <b>ASA class</b> (next), 
  <b>commonality</b> (third), and the combined 
  <b>anxiety score</b> (far right).  Dark blue = low risk/anxiety, 
  yellow = high risk/anxiety.  Click any body region to show only those surgeries.
</p>

=======
>>>>>>> Stashed changes
      <p style="color: #fff;">
        Anxiety score calculated as: (0.6 &bull; death_rate) + (0.2 &bull; asa_score) + (0.2 &bull; commonality_score)
      </p>
      <p style="
          margin-top: 0.8rem;
          font-size: 0.9rem;
          color: #fff;
          font-style: italic;
        ">
        Each color block represents a procedure’s score:
        <b>death risk</b> (left), <b>ASA class</b> (next),
        <b>commonality</b> (third), and the combined <b>anxiety score</b> (far right).
        Dark blue = low risk/anxiety, yellow = high risk/anxiety.
        Click any body region to show only those surgeries.
      </p>
>>>>>>> 2ab5fb8a3269ed3ad79a67e6c4a35cd789349665
    `);

    const wrap = container.select("#heatmap");
    wrap.selectAll("*").remove();

    const width  = 520;
    const height = 360;
    const margin = { top: 30, right: 20, bottom: 30, left: 160 };

    const optypes = Array.from(new Set(allData.map(d => d.optype))).sort();

    if (!currentGroup) {
      currentGroup = optypes[0];
    }

    function render(filteredData) {
      // Remove any existing <svg> before drawing
      wrap.selectAll("svg").remove();

      const yDomain = filteredData.map(d => d.opname);

      // Build two band scales
      const x = d3.scaleBand()
                  .domain(metrics)
                  .range([0, width])
                  .padding(0.08);

      const y = d3.scaleBand()
                  .domain(yDomain)
                  .range([0, height])
                  .padding(0.08);

      const deathMax = d3.max(filteredData, d => d.death_score);
      const asaMax = d3.max(filteredData, d => d.asa_score);
      const commonMax = d3.max(filteredData, d => d.commonality_score);
      const anxietyMax = d3.max(filteredData, d => d.anxiety_score);

      const colorDeath = (deathMax > 0) ? d3.scaleSequential(d3.interpolateViridis).domain([0, deathMax]) : d3.scaleSequential(d3.interpolateViridis).domain([0, 1]);
      const colorAsa = d3.scaleSequential(d3.interpolateViridis).domain([0, asaMax]);
      const colorCommon = d3.scaleSequential(d3.interpolateViridis).domain([0, commonMax]);
      const colorAnxiety = d3.scaleSequential(d3.interpolateViridis).domain([0, anxietyMax]);

      const svg = wrap.append("svg")
        .attr("width",  width + margin.left + margin.right)
        .attr("height", height + margin.top  + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

      svg.append("g")
        .call(d3.axisTop(x));

      svg.append("g")
        .call(d3.axisLeft(y));

      const cells = filteredData.flatMap(d =>
        metrics.map(m => ({
          opname: d.opname,
          metric: m,
          value:  d[m],
          allRow: d
        }))
      );

      svg.selectAll("rect")
        .data(cells)
        .join("rect")
        .attr("x", d => x(d.metric))
        .attr("y", d => y(d.opname))
        .attr("width", x.bandwidth())
        .attr("height", y.bandwidth())
        .attr("fill", d => {
          if (d.metric === "death_score") {
            return colorDeath(d.value);
          } else if (d.metric === "asa_score") {
            return colorAsa(d.value);
          } else if (d.metric === "commonality_score") {
            return colorCommon(d.value);
          } else {
            return colorAnxiety(d.value);
          }
        })
        .attr("stroke", "#fff")
        .on("mouseover", (event, d) => {
          d3.select("#heatmap-details").html(`
            <b>${d.opname}</b><br>
            ${d.metric}: ${d.value != null ? d.value.toFixed(2) : "N/A"}
          `);
        });
    }
    const initialFiltered = allData.filter(d => d.optype === currentGroup);

    initialFiltered.sort((a, b) => b.anxiety_score - a.anxiety_score);

    render(initialFiltered);

    d3.selectAll("#body-map2 .region").on("click", function(event) {
      // Clear previous highlight, then highlight this region
      d3.selectAll("#body-map2 .region").classed("region--selected", false);
      d3.select(this).classed("region--selected", true);

      // Look up its group name, set the dropdown value, re‐render
      const regionID = d3.select(this).attr("id");
      const groupName = regionToGroup[regionID];
      if (!groupName) return;

      currentGroup = groupName;
      const subset = allData.filter(d => d.optype === currentGroup);
      subset.sort((a, b) => b.anxiety_score - a.anxiety_score);
      render(subset);
    });

  }).catch(error => {
    console.error("Error loading data/daniel.json:", error);
  });
}

// Finally, call it on page load with the container selector:
document.addEventListener("DOMContentLoaded", () => {
  renderDanielViz("#slide3 .panel-cell");
});
