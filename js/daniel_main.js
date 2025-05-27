const margin = { top: 100, right: 30, bottom: 30, left: 200 };
const width  = 1000 - margin.left - margin.right;
const height = 700  - margin.top  - margin.bottom;

const svg = d3.select("#heatmap")
  .append("svg")
  .attr("width", width + margin.left + margin.right)
  .attr("height", height + margin.top + margin.bottom)
  .append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);

const tooltip = d3.select("body")
  .append("div")
  .attr("class","tooltip")
  .style("position", "absolute")
  .style("background", "#fff")
  .style("padding", "6px")
  .style("border", "1px solid #ccc")
  .style("border-radius", "4px")
  .style("pointer-events", "none")
  .style("opacity", 0);

const detailBox = d3.select("#details");

// Load data and raw cases for grouping
Promise.all([
  d3.json("data/daniel.json"),
  d3.csv("data/cases.csv", d3.autoType)
]).then(([data, cases]) => {
  const metrics = ["death_score", "asa_score", "commonality_score", "anxiety_score"];

  // Compute anxiety_score if not present
  data.forEach(d => {
    d.anxiety_score = 0.6 * d.death_score + 0.2 * d.asa_score + 0.2 * d.commonality_score;
  });

  const scoreMin = d3.min(data, d => d.anxiety_score);
  const scoreMax = d3.max(data, d => d.anxiety_score);

  // Render function will re-run on filter changes
  function render(filteredCases) {
    svg.selectAll("*").remove();
    detailBox.html("");

    // Group by optype, averaging each metric
    const grouped = Array.from(
      d3.group(filteredCases, d => d.optype),
      ([optype, recs]) => {
        const entry = { optype };
        metrics.forEach(m => entry[m] = d3.mean(recs, r => r[m]));
        return entry;
      }
    );

    const x = d3.scaleBand()
      .domain(metrics)
      .range([0, width])
      .padding(0.05);

    const y = d3.scaleBand()
      .domain(grouped.map(d => d.optype))
      .range([0, height])
      .padding(0.05);

    const color = d3.scaleSequential()
      .interpolator(d3.interpolateRdYlGn)
      .domain([scoreMax, scoreMin]);

    svg.append("g").call(d3.axisTop(x));
    svg.append("g").call(d3.axisLeft(y));

    // Flatten for rects
    const cellData = grouped.flatMap(d =>
      metrics.map(m => ({ optype: d.optype, metric: m, value: d[m], all: d }))
    );

    svg.selectAll("rect")
      .data(cellData)
      .join("rect")
      .attr("x", d => x(d.metric))
      .attr("y", d => y(d.optype))
      .attr("width", x.bandwidth())
      .attr("height", y.bandwidth())
      .style("fill", d => color(d.value))
      .style("stroke", "#fff")
      .on("mouseover", (event, d) => {
        tooltip.transition().duration(200).style("opacity", 1);
        tooltip.html(`<b>${d.optype}</b><br>${d.metric}: ${d.value.toFixed(3)}`)
          .style("left", (event.pageX+10)+"px")
          .style("top",  (event.pageY-28)+"px");
      })
      .on("mouseout", () => tooltip.transition().duration(500).style("opacity", 0));
  }

  render(data);

});