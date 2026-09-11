const init = () => {
  const sliderElem = document.querySelector(".slider");
  const sliderWrapper = document.querySelector(".slider > .slider-wrapper");

  const slider = new EasySlider(sliderElem, sliderWrapper, {
    spaceBetween: 20,
    slidesPerView: 1,
    navigation: {
      nextEl: document.querySelector("#slider-next"), 
      prevEl: document.querySelector("#slider-prev"),
    },
    autoplay: {
      delay: 4000,
      direct: 1,
    },
    keyboard: true,
    hashNavigation: true,
    loop: true,
    breakpoints: {
      768: {
        spaceBetween: 5
      }
    },
    allowTouchMove: true,
    freemode: false,
  });
};

document.addEventListener("DOMContentLoaded", init);
