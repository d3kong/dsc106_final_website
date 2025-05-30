(function () {
  const margin = { top: 100, right: 50, bottom: 30, left: 200 };
  const wrap      = d3.select("#heatmap");
  const detailBox = d3.select("#heatmap-details");

  // Dropdown is defined in HTML; we'll populate it after loading data
  const dropdown = d3.select("#surgeryFilter").style("margin-bottom", "10px");

  // Tooltip div for hover
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

    // Color scale based on full dataset anxiety range
    const scoreMin = d3.min(allData, d => d.anxiety_score);
    const scoreMax = d3.max(allData, d => d.anxiety_score);
    const color = d3.scaleSequential()
      .interpolator(d3.interpolateRdYlGn)
      .domain([scoreMax, scoreMin]);

    // Axes
    svg.append("g")
      .attr("class","x-axis")
      .attr("transform","translate(0,0)")
      .call(d3.axisTop(x));

    svg.append("g")
      .attr("class","y-axis")
      .call(d3.axisLeft(y));

    // Build heatmap cells
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
        .attr("tabindex", 0)
        .attr("focusable", true)
        .on("mouseover", (event, d) => {
          lastHovered = d;
          tooltip.transition().duration(200).style("opacity", 1)
                 .html(`<b>${d.opname}</b><br>${d.metric}: ${d.value.toFixed(3)}`)
                 .style("left", (event.pageX + 10) + "px")
                 .style("top",  (event.pageY - 28) + "px");
          // auto-focus the rect so Enter will work immediately
          event.currentTarget.focus();
        })
        .on("mouseout", () => {
          tooltip.transition().duration(200).style("opacity", 0);
          lastHovered = null;
        })
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

    // sort descending by anxiety_score
    const sorted = [...allData].sort((a, b) => b.anxiety_score - a.anxiety_score);
    let filtered;
    if (choice === "All") {
      filtered = sorted;
    } else {
      filtered = sorted.filter(d => d.optype === choice);
    }

    render(filtered);
  }

  // load data
  d3.json("data/daniel.json").then(data => {
    data.forEach(d => {
      if (d.anxiety_score === undefined) {
        d.anxiety_score = 0.6 * d.death_score + 0.2 * d.asa_score + 0.2 * d.commonality_score;
      }
    });
    allData = data;

    // populate dropdown with distinct operation types
    const optypes = Array.from(new Set(allData.map(d => d.optype))).sort();
    dropdown.selectAll("option")
      .data(["All", ...optypes])
      .join("option")
        .attr("value", d => d)
        .text(d => d);

    updateFilter();
    dropdown.on("change", updateFilter);

    // global Enter for lastHovered
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
  }).catch(error => console.error("Failed to load heatmap data:", error));
})();
