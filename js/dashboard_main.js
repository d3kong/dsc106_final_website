// --------------------------------------------------------------------------------
// js/dashboard_main.js
// - Removed theme-switcher logic entirely
// - Handles body-map clicks and initial rendering of all three charts
// --------------------------------------------------------------------------------

// 1) Shared global for selected region:
window.selectedRegion = null;

// 2) Set up D3 click‐listeners on the body map:
d3.selectAll("#body-map .region")
  .on("click", function() {
    const clickedId = d3.select(this).attr("id");
    window.selectedRegion = clickedId;
    d3.selectAll("#body-map .region").classed("region--selected", false);
    d3.select(this).classed("region--selected", true);
    window.dispatchEvent(new Event("regionChange"));
  });

// 3) (Optional) Reset region if needed
window.resetRegion = function() {
  window.selectedRegion = null;
  d3.selectAll("#body-map .region").classed("region--selected", false);
  window.dispatchEvent(new Event("regionChange"));
};

// 4) On first load, render all three visualizations:
document.addEventListener("DOMContentLoaded", () => {
  renderTracyViz("#viz1");
  renderDanielViz("#viz2");
  renderKateViz("#viz3");
});

// 5) Whenever “regionChange” fires, re-render all three:
window.addEventListener("regionChange", () => {
  renderTracyViz("#viz1");
  renderDanielViz("#viz2");
  renderKateViz("#viz3");
});
