// daniel_main.js

function renderDanielViz(containerSelector) {
  const regionToGroup = {
    head_neck: "Thyroid",
    thorax:    "Breast",
    abdomen:   "Colorectal",
    pelvis:    "Transplantation"
  };

  // Determine the initial group based on window.selectedRegion:
  let currentGroup = null;
  if (window.selectedRegion && regionToGroup[window.selectedRegion]) {
    currentGroup = regionToGroup[window.selectedRegion];
  }

  d3.json("data/daniel.json").then(data => {
    const allData = data;
    const metrics = ["death_score", "asa_score", "commonality_score", "anxiety_score"];

    // Set up the container HTML
    const container = d3.select(containerSelector);
    container.html(`
      <h2>Patient Profiles: Anxiety Heatmap</h2>
      <div id="heatmap"></div>
      <div id="heatmap-details" style="margin-top:12px"></div>
      <div class="legend" style="margin-top: 1rem; text-align: center; font-size: 0.9rem; color: #fff;">
        <div style="display: inline-flex; align-items: center; margin-bottom: 0.5rem;">
          <div style="width: 16px; height: 16px; background-color: #440154; border: 1px solid #fff; margin-right: 6px;"></div>
          <div>Low Anxiety</div>
        </div>
        <div style="display: inline-flex; align-items: center; margin-bottom: 0.5rem;">
          <div style="width: 16px; height: 16px; background-color: #21918c; border: 1px solid #fff; margin-right: 6px;"></div>
          <div>Medium Anxiety</div>
        </div>
        <div style="display: inline-flex; align-items: center;">
          <div style="width: 16px; height: 16px; background-color: #fde725; border: 1px solid #fff; margin-right: 6px;"></div>
          <div>High Anxiety</div>
        </div>
      </div>
      <p>Anxiety score calculated as: (0.6 • death_rate) + (0.2 • asa_score) + (0.2 • commonality_score)</p>
      <p style="
          margin-top: 0.8rem;
          font-size: 0.9rem;
          color: #fff;
          font-style: italic;
          text-align: center;
          max-width: 240px;
        ">
        Each color block represents a procedure’s score: 
        <b>death risk</b> (left), <b>ASA class</b> (next), 
        <b>commonality</b> (third), and the combined 
        <b>anxiety score</b> (far right).  Dark blue = low risk/anxiety, 
        yellow = high risk/anxiety.  Click any body region to show only those surgeries.
      </p>
    `);

    const wrap = container.select("#heatmap");
    wrap.selectAll("*").remove();

    const width = 520,
          height = 360,
          margin = { top: 30, right: 20, bottom: 30, left: 160 };

    // Build a sorted list of unique optypes
    const optypes = Array.from(new Set(allData.map(d => d.optype))).sort();

    // If no currentGroup (i.e. no region filter), default to the first optype in the sorted list
    if (!currentGroup) {
      currentGroup = optypes[0];
    }

    // Function that actually draws the heatmap given a filtered subset of data
    function render(filteredData) {
      wrap.selectAll("svg").remove();

      const yDomain = filteredData.map(d => d.opname);
      const x = d3.scaleBand()
                  .domain(metrics)
                  .range([0, width])
                  .padding(0.08);

      const y = d3.scaleBand()
                  .domain(yDomain)
                  .range([0, height])
                  .padding(0.08);

      const color = d3.scaleSequential()
                      .interpolator(d3.interpolateViridis)
                      .domain([1, 0]);

      const svg = wrap.append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

      svg.append("g").call(d3.axisTop(x));
      svg.append("g").call(d3.axisLeft(y));

      svg.selectAll("rect")
         .data(filteredData.flatMap(d =>
           metrics.map(m => ({
             opname: d.opname,
             metric: m,
             value: d[m],
             allRow: d
           }))
         ))
         .join("rect")
         .attr("x", d => x(d.metric))
         .attr("y", d => y(d.opname))
         .attr("width", x.bandwidth())
         .attr("height", y.bandwidth())
         .attr("fill", d => color(d.value))
         .attr("stroke", "#fff")
         .on("mouseover", (event, d) => {
           d3.select("#heatmap-details").html(`
             <b>${d.opname}</b><br>
             ${d.metric}: ${d.value != null ? d.value.toFixed(2) : "N/A"}
           `);
         });
    }

    // Initial render: filter by whatever currentGroup is
    const initialFiltered = allData.filter(d => d.optype === currentGroup);
    render(initialFiltered);
  });
}
