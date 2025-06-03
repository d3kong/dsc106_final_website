// main.js

document.addEventListener("DOMContentLoaded", () => {
  // 1) Set up IntersectionObserver for scrollytelling
  const sections = document.querySelectorAll(".visualization-section");

  const revealOnScroll = (entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }
    });
  };

  const observerOptions = {
    root: null,
    threshold: 0.5  // trigger when 50% of the section is visible
  };

  const observer = new IntersectionObserver(revealOnScroll, observerOptions);
  sections.forEach(section => observer.observe(section));

  // 2) Title‐slide → main‐app toggle
  const titleSlide = document.getElementById("title-slide");
  const mainApp    = document.getElementById("main-app");
  mainApp.style.display = "none";
  titleSlide.style.display = "flex";

  document.getElementById("enter-btn").onclick = () => {
    titleSlide.style.display = "none";
    mainApp.style.display = "flex";
  };
});


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

