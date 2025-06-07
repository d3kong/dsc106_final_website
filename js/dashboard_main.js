window.regionToSurgeries = {
  head_neck: {
    low: "Thyroid lobectomy",
    high: "Total thyroidectomy"
  },
  thorax: {
    low: "Breast-conserving surgery",
    high: "Lung lobectomy"
  },
  abdomen: {
    low: "Cholecystectomy",
    high: "Exploratory laparotomy"
  },
  pelvis: {
    low: "Ileostomy repair",
    high: "Low anterior resection"
  }
};

const regionTooltipInfo = {
  head_neck: {
    label: "Head/Neck",
    low: window.regionToSurgeries.head_neck.low,
    high: window.regionToSurgeries.head_neck.high
  },
  thorax: {
    label: "Thorax/Chest",
    low: window.regionToSurgeries.thorax.low,
    high: window.regionToSurgeries.thorax.high
  },
  abdomen: {
    label: "Abdomen",
    low: window.regionToSurgeries.abdomen.low,
    high: window.regionToSurgeries.abdomen.high
  },
  pelvis: {
    label: "Pelvis/Lower Abdomen",
    low: window.regionToSurgeries.pelvis.low,
    high: window.regionToSurgeries.pelvis.high
  }
};
// -----------------------------------------------------------------------------

window.selectedRegion = null;

// ---- BODY MAP CLICK HANDLER ----
document.addEventListener("DOMContentLoaded", () => {
  d3.selectAll("#body-map .region").on("click", function() {
    window.selectedRegion = d3.select(this).attr("id");
    console.log("Clicked region:", window.selectedRegion);

    d3.selectAll("#body-map .region").classed("region--selected", false);
    d3.select(this).classed("region--selected", true);

    // Dispatch your custom event for others to listen
    window.dispatchEvent(new Event("regionChange"));
  });
});

// ---- BODY MAP TOOLTIP HANDLERS ----
let bodymapTooltip = d3.select("body").select(".bodymap-tooltip");
if (bodymapTooltip.empty()) {
  bodymapTooltip = d3.select("body")
    .append("div")
    .attr("class", "bodymap-tooltip")
    .style("position", "absolute")
    .style("background", "#fff")
    .style("padding", "10px 18px")
    .style("border", "1.5px solid #999")
    .style("border-radius", "8px")
    .style("pointer-events", "none")
    .style("font-size", "15px")
    .style("color", "#222")
    .style("box-shadow", "0 2px 8px rgba(0,0,0,0.09)")
    .style("display", "none")
    .style("z-index", "9999");
}

d3.selectAll("#body-map .region")
  .on("mouseover", function(event) {
    const regionId = d3.select(this).attr("id");
    const info = regionTooltipInfo[regionId];
    if (info) {
      bodymapTooltip
        .style("display", "block")
        .html(`
          <strong>${info.label}</strong><br>
          <span style="color:#1a6;"><b>Low Risk:</b> ${info.low}</span><br>
          <span style="color:#b10;"><b>High Risk:</b> ${info.high}</span>
        `);
    }
  })
  .on("mousemove", function(event) {
    bodymapTooltip
      .style("left", (event.pageX + 16) + "px")
      .style("top", (event.pageY - 12) + "px");
  })
  .on("mouseout", function() {
    bodymapTooltip.style("display", "none");
  });

// ---- RESET FUNCTION ----
window.resetRegion = function() {
  window.selectedRegion = null;
  d3.selectAll("#body-map .region").classed("region--selected", false);
  window.dispatchEvent(new Event("regionChange"));
};