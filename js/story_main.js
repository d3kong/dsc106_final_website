// --------------------------------------------------------------------------------
// js/story_main.js
// Handles: 
//   • “Enter Story” button → hide title slide, show narrative 
//   • IntersectionObserver + typewriter effect for each story section
//   • “Try It Yourself” button → navigate to dashboard.html
//   • Pupil animation (no theme‐toggle code)
// --------------------------------------------------------------------------------

document.addEventListener("DOMContentLoaded", () => {
  // 1) Grab references
  const titleSlide         = document.getElementById("title-slide");
  const narrativeContainer = document.getElementById("narrative-container");
  const enterBtn           = document.getElementById("enter-btn");
  const tryBtn             = document.getElementById("try-btn");

  // 2) “Enter Story” hides title + shows narrative
  enterBtn.addEventListener("click", () => {
    titleSlide.style.display = "none";
    narrativeContainer.style.display = "flex";
  });

  // 3) IntersectionObserver for typewriter + fade-in
  const sections = document.querySelectorAll(".visualization-section");
  const observerOptions = { root: null, threshold: 0.5 };

  const revealOnScroll = (entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        el.classList.add("visible");
        observer.unobserve(el);

        if (el.classList.contains("story-section")) {
          const paragraphs = el.querySelectorAll("p");
          paragraphs.forEach(p => {
            typewriterEffect(p, p.textContent, 12);
          });
        }
      }
    });
  };

  const observer = new IntersectionObserver(revealOnScroll, observerOptions);
  sections.forEach(section => observer.observe(section));

  // 4) “Try It Yourself” button → navigate to dashboard.html
  tryBtn.addEventListener("click", () => {
    window.location.href = "dashboard.html";
  });

  // 5) Start pupil animation
  animatePupils();
});

// ───── Typewriter Effect ─────
function typewriterEffect(element, fullText, delay = 5) {
  if (element.dataset.typed === "true") return;
  element.dataset.typed = "true";
  element.textContent = "";
  let i = 0;
  function type() {
    if (i < fullText.length) {
      element.textContent += fullText.charAt(i);
      i++;
      setTimeout(type, delay);
    }
  }
  type();
}

// ───── Pupil Animation ─────
let t = 0;
const maxMove = 20; // max pixel movement

function animatePupils() {
  const moveX = maxMove * Math.sin(t);
  d3.select("#pupil-left").attr("cx", 12 + moveX);
  d3.select("#pupil-right").attr("cx", 137 + moveX);
  t += 0.03; // speed of oscillation
  requestAnimationFrame(animatePupils);
}
