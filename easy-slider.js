class EasySlider {
  activeIndex = 0;
  loop = false;

  width;
  height;

  constructor(sliderElem, sliderWrapper, config) {
    if (!(sliderElem instanceof Element))
      throw Error("sliderElem не является DOM элементом");
    if (!(sliderWrapper instanceof Element))
      throw Error("sliderWrapper не является DOM элементом");
    this._validate_config(config);

    this.sliderElem = sliderElem;
    this.sliderWrapper = sliderWrapper;
    this.config = config;

    this.init();
  }

  init() {
    this._init_config_props(this.config);
    this._resize_observer(this.sliderElem, (width, height) => {
      document.querySelector("#debug").innerHTML = `${width}px ${height}px`;
      this.width = width;
      this.height = height;
      this._calc_place(width);
    });
  }

  call_handler(handler_name) {}

  _init_config_props(config) {
    // Navigation
    if (
      Object.hasOwn(config, "navigation") &&
      typeof config.navigation === "object"
    ) {
      if (
        Object.hasOwn(config.navigation, "nextEl") &&
        config.navigation.nextEl instanceof Element
      ) {
        this.config.navigation.nextEl.addEventListener("click", () => {
          this.activeIndex += 1;
          this._calc_place(this.width);
        });
      }

      if (
        Object.hasOwn(config.navigation, "prevEl") &&
        config.navigation.prevEl instanceof Element
      ) {
        this.config.navigation.prevEl.addEventListener("click", () => {
          this.activeIndex -= 1;
          this._calc_place(this.width);
        });
      }
    }

    // Autoplay
    if (Object.hasOwn(config, "autoplay")) {
      let direct = -1;
      let delay = 5000;

      if (typeof config.autoplay !== "boolean") {
        if (
          Object.hasOwn(config.autoplay, "delay") &&
          typeof config.autoplay.delay === "number"
        ) {
          delay = config.autoplay.delay;
        }

        if (
          Object.hasOwn(config.autoplay, "direct") &&
          typeof config.autoplay.direct === "number"
        ) {
          direct = config.autoplay.direct;
        }
      }

      this._init_autoplay(delay, direct);
    }

    // Keyboard
    if (
      Object.hasOwn(config, "keyboard") &&
      typeof config.keyboard === "boolean" &&
      config.keyboard
    )
      this._base_keyboard_handlers();

    // HashNavigation
    if (
      Object.hasOwn(config, "hashNavigation") &&
      typeof config.hashNavigation === "boolean" &&
      config.hashNavigation
    )
      this._init_hash_navigation();

    // Loop
    if (Object.hasOwn(config, "loop") && typeof config.loop === "boolean")
      this.loop = config.loop;
  }

  _validate_config(config) {
    if (typeof config !== "object") throw Error("config не является объектом");

    // navigation
    if (
      Object.hasOwn(config, "navigation") &&
      typeof config.navigation !== "object"
    )
      throw Error("navigation не является объектом");

    if (
      Object.hasOwn(config, "navigation") &&
      typeof config.navigation === "object"
    ) {
      if (
        Object.hasOwn(config.navigation, "nextEl") &&
        !(config.navigation.nextEl instanceof Element)
      )
        throw Error("nextEl не является DOM элементом");

      if (
        Object.hasOwn(config.navigation, "prevEl") &&
        !(config.navigation.prevEl instanceof Element)
      )
        throw Error("prevEl не является DOM элементом");
    }

    // autoplay
    if (
      Object.hasOwn(config, "autoplay") &&
      !(
        typeof config.autoplay === "boolean" ||
        typeof config.autoplay === "object"
      )
    )
      throw Error("Параметр autoplay задан неправильно");

    if (
      Object.hasOwn(config, "autoplay") &&
      typeof config.autoplay === "object"
    ) {
      if (
        Object.hasOwn(config.autoplay, "delay") &&
        typeof config.autoplay.delay !== "number"
      )
        throw Error("Параметр autoplay.delay задан неправильно");

      if (
        Object.hasOwn(config.autoplay, "direct") &&
        !(config.autoplay.direct === -1 || config.autoplay.direct === 1)
      )
        throw Error("Параметр autoplay.direct может быть только 1 или -1");
    }

    // spaceBetween
    if (
      Object.hasOwn(config, "spaceBetween") &&
      typeof config.spaceBetween !== "number"
    )
      throw Error("Параметр spaceBetween должен быть числом");

    // slidesPerView
    if (
      Object.hasOwn(config, "slidesPerView") &&
      typeof config.spaceBetween !== "number"
    )
      throw Error("Параметр slidesPerView должен быть числом");

    // keyboard
    if (
      Object.hasOwn(config, "keyboard") &&
      typeof config.keyboard !== "boolean"
    )
      throw Error("Keyboard должен быть boolean");

    // hashNavigation
    if (
      Object.hasOwn(config, "hashNavigation") &&
      typeof config.hashNavigation !== "boolean"
    )
      throw Error("hashNavigation должен быть boolean");

    // breakpoints
    if (
      Object.hasOwn(config, "breakpoints") &&
      typeof config.breakpoints !== "object"
    )
      throw Error("breakpoints должен быть объектом");

    if (
      Object.hasOwn(config, "breakpoints") &&
      typeof config.breakpoints === "object"
    ) {
      for (const [key, value] of Object.entries(config.breakpoints)) {
        if (typeof parseInt(key) !== "number")
          throw Error(`Breakpoints Ключ ${key} не является числом`);

        if (
          Object.hasOwn(value, "slidesPerView") &&
          typeof value.slidesPerView !== "number"
        )
          throw Error(
            `Breakpoints Ключ ${key} slidesPerView не является числом`,
          );

        if (
          Object.hasOwn(value, "spaceBetween") &&
          typeof value.spaceBetween !== "number"
        )
          throw Error(
            `Breakpoints Ключ ${key} spaceBetween не является числом`,
          );

        if (Object.hasOwn(value, "class") && typeof value.class !== "string")
          throw Error(`Breakpoints Ключ ${key} class не является строкой`);
      }
    }

    // free mode
    if (
      Object.hasOwn(config, "freemode") &&
      typeof config.freemode !== "boolean"
    )
      throw Error("freemode должен быть boolean");

    // loop
    if (Object.hasOwn(config, "loop") && typeof config.loop !== "boolean")
      throw Error("loop должен быть boolean");

    // debug
    if (Object.hasOwn(config, "debug") && typeof config.debug !== "boolean")
      throw Error("debug должен быть boolean");
  }

  // Вызов функций для изменения состояния слайдера

  _init_autoplay(delay, direct) {
    setInterval(() => {
      this.activeIndex += direct;
      this._calc_place(this.width);
    }, delay);
  }

  _base_keyboard_handlers() {
    // navigation on arrows
    document.addEventListener("keydown", (e) => {
      if (e.code === "ArrowLeft") this.activeIndex -= 1;
      if (e.code === "ArrowRight") this.activeIndex += 1;
      this._calc_place(this.width);
    });
  }

  _init_hash_navigation() {
    const hash = window.location.hash.replace("#", "");
    const hash_prefix = "slide";

    const slides = this.sliderWrapper.querySelectorAll(".slide");
    slides.forEach((el, index) => {
      const slideHash = hash_prefix + (index + 1);
      el.dataset.hash = slideHash;
      if (slideHash === hash) {
        this.activeIndex = index;
      }
    });
  }

  _get_breakpoint_settings(width) {
    const breakpoints = this.config.breakpoints;

    const entries = Object.entries(breakpoints).sort(
      ([a], [b]) => Number(a) - Number(b),
    );

    for (const [key, value] of entries) {
      const breakpoint = Number(key);

      if (width <= breakpoint) {
        return value;
      }
    }

    return undefined;
  }

  _calc_place(width) {
    let slides = this.sliderWrapper.querySelectorAll(".slide");

    let spaceBetween = this.config.spaceBetween || 0;
    let slidesPerView = this.config.slidesPerView || 1;
    let activeClass = ""; 


    const breakpoint = this._get_breakpoint_settings(width);
    if (breakpoint) {
      spaceBetween = breakpoint.spaceBetween;
      slidesPerView = breakpoint.slidesPerView;
      activeClass = breakpoint.class;
    }

    if (this.activeIndex < 0) {
      this.activeIndex = 0;

      if (this.loop) {
        const element = slides[slides.length - 1];
        this.sliderWrapper.prepend(element);
        this.sliderWrapper.style.transition = "none";
        this.sliderWrapper.style.transform = `translateX(-${width}px)`;
      }
    }

    if (this.activeIndex > slides.length - 1) {
      this.activeIndex = slides.length - 1;

      if (this.loop) {
        this.sliderWrapper.append(slides[0]);
        this.sliderWrapper.style.transition = "none";
        this.sliderWrapper.style.transform = `tra_calc_placenslateX(-${(this.activeIndex - 1) * (width + spaceBetween)}px)`;
      }
    }

    setTimeout(() => {
      this.sliderWrapper.style.transition = "transform 0.3s";
      const xPos = this.activeIndex * (width + spaceBetween);
      this.sliderWrapper.style.transform = `translateX(-${xPos}px)`;
    }, 0);

    slides = this.sliderWrapper.querySelectorAll(".slide");

    const hash = Object.values(slides)[this.activeIndex].dataset.hash;
    if (hash) window.location.hash = hash;

    slides.forEach((el) => {
      el.className = "slide";
      el.style.marginRight = `${spaceBetween}px`;
      el.style.flex = `0 0 ${width}px`;
    });
  }

  _resize_observer(element, callback) {
    new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        callback(width, height);
      }
    }).observe(element);
  }
}
