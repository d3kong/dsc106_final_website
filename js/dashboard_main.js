// --------------------------------------------------------------------------------
// js/dashboard_main.js
// Surgery grouping for region-based filtering in all charts
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
// --------------------------------------------------------------------------------

window.selectedRegion = null;

d3.selectAll("#body-map .region")
  .on("click", function() {
    const clickedId = d3.select(this).attr("id");
    window.selectedRegion = clickedId;
    d3.selectAll("#body-map .region").classed("region--selected", false);
    d3.select(this).classed("region--selected", true);
    window.dispatchEvent(new Event("regionChange"));
  });

window.resetRegion = function() {
  window.selectedRegion = null;
  d3.selectAll("#body-map .region").classed("region--selected", false);
  window.dispatchEvent(new Event("regionChange"));
};

document.addEventListener("DOMContentLoaded", () => {
  renderTracyViz("#viz1");
  renderDanielViz("#viz2");
  renderKateViz("#viz3");
});

window.addEventListener("regionChange", () => {
  renderTracyViz("#viz1");
  renderDanielViz("#viz2");
  renderKateViz("#viz3");
});
