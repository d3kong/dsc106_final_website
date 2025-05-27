const metrics = [
      { id: "age",         label: "Age" },
      { id: "asa",         label: "ASA Score" },
      { id: "bmi",         label: "BMI" },
      { id: "preop_hb",    label: "Pre-op Hemoglobin" },
      { id: "intraop_ebl", label: "Intra-op Blood Loss (mL)" },
      { id: "preop_cr",    label: "Pre-op Creatinine" },
      { id: "preop_alb",   label: "Pre-op Albumin" },
      { id: "preop_na",    label: "Pre-op Sodium" },
      { id: "preop_k",     label: "Pre-op Potassium" },
      { id: "preop_gluc",  label: "Pre-op Glucose" },
      { id: "intraop_uo",  label: "Intra-op Urine Output (mL)" }
    ];

(function() {
  fetch("data/tracy.json")
    .then(res => res.json())
    .then(rawData => {
      const data = rawData;
      const outcomes = ["Survived", "Died"];
      const riskLevels = ["low", "medium", "high"];

      let selectedOptype = "";
      let currentMetric = metrics[0].id;

      const optypeSelector = d3.select("#optypeSelector")
        .on("change", function() {
          selectedOptype = this.value;
          drawBoxPlot();
          updateDetailsBoxFromFilter(getAllValues(), currentMetric);
        });

      const allOptypes = Array.from(new Set(data.map(d => d.optype).filter(d => d)));
      allOptypes.sort().forEach(op => {
        optypeSelector.append("option").attr("value", op).text(op);
      });

      const metricSelector = d3.select("#metricSelector")
        .on("change", function() {
          currentMetric = this.value;
          drawBoxPlot();
          updateDetailsBoxFromFilter(getAllValues(), currentMetric);
        });
      metrics.forEach(m => metricSelector.append("option").attr("value", m.id).text(m.label));

      // Initial draw & details
      drawBoxPlot();
      updateDetailsBoxFromFilter(getAllValues(), currentMetric);

      // Helper: get all numeric values for current filter+metric
      function getAllValues() {
        let filtered = selectedOptype ? data.filter(d => d.optype === selectedOptype) : data;
        return filtered.map(d => +d[currentMetric]);
      }

      function drawBoxPlot() {
        const svg = d3.select("#plot");
        svg.selectAll("*").remove();         // clear old plot

        // Size
        const margin = { top: 30, right: 20, bottom: 50, left: 100 };
        const innerW = +svg.attr("width")  - margin.left - margin.right;
        const innerH = +svg.attr("height") - margin.top  - margin.bottom;

        const g = svg.append("g")
                    .attr("transform", `translate(${margin.left},${margin.top})`);

        /* ---------- data ---------- */
        // filter by optype
        const filtered = selectedOptype ? data.filter(d => d.optype === selectedOptype)
                                        : data;

        const statsByGroup = [];
        riskLevels.forEach(risk => {
          outcomes.forEach(out => {
            const vals = filtered
              .filter(d => d.risk === risk &&
                          d.death_inhosp === (out === "Died" ? 1 : 0))
              .map(d => +d[currentMetric]);
            if (vals.length) statsByGroup.push({
              risk, outcome: out, values: vals,
              stats: getBoxStats(vals)
            });
          });
        });

        if (!statsByGroup.length) return;  // nothing to draw

        /* ---------- scales ---------- */
        const x = d3.scaleLinear()
                    .domain([
                      d3.min(statsByGroup, d => d.stats.min),
                      d3.max(statsByGroup, d => d.stats.max)
                    ])
                    .nice()
                    .range([0, innerW]);

        const y = d3.scaleBand()
                    .domain(statsByGroup.map(d => `${d.outcome}-${d.risk}`))
                    .range([0, innerH])
                    .padding(0.25);

        /* ---------- axes ---------- */
        g.append("g")
          .attr("class", "xaxis")
          .attr("transform", `translate(0,${innerH})`)
          .call(d3.axisBottom(x).ticks(4));

        g.append("g")
          .attr("class", "yaxis")
          .call(
            d3.axisLeft(y)
              .tickFormat(d => {
                const [o,r] = d.split("-");
                return `${o} / ${r}`;
              })
          );

        /* ---------- boxes ---------- */
        const box = g.selectAll(".boxplot")
                    .data(statsByGroup)
                    .join("g")
                    .attr("class", "boxplot")
                    .attr("transform", d => `translate(0,${y(`${d.outcome}-${d.risk}`)})`)
                    .on("click", d => {
                      updateDetailsBoxFromFilter(d.values, currentMetric);
                    });

        // whiskers
        box.append("line")
          .attr("x1", d => x(d.stats.min))
          .attr("x2", d => x(d.stats.max))
          .attr("y1", y.bandwidth()/2)
          .attr("y2", y.bandwidth()/2)
          .attr("stroke", "#666");

        // inter-quartile box
        box.append("rect")
          .attr("x",  d => x(d.stats.q1))
          .attr("width", d => x(d.stats.q3) - x(d.stats.q1))
          .attr("y",  0)
          .attr("height", y.bandwidth())
          .attr("fill", "#4682b4")
          .attr("opacity", 0.7);

        // median line
        box.append("line")
          .attr("x1", d => x(d.stats.median))
          .attr("x2", d => x(d.stats.median))
          .attr("y1", 0)
          .attr("y2", y.bandwidth())
          .attr("stroke", "#000")
          .attr("stroke-width", 2);
      }
    });

  function getBoxStats(values) {
    const sorted = values.slice().sort(d3.ascending);
    const q1 = d3.quantile(sorted, 0.25);
    const median = d3.quantile(sorted, 0.5);
    const q3 = d3.quantile(sorted, 0.75);
    const iqr = q3 - q1;
    const min = d3.min(sorted.filter(v => v >= q1 - 1.5 * iqr));
    const max = d3.max(sorted.filter(v => v <= q3 + 1.5 * iqr));
    return { min, q1, median, q3, max };
  }

  function updateDetailsBoxFromFilter(values, variable) {
    const stats = getBoxStats(values);
    const label = metrics.find(m => m.id === variable).label;
    const html = `
      <h3>${label}</h3>
      <ul>
        <li><strong>Min:</strong> ${stats.min.toFixed(2)}</li>
        <li><strong>Q1:</strong> ${stats.q1.toFixed(2)}</li>
        <li><strong>Median:</strong> ${stats.median.toFixed(2)}</li>
        <li><strong>Q3:</strong> ${stats.q3.toFixed(2)}</li>
        <li><strong>Max:</strong> ${stats.max.toFixed(2)}</li>
      </ul>
    `;
    d3.select('#detailsBox').html(html);
  }
})();
