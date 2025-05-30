(function () {
  const margin = { top: 100, right: 50, bottom: 30, left: 150 };

  const wrap = d3.select("#heatmap");           // heatmap container div
  const detailBox = d3.select("#heatmap-details"); // details div in HTML

  // Dropdown filter before SVG
  const dropdown = wrap
    .insert("select", ":first-child")
    .attr("id", "surgeryFilter")
    .style("margin-bottom", "10px");

  dropdown.selectAll("option")
    .data(["Top 10", "Top 20", "Top 50", "All"])
    .enter()
    .append("option")
    .text(d => d);

  const tooltip = d3.select("body")
    .append("div")
    .attr("class", "tooltip")
    .style("position", "absolute")
    .style("background", "#fff")
    .style("padding", "6px")
    .style("border", "1px solid #ccc")
    .style("border-radius", "4px")
    .style("pointer-events", "none")
    .style("opacity", 0);

  // Brush info container (under heatmap)
  let brushInfo = wrap.select("#brush-info");
  if (brushInfo.empty()) {
    brushInfo = wrap.append("div")
      .attr("id", "brush-info")
      .style("margin-top", "20px")
      .style("font-size", "14px")
      .style("font-family", "sans-serif");
  }

  let allData = [];
  let lastHovered = null;

  function render(data) {
    wrap.selectAll("svg").remove();
    detailBox.html("");
    brushInfo.text("");

    const width = 1000 - margin.left - margin.right;
    const height = 700 - margin.top - margin.bottom;

    const svg = wrap.append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
      .attr("preserveAspectRatio", "xMidYMid meet")
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const metrics = ["death_score", "asa_score", "commonality_score", "anxiety_score"];

    // Sort y domain alphabetically or by anxiety_score
    const yDomain = data.map(d => d.opname).sort();

    const x = d3.scaleBand()
      .domain(metrics)
      .range([0, width])
      .padding(0.05);

    const y = d3.scaleBand()
      .domain(yDomain)
      .range([0, height])
      .padding(0.05);

    // Color scale: reversed to have green=low anxiety, red=high anxiety
    const scoreMin = d3.min(allData, d => d.anxiety_score);
    const scoreMax = d3.max(allData, d => d.anxiety_score);
    const color = d3.scaleSequential()
      .interpolator(d3.interpolateRdYlGn)
      .domain([scoreMax, scoreMin]); // reversed domain

    svg.append("g").call(d3.axisTop(x));
    svg.append("g").call(d3.axisLeft(y));

    // Prepare cells
    const cells = data.flatMap(d =>
      metrics.map(m => ({
        opname: d.opname,
        metric: m,
        value: d[m],
        allRow: d
      }))
    );

    const rects = svg.selectAll("rect")
      .data(cells)
      .join("rect")
      .attr("x", d => x(d.metric))
      .attr("y", d => y(d.opname))
      .attr("width", x.bandwidth())
      .attr("height", y.bandwidth())
      .style("fill", d => color(d.value))
      .style("stroke", "#fff")
      .on("mouseover", (event, d) => {
        lastHovered = d;
        tooltip.transition().duration(200).style("opacity", 1);
        tooltip.html(`<b>${d.opname}</b><br>${d.metric}: ${d.value.toFixed(3)}`)
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 28) + "px");
      })
      .on("mouseout", () => {
        tooltip.transition().duration(500).style("opacity", 0);
        lastHovered = null;
      });

    // Brush setup
    const brush = d3.brush()
      .extent([[0, 0], [width, height]])
      .on("end", ({ selection }) => {
        if (!selection) {
          brushInfo.text("");
          rects.classed("selected", false);
          return;
        }
        const [[x0, y0], [x1, y1]] = selection;
        const selected = cells.filter(d => {
          const cx = x(d.metric) + x.bandwidth() / 2;
          const cy = y(d.opname) + y.bandwidth() / 2;
          return x0 <= cx && cx <= x1 && y0 <= cy && cy <= y1;
        });

        rects.classed("selected", d => {
          const cx = x(d.metric) + x.bandwidth() / 2;
          const cy = y(d.opname) + y.bandwidth() / 2;
          return x0 <= cx && cx <= x1 && y0 <= cy && cy <= y1;
        });

        if (selected.length > 0) {
          const avg = d3.mean(selected, d => d.value);
          brushInfo.html(`<b>${selected.length}</b> cells selected<br>Average value: <b>${avg.toFixed(3)}</b>`);
        } else {
          brushInfo.text("No cells selected.");
        }
      });

    svg.append("g").call(brush);
  }

  function updateFilter() {
    const choice = dropdown.property("value");
    if (!allData.length) return;

    let filtered;
    // Sort descending by anxiety_score on each filter change
    const sortedData = [...allData].sort((a, b) => b.anxiety_score - a.anxiety_score);

    if (choice === "Top 10") filtered = sortedData.slice(0, 10);
    else if (choice === "Top 20") filtered = sortedData.slice(0, 20);
    else if (choice === "Top 50") filtered = sortedData.slice(0, 50);
    else filtered = sortedData;

    render(filtered);
  }

  d3.json("data/daniel.json").then(data => {
    // Calculate anxiety_score if not present
    data.forEach(d => {
      if (d.anxiety_score === undefined) {
        d.anxiety_score = 0.6 * d.death_score + 0.2 * d.asa_score + 0.2 * d.commonality_score;
      }
    });

    allData = data;
    updateFilter();

    dropdown.on("change", updateFilter);

    // Keyboard interaction
    d3.select("body").on("keydown", (event) => {
      if (event.key === "Enter" && lastHovered) {
        const vals = lastHovered.allRow;
        detailBox.html(`
          <div style="text-align:left; padding: 10px; border: 1px solid #ccc; background: #f9f9f9; border-radius: 6px;">
            <b>${vals.opname}</b><br>
            Anxiety Score: ${vals.anxiety_score.toFixed(3)}<br>
            Death Score: ${vals.death_score.toFixed(3)}<br>
            ASA Score: ${vals.asa_score.toFixed(3)}<br>
            Commonality Score: ${vals.commonality_score.toFixed(3)}
          </div>
        `);
      }
    });
  }).catch(error => {
    console.error("Failed to load heatmap data:", error);
  });
})();
