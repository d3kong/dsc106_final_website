// kate_main.js

function renderKateViz(containerSelector) {
  // Load both data files in parallel
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

    // Default slider values
    let age = 50,
        height = 160,
        weight = 75;

    // Pre‐filter both datasets by region, if one is selected
    let cases = allData;
    let labs = labData;
    if (region) {
      cases = cases.filter(d => optypeToRegion[d.optype] === region);
      labs  = labs.filter(d => optypeToRegion[d.optype] === region);
    }

    // Build the HTML for this section.
    // Note: We set SVG to 500×600 and add inline `style="display:block; margin:0 auto"` to center it.
    const container = d3.select(containerSelector);
    container.html(`
      <h2>Guided Preparation Tips</h2>
      <div class="sliders" style="text-align:center; margin-bottom:12px;">
        <label style="display:inline-block; margin-right:1rem;">
          Age:
          <input type="range" id="kate-age" min="10" max="100" value="${age}"/>
          <span id="kate-age-val">${age}</span>
        </label>
        <label style="display:inline-block; margin-right:1rem;">
          Height (cm):
          <input type="range" id="kate-height" min="120" max="200" value="${height}"/>
          <span id="kate-height-val">${height}</span>
        </label>
        <label style="display:inline-block;">
          Weight (kg):
          <input type="range" id="kate-weight" min="30" max="150" value="${weight}"/>
          <span id="kate-weight-val">${weight}</span>
        </label>
      </div>

      <!-- SVG is now 500×600 with viewBox 0 0 500 500 -->
      <svg id="kate-radar"
           viewBox="0 0 500 500"
           width="800"
           height="600"
           style="display: block; margin: 0 auto; background: none;">
      </svg>

      <div id="summary" style="margin-top:18px; text-align:left;"></div>

      <br></br>
      <p><strong>Note:</strong> Lab test results were normalized using reference ranges specific to each test. For each result, the normalized value was calculated as:</p>

        <pre><code>
        Normalized Value = (Result - Reference Min) / (Reference Max - Reference Min)
        </code></pre>
      <p>Values are scaled between 0 and 1, where:</p>
        <ul>
            <li style= "margin: 1em;"><strong>0</strong> represents the lower bound of the normal reference range,</li>
            <li style= "margin: 1em;"><strong>1</strong> represents the upper bound,</li>
            <li style= "margin: 1em;">Values outside the reference range are capped at 0 or 1 and do not indicate how far out of range the original value was.</li>
        </ul>

        <p>This normalization allows for comparability across different lab tests. For each user-defined group (based on age, height, and weight), normalized values were averaged to produce a composite score for each test.</p>
    `);

    // Update slider labels and redraw whenever a slider moves
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

    // Initial draw
    update();

    function update() {
      // 1) Filter lab data by slider ranges
      const filtLabs = labs.filter(d =>
        d.age    >= age - 10 && d.age    <= age + 10 &&
        d.height >= height - 10 && d.height <= height + 10 &&
        d.weight >= weight - 10 && d.weight <= weight + 10
      );

      // --------- REDRAW RADAR CHART ---------
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
        "Blood Cell & Inflammation Markers": ["wbc","hb","hct","plt","esr","crp"],
        "Liver & Protein Function":          ["tprot","alb","tbil","ast","alt","ammo"],
        "Kidney Function & Metabolic Waste": ["bun","cr","gfr","ccr","lac"],
        "Electrolytes & Metabolic Panel":    ["gluc","na","k","ica","cl","hco3"],
        "Coagulation & Blood Gases":         ["ptinr","aptt","fib","ph","pco2","po2","be","sao2"]
      };

      // 2) Compute means per group
      const means = {};
      groups.forEach(gp => {
        const vals = clinical[gp]
          .flatMap(key => filtLabs.map(d => +d[key]).filter(v => isFinite(v)));
        means[gp] = vals.length ? d3.mean(vals) : 0;
      });

      // 3) Find the maximum mean (for radial scaling)
      const maxVal = d3.max(Object.values(means)) || 1;

      // 4) Compute angle slice
      const angleSlice = (2 * Math.PI) / groups.length;

      // 5) SVG dimensions (pull from attributes)
      const svgWidth  = +svg.attr("width");
      const svgHeight = +svg.attr("height");

      // 6) Center of radar = middle of the 500×500 viewBox
      const centerX = 500 / 2;  // = 250
      const centerY = 500 / 2;  // = 250

      // 7) Radius = 40% of min(viewBox width, viewBox height) → ~200 px
      const radius = 500 * 0.4; // on a 500×500 box = 200 px

      // --- DRAW SPIDERWEB BACKGROUND BEFORE DATA POLYGON ---
      // Draw 5 concentric circles (20%, 40%, 60%, 80%, 100% of radius)
      const numLevels = 5;
      for (let level = 1; level <= numLevels; level++) {
        svg.append("circle")
          .attr("cx", centerX)
          .attr("cy", centerY)
          .attr("r", (radius * level) / numLevels)
          .attr("fill", "none")
          .attr("stroke", "rgba(255,255,255,0.2)")
          .attr("stroke-width", 1);
      }

      // Draw radial axes from center to each group’s maximum radius
      groups.forEach((gp, i) => {
        const ang = i * angleSlice - Math.PI / 2;
        const x2 = centerX + Math.cos(ang) * radius;
        const y2 = centerY + Math.sin(ang) * radius;
        svg.append("line")
          .attr("x1", centerX)
          .attr("y1", centerY)
          .attr("x2", x2)
          .attr("y2", y2)
          .attr("stroke", "rgba(255,255,255,0.2)")
          .attr("stroke-width", 1);
      });

      // 8) Build radial line generator for data polygon
      const radarLine = d3.lineRadial()
        .radius(d => radius * (means[d] / maxVal))
        .angle((d, i) => i * angleSlice)
        .curve(d3.curveLinearClosed);

      // 9) Draw filled polygon (data area)
      svg.append("path")
        .datum(groups)
        .attr("transform", `translate(${centerX},${centerY})`)
        .attr("d", radarLine)
        .attr("fill", "steelblue")
        .attr("fill-opacity", 0.33)
        .attr("stroke", "steelblue")
        .attr("stroke-width", 2);

      // 10) Draw circles & labels for each group
      groups.forEach((gp, i) => {
        const ang = i * angleSlice - Math.PI / 2;
        // point on the data polygon edge
        const x = centerX + Math.cos(ang) * radius * (means[gp] / maxVal);
        const y = centerY + Math.sin(ang) * radius * (means[gp] / maxVal);

        // Draw the data‐point circle
        svg.append("circle")
          .attr("cx", x)
          .attr("cy", y)
          .attr("r", 6)
          .attr("fill", "steelblue");

        // Draw the label further out
        const labelOffset = 30;
        const labelX = centerX + Math.cos(ang) * (radius + labelOffset);
        const labelY = centerY + Math.sin(ang) * (radius + labelOffset);

        svg.append("text")
          .attr("x", labelX)
          .attr("y", labelY)
          .attr("text-anchor", "middle")
          .attr("font-size", "14px")
          .attr("fill", "#fff")
          .text(gp);
      });

      // --------- UPDATE SUMMARY BELOW CHART ---------
      // Filter the `cases` data in the same way to get matching patients
      const filteredData = cases.filter(d =>
        d.age    >= age - 10 && d.age    <= age + 10 &&
        d.height >= height - 10 && d.height <= height + 10 &&
        d.weight >= weight - 10 && d.weight <= weight + 10
      );
      const typeCounts = d3.rollup(filteredData, v => v.length, d => d.optype);
      const sortedTypes = Array.from(typeCounts.entries())
                            .sort((a, b) => b[1] - a[1]);
      const commonSurgery = sortedTypes.length > 0 ? sortedTypes[0][0] : "N/A";
      const aneTypes = [...new Set(
        filteredData.map(d => d.ane_type).filter(t => t !== 'N/A')
      )];
      const anesthesiaTypes = aneTypes.length ? aneTypes.join(", ") : "N/A";
      const stayDuration = d3.mean(filteredData, d => +d.stay_duration) || 0;
      const surgeryDuration = d3.mean(filteredData, d => +d.surgery_duration) || 0;
      const anesthesiaDuration = d3.mean(filteredData, d => +d.anesthesia_duration) || 0;

      // Compute average age, height, and weight
      const avgAge = filteredData.length
        ? d3.mean(filteredData, d => +d.age).toFixed(1)
        : "N/A";
      const avgHeight = filteredData.length
        ? d3.mean(filteredData, d => +d.height).toFixed(1)
        : "N/A";
      const avgWeight = filteredData.length
        ? d3.mean(filteredData, d => +d.weight).toFixed(1)
        : "N/A";

      const summaryHTML = `
        <p><strong>Most Common Procedure:</strong> ${commonSurgery}</p>
        <p><strong>Estimated Hospital Stay:</strong> ${formatDurationFromSeconds(stayDuration)}</p>
        <p><strong>Estimated Surgery Duration:</strong> ${formatDurationFromSeconds(surgeryDuration)}</p>
        <p><strong>Anesthesia Type(s) Typically Used:</strong> ${anesthesiaTypes}</p>
        <p><strong>Average Anesthesia Time:</strong> ${formatDurationFromSeconds(anesthesiaDuration)}</p>
        <p>Based on <strong>${filteredData.length} similar patient(s)</strong> averaging 
           <strong>${avgAge}</strong> years old, <strong>${avgHeight}</strong> cm, and <strong>${avgWeight}</strong> kg.
        </p>
      `;
      container.select("#summary").html(summaryHTML);

      // Helper to convert seconds → human‐readable
      function formatDurationFromSeconds(totalSeconds) {
        if (isNaN(totalSeconds) || totalSeconds === 0) return "N/A";
        const days = Math.floor(totalSeconds / 86400);
        const hours = Math.floor((totalSeconds % 86400) / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        let parts = [];
        if (days) parts.push(`${days}d`);
        if (hours) parts.push(`${hours}h`);
        if (minutes || !parts.length) parts.push(`${minutes}m`);
        return parts.join(" ");
      }
    }
  });
}
