// daniel_main.js

function renderDanielViz(containerSelector) {
  const regionToGroup = {
    head_neck: "Thyroid",
    thorax:    "Breast",
    abdomen:   "Colorectal",
    pelvis:    "Transplantation"
  };
  let currentGroup = null;
  if (window.selectedRegion && regionToGroup[window.selectedRegion])
    currentGroup = regionToGroup[window.selectedRegion];

  d3.json("data/daniel.json").then(data => {
    const allData = data;
    const metrics = ["death_score", "asa_score", "commonality_score", "anxiety_score"];

    // Set up UI
    const container = d3.select(containerSelector);
    container.html(`<h2>Patient Profiles: Anxiety Heatmap</h2>
      <div id="heatmap"></div>
      <div id="heatmap-details" style="margin-top:12px"></div>
    `);

    const wrap = container.select("#heatmap");
    wrap.selectAll("*").remove();

    const width = 520, height = 360, margin = { top: 30, right: 20, bottom: 30, left: 160 };
    const filtered = currentGroup
      ? allData.filter(d => d.optype === currentGroup)
      : allData;

    // Build dropdown
    const optypes = Array.from(new Set(allData.map(d => d.optype))).sort();
    const dropdown = wrap.append("select")
      .style("margin-bottom", "10px")
      .on("change", function() {
        const val = this.value;
        render(val === "All" ? allData : allData.filter(d => d.optype === val));
      });
    dropdown.selectAll("option")
      .data(["All", ...optypes])
      .join("option")
      .attr("value", d => d)
      .text(d => d);
    dropdown.property("value", currentGroup || "All");

    function render(filteredData) {
      wrap.selectAll("svg").remove();
      const yDomain = filteredData.map(d => d.opname);
      const x = d3.scaleBand().domain(metrics).range([0, width]).padding(0.08);
      const y = d3.scaleBand().domain(yDomain).range([0, height]).padding(0.08);
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
          metrics.map(m => ({ opname: d.opname, metric: m, value: d[m], allRow: d }))
        ))
        .join("rect")
        .attr("x", d => x(d.metric))
        .attr("y", d => y(d.opname))
        .attr("width", x.bandwidth())
        .attr("height", y.bandwidth())
        .attr("fill", d => color(d.value))
        .attr("stroke", "#fff")
        .on("mouseover", function(event, d) {
          d3.select("#heatmap-details").html(
            `<b>${d.opname}</b><br>${d.metric}: ${d.value != null ? d.value.toFixed(2) : "N/A"}`
          );
        });
    }

    render(filtered);
  });
}
