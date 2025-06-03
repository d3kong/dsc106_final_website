// kate_main.js

function renderKateViz(containerSelector) {
  // -- allData for case filtering and summary, labData for radar chart --
  Promise.all([
    d3.json("data/kate_card.json"),
    d3.json("data/kate_chart.json")
  ]).then(([allData, labData]) => {
    const optypeToRegion = {
      "Colorectal":      "abdomen",
      "Stomach":         "abdomen",
      "Major resection": "abdomen",
      "Minor resection": "abdomen",
      "Biliary/Pancreas":"thorax",
      "Hepatic":         "thorax",
      "Breast":          "thorax",
      "Vascular":        "thorax",
      "Thyroid":         "head_neck",
      "Transplantation": "pelvis",
      "Others":          "pelvis"
    };
    let region = window.selectedRegion;

    // Sliders default values
    let age = 50, height = 160, weight = 75;

    // Filter data by region
    let cases = allData;
    let labs = labData;
    if (region) {
      cases = cases.filter(d => optypeToRegion[d.optype] === region);
      labs = labs.filter(d => optypeToRegion[d.optype] === region);
    }

    // UI
    const container = d3.select(containerSelector);
    container.html(`
      <h2>Guided Preparation Tips</h2>
      <div class="sliders">
        <label>Age: <input type="range" id="kate-age" min="10" max="100" value="${age}"/> <span id="kate-age-val">${age}</span></label>
        <label>Height (cm): <input type="range" id="kate-height" min="120" max="200" value="${height}"/> <span id="kate-height-val">${height}</span></label>
        <label>Weight (kg): <input type="range" id="kate-weight" min="30" max="150" value="${weight}"/> <span id="kate-weight-val">${weight}</span></label>
      </div>
      <svg id="kate-radar" width="380" height="340"></svg>
      <div id="summary" style="margin-top:18px"></div>
    `);

    // Listen to sliders
    d3.select("#kate-age").on("input", function() {
      age = +this.value;
      d3.select("#kate-age-val").text(age);
      update();
    });
    d3.select("#kate-height").on("input", function() {
      height = +this.value;
      d3.select("#kate-height-val").text(height);
      update();
    });
    d3.select("#kate-weight").on("input", function() {
      weight = +this.value;
      d3.select("#kate-weight-val").text(weight);
      update();
    });

    update();

    function update() {
      // Filter by age, height, weight
      const filtLabs = labs.filter(d =>
        d.age >= age - 10 && d.age <= age + 10 &&
        d.height >= height - 10 && d.height <= height + 10 &&
        d.weight >= weight - 10 && d.weight <= weight + 10
      );

      // Radar Chart
      const svg = d3.select("#kate-radar");
      svg.selectAll("*").remove();
      const groups = [
        "Blood Cell & Inflammation Markers",
        "Liver & Protein Function",
        "Kidney Function & Metabolic Waste",
        "Electrolytes & Metabolic Panel",
        "Coagulation & Blood Gases"
      ];
      const clinical = {
        "Blood Cell & Inflammation Markers": ["wbc", "hb", "hct", "plt", "esr", "crp"],
        "Liver & Protein Function": ["tprot", "alb", "tbil", "ast", "alt", "ammo"],
        "Kidney Function & Metabolic Waste": ["bun", "cr", "gfr", "ccr", "lac"],
        "Electrolytes & Metabolic Panel": ["gluc", "na", "k", "ica", "cl", "hco3"],
        "Coagulation & Blood Gases": ["ptinr", "aptt", "fib", "ph", "pco2", "po2", "be", "sao2"]
      };
      const angleSlice = 2 * Math.PI / groups.length;
      const radius = 110, centerX = 170, centerY = 170;
      // Get means for each group
      const means = {};
      groups.forEach(gp => {
        const vals = clinical[gp]
          .flatMap(key => filtLabs.map(d => +d[key]).filter(v => isFinite(v)));
        means[gp] = vals.length ? d3.mean(vals) : 0;
      });
      const maxVal = d3.max(Object.values(means)) || 1;
      const radarLine = d3.lineRadial()
        .radius((d, i) => radius * (means[d] / maxVal))
        .angle((d, i) => i * angleSlice);
      svg.append("path")
        .datum(groups)
        .attr("transform", `translate(${centerX},${centerY})`)
        .attr("d", radarLine)
        .attr("fill", "steelblue")
        .attr("fill-opacity", 0.33)
        .attr("stroke", "steelblue");
      groups.forEach((gp, i) => {
        const ang = i * angleSlice - Math.PI / 2;
        const x = centerX + Math.cos(ang) * radius * (means[gp] / maxVal);
        const y = centerY + Math.sin(ang) * radius * (means[gp] / maxVal);
        svg.append("circle")
          .attr("cx", x).attr("cy", y)
          .attr("r", 5)
          .attr("fill", "steelblue");
        svg.append("text")
          .attr("x", centerX + Math.cos(ang) * (radius + 28))
          .attr("y", centerY + Math.sin(ang) * (radius + 28))
          .attr("text-anchor", "middle")
          .attr("font-size", "12px")
          .text(gp);
      });

      // Summary
      const filteredData = cases.filter(d =>
        d.age >= age - 10 && d.age <= age + 10 &&
        d.height >= height - 10 && d.height <= height + 10 &&
        d.weight >= weight - 10 && d.weight <= weight + 10
      );
      const typeCounts = d3.rollup(filteredData, v => v.length, d => d.optype);
      const sortedTypes = Array.from(typeCounts.entries()).sort((a, b) => b[1] - a[1]);
      const commonSurgery = sortedTypes.length > 0 ? sortedTypes[0][0] : "N/A";
      const aneTypes = [...new Set(filteredData.map(d => d.ane_type).filter(t => t !== 'N/A'))];
      const anesthesiaTypes = aneTypes.length > 0 ? aneTypes.join(", ") : "N/A";
      const stayDuration = d3.mean(filteredData, d => +d.stay_duration) || 0;
      const surgeryDuration = d3.mean(filteredData, d => +d.surgery_duration) || 0;
      const anesthesiaDuration = d3.mean(filteredData, d => +d.anesthesia_duration) || 0;
      const summary = `
        <p><strong>Most Common Procedure:</strong> ${commonSurgery}</p>
        <p><strong>Estimated Hospital Stay:</strong> ${formatDurationFromSeconds(stayDuration)}</p>
        <p><strong>Estimated Surgery Duration:</strong> ${formatDurationFromSeconds(surgeryDuration)}</p>
        <p><strong>Anesthesia Type(s) Typically Used:</strong> ${anesthesiaTypes}</p>
        <p><strong>Average Anesthesia Time:</strong> ${formatDurationFromSeconds(anesthesiaDuration)}</p>
        <p><strong>Based on ${filteredData.length} similar patient(s)</strong></p>
      `;
      container.select("#summary").html(summary);

      function formatDurationFromSeconds(totalSeconds) {
        if (isNaN(totalSeconds) || totalSeconds === 0) return "N/A";
        const days = Math.floor(totalSeconds / 86400);
        const hours = Math.floor((totalSeconds % 86400) / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        let parts = [];
        if (days) parts.push(`${days}d`);
        if (hours) parts.push(`${hours}h`);
        if (minutes || parts.length === 0) parts.push(`${minutes}m`);
        return parts.join(" ");
      }
    }
  });
}
