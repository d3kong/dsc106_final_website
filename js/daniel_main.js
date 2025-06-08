// daniel_main.js

(function(){
  //── 1) map each <area> region ID to exactly two surgeries to compare ─────────────
  const regionToSurgeries = {
    head_neck: { low: "Thyroid lobectomy",        high: "Total thyroidectomy"     },
    thorax:    { low: "Breast-conserving surgery", high: "Mastectomy"             },
    abdomen:   { low: "Cholecystectomy",           high: "Exploratory laparotomy"  },
    pelvis:    { low: "Ileostomy repair",         high: "Low anterior resection"   }
  };

  //── 2) main drawing routine ────────────────────────────────────────────────────────
  function drawDanielHeatmap(data){
    const container = d3.select("#heatmap-container");
    container.html("");

    // pick current region (default → "abdomen")
    const region = window.selectedRegion || "abdomen";
    const pair   = regionToSurgeries[region];
    if(!pair){
      container
        .append("div")
        .style("color","#ccc")
        .text("Click any body region to filter operations.");
      return;
    }

    // two columns = low & high surgery names
    const cols = [ pair.low, pair.high ];
    // y axis = ASA levels 1–5
    const rows = ["1","2","3","4","5"];

    // filter data down to just those two ops with valid ASA & death
    const filtered = data.filter(d =>
      cols.includes(d.opname) &&
      d.asa_score   != null &&
      d.death_score != null
    );

    // roll up: mean death_score by [asa_level → opname]
    const roll = d3.rollups(
      filtered,
      vs => d3.mean(vs, d => +d.death_score),
      d => String(Math.round(d.asa_score)),
      d => d.opname
    );
    // convert to lookup table
    const avgDeath = {};
    roll.forEach(([asa, grp]) => {
      avgDeath[asa] = Object.fromEntries(grp);
    });

    const cells = [];
    rows.forEach(asa => {
      cols.forEach(op => {
        const val = avgDeath[asa]?.[op] ?? 0;
        cells.push({ asa, op, value: val });
      });
    });

    const margin = { top: 60, right: 20, bottom: 80, left: 60 },
          fullW  = container.node().clientWidth,
          fullH  = 480,
          W      = fullW - margin.left - margin.right,
          H      = fullH - margin.top  - margin.bottom;

    const x = d3.scaleBand().domain(cols).range([0, W]).padding(0.1);
    const y = d3.scaleBand().domain(rows).range([0, H]).padding(0.1);

    const localMax = d3.max(cells, d => d.value) || 1;
    const color    = d3.scaleSequential(d3.interpolateViridis)
                       .domain([0, localMax]);

    //── draw SVG ─────────────────────────────────────────────────────────────────────
    const svg = container.append("svg")
        .attr("viewBox", `0 0 ${fullW} ${fullH}`)
        .style("width","100%")
        .style("height","auto")
      .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // axes
    svg.append("g")
      .attr("transform", `translate(0,${H})`)
      .call(d3.axisBottom(x))
      .selectAll("text")
        .attr("dy","1.2em");

    svg.append("g")
      .call(d3.axisLeft(y));

    // title / subtitle
    svg.append("text")
      .attr("x", W/2).attr("y",-36)
      .attr("text-anchor","middle")
      .style("font-size","1.5rem")
      .style("font-weight","bold")
      .style("fill","#fff")
      .text("Clinical Complexity Heatmap");

    svg.append("text")
      .attr("x", W/2).attr("y",-16)
      .attr("text-anchor","middle")
      .style("font-size","1rem")
      .style("fill","#ddd")
      .text("X: Surgery (Low vs High Risk) · Y: ASA Level · Color: Avg Mortality");

    const descriptionHTML =
      `Higher <strong>ASA levels</strong> (rows) indicate sicker patients, and follow along the
      gradient to see that as the bars' colors get brighter (i.e. more yellow) the higher the
      mortality rates are across the differnt operations. Mortality rates vary from region to region, and
      each visualization's color is scaled to the region's max mortality rate`;

    container.append("div")
      .attr("class","heatmap-note")
      .style("max-width","1250px")
      .style("margin","20px auto 0")
      .style("font-size","0.95rem")
      .style("line-height","1.4")
      .style("color","#eee")
      .style("text-align","center")
      .html(descriptionHTML);

    // tooltip div
    let tooltip = d3.select("body").select(".daniel-tooltip");
    if(tooltip.empty()){
      tooltip = d3.select("body")
        .append("div")
        .attr("class","daniel-tooltip")
        .style("position","absolute")
        .style("background","#222")
        .style("color","#fff")
        .style("padding","6px 10px")
        .style("border-radius","4px")
        .style("pointer-events","none")
        .style("font-size","0.9rem")
        .style("display","none");
    }

    // draw cells
    svg.selectAll("rect")
      .data(cells)
      .join("rect")
        .attr("x",      d=> x(d.op))
        .attr("y",      d=> y(d.asa))
        .attr("width",  x.bandwidth())
        .attr("height", y.bandwidth())
        .attr("fill",   d=> color(d.value))
        .attr("stroke", "#333")
        .attr("stroke-width", 1)
      .on("mouseover", function(e,d){
        d3.select(this).attr("stroke-width",2);
        tooltip
          .style("display","block")
          .html(`
            <strong>Surgery:</strong> ${d.op}<br>
            <strong>ASA Level:</strong> ${d.asa}<br>
            <strong>Mortality Rate:</strong> ${(d.value*100).toFixed(1)}%
          `)
          .style("left",  (e.pageX + 8) + "px")
          .style("top",   (e.pageY - 28) + "px");
      })
      .on("mouseout", function(){
        d3.select(this).attr("stroke-width",1);
        tooltip.style("display","none");
      });

    //—— gradient legend ————————————————————————————————————————
    const defs = svg.append("defs"),
          grad = defs.append("linearGradient")
                     .attr("id", "deathGrad")
                     .attr("x1", "0%").attr("y1", "0%")
                     .attr("x2", "100%").attr("y2", "0%");

    const nStops = 20;                     // sample Viridis at 20 points
    for (let i = 0; i <= nStops; i++) {
      const t = i / nStops;               // 0 … 1
      grad.append("stop")
          .attr("offset", `${t * 100}%`)
          .attr("stop-color", color(t * localMax));
    }

    const legendW = 240, legendH = 12,
          lx = (W - legendW) / 2,
          ly = H + 40;

    svg.append("rect")
       .attr("x", lx).attr("y", ly)
       .attr("width", legendW).attr("height", legendH)
       .style("fill", "url(#deathGrad)")
       .style("stroke", "#333");

    // min / max labels
    svg.append("text")
       .attr("x", lx).attr("y", ly + legendH + 16)
       .attr("font-size", "0.9rem")
       .attr("fill", "#eee")
       .text("0 %");

    svg.append("text")
       .attr("x", lx + legendW).attr("y", ly + legendH + 16)
       .attr("text-anchor", "end")
       .attr("font-size", "0.9rem")
       .attr("fill", "#eee")
       .text(`${(localMax * 100).toFixed(1)} %`);

    // explanatory blurb
    svg.append("text")
       .attr("x", W / 2).attr("y", ly + legendH + 40)
       .attr("text-anchor", "middle")
       .style("font-size", "0.9rem")
       .style("fill", "#aaa")
       .style("font-style", "italic")
       .text("Purple = 0 % → Yellow = highest observed mortality");
  }


  //── on load: fetch data & draw initial, wire up clicks ────────────────────────────
  document.addEventListener("DOMContentLoaded", () => {
    d3.json("data/daniel.json")
      .then(drawDanielHeatmap)
      .catch(err => {
        d3.select("#heatmap-container")
          .style("color","crimson")
          .text("Failed to load data: " + err);
        console.error(err);
      });

    d3.selectAll("#body-map .region").on("click", function(){
      // clear old selection, highlight this one
      d3.selectAll("#body-map .region").classed("region--selected", false);
      d3.select(this).classed("region--selected", true);

      window.selectedRegion = d3.select(this).attr("id");
      d3.json("data/daniel.json").then(drawDanielHeatmap);
    });
  });
})();
