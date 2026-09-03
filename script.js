const init = () => {
  const sliderElem = document.querySelector(".slider");
  const sliderWrapper = document.querySelector(".slider > .slider-wrapper");

  const slider = new EasySlider(sliderElem, sliderWrapper, {
    spaceBetween: 100,
    // slidesPerView
    navigation: {
      nextEl: document.querySelector("#slider-next"), 
      prevEl: document.querySelector("#slider-prev"),
    },
    // autoplay: {
    //   delay: 1000,
    //   direct: 1,
    // },
    keyboard: true,
    hashNavigation: false,
    loop: true,
    breakpoints: {
      768: {
        spaceBetween: 5
      }
    }
    // debug
  });
};

/*
У меня появилась идея насчёт колбеков, т.е. keyboard будет по сути callback, который возвращает конфигурацию слайдера, за счёт
чего можно гибко настроить управление с клавиатуры.
*/

/*
Было бы прикольно сделать систему полностью модульной.
Допустим выкинуть breakpoint, virtualslides, hashNavigation, freemode 
*/

document.addEventListener("DOMContentLoaded", init);
