document.addEventListener("DOMContentLoaded", () => {
  const titleSlide         = document.getElementById("title-slide");
  const narrativeContainer = document.getElementById("narrative-container");
  const enterBtn           = document.getElementById("enter-btn");
  const tryBtn             = document.getElementById("try-btn");

  // Hide narrative at first
  narrativeContainer.style.display = "none";

  // “Enter Story” hides title + shows narrative
  enterBtn.addEventListener("click", () => {
    titleSlide.style.display = "none";
    narrativeContainer.style.display = "flex";
  });

  // Set up observer for story sections
  const sections = Array.from(document.querySelectorAll(".visualization-section.story-section"));
  const observerOptions = { root: null, threshold: 0.6 };

  // Store the *real* text of each paragraph as data attribute, and set paragraphs blank
  sections.forEach(section => {
    section.querySelectorAll("p").forEach(p => {
      if (!p.dataset.fullText) p.dataset.fullText = p.textContent;
      p.textContent = ""; // always start blank until typed!
      p.dataset.typed = "false";
    });
  });

  // Type each paragraph in order, only start the next when finished
  function typeParagraphSequential(paragraphs, idx) {
    if (idx >= paragraphs.length) return;
    const p = paragraphs[idx];
    // Only type if not already typed
    if (p.dataset.typed === "true") {
      typeParagraphSequential(paragraphs, idx + 1);
      return;
    }
    p.textContent = ""; // start blank
    let i = 0;
    const fullText = p.dataset.fullText;
    function typeChar() {
      if (i < fullText.length) {
        p.textContent += fullText.charAt(i);
        i++;
        setTimeout(typeChar, 13 + Math.random() * 16); // tweak speed as needed
      } else {
        p.dataset.typed = "true";
        typeParagraphSequential(paragraphs, idx + 1); // go to next paragraph
      }
    }
    typeChar();
  }

  // Only run the typing ONCE per section
  function handleTyping(entry) {
    const el = entry.target;
    if (el.dataset.typedStarted === "true") return;
    el.dataset.typedStarted = "true";
    const paragraphs = Array.from(el.querySelectorAll("p"));
    typeParagraphSequential(paragraphs, 0);
  }

  // IntersectionObserver for typewriter + fade-in
  const revealOnScroll = (entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        el.classList.add("visible");
        observer.unobserve(el);
        if (el.classList.contains("story-section")) {
          handleTyping(entry);
        }
      }
    });
  };
  const observer = new IntersectionObserver(revealOnScroll, observerOptions);
  sections.forEach(section => observer.observe(section));

  // “Try It Yourself” button → dashboard
  if (tryBtn) {
    tryBtn.addEventListener("click", () => {
      window.location.href = "dashboard.html";
    });
  }

  // Pupil Animation
  animatePupils();
});

// Pupil Animation (unchanged)
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
