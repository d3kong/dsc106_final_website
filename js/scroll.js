document.addEventListener('DOMContentLoaded', () => {

  /* ---------- slide navigation ---------- */
  const slide1 = document.getElementById('slide1');
  const slide2 = document.getElementById('slide2');
  const returnBtn = document.getElementById('returnBtn');

  function showSlide1(){slide2.classList.add('hidden');slide1.classList.remove('hidden')}
  function showSlide2(){slide1.classList.add('hidden');slide2.classList.remove('hidden')}

  slide1.addEventListener('click',showSlide2);
  document.addEventListener('keydown',e=>{
    if(e.code==='Space'&&!e.repeat&&!slide1.classList.contains('hidden')){
      e.preventDefault();showSlide2();
    }
  });
  returnBtn.addEventListener('click',e=>{e.stopPropagation();showSlide1()});

  /* ---------- body / viz toggle ---------- */
  const wrapper      = document.getElementById('wrapper');
  const bodyImg      = document.getElementById('bodyImg');
  const maximizeBtn  = document.getElementById('maximizeBtn');

  maximizeBtn.addEventListener('click',()=>wrapper.classList.add('wrapper-collapsed'));
  bodyImg   .addEventListener('click',()=>wrapper.classList.remove('wrapper-collapsed'));

});
