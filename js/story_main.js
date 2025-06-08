document.addEventListener("DOMContentLoaded", () => {
  const titleSlide         = document.getElementById("title-slide");
  const narrativeContainer = document.getElementById("narrative-container");
  const enterBtn           = document.getElementById("enter-btn");
  const tryBtn             = document.getElementById("try-btn");
  const backBtn            = document.getElementById('back-btn');

  // Prepare sections and paragraphs
  const sections = Array.from(document.querySelectorAll(".visualization-section.story-section"));
  const observerOptions = { root: null, threshold: 0.6 };

  // Wrap each paragraph in faded + typing spans
  sections.forEach(section => {
    section.querySelectorAll("p").forEach(p => {
      const fullText = p.textContent;
      p.dataset.fullText = fullText;
      p.dataset.typed = "false";
      // insert faded and typing layers
      p.innerHTML = `
        <span class="faded-text">${fullText}</span>
        <span class="typing-text"></span>
      `;
    });
  });

  // Typing function targeting the overlay span
  function typeParagraphSequential(paragraphs, idx) {
    if (idx >= paragraphs.length) return;
    const p = paragraphs[idx];
    if (p.dataset.typed === "true") {
      return typeParagraphSequential(paragraphs, idx + 1);
    }
    const typer = p.querySelector('.typing-text');
    typer.textContent = '';
    let i = 0;
    const fullText = p.dataset.fullText;
    function typeChar() {
      if (i < fullText.length) {
        typer.textContent += fullText.charAt(i);
        i++;
        setTimeout(typeChar, 13 + Math.random() * 16);
      } else {
        p.dataset.typed = "true";
        typeParagraphSequential(paragraphs, idx + 1);
      }
    }
    typeChar();
  }

  // IntersectionObserver setup
  function handleTyping(entry) {
    const el = entry.target;
    if (el.dataset.typedStarted === "true") return;
    el.dataset.typedStarted = "true";
    const paragraphs = Array.from(el.querySelectorAll("p"));
    typeParagraphSequential(paragraphs, 0);
  }
  const revealOnScroll = (entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
        if (entry.target.classList.contains("story-section")) {
          handleTyping(entry);
        }
      }
    });
  };
  const observer = new IntersectionObserver(revealOnScroll, observerOptions);
  sections.forEach(section => observer.observe(section));

  // Hide narrative initially (unless query param)
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('view') === 'narrative') {
    titleSlide.style.display = 'none';
    narrativeContainer.style.display = 'flex';
  } else {
    narrativeContainer.style.display = 'none';
  }

  // Button handlers
  backBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    narrativeContainer.style.display = 'none';
    titleSlide.style.display      = 'flex';
    // reset typing
    sections.forEach(section => {
      section.querySelectorAll('p').forEach(p => {
        p.dataset.typed = 'false';
        delete p.dataset.typedStarted;
        // clear typing-text
        p.querySelector('.typing-text').textContent = '';
      });
      section.classList.remove('visible');
      observer.observe(section);
    });
  });

  enterBtn.addEventListener("click", () => {
    titleSlide.style.display = "none";
    narrativeContainer.style.display = "flex";
  });

  if (tryBtn) {
    tryBtn.addEventListener("click", () => {
      window.location.href = "dashboard.html";
    });
  }

  // Pupil Animation (unchanged)
  animatePupils();
});

let t = 0;
const maxMove = 20;
function animatePupils() {
  const moveX = maxMove * Math.sin(t);
  if (window.d3) {
    d3.select("#pupil-left").attr("cx", 12 + moveX);
    d3.select("#pupil-right").attr("cx", 137 + moveX);
  }
  t += 0.03;
  requestAnimationFrame(animatePupils);
}

// MINI PLOTS FOR TITLE

function drawMiniTracySwarm(data) {
  if (!data) return;

  const surgeries = ["Cholecystectomy", "Exploratory laparotomy"];

  // Filter and prepare data
  const plotData = data
    .filter(d =>
      surgeries.includes(d.opname) &&
      d.asa != null &&
      d.intraop_ebl != null
    )
    .map(d => ({
      surgery: d.opname,
      asa: String(Math.round(d.asa)),
      ebl: +d.intraop_ebl
    }));

  if (plotData.length === 0) {
    d3.select("#swarm-chart-mini").html("<div style='color:#aaa;font-size:0.8rem'>No data for abdomen region.</div>");
    return;
  }

  // Clear previous
  d3.select("#swarm-chart-mini").selectAll("*").remove();

  const margin = { top: 30, right: 20, bottom: 40, left: 40 };
  const width = 450 - margin.left - margin.right;
  const height = 400 - margin.top - margin.bottom;
  const radius = 3;

  const svg = d3.select("#swarm-chart-mini")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const asaColors = d3.scaleOrdinal()
    .domain(["1", "2", "3", "4", "5"])
    .range(["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd"]);

  const x = d3.scalePoint()
    .domain(surgeries)
    .range([radius, width - radius])
    .padding(0.5);

  const maxEbl = d3.max(plotData, d => d.ebl);
  const y = d3.scaleSymlog()
    .domain([0, maxEbl])
    .constant(10)
    .range([height - radius, radius]);

  // Axes
  svg.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x).tickSize(0))
    .selectAll("text")
    .attr("font-size", "0.7rem")
    .attr("font-family", "'Georgia', serif");

  svg.append("g")
    .call(d3.axisLeft(y).ticks(4).tickFormat(d3.format(",.0f")))
    .selectAll("text")
    .attr("font-size", "0.5rem")
    .attr("font-family", "'Georgia', serif");

  // Force simulation for swarm layout
  const simulation = d3.forceSimulation(plotData)
    .force("x", d3.forceX(d => x(d.surgery)).strength(1))
    .force("y", d3.forceY(d => y(d.ebl)).strength(1))
    .force("collide", d3.forceCollide(radius * 1.1))
    .stop();

  for (let i = 0; i < 120; ++i) simulation.tick();

  // Draw circles (no interaction)
  svg.append("g")
    .selectAll("circle")
    .data(plotData)
    .join("circle")
    .attr("cx", d => d.x)
    .attr("cy", d => d.y)
    .attr("r", radius)
    .attr("fill", d => d.asa === "4" ? asaColors(d.asa) : "#ccc")
    .attr("stroke", "#333")
    .attr("stroke-width", 0.8);

  // Title
  svg.append("text")
    .attr("x", width / 2)
    .attr("y", -10)
    .attr("text-anchor", "middle")
    .style("font-size", "0.85rem")
    .style("font-weight", "600")
    .text("Blood Loss vs. ASA Score (Abdomen)");

  // X axis label
  svg.append("text")
    .attr("x", width / 2)
    .attr("y", height + 30)
    .attr("text-anchor", "middle")
    .style("font-size", "0.7rem")
    .text("Surgery (Low vs. High Risk)");

  // Y axis label
  svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", -30)
    .attr("text-anchor", "middle")
    .style("font-size", "0.7rem")
    .text("Estimated Blood Loss (ml)");
}

// Load data and draw mini chart:
d3.json("data/tracy.json").then(data => {
  drawMiniTracySwarm(data);
});

(function(){
  let allCases = null;

  function drawMiniHeatmap() {
    const container = d3.select("#heatmap-chart-mini");
    container.html("");

    const surgeries = ["Cholecystectomy", "Exploratory laparotomy"];
    const rows = ["5","4","3","2","1"];

    if (!allCases) {
      container.html("<div style='color:#faa'>No data loaded</div>");
      return;
    }

    // Filter and rollup average death_score by ASA and surgery
    const filtered = allCases.filter(d =>
      surgeries.includes(d.opname) &&
      d.asa_score != null &&
      d.death_score != null
    );

    const roll = d3.rollups(
      filtered,
      vs => d3.mean(vs, d => +d.death_score),
      d => String(Math.round(d.asa_score)),
      d => d.opname
    );

    const avgDeath = {};
    roll.forEach(([asa, grp]) => {
      avgDeath[asa] = Object.fromEntries(grp);
    });

    const cells = [];
    rows.forEach(asa => {
      surgeries.forEach(op => {
        cells.push({ asa, op, value: avgDeath[asa]?.[op] ?? 0 });
      });
    });

    // Dimensions — smaller size
    const margin = { top: 40, right: 15, bottom: 50, left: 50 },
          fullW = 400,
          fullH = 360,
          W = fullW - margin.left - margin.right,
          H = fullH - margin.top - margin.bottom;

    // Scales
    const x = d3.scaleBand().domain(surgeries).range([0, W]).padding(0.1);
    const y = d3.scaleBand().domain(rows).range([0, H]).padding(0.1);

    const maxVal = d3.max(cells, d => d.value) || 1;
    const color = d3.scaleSequential(d3.interpolateViridis).domain([0, maxVal]);

    // SVG
    const svg = container.append("svg")
      .attr("width", fullW)
      .attr("height", fullH)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Axes
    svg.append("g")
      .attr("transform", `translate(0,${H})`)
      .call(d3.axisBottom(x))
      .selectAll("text")
      .attr("font-size", "0.8rem").attr("font-family", "'Georgia', serif");

    svg.append("g")
      .call(d3.axisLeft(y))
      .selectAll("text")
      .attr("font-size", "0.8rem").attr("font-family", "'Georgia', serif");

    // Cells
    svg.selectAll("rect")
      .data(cells)
      .join("rect")
      .attr("x", d => x(d.op))
      .attr("y", d => y(d.asa))
      .attr("width", x.bandwidth())
      .attr("height", y.bandwidth())
      .attr("fill", d => color(d.value))
      .attr("stroke", "#444")
      .attr("stroke-width", 0.8);

    // Title
    svg.append("text")
      .attr("x", W / 2)
      .attr("y", -20)
      .attr("text-anchor", "middle")
      .style("font-size", "0.85rem")
      .style("font-weight", "600")
      .text("Mortality Rate by ASA & Surgery");

    // Legend (simple)
    const legendW = 150, legendH = 10;
    const defs = svg.append("defs");
    const grad = defs.append("linearGradient").attr("id", "grad").attr("x1", "0%").attr("x2", "100%");

    grad.append("stop").attr("offset", "0%").attr("stop-color", color(0));
    grad.append("stop").attr("offset", "100%").attr("stop-color", color(maxVal));

    svg.append("rect")
      .attr("x", (W - legendW) / 2)
      .attr("y", H + 35)
      .attr("width", legendW)
      .attr("height", legendH)
      .style("fill", "url(#grad)")
      .style("stroke", "#444");

    svg.append("text")
      .attr("x", (W - legendW) / 2 - 20)
      .attr("y", H + 47)
      .attr("font-size", "0.5rem")
      .text("0%");

    svg.append("text")
      .attr("x", (W + legendW) / 2 + 30)
      .attr("y", H + 47)
      .attr("font-size", "0.5rem")
      .attr("text-anchor", "end")
      .text(`${(maxVal * 100).toFixed(1)}%`);
  }

  // Load data & draw
  document.addEventListener("DOMContentLoaded", () => {
    d3.json("data/daniel.json").then(data => {
      allCases = data;
      drawMiniHeatmap();
    }).catch(err => {
      d3.select("#heatmap-container").html(`<div style="color:#faa">Error loading data: ${err.message}</div>`);
    });
  });
})();


(function() {
  let allCases = null;

  document.addEventListener("DOMContentLoaded", () => {
    d3.json("data/kate_card.json")
      .then(data => {
        allCases = data;
        drawMiniRadar();
      })
      .catch(err => {
        d3.select("#radar-mini")
          .html(`<div style="color:#c00">Error loading data: ${err.message}</div>`);
      });
  });

  function drawMiniRadar() {
    const container = d3.select("#radar-chart-mini").html("");
    const surgery = "Exploratory laparotomy";

    const dims = [
      "Medical Complexity", "Recovery Support Needs", "Decision Clarity Needed",
      "Emotional Sensitivity", "Information Depth"
    ];

    const filt = allCases.filter(d => d.opname === surgery);
    if (!filt.length) {
      container.html(`<div style="color:#c00">No data for ${surgery}</div>`);
      return;
    }

    const maxSurgDur = d3.max(filt, d => +d.surgery_duration) || 1;
    const maxLead    = d3.max(filt, d => Math.abs(+d.anesthesia_lead_time)) || 1;

    const means = {};
    dims.forEach(dim => {
      const vs = filt.map(d => {
        switch(dim) {
          case "Medical Complexity":       return (d.asa || 0) / 5;
          case "Recovery Support Needs":   return (d.age || 0) / 100;
          case "Decision Clarity Needed":  return (d.surgery_duration || 0) / maxSurgDur;
          case "Emotional Sensitivity":    return Math.abs(d.anesthesia_lead_time || 0) / maxLead;
          case "Information Depth": {
            let cnt = 0;
            ["iv1","iv2","aline1","aline2","cline1","cline2"].forEach(k => {
              if (d[k] && d[k] !== "N/A") cnt++;
            });
            return cnt / 6;
          }
        }
      }).filter(v => isFinite(v));
      means[dim] = vs.length ? d3.mean(vs) : 0;
    });

    drawSingleRadar(container, surgery, dims, means);
  }

  function drawSingleRadar(sel, title, dims, means) {
    const maxVal = d3.max(Object.values(means)) || 1;
    const angle = 2 * Math.PI / dims.length;

    const svgWidth = 400;
    const svgHeight = 400;
    const cx = svgWidth / 2;
    const cy = svgHeight / 2 + 10;
    const r = 120;

    const svg = sel.append("svg")
      .attr("viewBox", `0 0 ${svgWidth} ${svgHeight}`)
      .attr("width", svgWidth)
      .attr("height", svgHeight)
      .style("display", "block")
      .style("margin", "0 auto");

    svg.append("text")
      .attr("x", svgWidth / 2)
      .attr("y", 20)
      .attr("text-anchor", "middle")
      .attr("fill", "#000")
      .attr("font-size", "1rem")
      .attr("font-weight", 600)
      .text(title);

    for (let lvl = 1; lvl <= 5; lvl++) {
      svg.append("circle")
        .attr("cx", cx).attr("cy", cy)
        .attr("r", (r * lvl) / 5)
        .attr("fill", "none")
        .attr("stroke", "rgba(0,0,0,0.2)");
    }

    dims.forEach((dim, i) => {
      const a = i * angle - Math.PI / 2;
      svg.append("line")
        .attr("x1", cx).attr("y1", cy)
        .attr("x2", cx + Math.cos(a) * r)
        .attr("y2", cy + Math.sin(a) * r)
        .attr("stroke", "rgba(0,0,0,0.2)");
    });

    const radarLine = d3.lineRadial()
      .radius(d => r * (means[d] / maxVal))
      .angle((_, i) => i * angle)
      .curve(d3.curveLinearClosed);

    svg.append("path")
      .datum(dims)
      .attr("transform", `translate(${cx},${cy})`)
      .attr("d", radarLine)
      .attr("fill","steelblue").attr("fill-opacity",0.3)
      .attr("stroke","steelblue").attr("stroke-width",2);

    dims.forEach((dim, i) => {
      const a = i * angle - Math.PI / 2;
      const norm = means[dim] / maxVal;
      const px = cx + Math.cos(a) * r * norm;
      const py = cy + Math.sin(a) * r * norm;

      svg.append("circle")
        .attr("cx", px).attr("cy", py).attr("r", 4)
        .attr("fill", "black");

      svg.append("text")
        .attr("x", cx + Math.cos(a) * (r + 16))
        .attr("y", cy + Math.sin(a) * (r + 16))
        .attr("text-anchor", "middle")
        .attr("font-size", "0.65rem")
        .attr("fill", "#000")
        .text(dim);
    });
  }
})();
