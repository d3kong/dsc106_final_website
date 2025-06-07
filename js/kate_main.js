(function() {
  let age = 50, height = 160, weight = 75;
  let allCases = null;

  //── main draw function ─────────────────────────────────────────────────
  function drawKateRadar() {
    if (!allCases) return;
    const container = d3.select("#radar-container").html("");

    // Determine region and surgeries
    const region = window.selectedRegion || "abdomen";
    const mapping = window.regionToSurgeries[region];
    const surgeries = [mapping.low, mapping.high];

    // BUIDL LAYOUT: Sliders on top, charts side by side, table at bottom
    container.html(`
      <h2>Guided Preparation Tips</h2>
      <div id="sliders">
        <label>Age:
          <input id="kate-age" type="range" min="10" max="100" value="${age}" />
          <span id="kate-age-val">${age}</span>
        </label>
        <label>Height:
          <input id="kate-height" type="range" min="120" max="200" value="${height}" />
          <span id="kate-height-val">${height}</span>
        </label>
        <label>Weight:
          <input id="kate-weight" type="range" min="30" max="150" value="${weight}" />
          <span id="kate-weight-val">${weight}</span>
        </label>
      </div>
      <div id="charts">
        <div id="radar-low"></div>
        <div id="radar-high"></div>
      </div>
      <div id="summary"></div>
    `);

    // Wire up slider events
    d3.select("#kate-age").on("input", function() {
      age = +this.value; d3.select("#kate-age-val").text(age); drawKateRadar();
    });
    d3.select("#kate-height").on("input", function() {
      height = +this.value; d3.select("#kate-height-val").text(height); drawKateRadar();
    });
    d3.select("#kate-weight").on("input", function() {
      weight = +this.value; d3.select("#kate-weight-val").text(weight); drawKateRadar();
    });

    // FILTER DATA by surgery and sliders
    const filt0 = allCases.filter(d => surgeries.includes(d.opname));
    const filt1 = filt0.filter(d =>
      d.age    >= age - 10    && d.age    <= age + 10 &&
      d.height >= height - 10 && d.height <= height + 10 &&
      d.weight >= weight - 10 && d.weight <= weight + 10
    );

    // Dimensions and normalization
    const dims = [
      "Medical Complexity", "Recovery Support Needs", "Decision Clarity Needed",
      "Emotional Sensitivity", "Information Depth", "Mortality Risk", "Avg Blood Loss"
    ];
    const maxSurgDur = d3.max(filt1, d => +d.surgery_duration) || 1;
    const maxLead    = d3.max(filt1, d => Math.abs(+d.anesthesia_lead_time)) || 1;
    const maxEBL     = d3.max(filt1, d => +d.intraop_ebl) || 1;

    // DRAW each radar
    surgeries.forEach((surg, idx) => {
      const sub = filt1.filter(d => d.opname === surg);
      const target = `#radar-${ idx===0 ? 'low' : 'high' }`;
      if (!sub.length) {
        d3.select(target).html(`<div style="color:#faa">No data for ${surg}</div>`);
        return;
      }
      const means = {};
      dims.forEach(dim => {
        const vs = sub.map(d => {
          switch(dim) {
            case "Medical Complexity":       return (d.asa||0)/5;
            case "Recovery Support Needs":   return (d.age||0)/100;
            case "Decision Clarity Needed":  return (d.surgery_duration||0)/maxSurgDur;
            case "Emotional Sensitivity":    return Math.abs(d.anesthesia_lead_time||0)/maxLead;
            case "Information Depth":        
              let cnt=0; ["iv1","iv2","aline1","aline2","cline1","cline2"].forEach(k=>{ if(d[k]&&d[k]!="N/A") cnt++; });
              return cnt/6;
            case "Mortality Risk":           return d.death_inhosp||0;
            case "Avg Blood Loss":           return (d.intraop_ebl||0)/maxEBL;
          }
        }).filter(v=>isFinite(v));
        means[dim] = vs.length ? d3.mean(vs) : 0;
      });
      drawSingleRadar(target, surg, dims, means);
    });

    // SUMMARY and TABLE at bottom
    const summaryHTML = [`<p><strong>${surgeries[0]}</strong> vs. <strong>${surgeries[1]}</strong><br>` +
      `${filt1.length} matching cases.</p>`,
      `<table style="width:100%; border-collapse: collapse; margin-top:1em; color:#fff;"><thead>` +
      `<tr>` +
        `<th style="border-bottom:1px solid #888; padding:6px;">Dimension</th>` +
        `<th style="border-bottom:1px solid #888; padding:6px;">Formula</th>` +
        `<th style="border-bottom:1px solid #888; padding:6px;">0 = best … 1 = worst</th>` +
      `</tr></thead><tbody>` +
      [`Medical Complexity`, `Recovery Support Needs`, `Decision Clarity Needed`,
       `Emotional Sensitivity`, `Information Depth`, `Mortality Risk`, `Avg Blood Loss`]
      .map((dim,i) => {
        const formulas = [
          `ASA / 5`, `Age / 100`, `surgery_duration / max_duration`,
          `|anesthesia_lead_time| / max_lead`, `(IV+lines)/6`, `mean(death_inhosp)`, `intraop_ebl / maxEBL`
        ];
        const notes = [
          `0 healthy … 1 severe`, `0 newborn … 1 centenarian`,
          `0 short … 1 long`, `0 no delay … 1 max delay`,
          `0 none … 1 many`, `0 no deaths … 1 all died`, `0 mL … 1 max` ];
        return `<tr>` +
          `<td style="padding:6px;">${dim}</td>` +
          `<td style="padding:6px;">${formulas[i]}</td>` +
          `<td style="padding:6px;">${notes[i]}</td>` +
        `</tr>`;
      }).join('') +
      `</tbody></table>`
    ].join('\n');

    d3.select("#summary").html(summaryHTML);
  }

  //── single radar helper ─────────────────────────────────────────────
  function drawSingleRadar(sel, title, dims, means) {
    const maxVal = d3.max(Object.values(means))||1;
    const angle  = 2*Math.PI/dims.length;
    const svg = d3.select(sel).html(`<h3 style="text-align:center;color:#fff">${title}</h3>`)
      .append("svg")
        .attr("viewBox","0 0 380 380")
        .attr("width",380).attr("height",380)
        .style("display","block").style("margin","0 auto");
    const cx=190, cy=190, r=150;

    // tooltip
    let tooltip = d3.select("body").select(".kate-tooltip");
    if (tooltip.empty()) {
      tooltip = d3.select("body").append("div")
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

    // grid + axes
    for(let lvl=1; lvl<=5; lvl++){
      svg.append("circle")
        .attr("cx",cx).attr("cy",cy)
        .attr("r",(r*lvl)/5)
        .attr("fill","none")
        .attr("stroke","rgba(255,255,255,0.2)");
    }
    dims.forEach((dim,i)=>{
      const a = i*angle - Math.PI/2;
      svg.append("line")
        .attr("x1",cx).attr("y1",cy)
        .attr("x2",cx+Math.cos(a)*r)
        .attr("y2",cy+Math.sin(a)*r)
        .attr("stroke","rgba(255,255,255,0.2)");
    });

    // polygon
    const radarLine = d3.lineRadial()
      .radius(d=>r*(means[d]/maxVal))
      .angle((_,i)=>i*angle)
      .curve(d3.curveLinearClosed);
    svg.append("path")
      .datum(dims)
      .attr("transform",`translate(${cx},${cy})`)
      .attr("d",radarLine)
      .attr("fill","steelblue").attr("fill-opacity",0.3)
      .attr("stroke","steelblue").attr("stroke-width",2);

    // points + labels + tooltips
    dims.forEach((dim,i)=>{
      const a = i*angle - Math.PI/2;
      const norm = means[dim]/maxVal;
      const px = cx + Math.cos(a)*r*norm;
      const py = cy + Math.sin(a)*r*norm;

      svg.append("circle")
        .attr("cx",px).attr("cy",py).attr("r",6)
        .attr("fill","steelblue")
        .on("mouseover", ev=>{
          tooltip.style("display","block")
            .html(`<strong>${dim}:</strong> ${norm.toFixed(2)}`)
            .style("left",(ev.pageX+8)+"px")
            .style("top",(ev.pageY-20)+"px");
        })
        .on("mouseout", ()=>tooltip.style("display","none"));

      svg.append("text")
        .attr("x",cx+Math.cos(a)*(r+30))
        .attr("y",cy+Math.sin(a)*(r+30))
        .attr("text-anchor","middle")
        .attr("font-size","0.8rem")
        .attr("fill","#fff")
        .text(dim);
    });
  }

  //── initialize ──────────────────────────────────────────────────────
  document.addEventListener("DOMContentLoaded", () => {
    d3.json("data/kate_card.json")
      .then(data => {
        allCases = data;
        drawKateRadar();
      })
      .catch(err => {
        d3.select("#radar-container")
          .html(`<div style="color:#faa">Error loading data: ${err.message}</div>`);
      });

    // tie into body‐map clicks for region changes
    d3.selectAll("#body-map .region").on("click", function() {
      window.selectedRegion = d3.select(this).attr("id");
      d3.selectAll("#body-map .region").classed("region--selected", false);
      d3.select(this).classed("region--selected", true);
      drawKateRadar();
    });
  });
})();
