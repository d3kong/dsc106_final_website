// js/daniel_main.js   –  Slide-3 “Anxiety Heat-map”
(function () {
  /* ---------- layout helpers ---------- */
  const margin = { top: 80, right: 20, bottom: 30, left: 200 };

  function innerSize() {
    const { width, height } = document
      .querySelector("#heatmap")
      .getBoundingClientRect();
    return {
      w: Math.max(400, width)  - margin.left - margin.right,
      h: Math.max(400, height) - margin.top  - margin.bottom,
    };
  }

  /* ---------- persistent DOM ---------- */
  const wrap      = d3.select("#heatmap");              // slide-3 container
  const detailBox = d3.select("#heatmap-details");      // tiny box you already have

  const dropdown  = wrap
    .insert("select", ":first-child")                   // before SVG
    .attr("id", "surgeryFilter")
    .style("margin-bottom", "10px")
    .selectAll("option")
    .data(["Top 10", "Top 20", "Top 50", "All"])
    .enter()
    .append("option")
    .text(d => d);

  const tooltip = d3.select("body")
    .append("div")
    .style("position", "absolute")
    .style("background", "#fff")
    .style("padding", "6px")
    .style("border", "1px solid #ccc")
    .style("border-radius", "4px")
    .style("pointer-events", "none")
    .style("opacity", 0);

  let   allData       = [];   // full JSON
  let   currentSubset = [];   // filtered by region + dropdown
  let   lastHovered   = null; // for Enter-key details

  /* ---------- main render ---------- */
  function render(data) {
    currentSubset = data;   // save for resize

    wrap.selectAll("svg").remove();           // wipe previous draw
    detailBox.html("");

    const { w, h } = innerSize();

    const svg = wrap
      .append("svg")
      .attr("width",  w + margin.left + margin.right)
      .attr("height", h + margin.top  + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    /* ---- axes & scales ---- */
    const metrics = ["death_score", "asa_score",
                     "commonality_score", "anxiety_score"];

    const x = d3.scaleBand()
      .domain(metrics)
      .range([0, w])
      .padding(0.05);

    const y = d3.scaleBand()
      .domain(data.map(d => d.optype).sort())
      .range([0, h])
      .padding(0.05);

    const color = d3.scaleSequential()
      .interpolator(d3.interpolateRdYlGn)      // green → red
      .domain(d3.extent(allData, d => d.anxiety_score).reverse());

    svg.append("g").call(d3.axisTop(x));
    svg.append("g").call(d3.axisLeft(y));

    /* ---- cell data ---- */
    const cells = data.flatMap(d => metrics.map(m => ({
      optype : d.optype,
      metric : m,
      value  : d[m],
      allRow : d,
    })));

    svg.selectAll("rect")
      .data(cells)
      .join("rect")
      .attr("x", d => x(d.metric))
      .attr("y", d => y(d.optype))
      .attr("width",  x.bandwidth())
      .attr("height", y.bandwidth())
      .style("fill", d => color(d.value))
      .style("stroke", "#fff")
      .on("mouseover", (e, d) => {
        lastHovered = d;
        tooltip.transition().duration(200).style("opacity", 1);
        tooltip.html(`<b>${d.optype}</b><br>${d.metric}: ${d.value.toFixed(3)}`)
               .style("left", (e.pageX + 10) + "px")
               .style("top",  (e.pageY - 28) + "px");
      })
      .on("mouseout", () => {
        tooltip.transition().duration(500).style("opacity", 0);
        lastHovered = null;
      });

    /* ---- brush ---- */
    const brushInfo = wrap.select("#brush-info").empty()
        ? wrap.append("div").attr("id","brush-info")
                             .style("margin-top","20px")
                             .style("font-size","14px")
                             .style("font-family","sans-serif")
        : wrap.select("#brush-info");

    svg.append("g")
      .call(d3.brush()
        .extent([[0,0], [w,h]])
        .on("end", ({selection}) => {
          if (!selection) { brushInfo.text(""); return; }
          const [[x0,y0],[x1,y1]] = selection;
          const sel = cells.filter(d=>{
            const cx = x(d.metric)+x.bandwidth()/2;
            const cy = y(d.optype)+y.bandwidth()/2;
            return x0<=cx && cx<=x1 && y0<=cy && cy<=y1;
          });
          svg.selectAll("rect")
             .classed("selected", d=>{
                const cx = x(d.metric)+x.bandwidth()/2;
                const cy = y(d.optype)+y.bandwidth()/2;
                return x0<=cx && cx<=x1 && y0<=cy && cy<=y1;
             });
          if (sel.length)
            brushInfo.html(`<b>${sel.length}</b> cells selected<br>Average value: <b>${d3.mean(sel,d=>d.value).toFixed(3)}</b>`);
          else brushInfo.text("No cells selected.");
        }));
  }

  /* ---------- dropdown filter ---------- */
  function applyDropdown(region = null) {
    const choice = d3.select("#surgeryFilter").property("value");
    let subset = allData;
    if (region) subset = subset.filter(d => d.region === region);

    subset = subset.sort((a,b)=>b.anxiety_score - a.anxiety_score);
    if (choice === "Top 10")   subset = subset.slice(0,10);
    else if (choice === "Top 20") subset = subset.slice(0,20);
    else if (choice === "Top 50") subset = subset.slice(0,50);

    render(subset);
  }

  d3.select("#surgeryFilter").on("change", () => applyDropdown(currentRegion));

  /* ---------- keyboard “Enter” → show details ---------- */
  window.addEventListener("keydown", e=>{
    if (e.key === "Enter" && lastHovered){
      const v = lastHovered.allRow;
      detailBox.html(`
        <div style="text-align:left;padding:10px;border:1px solid #ccc;background:#f9f9f9;border-radius:6px;">
          <b>${v.optype}</b><br>
          Anxiety: ${v.anxiety_score.toFixed(3)}<br>
          Death  : ${v.death_score.toFixed(3)}<br>
          ASA    : ${v.asa_score.toFixed(3)}<br>
          Common : ${v.commonality_score.toFixed(3)}
        </div>`);
    }
  });

  /* ---------- region selection from Slide-1 ---------- */
  let currentRegion = null;
  addEventListener("regionSelected", e=>{
    currentRegion = e.detail.region;        // "thorax", "abdomen", …
    applyDropdown(currentRegion);
  });

  /* ---------- data load ---------- */
  d3.json("data/daniel.json").then(json=>{
    // enrich json → anxiety_score (matches your original script)
    json.forEach(d=>{
      d.anxiety_score = 0.6*d.death_score + 0.2*d.asa_score + 0.2*d.commonality_score;
    });
    allData = json;
    applyDropdown();            // first draw, no region filter
  });

  /* ---------- redraw on resize ---------- */
  window.addEventListener("resize", () => render(currentSubset));
})();
