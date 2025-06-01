(function() {
  const margin = { top: 100, right: 50, bottom: 30, left: 150 };

  const wrap = d3.select("#heatmap");

  const detailBox = d3.select("#heatmap-details");

  const dropdown = wrap
    .insert("select", ":first-child")
    .attr("id", "optypeFilter")
    .style("margin-bottom", "10px");

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

  const regionToGroup = {
    "region_OthersBar":        "Others",
    "region_Thyroid":          "Thyroid",
    "region_Breast":           "Breast",
    "region_Vascular":         "Vascular",
    "region_Hepatic":          "Hepatic",
    "region_BiliaryPancreas":  "Biliary/Pancreas",
    "region_Stomach":          "Stomach",
    "region_Colorectal":       "Colorectal",
    "region_MajorResection":   "Major resection",
    "region_MinorResection":   "Minor resection",
    "region_Transplantation":  "Transplantation",
    "region_Others":           "Others"
  };

  function render(filteredData) {
    wrap.selectAll("svg").remove();
    detailBox.html("");
    brushInfo.text("");

    const width  = 1000 - margin.left - margin.right;
    const height =  700 - margin.top  - margin.bottom;

    const svg = wrap.append("svg")
      .attr("width",  width + margin.left + margin.right)
      .attr("height", height + margin.top  + margin.bottom)
      .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
      .attr("preserveAspectRatio", "xMidYMid meet")
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const metrics = ["death_score", "asa_score", "commonality_score", "anxiety_score"];
    const yDomain = filteredData.map(d => d.opname);

    const x = d3.scaleBand()
      .domain(metrics)
      .range([0, width])
      .padding(0.05);

    const y = d3.scaleBand()
      .domain(yDomain)
      .range([0, height])
      .padding(0.05);

    const scoreMin = d3.min(allData, d => d.anxiety_score);
    const scoreMax = d3.max(allData, d => d.anxiety_score);
    const color = d3.scaleSequential()
      .interpolator(d3.interpolateViridis)
      .domain([scoreMax, scoreMin]);

    // DRAW AXES
    svg.append("g")
      .attr("class", "x-axis")
      .attr("transform", "translate(0, 0)")
      .call(d3.axisTop(x));

    svg.append("g")
      .attr("class", "y-axis")
      .attr("transform", "translate(0, 0)")
      .call(d3.axisLeft(y));

    const cells = filteredData.flatMap(d =>
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
      .attr("x",      d => x(d.metric))
      .attr("y",      d => y(d.opname))
      .attr("width",  x.bandwidth())
      .attr("height", y.bandwidth())
      .style("fill",  d => color(d.value))
      .style("stroke","#fff")
      .attr("tabindex", 0)
      .attr("focusable", true)
      .on("mouseover", (event, d) => {
        lastHovered = d;
        tooltip.transition().duration(200).style("opacity", 1);
        tooltip.html(`
          <b>${d.opname}</b><br>
          ${d.metric}: ${isNaN(d.value) ? "N/A" : d.value.toFixed(3)}
        `)
          .style("left", (event.pageX + 10) + "px")
          .style("top",  (event.pageY - 28) + "px");
      })
      .on("mouseout", () => {
        tooltip.transition().duration(500).style("opacity", 0);
        lastHovered = null;
      })
      .on("focus", (event, d) => {
        lastHovered = d;
        tooltip.transition().duration(200).style("opacity", 1);
        tooltip.html(`
          <b>${d.opname}</b><br>
          ${d.metric}: ${isNaN(d.value) ? "N/A" : d.value.toFixed(3)}
        `)
          .style("left", (event.pageX + 10) + "px")
          .style("top",  (event.pageY - 28) + "px");
      })
      .on("blur", () => {
        tooltip.transition().duration(200).style("opacity", 0);
        lastHovered = null;
      })
      .on("keydown", (event, d) => {
        if (event.key === "Enter" || event.key === "Return") {
          const v = d.allRow;
          detailBox.html(`
            <div style="
                text-align: left;
                padding: 10px;
                border: 1px solid #ccc;
                background: #f9f9f9;
                border-radius: 6px;
              ">
              <b>${v.opname}</b><br>
              Anxiety Score: ${isNaN(v.anxiety_score) ? "N/A" : v.anxiety_score.toFixed(3)}<br>
              Death Score:   ${isNaN(v.death_score)     ? "N/A" : v.death_score.toFixed(3)}<br>
              ASA Score:     ${isNaN(v.asa_score)       ? "N/A" : v.asa_score.toFixed(3)}<br>
              Commonality:   ${isNaN(v.commonality_score)? "N/A" : v.commonality_score.toFixed(3)}
            </div>
          `);
        }
      });

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
          const cx = x(d.metric) + x.bandwidth()/2;
          const cy = y(d.opname) + y.bandwidth()/2;
          return x0 <= cx && cx <= x1 && y0 <= cy && cy <= y1;
        });

        rects.classed("selected", d => {
          const cx = x(d.metric) + x.bandwidth()/2;
          const cy = y(d.opname) + y.bandwidth()/2;
          return x0 <= cx && cx <= x1 && y0 <= cy && cy <= y1;
        });

        if (selected.length > 0) {
          const avg = d3.mean(selected, d => d.value);
          brushInfo.html(`
            <b>${selected.length}</b> cells selected<br>
            Average value: <b>${avg.toFixed(3)}</b>
          `);
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
    if (choice === "All") {
      filtered = allData.slice();
    } else {
      filtered = allData.filter(d => d.optype === choice);
    }

    filtered.sort((a, b) => b.anxiety_score - a.anxiety_score);
    render(filtered);
  }

  d3.json("data/daniel.json").then(data => {
    data.forEach(d => {
      if (d.anxiety_score === undefined || isNaN(d.anxiety_score)) {
        d.anxiety_score = 0.6 * d.death_score
                         + 0.2 * d.asa_score
                         + 0.2 * d.commonality_score;
      }
    });
    allData = data;

    const optypes = Array.from(new Set(allData.map(d => d.optype))).sort();
    const dropdownOptions = ["All", ...optypes];

    dropdown.selectAll("option")
      .data(dropdownOptions)
      .join("option")
      .text(d => d);

    dropdown.on("change", updateFilter);

    dropdown.property("value", "All");
    updateFilter();

    d3.select("body").on("keydown", (event) => {
      if ((event.key === "Enter" || event.key === "Return") && lastHovered) {
        const v = lastHovered.allRow;
        detailBox.html(`
          <div style="
              text-align: left;
              padding: 10px;
              border: 1px solid #ccc;
              background: #f9f9f9;
              border-radius: 6px;
            ">
            <b>${v.opname}</b><br>
            Anxiety Score: ${isNaN(v.anxiety_score) ? "N/A" : v.anxiety_score.toFixed(3)}<br>
            Death Score:   ${isNaN(v.death_score)     ? "N/A" : v.death_score.toFixed(3)}<br>
            ASA Score:     ${isNaN(v.asa_score)       ? "N/A" : v.asa_score.toFixed(3)}<br>
            Commonality:   ${isNaN(v.commonality_score)? "N/A" : v.commonality_score.toFixed(3)}
          </div>
        `);
      }
    });

    d3.selectAll("#body-map2 .region").on("click", function(event) {
      // highlight the clicked region
      d3.selectAll("#body-map2 .region").classed("region--selected", false);
      d3.select(this).classed("region--selected", true);

      const regionID = d3.select(this).attr("id");
      const groupName = regionToGroup[regionID];
      if (!groupName) return;
      dropdown.property("value", groupName);
      updateFilter();
    });

  }).catch(error => {
    console.error("Error loading daniel.json:", error);
  });

})();
