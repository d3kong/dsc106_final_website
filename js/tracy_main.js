(function() {
  let allCases = null;

  function drawTracySwarm(data) {
    if (!allCases) return;
    const container = document.getElementById("swarm-container");
    if (!container) return;
    container.innerHTML = "";

    // Get selected region and surgeries
    const region = window.selectedRegion || "abdomen";
    const mapping = window.regionToSurgeries[region];
    const surgeries = [mapping.low, mapping.high];

    // 4) prep ASA color scale
    const asaColors = d3.scaleOrdinal()
    .domain(["1","2","3","4","5"])
    .range(["#1f77b4","#ff7f0e","#2ca02c","#d62728","#9467bd"]);

    // 5) filter & map your data
    const plotData = (data || [])
    .filter(d =>
      surgeries.includes(d.opname) &&
      d.asa         != null &&
      d.intraop_ebl != null
    )
    .map(d => ({
      surgery: d.opname,
      asa:     String(Math.round(d.asa)),
      ebl:     +d.intraop_ebl,
      age:     d.age,
      sex:     d.sex
    }));

    if (plotData.length === 0) {
    container.innerHTML = "<div style='color:#aaa'>No data for that region.</div>";
    return;
    }

    // 6) compute dimensions
    const margin = { top:70, right:30, bottom:70, left:70 };
    const { width: fullW, height: fullH } = container.getBoundingClientRect();
    const width  = fullW  - margin.left - margin.right;
    const height = fullH - margin.top  - margin.bottom;

    // 7) create SVG
    const svg = d3.select(container)
    .append("svg")
      .attr("width", fullW)
      .attr("height", fullH)
    .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // 8) scales & axes
    const radius = 5;
    const x = d3.scalePoint()
    .domain(surgeries)
    .range([radius, width - radius])
    .padding(0.5);

    const maxEbl = d3.max(plotData, d => d.ebl);
    const y = d3.scaleSymlog()
    .domain([0, maxEbl])
    .constant(10)
    .range([height - radius, radius]);

    svg.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x).tickSize(0))
    .selectAll("text")
      .attr("font-size","1rem").attr("dy","1.5em");

    svg.append("g")
    .call(d3.axisLeft(y).ticks(6).tickFormat(d3.format(",.0f")))
    .selectAll("text")
      .attr("font-size","1rem");

    // 9) force-swarm
    const sim = d3.forceSimulation(plotData)
    .force("x",       d3.forceX(d => x(d.surgery)).strength(1))
    .force("y",       d3.forceY(d => y(d.ebl)).strength(1))
    .force("collide", d3.forceCollide(radius * 1.05))
    .stop();
    for (let i = 0; i < 200; ++i) sim.tick();

    // 10) tooltip setup
    let tooltip = d3.select("body").select(".tracy-tooltip");
    if (tooltip.empty()) {
    tooltip = d3.select("body")
      .append("div")
      .attr("class","tracy-tooltip")
      .style("position","absolute")
      .style("background","#fff")
      .style("padding","8px 14px")
      .style("border","1.5px solid #999")
      .style("border-radius","8px")
      .style("pointer-events","none")
      .style("font-size","15px")
      .style("display","none")
      .style("z-index","9999");
    }

    // 11) draw circles
    svg.append("g")
    .selectAll("circle")
    .data(plotData)
    .join("circle")
      .attr("cx", d => d.x)
      .attr("cy", d => d.y)
      .attr("r", radius)
      .attr("fill", d => asaColors(d.asa))
      .attr("stroke","#333")
      .attr("stroke-width",1)
    .on("mouseover", function(event, d) {
      d3.select(this).attr("stroke-width",2);
      tooltip
        .style("display","block")
        .html(`
          <strong>Surgery:</strong> ${d.surgery}<br>
          <strong>ASA:</strong> ${d.asa}<br>
          <strong>EBL:</strong> ${d.ebl.toLocaleString()} ml<br>
          <strong>Age:</strong> ${d.age||"N/A"}<br>
          <strong>Sex:</strong> ${d.sex||"N/A"}
        `)
        .style("left",(event.pageX+15)+"px")
        .style("top",(event.pageY-18)+"px");
    })
    .on("mouseout", function() {
      d3.select(this).attr("stroke-width",1);
      tooltip.style("display","none");
    });

    // 12) titles & legend
    svg.append("text")
    .attr("x", width/2).attr("y",-35)
    .attr("text-anchor","middle")
    .style("font-size","1.45rem").style("font-weight","bold")
    .text("Blood Loss vs. ASA Score");

    svg.append("text")
    .attr("x", width/2).attr("y", height+50)
    .attr("text-anchor","middle")
    .style("font-size","1rem")
    .text("Surgery (Low vs. High Risk)");

    svg.append("text")
    .attr("transform","rotate(-90)")
    .attr("x",-height/2).attr("y",-50)
    .attr("text-anchor","middle")
    .style("font-size","1rem")
    .text("Estimated Blood Loss (ml)");

    const legend = svg.append("g").attr("transform",`translate(${width-100}, -20)`);
    ["1","2","3","4","5"].forEach((asa,i) => {
    legend.append("circle")
      .attr("cx",0).attr("cy",i*20).attr("r",radius)
      .attr("fill", asaColors(asa)).attr("stroke","#333");
    legend.append("text")
      .attr("x",12).attr("y",i*20+4)
      .attr("font-size","0.9rem")
      .text(`ASA ${asa}`);
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    d3.json("data/tracy.json")
      .then(data => {
        allCases = data;
        drawTracySwarm(allCases);
      })
      .catch(err => {
        d3.select("#swarm-container")
          .html(`<div style="color:#faa">Error loading data: ${err.message}</div>`);
      });

      window.addEventListener("regionChange", () => {
        console.log("Region changed to:", window.selectedRegion);
        drawTracySwarm(allCases);
      });
  });

})();