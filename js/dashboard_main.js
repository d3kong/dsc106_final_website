// ==================== Main Surgeries (as STRINGS, unchanged!) ====================
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

// ==================== Surgery Descriptions (for TOOLTIP ONLY) ====================
window.regionSurgeryDescriptions = {
  "Thyroid lobectomy": "Removal of one lobe of the thyroid gland, usually for benign nodules or small cancers.",
  "Total thyroidectomy": "Removal of the entire thyroid gland, typically for larger or more aggressive thyroid cancers.",
  "Breast-conserving surgery": "Removal of a breast tumor and margin, preserving most of the breast.",
  "Lung lobectomy": "Removal of one lobe of the lung, most often for cancer or severe lung disease.",
  "Cholecystectomy": "Removal of the gallbladder, commonly due to gallstones causing pain or infection.",
  "Exploratory laparotomy": "Surgical opening of the abdomen to diagnose or treat conditions.",
  "Ileostomy repair": "Surgical repair of an opening from the small intestine to the abdominal wall for waste elimination.",
  "Low anterior resection": "Removal of the lower part of the rectum, usually for rectal cancer, with reconnection of the colon."
};

// ==================== Tooltip Info (uses surgery NAMES) ====================
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

// ==================== Region Selection ====================
window.selectedRegion = null;

document.addEventListener("DOMContentLoaded", () => {
  d3.selectAll("#body-map .region").on("click", function() {
    window.selectedRegion = d3.select(this).attr("id");
    d3.selectAll("#body-map .region").classed("region--selected", false);
    d3.select(this).classed("region--selected", true);

    // Dispatch your custom event for others to listen
    window.dispatchEvent(new Event("regionChange"));
  });
});

// ==================== Body Map Tooltip ====================
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
          <div style="margin-top:4px">
            <span style="color:#1a6;"><b>Low Risk:</b> ${info.low}</span>
            <div style="font-size:13px; margin-left:0.7em; margin-bottom:0.5em; color:#446;">
              ${window.regionSurgeryDescriptions[info.low]}
            </div>
            <span style="color:#b10;"><b>High Risk:</b> ${info.high}</span>
            <div style="font-size:13px; margin-left:0.7em; color:#664;">
              ${window.regionSurgeryDescriptions[info.high]}
            </div>
          </div>
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

// ==================== Region Reset (optional) ====================
window.resetRegion = function() {
  window.selectedRegion = null;
  d3.selectAll("#body-map .region").classed("region--selected", false);
  window.dispatchEvent(new Event("regionChange"));
};
