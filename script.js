document.addEventListener('DOMContentLoaded', () => {
    const slide1 = document.getElementById('slide1');
    const slide2 = document.getElementById('slide2');
    const returnBtn = document.getElementById('returnBtn');
  
    function goToNextSlide() {
      slide1.classList.add('hidden');
      slide2.classList.remove('hidden');
    }
  
    function returnToFirstSlide() {
      slide2.classList.add('hidden');
      slide1.classList.remove('hidden');
    }
  
    document.addEventListener('keydown', (e) => {
      if (e.code === 'Space') {
        goToNextSlide();
      }
    });
  
    document.addEventListener('click', () => {
      if (!slide1.classList.contains('hidden')) {
        goToNextSlide();
      }
    });
  
    returnBtn.addEventListener('click', (e) => {
      e.stopPropagation(); // prevent accidental slide advance
      returnToFirstSlide();
    });
  });
  