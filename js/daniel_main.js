(function() {
  // margin setup
  const margin = { top: 100, right: 50, bottom: 30, left: 200 };

  // main containers
  const wrap      = d3.select("#heatmap");
  const detailBox = d3.select("#heatmap-details");
  const dropdown  = d3.select("#surgeryFilter").style("margin-bottom", "10px");

  // tooltip for hover
  const tooltip = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("position",       "absolute")
    .style("background",     "#fff")
    .style("padding",        "6px")
    .style("border",         "1px solid #ccc")
    .style("border-radius",  "4px")
    .style("pointer-events", "none")
    .style("opacity",        0);

  // brush info area
  let brushInfo = wrap.select("#brush-info");
  if (brushInfo.empty()) {
    brushInfo = wrap.append("div")
      .attr("id", "brush-info")
      .style("margin-top", "20px")
      .style("font-family", "sans-serif")
      .style("font-size", "14px");
  }

  // state
  let allData = [];
  let selectedGroup;
  let selectedMetric = "death_score";
  let lastHovered = null;

  // metrics available
  const metricsList = ["death_score", "asa_score", "commonality_score"];

  // map SVG region IDs to group names
  const regionToGroup = {
    head_neck:   "Endocrine",
    thorax:      "Transplantation",
    abdomen:     "HPB",
    pelvis:      "GI tract",
    vascular:    "Vascular",
    breast:      "Breast & Other"
  };

  // render heatmap for given data subset
  function render(data) {
    wrap.selectAll("svg").remove();
    detailBox.html("");
    brushInfo.text("");

    const width  = 1000 - margin.left - margin.right;
    const height =  700 - margin.top  - margin.bottom;

    const svg = wrap.append("svg")
      .attr("width",  width + margin.left + margin.right)
      .attr("height", height + margin.top  + margin.bottom)
      .attr("viewBox", `0 0 ${width+margin.left+margin.right} ${height+margin.top+margin.bottom}`)
      .attr("preserveAspectRatio", "xMidYMid meet")
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // two columns: selectedMetric and anxiety_score
    const cols = [selectedMetric, "anxiety_score"];
    const yDomain = data.map(d => d.opname);

    const x = d3.scaleBand().domain(cols).range([0, width]).padding(0.05);
    const y = d3.scaleBand().domain(yDomain).range([0, height]).padding(0.05);

    // color by overall anxiety range
    const minA = d3.min(allData, d => d.anxiety_score);
    const maxA = d3.max(allData, d => d.anxiety_score);
    const color = d3.scaleSequential()
      .interpolator(d3.interpolateRdYlGn)
      .domain([maxA, minA]);

    // axes
    svg.append("g").attr("class", "x-axis").call(d3.axisTop(x));
    svg.append("g").attr("class", "y-axis").call(d3.axisLeft(y));

    // prepare cells
    const cells = data.flatMap(d =>
      cols.map(c => ({ opname: d.opname, metric: c, value: d[c], row: d }))
    );

    // draw
    const rects = svg.selectAll("rect").data(cells).join("rect")
      .attr("x", d => x(d.metric))
      .attr("y", d => y(d.opname))
      .attr("width", x.bandwidth())
      .attr("height", y.bandwidth())
      .style("fill", d => color(d.value))
      .style("stroke", "#fff")
      .attr("tabindex", 0)
      .attr("focusable", true)
      .on("mouseover", (event,d) => {
        lastHovered = d;
        tooltip.transition().duration(200).style("opacity",1)
               .html(`<b>${d.opname}</b><br>${d.metric}: ${d.value.toFixed(3)}`)
               .style("left", (event.pageX+10)+"px")
               .style("top",  (event.pageY-28)+"px");
        event.currentTarget.focus();
      })
      .on("mouseout", () => { tooltip.transition().duration(200).style("opacity",0); lastHovered=null; })
      .on("focus", (event,d) => {
        lastHovered = d;
        tooltip.transition().duration(200).style("opacity",1)
               .html(`<b>${d.opname}</b><br>${d.metric}: ${d.value.toFixed(3)}`)
               .style("left", (event.pageX+10)+"px")
               .style("top",  (event.pageY-28)+"px");
      })
      .on("blur", () => { tooltip.transition().duration(200).style("opacity",0); lastHovered=null; })
      .on("keydown", (event,d) => {
        if (event.key === "Enter") {
          const v = d.row;
          detailBox.html(
            `<div style="text-align:left; padding:10px; border:1px solid #ccc; background:#f9f9f9; border-radius:6px;">
               <b>${v.opname}</b><br>
               ${selectedMetric}: ${v[selectedMetric].toFixed(3)}<br>
               Anxiety Score: ${v.anxiety_score.toFixed(3)}
             </div>`
          );
        }
      });

    // brush selection
    const brush = d3.brush().extent([[0,0],[width,height]]).on("end",({selection})=>{
      if (!selection) { brushInfo.text(""); rects.classed("selected",false); return; }
      const [[x0,y0],[x1,y1]] = selection;
      const sel = cells.filter(d => {
        const cx = x(d.metric)+x.bandwidth()/2;
        const cy = y(d.opname)+y.bandwidth()/2;
        return x0<=cx&&cx<=x1&&y0<=cy&&cy<=y1;
      });
      rects.classed("selected", d => sel.includes(d));
      if (sel.length) {
        const avg = d3.mean(sel, d => d.value);
        brushInfo.html(`<b>${sel.length}</b> cells selected<br>Average: <b>${avg.toFixed(3)}</b>`);
      } else brushInfo.text("No cells selected.");
    });
    svg.append("g").call(brush);
  }

  // update filter and redraw
  function updateFilter() {
    const filtered = allData
      .filter(d => d.optype === selectedGroup)
      .sort((a,b) => b.anxiety_score - a.anxiety_score);
    render(filtered);
  }

  // load data and initialize
  Promise.all([
    d3.json("data/daniel.json"),
    d3.json("data/surgery_groups.json")
  ]).then(([procs, groups]) => {
    // annotate each procedure with group via substring match
    allData = procs.map(d => {
      const found = groups.find(g =>
        g.members.some(mem =>
          d.opname.toLowerCase().includes(mem.toLowerCase())
        )
      );
      return { ...d, optype: found ? found.group : "Other" };
    });

    // populate metric dropdown
    dropdown.selectAll("option").data(metricsList).join("option")
      .attr("value", d => d)
      .text(d => d);
    dropdown.property("value", selectedMetric);
    dropdown.on("change", () => {
      selectedMetric = dropdown.property("value");
      updateFilter();
    });

    // pick default group (first in surgery_groups)
    selectedGroup = groups[0].group;

    // setup body clicks now that regionToGroup is known
    d3.selectAll("#body-map2 .region").on("click", function(event) {
      d3.selectAll("#body-map2 .region").classed("region--selected", false);
      d3.select(this).classed("region--selected", true);
      const id = d3.select(this).attr("id");
      const grp = regionToGroup[id];
      if (!grp) return;
      selectedGroup = grp;
      updateFilter();
    });

    // initial draw
    updateFilter();
  })
  .catch(err => console.error("heatmap load error:", err));
})();
