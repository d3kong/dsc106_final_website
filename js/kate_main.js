// kate_main.js – Two‐chart Radar for Low vs High Risk (with mortality & blood‐loss)
(function() {
  let age = 50, height = 160, weight = 75;

  function drawKateRadar(allCases, containerSelector) {
    const container = d3.select(containerSelector).html("");
    const region = window.selectedRegion;
    const mapping = window.regionToSurgeries?.[region];

    const defaultSurgeries = ["Ileostomy repair","Exploratory laparotomy"];
    const surgeries = mapping
      ? [mapping.low, mapping.high]
      : defaultSurgeries;

    // build sliders + two placeholders
    container.html(`
      <h2>Guided Preparation Tips</h2>
      <div style="text-align:center;color:#fff;margin:1em 0;">
        <label>Age:
          <input id="kate-age" type="range" min="10" max="100" value="${age}"/>
          <span id="kate-age-val">${age}</span>
        </label>
        <label style="margin-left:1em;">Height:
          <input id="kate-height" type="range" min="120" max="200" value="${height}"/>
          <span id="kate-height-val">${height}</span>
        </label>
        <label style="margin-left:1em;">Weight:
          <input id="kate-weight" type="range" min="30" max="150" value="${weight}"/>
          <span id="kate-weight-val">${weight}</span>
        </label>
      </div>
      <div style="display:flex;gap:2rem;justify-content:center;">
        <div id="radar-low" style="flex: 1 1 500px; max-width: 550px;"></div>
        <div id="radar-high" style="flex: 1 1 500px; max-width: 550px;"></div>
      </div>
      <div id="summary" style="margin-top:1.5em;color:#fff;"></div>
    `);

    // slider events
    d3.select("#kate-age").on("input", function() {
      age = +this.value; d3.select("#kate-age-val").text(age); update();
    });
    d3.select("#kate-height").on("input", function() {
      height = +this.value; d3.select("#kate-height-val").text(height); update();
    });
    d3.select("#kate-weight").on("input", function() {
      weight = +this.value; d3.select("#kate-weight-val").text(weight); update();
    });

    update();

    function update() {
      // common filter window
      const filt0 = allCases.filter(d =>
        d.opname === surgeries[0] || d.opname === surgeries[1]);
      const filt1 = filt0.filter(d =>
        d.age    >= age - 10    && d.age    <= age + 10 &&
        d.height >= height - 10 && d.height <= height + 10 &&
        d.weight >= weight - 10 && d.weight <= weight + 10
      );

      // dimensions: add two new ones
      const dims = [
        "Medical Complexity",       // ASA
        "Recovery Support Needs",   // Age
        "Decision Clarity Needed",  // surgery_duration
        "Emotional Sensitivity",    // anesthesia_lead_time
        "Information Depth",        // IV/lines
        "Mortality Risk",           // death_inhosp
        "Avg Blood Loss"            // intraop_ebl
      ];

      // for normalization
      const maxSurgDur = d3.max(filt1, d=>+d.surgery_duration)||1;
      const maxLead    = d3.max(filt1, d=>Math.abs(+d.anesthesia_lead_time))||1;
      const maxEBL     = d3.max(filt1, d=>+d.intraop_ebl)||1;

      // for each surgery, compute means & draw
      surgeries.forEach((surg, idx) => {
        const sub = filt1.filter(d=>d.opname===surg);
        if (!sub.length) {
          d3.select(`#radar-${idx===0?"low":"high"}`)
            .html(`<div style="color:#faa">No data for ${surg}</div>`);
          return;
        }

        // compute mean for each dim
        const means = {};
        dims.forEach(dim => {
          const vs = sub.map(d => {
            switch(dim) {
              case "Medical Complexity":       return (d.asa||0)/5;
              case "Recovery Support Needs":   return (d.age||0)/100;
              case "Decision Clarity Needed":  return (d.surgery_duration||0)/maxSurgDur;
              case "Emotional Sensitivity":    return Math.abs(d.anesthesia_lead_time||0)/maxLead;
              case "Information Depth":
                let cnt=0; ["iv1","iv2","aline1","aline2","cline1","cline2"]
                  .forEach(k=>{ if(d[k]&&d[k]!=="N/A") cnt++; });
                return cnt/6;
              case "Mortality Risk":           return d.death_inhosp||0;
              case "Avg Blood Loss":           return (d.intraop_ebl||0)/maxEBL;
            }
          }).filter(v=>isFinite(v));
          means[dim] = vs.length?d3.mean(vs):0;
        });

        // draw radar into its own div
        drawSingleRadar(`#radar-${idx===0?"low":"high"}`, surg, dims, means);
      });

      // summary (e.g. compare two)
      container.select("#summary").html(`
        <p><strong>${surgeries[0]}</strong> vs. <strong>${surgeries[1]}</strong><br>
           Showing ${filt1.length} matching cases.</p>
      
        <table style="width:100%; margin-top:1em; border-collapse: collapse; color: #fff; font-size:0.9em;">
          <thead>
            <tr>
              <th style="border-bottom:1px solid #888; padding:4px;">Dimension</th>
              <th style="border-bottom:1px solid #888; padding:4px;">Formula</th>
              <th style="border-bottom:1px solid #888; padding:4px;">0 = best … 1 = worst</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="padding:4px;">Medical Complexity</td>
              <td style="padding:4px;">ASA / 5</td>
              <td style="padding:4px;">0 healthy … 1 most severe</td>
            </tr>
            <tr>
              <td style="padding:4px;">Recovery Support Needs</td>
              <td style="padding:4px;">Age / 100</td>
              <td style="padding:4px;">0 newborn … 1 centenarian</td>
            </tr>
            <tr>
              <td style="padding:4px;">Decision Clarity Needed</td>
              <td style="padding:4px;">surgery_duration / max_duration</td>
              <td style="padding:4px;">0 very short … 1 very long</td>
            </tr>
            <tr>
              <td style="padding:4px;">Emotional Sensitivity</td>
              <td style="padding:4px;">|anesthesia_lead_time| / max_lead</td>
              <td style="padding:4px;">0 no delay … 1 max delay</td>
            </tr>
            <tr>
              <td style="padding:4px;">Information Depth</td>
              <td style="padding:4px;">(IV+lines count) / 6</td>
              <td style="padding:4px;">0 none … 1 many steps</td>
            </tr>
            <tr>
              <td style="padding:4px;">Mortality Risk</td>
              <td style="padding:4px;">mean(death_inhosp)</td>
              <td style="padding:4px;">0 no deaths … 1 all died</td>
            </tr>
            <tr>
              <td style="padding:4px;">Avg Blood Loss</td>
              <td style="padding:4px;">intraop_ebl / maxEBL</td>
              <td style="padding:4px;">0 mL … 1 max observed</td>
            </tr>
          </tbody>
        </table>
      `);      
    }
  }

  // helper to draw one radar
  function drawSingleRadar(sel, title, dims, means) {
    const maxVal = d3.max(Object.values(means))||1;
    const angle  = 2*Math.PI/dims.length;
    const svg = d3.select(sel).html(`
      <h3 style="text-align:center;color:#fff">${title}</h3>
      `)
        .append("svg")
        .attr("viewBox","0 0 380 380")
        .attr("width", 380)
        .attr("height", 380)
        .style("display","block")
        .style("margin","0 auto");
    const cx = 190, cy = 190, r = 150;

    let tooltip = d3.select("body").select(".kate-tooltip");
    if (tooltip.empty()) {
      tooltip = d3.select("body")
      .append("div")
      .attr("class","kate-tooltip")
      .style("position","absolute")
      .style("background","#fff")
      .style("padding","4px 8px")
      .style("border","1px solid #666")
      .style("border-radius","4px")
      .style("pointer-events","none")
      .style("font-size","0.85rem")
      .style("display","none");
    }

    // grid
    for(let lvl=1;lvl<=5;lvl++){
      svg.append("circle")
        .attr("cx",cx).attr("cy",cy).attr("r",(r*lvl)/5)
        .attr("fill","none").attr("stroke","rgba(255,255,255,0.2)");
    }
    // axes
    dims.forEach((dim,i)=>{
      const a = i*angle - Math.PI/2;
      const norm = means[dim]/maxVal;
      const px = cx + Math.cos(a)*r*norm;
      const py = cy + Math.sin(a)*r*norm;

      svg.append("circle")
        .attr("cx", px).attr("cy", py).attr("r", 5).attr("fill", "steelblue")
        .on("mouseover", (ev) => {
          tooltip
            .style("display","block")
            .html(`<strong>${dim}:</strong> ${norm.toFixed(2)}`)
            .style("left",(ev.pageX+8)+"px")
            .style("top",(ev.pageY-20)+"px");
          })
          .on("mouseout", () => {
            tooltip.style("display","none");
          });
          
          // label
          svg.append("text")
          .attr("x", cx + Math.cos(a)*(r+20))
          .attr("y", cy + Math.sin(a)*(r+20))
          .attr("text-anchor","middle")
          .attr("font-size","0.75rem")
          .attr("fill","#fff")
          .text(dim);

      
      svg.append("line")
        .attr("x1",cx).attr("y1",cy)
        .attr("x2",cx+Math.cos(a)*r)
        .attr("y2",cy+Math.sin(a)*r)
        .attr("stroke","rgba(255,255,255,0.2)");
    });

    // polygon
    const radarLine = d3.lineRadial()
      .radius(d=>r*(means[d]/maxVal))
      .angle((d,i)=>i*angle)
      .curve(d3.curveLinearClosed);
    svg.append("path")
      .datum(dims)
      .attr("transform",`translate(${cx},${cy})`)
      .attr("d",radarLine)
      .attr("fill","steelblue").attr("fill-opacity",0.3)
      .attr("stroke","steelblue").attr("stroke-width",2);
  }

  // expose
  window.renderKateViz = function(containerSelector) {
    d3.json("data/kate_card.json")
      .then(data=>drawKateRadar(data, containerSelector))
      .catch(err=>{
        d3.select(containerSelector)
          .html(`<div style="color:#faa">Error loading: ${err.message}</div>`);
      });
  };
})();
