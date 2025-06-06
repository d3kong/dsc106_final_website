// document.addEventListener("DOMContentLoaded", () => {
//   // 1) Set up IntersectionObserver for scrollytelling
//   const sections = document.querySelectorAll(".visualization-section");

//   const revealOnScroll = (entries, observer) => {
//     entries.forEach(entry => {
//       if (entry.isIntersecting) {
//         const el = entry.target;
//         el.classList.add("visible");
//         observer.unobserve(el);

//         // Typewriter effect only on .story-section paragraphs
//         if (el.classList.contains("story-section")) {
//           const paragraphs = el.querySelectorAll("p");
//           paragraphs.forEach(p => {
//             const text = p.textContent;
//             typewriterEffect(p, text, 12); // adjust speed here
//           });
//         }
//       }
//     });
//   };

//   const observerOptions = {
//     root: null,
//     threshold: 0.5  // trigger when 50% of the section is visible
//   };

//   const observer = new IntersectionObserver(revealOnScroll, observerOptions);
//   sections.forEach(section => observer.observe(section));

//   // 2) Title‐slide → main‐app toggle
//   const titleSlide = document.getElementById("title-slide");
//   const mainApp    = document.getElementById("main-app");
//   mainApp.style.display = "none";
//   titleSlide.style.display = "flex";

//   document.getElementById("enter-btn").onclick = () => {
//     titleSlide.style.display = "none";
//     mainApp.style.display = "flex";
//   };

//   // --- THEME SELECT SETUP ---

//   const themeSelect = document.getElementById("theme-select");

//   function applyTheme(theme) {
//     if (theme === 'dark') {
//       document.body.classList.add('dark-mode');
//     } else if (theme === 'light') {
//       document.body.classList.remove('dark-mode');
//     } else if (theme === 'system') {
//       if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
//         document.body.classList.add('dark-mode');
//       } else {
//         document.body.classList.remove('dark-mode');
//       }
//     }
//   }

//   // Initialize theme from saved preference or default to system
//   let savedTheme = localStorage.getItem('theme') || 'system';
//   if (themeSelect) {
//     themeSelect.value = savedTheme;
//   }
//   applyTheme(savedTheme);

//   // Listen for dropdown changes
//   if (themeSelect) {
//     themeSelect.addEventListener('change', () => {
//       const selectedTheme = themeSelect.value;
//       localStorage.setItem('theme', selectedTheme);
//       applyTheme(selectedTheme);
//     });
//   }

//   // Listen for system theme changes (only if system mode is selected)
//   if (window.matchMedia) {
//     window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
//       if (themeSelect && themeSelect.value === 'system') {
//         applyTheme('system');
//       }
//     });
//   }
// });


// window.selectedRegion = null; // Shared filter for body region

// // Listen for region changes on body map
// d3.selectAll("#body-map .region")
//   .on("click", function() {
//     const prev = window.selectedRegion;
//     window.selectedRegion = this.id;
//     d3.selectAll("#body-map .region").classed("region--selected", false);
//     d3.select(this).classed("region--selected", true);
//     // Dispatch a custom event
//     window.dispatchEvent(new Event("regionChange"));
//   });

// // Allow external "reset" (optional)
// window.resetRegion = function() {
//   window.selectedRegion = null;
//   d3.selectAll("#body-map .region").classed("region--selected", false);
//   window.dispatchEvent(new Event("regionChange"));
// }

// // On load, render all 3 visualizations:
// document.addEventListener("DOMContentLoaded", function() {
//   renderTracyViz("#viz1");
//   renderDanielViz("#viz2");
//   renderKateViz("#viz3");
// });

// // On region change, update all 3
// window.addEventListener("regionChange", function() {
//   renderTracyViz("#viz1");
//   renderDanielViz("#viz2");
//   renderKateViz("#viz3");
// });


// function typewriterEffect(element, text, delay = 5) {
//   if (element.dataset.typed === "true") return;
//   element.textContent = '';
//   let i = 0;
//   function type() {
//     if (i < text.length) {
//       element.textContent += text.charAt(i);
//       i++;
//       setTimeout(type, delay);
//     }
//   }
//   type();
// }

// let t = 0;
// const maxMove = 20; // max pixel movement

// function animatePupils() {
//   // Use sine and cosine for smooth, looped motion
//   const moveX = maxMove * Math.sin(t);

//   d3.select("#pupil-left")
//     .attr("cx", 12 + moveX);

//   d3.select("#pupil-right")
//     .attr("cx", 137 + moveX);

//   t += 0.03; // speed of oscillation
//   requestAnimationFrame(animatePupils);
// }

// animatePupils(); // Start the loop

document.addEventListener("DOMContentLoaded", () => {
  // 1) Set up IntersectionObserver for scrollytelling
  const sections = document.querySelectorAll(".visualization-section");

  const revealOnScroll = (entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        el.classList.add("visible");
        observer.unobserve(el);

        // Typewriter effect on story-section paragraphs
        if (el.classList.contains("story-section")) {
          const paragraphs = el.querySelectorAll("p");
          paragraphs.forEach(p => {
            const text = p.textContent;
            typewriterEffect(p, text, 12); // adjust speed here
          });
        }
      }
    });
  };

  const observerOptions = {
    root: null,
    threshold: 0.5 // trigger when 50% of the section is visible
  };

  const observer = new IntersectionObserver(revealOnScroll, observerOptions);
  sections.forEach(section => observer.observe(section));

  // 2) Title-slide → main-app toggle
  const titleSlide = document.getElementById("title-slide");
  const mainApp    = document.getElementById("main-app");
  mainApp.style.display = "none";
  titleSlide.style.display = "flex";

  document.getElementById("enter-btn").onclick = () => {
    titleSlide.style.display = "none";
    mainApp.style.display = "flex";
  };

  // --- THEME SELECT SETUP (unchanged) ---
  const themeSelect = document.getElementById("theme-select");
  function applyTheme(theme) {
    if (theme === 'dark') {
      document.body.classList.add('dark-mode');
    } else if (theme === 'light') {
      document.body.classList.remove('dark-mode');
    } else if (theme === 'system') {
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.body.classList.add('dark-mode');
      } else {
        document.body.classList.remove('dark-mode');
      }
    }
  }
  let savedTheme = localStorage.getItem('theme') || 'system';
  if (themeSelect) themeSelect.value = savedTheme;
  applyTheme(savedTheme);
  if (themeSelect) {
    themeSelect.addEventListener('change', () => {
      const selectedTheme = themeSelect.value;
      localStorage.setItem('theme', selectedTheme);
      applyTheme(selectedTheme);
    });
  }
  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
      if (themeSelect && themeSelect.value === 'system') {
        applyTheme('system');
      }
    });
  }
}); // end DOMContentLoaded

// Keep your body‐map click logic as-is
window.selectedRegion = null; 

d3.selectAll("#body-map .region")
  .on("click", function() {
    const prev = window.selectedRegion;
    window.selectedRegion = this.id;
    d3.selectAll("#body-map .region").classed("region--selected", false);
    d3.select(this).classed("region--selected", true);
    window.dispatchEvent(new Event("regionChange"));
  });

window.resetRegion = function() {
  window.selectedRegion = null;
  d3.selectAll("#body-map .region").classed("region--selected", false);
  window.dispatchEvent(new Event("regionChange"));
};

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

function typewriterEffect(element, text, delay = 5) {
  if (element.dataset.typed === "true") return;
  element.textContent = '';
  element.dataset.typed = "true";
  let i = 0;
  function type() {
    if (i < text.length) {
      element.textContent += text.charAt(i);
      i++;
      setTimeout(type, delay);
    }
  }
  type();
}

let t = 0;
const maxMove = 20; // max pixel movement
function animatePupils() {
  const moveX = maxMove * Math.sin(t);
  d3.select("#pupil-left").attr("cx", 12 + moveX);
  d3.select("#pupil-right").attr("cx", 137 + moveX);
  t += 0.03; 
  requestAnimationFrame(animatePupils);
}
animatePupils();
