// main.js

window.selectedRegion = null; // Shared filter for body region

// Listen for region changes on body map
d3.selectAll("#body-map .region")
  .on("click", function() {
    const prev = window.selectedRegion;
    window.selectedRegion = this.id;
    d3.selectAll("#body-map .region").classed("region--selected", false);
    d3.select(this).classed("region--selected", true);
    // Dispatch a custom event
    window.dispatchEvent(new Event("regionChange"));
  });

// Allow external "reset" (optional)
window.resetRegion = function() {
  window.selectedRegion = null;
  d3.selectAll("#body-map .region").classed("region--selected", false);
  window.dispatchEvent(new Event("regionChange"));
}

// On load, render all 3 visualizations:
document.addEventListener("DOMContentLoaded", function() {
  renderTracyViz("#viz1");
  renderDanielViz("#viz2");
  renderKateViz("#viz3");
});

// On region change, update all 3
window.addEventListener("regionChange", function() {
  renderTracyViz("#viz1");
  renderDanielViz("#viz2");
  renderKateViz("#viz3");
});
