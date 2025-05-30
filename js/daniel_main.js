(function () {
  const margin = { top: 100, right: 50, bottom: 30, left: 250 };

  // Main containers
  const wrap      = d3.select("#heatmap");
  const detailBox = d3.select("#heatmap-details");

  // Use the dropdown placed in HTML
  const dropdown = d3.select("#surgeryFilter").style("margin-bottom", "10px");
  dropdown.selectAll("option")
    .data(["Top 10", "Top 20", "Top 50", "All"] )
    .join("option")
      .attr("value", d => d)
      .text(d => d);

  // Tooltip for hover
  const tooltip = d3.select("body")
    .append("div")
    .attr("class", "tooltip")
    .style("position",       "absolute")
    .style("background",     "#fff")
    .style("padding",        "6px")
    .style("border",         "1px solid #ccc")
    .style("border-radius",  "4px")
    .style("pointer-events", "none")
    .style("opacity",        0);

  // Brush-info pane
  let brushInfo = wrap.select("#brush-info");
  if (brushInfo.empty()) {
    brushInfo = wrap.append("div")
      .attr("id", "brush-info")
      .style("margin-top", "20px")
      .style("font-size",  "14px")
      .style("font-family","sans-serif");
  }

  let allData = [];
  let lastHovered = null;

  function render(data) {
    wrap.selectAll("svg").remove();
    detailBox.html("");
    brushInfo.text("");

    const width  = 1000 - margin.left - margin.right;
    const height =  700 - margin.top  - margin.bottom;

    const svg = wrap.append("svg")
      .attr("width",  width  + margin.left + margin.right)
      .attr("height", height + margin.top  + margin.bottom)
      .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
      .attr("preserveAspectRatio", "xMidYMid meet")
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const metrics = ["death_score", "asa_score", "commonality_score", "anxiety_score"];
    const yDomain = data.map(d => d.opname);

    const x = d3.scaleBand()
      .domain(metrics)
      .range([0, width])
      .padding(0.05);

    const y = d3.scaleBand()
      .domain(yDomain)
      .range([0, height])
      .padding(0.05);

    // Color scale based on full data anxiety range
    const scoreMin = d3.min(allData, d => d.anxiety_score);
    const scoreMax = d3.max(allData, d => d.anxiety_score);
    const color = d3.scaleSequential()
      .interpolator(d3.interpolateRdYlGn)
      .domain([scoreMax, scoreMin]);

    // Axes with labels
    svg.append("g")
      .attr("class","x-axis")
      .attr("transform","translate(0,0)")
      .call(d3.axisTop(x));

    svg.append("g")
      .attr("class","y-axis")
      .call(d3.axisLeft(y));

    // Build cells
    const cells = data.flatMap(d =>
      metrics.map(m => ({ opname: d.opname, metric: m, value: d[m], allRow: d }))
    );

    const rects = svg.selectAll("rect")
      .data(cells)
      .join("rect")
      .attr("x",      d => x(d.metric))
      .attr("y",      d => y(d.opname))
      .attr("width",  x.bandwidth())
      .attr("height", y.bandwidth())
      .style("fill",   d => color(d.value))
      .style("stroke", "#fff")
      .on("mouseover", (event, d) => {
        lastHovered = d;
        // show tooltip as before…
        tooltip.transition().duration(200).style("opacity", 1)
              .html(`<b>${d.opname}</b><br>${d.metric}: ${d.value.toFixed(3)}`)
              .style("left", (event.pageX + 10) + "px")
              .style("top",  (event.pageY - 28) + "px");

        // new: give this rect keyboard focus
        event.currentTarget.focus();
      })
      .on("mouseout", () => {
        tooltip.transition().duration(200).style("opacity", 0);
        lastHovered = null;
      });

    // ─── Keyboard access: Tab + Enter on each cell ───
    rects
      .attr("tabindex", 0)
      .attr("focusable", true)
      .on("focus", (event, d) => {
        lastHovered = d;
        tooltip.transition().duration(200).style("opacity", 1)
               .html(`<b>${d.opname}</b><br>${d.metric}: ${d.value.toFixed(3)}`)
               .style("left", (event.pageX + 10) + "px")
               .style("top",  (event.pageY - 28) + "px");
      })
      .on("blur", () => {
        tooltip.transition().duration(200).style("opacity", 0);
        lastHovered = null;
      })
      .on("keydown", (event, d) => {
        if (event.key === "Enter") {
          const v = d.allRow;
          detailBox.html(
            `<div style="text-align:left; padding:10px; border:1px solid #ccc; background:#f9f9f9; border-radius:6px;">
               <b>${v.opname}</b><br>
               Death Score: ${v.death_score.toFixed(3)}<br>
               ASA Score: ${v.asa_score.toFixed(3)}<br>
               Commonality Score: ${v.commonality_score.toFixed(3)}<br>
               Anxiety Score: ${v.anxiety_score.toFixed(3)}
             </div>`
          );
        }
      });

    // Brush for multi-cell summary
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
        if (selected.length) {
          const avg = d3.mean(selected, d => d.value);
          brushInfo.html(`<b>${selected.length}</b> cells selected<br>Average: <b>${avg.toFixed(3)}</b>`);
        } else {
          brushInfo.text("No cells selected.");
        }
      });
    svg.append("g").call(brush);
  }

  function updateFilter() {
    const choice = dropdown.property("value");
    if (!allData.length) return;

    const sorted = [...allData].sort((a, b) => b.anxiety_score - a.anxiety_score);
    let filtered;
    if (choice === "Top 10") filtered = sorted.slice(0, 10);
    else if (choice === "Top 20") filtered = sorted.slice(0, 20);
    else if (choice === "Top 50") filtered = sorted.slice(0, 50);
    else filtered = sorted;

    render(filtered);
  }

  // Load and initialize
  d3.json("data/daniel.json").then(data => {
    data.forEach(d => {
      if (d.anxiety_score === undefined) {
        d.anxiety_score = 0.6 * d.death_score
                        + 0.2 * d.asa_score
                        + 0.2 * d.commonality_score;
      }
    });
    allData = data;
    updateFilter();
    dropdown.on("change", updateFilter);

    // Global Enter for detail pane
    d3.select("body").on("keydown", event => {
      if (event.key === "Enter" && lastHovered) {
        const v = lastHovered.allRow;
        detailBox.html(
          `<div style="text-align:left; padding:10px; border:1px solid #ccc; background:#f9f9f9; border-radius:6px;">
             <b>${v.opname}</b><br>
             Death Score: ${v.death_score.toFixed(3)}<br>
             ASA Score: ${v.asa_score.toFixed(3)}<br>
             Commonality Score: ${v.commonality_score.toFixed(3)}<br>
             Anxiety Score: ${v.anxiety_score.toFixed(3)}
           </div>`
        );
      }
    });
  }).catch(err => console.error("Failed to load heatmap data:", err));
})();
