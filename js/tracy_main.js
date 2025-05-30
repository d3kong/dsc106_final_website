// js/tracy_main.js

const metrics = [
  { id:"age", label:"Age" },
  { id:"asa", label:"ASA Score" },
  { id:"bmi", label:"BMI" },
  { id:"preop_hb", label:"Pre-op Hemoglobin" },
  { id:"intraop_ebl", label:"Intra-op Blood Loss (mL)" },
  { id:"preop_cr", label:"Pre-op Creatinine" },
  { id:"preop_alb", label:"Pre-op Albumin" },
  { id:"preop_na", label:"Pre-op Sodium" },
  { id:"preop_k", label:"Pre-op Potassium" },
  { id:"preop_gluc", label:"Pre-op Glucose" },
  { id:"intraop_uo", label:"Intra-op Urine Output (mL)" }
];

(function() {
  fetch("data/tracy.json")
    .then(r => r.json())
    .then(data => {
      const outcomes = ["Survived","Died"];
      const riskLevels = ["low","medium","high"];

      let selectedOptype = "";
      let selectedRegion = "";
      let currentMetric = metrics[0].id;

      // map each raw optype → region-ID
      const optypeToRegion = {
        "Colorectal":"abdomen","Stomach":"abdomen",
        "Major resection":"abdomen","Minor resection":"abdomen",
        "Biliary/Pancreas":"thorax","Hepatic":"thorax","Breast":"thorax",
        "Vascular":"thorax","Thyroid":"head_neck",
        "Transplantation":"pelvis","Others":"pelvis"
      };

      // 1) REGION click
      d3.selectAll("#body-map2 .region")
        .on("click", function() {
          selectedRegion = this.id;
          selectedOptype = "";
          d3.select("#optypeSelector").property("value","");
          d3.selectAll(".region--selected").classed("region--selected", false);
          d3.select(this).classed("region--selected", true);
          redraw();
        });

      // 2) DROPDOWNS
      const opDD = d3.select("#optypeSelector")
        .on("change", function() {
          selectedOptype = this.value;
          selectedRegion = "";
          d3.selectAll(".region--selected").classed("region--selected", false);
          redraw();
        });

      Array.from(new Set(data.map(d => d.optype)))
           .filter(d => d)
           .sort()
           .forEach(op => opDD.append("option").attr("value",op).text(op));

      const metricDD = d3.select("#metricSelector")
        .on("change", function() {
          currentMetric = this.value;
          redraw();
        });
      metrics.forEach(m =>
        metricDD.append("option").attr("value",m.id).text(m.label)
      );

      d3.select("#resetButton").on("click", () => {
        selectedOptype = ""; selectedRegion = "";
        d3.select("#optypeSelector").property("value","");
        d3.selectAll(".region--selected").classed("region--selected", false);
        redraw();
      });

      // INITIAL DRAW
      redraw();

      // redraw chart & details
      function redraw() {
        const values = getFiltered();
        drawBoxPlot(values);
        updateDetails(values);
      }

      // filter raw data → array of currentMetric
      function getFiltered() {
        let arr = data;
        if (selectedRegion) {
          arr = arr.filter(d => optypeToRegion[d.optype] === selectedRegion);
        } else if (selectedOptype) {
          arr = arr.filter(d => d.optype === selectedOptype);
        }
        return arr.map(d => +d[currentMetric]);
      }

      // draw boxplot on #plot
      function drawBoxPlot(vals) {
        const svg = d3.select("#plot");
        svg.selectAll("*").remove();
        const margin={top:30,right:20,bottom:50,left:75},
              W=+svg.attr("width")-margin.left-margin.right,
              H=+svg.attr("height")-margin.top-margin.bottom;
        const g = svg.append("g")
                     .attr("transform",`translate(${margin.left},${margin.top})`);

        // group stats by outcome & risk
        const stats = [];
        riskLevels.forEach(r => {
          outcomes.forEach(o => {
            let subset = data.filter(d =>
              d.risk===r && d.death_inhosp===+(o==="Died")
            );
            if (selectedRegion)
              subset = subset.filter(d => optypeToRegion[d.optype] === selectedRegion);
            else if (selectedOptype)
              subset = subset.filter(d => d.optype === selectedOptype);
            const arr = subset.map(d => +d[currentMetric]);
            if (arr.length) stats.push({
              key:`${o}-${r}`, outcome:o, risk:r,
              vals:arr, stats:boxStats(arr)
            });
          });
        });

        if (!stats.length) {
          g.append("text")
           .attr("x",W/2).attr("y",H/2)
           .attr("text-anchor","middle").attr("fill","#666")
           .text("No data for this filter");
          return;
        }

        const x = d3.scaleLinear()
                    .domain([
                      d3.min(stats,d=>d.stats.min),
                      d3.max(stats,d=>d.stats.max)
                    ]).nice().range([0,W]);

        const y = d3.scaleBand()
                    .domain(stats.map(d=>d.key))
                    .range([0,H]).padding(0.3);

        g.append("g")
         .attr("transform",`translate(0,${H})`)
         .call(d3.axisBottom(x).ticks(4));
        g.append("g")
         .call(d3.axisLeft(y).tickFormat(d=>{
           const [o,r] = d.split("-");
           return `${o} / ${r}`;
         }));

        const box = g.selectAll(".box")
                     .data(stats)
                     .join("g")
                       .attr("class","box")
                       .attr("transform",d=>`translate(0,${y(d.key)})`)
                       .on("click", d=> updateDetails(d.vals));

        box.append("line")
           .attr("x1",d=>x(d.stats.min))
           .attr("x2",d=>x(d.stats.max))
           .attr("y1",y.bandwidth()/2)
           .attr("y2",y.bandwidth()/2)
           .attr("stroke","#666");

        box.append("rect")
           .attr("x",d=>x(d.stats.q1))
           .attr("width",d=>x(d.stats.q3)-x(d.stats.q1))
           .attr("height",y.bandwidth())
           .attr("fill","#4682b4").attr("opacity",0.7);

        box.append("line")
           .attr("x1",d=>x(d.stats.median))
           .attr("x2",d=>x(d.stats.median))
           .attr("y1",0).attr("y2",y.bandwidth())
           .attr("stroke","#000").attr("stroke-width",2);
      }

      function boxStats(a) {
        const s = a.slice().sort(d3.ascending),
              q1 = d3.quantile(s,0.25),
              m  = d3.quantile(s,0.5),
              q3 = d3.quantile(s,0.75),
              iqr= q3-q1,
              min= d3.min(s.filter(v=>v>=q1-1.5*iqr)),
              max= d3.max(s.filter(v=>v<=q3+1.5*iqr));
        return {min,q1,median:m,q3,max};
      }

      function updateDetails(arr) {
        const st = boxStats(arr),
              label = metrics.find(m=>m.id===currentMetric).label;
        d3.select("#detailsBox").html(`
          <h3>${label}</h3>
          <ul>
            <li><strong>Min:</strong> ${st.min.toFixed(2)}</li>
            <li><strong>Q1:</strong> ${st.q1.toFixed(2)}</li>
            <li><strong>Median:</strong> ${st.median.toFixed(2)}</li>
            <li><strong>Q3:</strong> ${st.q3.toFixed(2)}</li>
            <li><strong>Max:</strong> ${st.max.toFixed(2)}</li>
          </ul>
        `);
      }

    });
})();
