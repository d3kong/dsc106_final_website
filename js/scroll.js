document.addEventListener('DOMContentLoaded', () => {

  /* ---------- slide navigation ---------- */
  const slide1   = document.getElementById('slide1');
  const slide2   = document.getElementById('slide2');
  const returnBtn = document.getElementById('returnBtn');

  function showSlide1() {
    slide2.classList.add('hidden');
    slide1.classList.remove('hidden');
  }
  function showSlide2() {
    slide1.classList.add('hidden');
    slide2.classList.remove('hidden');
  }

  // Advance to Slide 2 only when clicking outside of region elements
  slide1.addEventListener('click', e => {
    if (e.target.closest('.region')) return;
    showSlide2();
  });

  // Spacebar also advances when on Slide 1
  document.addEventListener('keydown', e => {
    if (e.code === 'Space' && !e.repeat && !slide1.classList.contains('hidden')) {
      e.preventDefault();
      showSlide2();
    }
  });

  // Return button goes back to Slide 1 (if present)
  if (returnBtn) {
    returnBtn.addEventListener('click', e => {
      e.stopPropagation();
      showSlide1();
    });
  }

  /* ---------- body / viz toggle (maximise/minimise) ---------- */
  const wrapper     = document.getElementById('wrapper');
  const bodyImg     = document.getElementById('bodyImg');
  const maximizeBtn = document.getElementById('maximizeBtn');

  if (maximizeBtn && wrapper) {
    maximizeBtn.addEventListener('click', () => wrapper.classList.add('wrapper-collapsed'));
  }
  if (bodyImg && wrapper) {
    bodyImg.addEventListener('click',   () => wrapper.classList.remove('wrapper-collapsed'));
  }

});