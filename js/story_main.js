document.addEventListener("DOMContentLoaded", () => {
  const titleSlide         = document.getElementById("title-slide");
  const narrativeContainer = document.getElementById("narrative-container");
  const enterBtn           = document.getElementById("enter-btn");
  const tryBtn             = document.getElementById("try-btn");
  const backBtn            = document.getElementById('back-btn');

  // Prepare sections and paragraphs
  const sections = Array.from(document.querySelectorAll(".visualization-section.story-section"));
  const observerOptions = { root: null, threshold: 0.6 };

  // Wrap each paragraph in faded + typing spans
  sections.forEach(section => {
    section.querySelectorAll("p").forEach(p => {
      const fullText = p.textContent;
      p.dataset.fullText = fullText;
      p.dataset.typed = "false";
      // insert faded and typing layers
      p.innerHTML = `
        <span class="faded-text">${fullText}</span>
        <span class="typing-text"></span>
      `;
    });
  });

  // Typing function targeting the overlay span
  function typeParagraphSequential(paragraphs, idx) {
    if (idx >= paragraphs.length) return;
    const p = paragraphs[idx];
    if (p.dataset.typed === "true") {
      return typeParagraphSequential(paragraphs, idx + 1);
    }
    const typer = p.querySelector('.typing-text');
    typer.textContent = '';
    let i = 0;
    const fullText = p.dataset.fullText;
    function typeChar() {
      if (i < fullText.length) {
        typer.textContent += fullText.charAt(i);
        i++;
        setTimeout(typeChar, 13 + Math.random() * 16);
      } else {
        p.dataset.typed = "true";
        typeParagraphSequential(paragraphs, idx + 1);
      }
    }
    typeChar();
  }

  // IntersectionObserver setup
  function handleTyping(entry) {
    const el = entry.target;
    if (el.dataset.typedStarted === "true") return;
    el.dataset.typedStarted = "true";
    const paragraphs = Array.from(el.querySelectorAll("p"));
    typeParagraphSequential(paragraphs, 0);
  }
  const revealOnScroll = (entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
        if (entry.target.classList.contains("story-section")) {
          handleTyping(entry);
        }
      }
    });
  };
  const observer = new IntersectionObserver(revealOnScroll, observerOptions);
  sections.forEach(section => observer.observe(section));

  // Hide narrative initially (unless query param)
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('view') === 'narrative') {
    titleSlide.style.display = 'none';
    narrativeContainer.style.display = 'flex';
  } else {
    narrativeContainer.style.display = 'none';
  }

  // Button handlers
  backBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    narrativeContainer.style.display = 'none';
    titleSlide.style.display      = 'flex';
    // reset typing
    sections.forEach(section => {
      section.querySelectorAll('p').forEach(p => {
        p.dataset.typed = 'false';
        delete p.dataset.typedStarted;
        // clear typing-text
        p.querySelector('.typing-text').textContent = '';
      });
      section.classList.remove('visible');
      observer.observe(section);
    });
  });

  enterBtn.addEventListener("click", () => {
    titleSlide.style.display = "none";
    narrativeContainer.style.display = "flex";
  });

  if (tryBtn) {
    tryBtn.addEventListener("click", () => {
      window.location.href = "dashboard.html";
    });
  }

  // Pupil Animation (unchanged)
  animatePupils();
});

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
