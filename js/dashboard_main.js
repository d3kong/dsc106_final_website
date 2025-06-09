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

document.addEventListener("DOMContentLoaded", function() {
  // Overlay logic (unchanged)
  const overlay   = document.getElementById("center-overlay");
  const dashboard = document.getElementById("main-app");
  const restart   = document.getElementById("restart-btn");
  const regionMap = {
    center_head_neck: 'head_neck',
    center_thorax: 'thorax',
    center_abdomen: 'abdomen',
    center_pelvis: 'pelvis'
  };

  // Overlay region select
  if (overlay && dashboard) {
    document.querySelectorAll('#overlay-body-map .region').forEach(region => {
      region.addEventListener('click', function() {
        const rId = regionMap[this.id];
        if (rId) {
          window.selectedRegion = rId;
          overlay.classList.add('hide');
          setTimeout(() => {
            overlay.style.display = 'none';
            dashboard.classList.add('show');
            setTimeout(() => {
              d3.selectAll("#body-map .region").classed("region--selected", false);
              d3.select(`#body-map .region#${rId}`).classed("region--selected", true);
              window.dispatchEvent(new Event("regionChange"));
              // Set pinned tooltip
              showPinnedTooltip(rId);
            }, 200);
          }, 700);
        }
      });
    });
    // Restart
    if (restart) {
      restart.addEventListener('click', function() {
        window.selectedRegion = null;
        dashboard.classList.remove('show');
        setTimeout(() => {
          overlay.style.display = 'flex';
          setTimeout(() => {
            overlay.classList.remove('hide');
            d3.selectAll("#body-map .region").classed("region--selected", false);
            window.dispatchEvent(new Event("regionChange"));
            hidePinnedTooltip();
          }, 60);
        }, 700);
      });
    }
  }

  // Main (left) region select
  d3.selectAll("#body-map .region").on("click", function() {
    const regionKey = normalizeRegionID(this.id);
    window.selectedRegion = regionKey;
    d3.selectAll("#body-map .region").classed("region--selected", false);
    d3.select(this).classed("region--selected", true);
    window.dispatchEvent(new Event("regionChange"));
    // Show pinned tooltip
    showPinnedTooltip(regionKey);
  });

  // ---- Tooltips for both body maps (hover) ----
  function setupBodymapTooltip(svgSelector, idPrefix='') {
    let tooltip = d3.select("body").select(".bodymap-tooltip.floating-tooltip");
    if (tooltip.empty()) {
      tooltip = d3.select("body")
        .append("div")
        .attr("class", "bodymap-tooltip floating-tooltip")
        .style("display", "none");
    }
    const tooltipData = regionTooltipInfo;
    d3.selectAll(svgSelector + " .region")
      .on("mouseover", function(event) {
        let reg = this.id.replace(idPrefix, '');
        let info = tooltipData[reg];
        if (info) {
          tooltip
            .style("display", "block")
            .html(`
              <strong>${info.label}</strong><br>
              <span style="color:#CC5500; font-size:14px;"><b>Low Risk:</b> ${info.low}</span>
              <div style="font-size:13px; margin-left:0.7em; margin-bottom:0.5em; color:#964308;">
                ${window.regionSurgeryDescriptions[info.low]}
              </div>
              <span style="color:#4682B4; font-size:14px;"><b>High Risk:</b> ${info.high}</span>
              <div style="font-size:13px; margin-left:0.7em; color:#21527A;">
                ${window.regionSurgeryDescriptions[info.high]}
              </div>
            `);
        }
      })
      .on("mousemove", function(event) {
        tooltip
          .style("left", (event.pageX + 16) + "px")
          .style("top", (event.pageY - 12) + "px");
      })
      .on("mouseout", function() {
        tooltip.style("display", "none");
      });
  }
  setupBodymapTooltip("#overlay-body-map", "center_");
  setupBodymapTooltip("#body-map", "");

  // -------- Pinned Tooltip --------
  const pinnedTooltip = document.getElementById('pinned-tooltip');
  function showPinnedTooltip(regionKey) {
    const info = regionTooltipInfo[regionKey];
    if (info && pinnedTooltip) {
      pinnedTooltip.style.display = 'block';
      pinnedTooltip.innerHTML = `
        <strong>${info.label}</strong><br>
        <span style="color:#CC5500; font-size:14px;"><b>Low Risk: ${info.low}</b></span>
        <div style="font-size:13px; margin-left:0.7em; margin-bottom:0.5em; color:#446;">
          ${window.regionSurgeryDescriptions[info.low]}
        </div>
        <span style="color:#4682B4; font-size:14px;"><b>High Risk: ${info.high}</b></span>
        <div style="font-size:13px; margin-left:0.7em; color:#664;">
          ${window.regionSurgeryDescriptions[info.high]}
        </div>
      `;
      pinnedTooltip.style.opacity = 0;
      setTimeout(() => { pinnedTooltip.style.opacity = 1; }, 10);
    } else if (pinnedTooltip) {
      pinnedTooltip.style.display = 'none';
    }
  }
  function hidePinnedTooltip() {
    if (pinnedTooltip) pinnedTooltip.style.display = 'none';
  }

  // Optionally show pinned tooltip for initial selection
  if (window.selectedRegion) showPinnedTooltip(window.selectedRegion);

  // Back button logic
  const backBtn = document.getElementById('back-btn');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      window.location.href = 'index.html?view=narrative';
    });
  }
});

// ==================== Helpers ====================
function normalizeRegionID(id) {
  const regionMap = {
    center_head_neck: 'head_neck',
    center_thorax: 'thorax',
    center_abdomen: 'abdomen',
    center_pelvis: 'pelvis'
  };
  return regionMap[id] || id;
}

window.resetRegion = function() {
  window.selectedRegion = null;
  d3.selectAll("#body-map .region").classed("region--selected", false);
  window.dispatchEvent(new Event("regionChange"));
  const pinnedTooltip = document.getElementById('pinned-tooltip');
  if (pinnedTooltip) pinnedTooltip.style.display = 'none';
};
