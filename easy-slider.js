// 1. Загрзука стилей для слайдера
const EASY_SLIDER_STYLES = `
.slider {
    position: relative;
    overflow: hidden;
    display: flex;
}

.slider-wrapper {
    display: flex;
    flex: 1;
    will-change: transform;
    touch-action: none;
    user-select: none;
}

.slide {
    flex: 0 0 100%;
    height: 100%;
}
`;

const loadEasySliderCSSStyle = () => {
  if (typeof document === "undefined") return;
  if (document.getElementById("easy-slider-styles")) return;

  const style = document.createElement("style");
  style.id = "easy-slider-styles";
  style.textContent = EASY_SLIDER_STYLES;
  document.head.appendChild(style);
};

loadEasySliderCSSStyle();

// 2. Класс для валидация входящей конфигурации
class SliderConfig {
  static DEFAULTS = {
    spaceBetween: 0,
    slidesPerView: 1,
    loop: false,
    allowTouchMove: true,
    keyboard: false,
    hashNavigation: false,
    freemode: false,
    debug: false,
  };

  constructor(rawConfig = {}) {
    this._assertPlainObject(rawConfig, "config");
    this._validate(rawConfig);

    Object.assign(this, SliderConfig.DEFAULTS);
    for (const [key, value] of Object.entries(rawConfig)) {
      if (this._has(SliderConfig.DEFAULTS, key)) this[key] = value;
    }

    this.navigation = this._normalizeNavigation(rawConfig.navigation);
    this.autoplay = this._normalizeAutoplay(rawConfig.autoplay);
    this.breakpoints = this._normalizeBreakpoints(rawConfig.breakpoints);
  }

  resolveBreakpoint(width) {
    const entries = Object.entries(this.breakpoints).sort(
      ([a], [b]) => Number(a) - Number(b),
    );

    for (const [key, value] of entries) {
      if (width <= Number(key)) return value;
    }

    return undefined;
  }

  _has(object, key) {
    return Object.hasOwn(object, key);
  }

  _assertPlainObject(value, name) {
    if (value === null || typeof value !== "object" || Array.isArray(value))
      throw Error(`${name} не является объектом`);
  }

  _validate(config) {
    if (this._has(config, "navigation"))
      this._validateNavigation(config.navigation);

    if (this._has(config, "autoplay")) this._validateAutoplay(config.autoplay);

    if (
      this._has(config, "spaceBetween") &&
      typeof config.spaceBetween !== "number"
    )
      throw Error("Параметр spaceBetween должен быть числом");

    if (
      this._has(config, "slidesPerView") &&
      typeof config.slidesPerView !== "number"
    )
      throw Error("Параметр slidesPerView должен быть числом");

    for (const key of [
      "keyboard",
      "hashNavigation",
      "loop",
      "debug",
      "allowTouchMove",
      "freemode",
    ]) {
      if (this._has(config, key) && typeof config[key] !== "boolean")
        throw Error(`Параметр ${key} должен быть boolean`);
    }

    if (this._has(config, "breakpoints"))
      this._validateBreakpoints(config.breakpoints);
  }

  _validateNavigation(navigation) {
    this._assertPlainObject(navigation, "navigation");

    if (
      this._has(navigation, "nextEl") &&
      !(navigation.nextEl instanceof Element)
    )
      throw Error("nextEl не является DOM элементом");

    if (
      this._has(navigation, "prevEl") &&
      !(navigation.prevEl instanceof Element)
    )
      throw Error("prevEl не является DOM элементом");
  }

  _validateAutoplay(autoplay) {
    if (typeof autoplay === "boolean") return;

    this._assertPlainObject(autoplay, "autoplay");

    if (this._has(autoplay, "delay") && typeof autoplay.delay !== "number")
      throw Error("Параметр autoplay.delay задан неправильно");

    if (
      this._has(autoplay, "direct") &&
      autoplay.direct !== 1 &&
      autoplay.direct !== -1
    )
      throw Error("Параметр autoplay.direct может быть только 1 или -1");
  }

  _validateBreakpoints(breakpoints) {
    this._assertPlainObject(breakpoints, "breakpoints");

    for (const [key, value] of Object.entries(breakpoints)) {
      if (Number.isNaN(Number(key)))
        throw Error(`Breakpoints Ключ ${key} не является числом`);

      this._assertPlainObject(value, `Breakpoints Ключ ${key}`);

      if (
        this._has(value, "slidesPerView") &&
        typeof value.slidesPerView !== "number"
      )
        throw Error(`Breakpoints Ключ ${key} slidesPerView не является числом`);

      if (
        this._has(value, "spaceBetween") &&
        typeof value.spaceBetween !== "number"
      )
        throw Error(`Breakpoints Ключ ${key} spaceBetween не является числом`);

      if (this._has(value, "class") && typeof value.class !== "string")
        throw Error(`Breakpoints Ключ ${key} class не является строкой`);
    }
  }

  _normalizeNavigation(navigation) {
    if (!navigation) return { nextEl: null, prevEl: null };

    return {
      nextEl: navigation.nextEl ?? null,
      prevEl: navigation.prevEl ?? null,
    };
  }

  _normalizeAutoplay(autoplay) {
    if (autoplay === true) return { enabled: true, delay: 5000, direct: -1 };
    if (!autoplay) return { enabled: false, delay: 5000, direct: -1 };

    return {
      enabled: true,
      delay: autoplay.delay ?? 5000,
      direct: autoplay.direct ?? -1,
    };
  }

  _normalizeBreakpoints(breakpoints) {
    return breakpoints ?? {};
  }
}

class EasySlider {
  state = {
    width: 0,
    spaceBetween: 0,
    activeIndex: 0,
    pointer: {
      diff: 0,
    },
  };

  _domShift = 0;
  _currentX = 0;
  _ready = false;
  _dragOffset = 0;
  _momentum = false;
  _velocity = 0;
  _autoplayTimer = null;
  _slidesPerView = 1;
  _spaceBetween = 0;
  _breakpointClass = null;

  constructor(sliderElem, sliderWrapper, config) {
    if (!(sliderElem instanceof Element))
      throw Error("sliderElem не является DOM элементом");
    if (!(sliderWrapper instanceof Element))
      throw Error("sliderWrapper не является DOM элементом");

    this.sliderElem = sliderElem;
    this.sliderWrapper = sliderWrapper;
    this.config = new SliderConfig(config);

    this.init();
  }

  init() {
    this._init_config_props();
    this._resize_observer(this.sliderElem);
  }

  _init_config_props() {
    const { navigation, autoplay, keyboard, hashNavigation, allowTouchMove } =
      this.config;

    if (navigation.nextEl) this._init_navigation_handler(navigation.nextEl, 1);

    if (navigation.prevEl) this._init_navigation_handler(navigation.prevEl, -1);

    if (autoplay.enabled) this._init_autoplay(autoplay.delay, autoplay.direct);

    if (keyboard) this._base_keyboard_handlers();

    if (hashNavigation) this._init_hash_navigation();

    if (allowTouchMove) this._init_swipe_handlers();
  }

  _init_navigation_handler(elem, direct) {
    elem.addEventListener("click", () =>
      this._set_state((state) => state.activeIndex += direct),
    );
  }

  _init_autoplay(delay, direct) {
    this._autoplayDelay = delay;
    this._autoplayDirect = direct;
    this._restart_autoplay();
  }

  _restart_autoplay() {
    if (!this.config.autoplay.enabled) return;

    clearTimeout(this._autoplayTimer);
    this._autoplayTimer = setTimeout(() => {
      this._set_state((state) => (state.activeIndex += this._autoplayDirect));
      this._restart_autoplay();
    }, this._autoplayDelay);
  }

  _base_keyboard_handlers() {
    document.addEventListener("keydown", (e) => {
      if (e.code === "ArrowLeft")
        this._set_state((state) => (state.activeIndex -= 1));
      else if (e.code === "ArrowRight")
        this._set_state((state) => (state.activeIndex += 1));
    });
  }

  _init_hash_navigation() {
    const hashPrefix = "slide";

    const slides = [...this.sliderWrapper.querySelectorAll(".slide")];
    slides.forEach((el, index) => {
      if (!el.dataset.hash) el.dataset.hash = hashPrefix + (index + 1);
    });

    const index = slides.findIndex(
      (el) => el.dataset.hash === this._current_hash(),
    );
    if (index !== -1) this.state.activeIndex = index;

    window.addEventListener?.("hashchange", () => {
      const next = slides.findIndex(
        (el) => el.dataset.hash === this._current_hash(),
      );
      if (next === -1) return;

      const count = slides.length;
      const current =
        ((Math.round(this.state.activeIndex) % count) + count) % count;
      if (next === current) return;

      this._set_state((state) => {
        state.activeIndex = next;
        state.pointer.diff = 0;
      });
    });
  }

  _current_hash() {
    return window.location.hash.replace("#", "");
  }

  _sync_hash(position) {
    const count = this.sliderWrapper.children.length;
    if (!count) return;

    const index = ((Math.round(position) % count) + count) % count;
    const hash = this.sliderWrapper.children[index]?.dataset.hash;
    if (!hash || hash === this._current_hash()) return;

    if (window.history?.replaceState)
      window.history.replaceState(null, "", `#${hash}`);
    else window.location.hash = hash;
  }

  // Контроллеры
  _resize_observer(element) {
    new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        this._set_state((state) => {
          state.width = width;
          state.height = height;
        });
      }
    }).observe(element);
  }

  _init_swipe_handlers() {
    this.sliderWrapper.addEventListener("pointerdown", (e) => {
      cancelAnimationFrame(this._momentumFrame);
      this._momentum = false;

      this.startX = e.clientX;
      this.endX = e.clientX;
      this._dragIndex = this.state.activeIndex;
      this._dragOffset = this.state.pointer.diff;
      this._velocity = 0;
      this._lastX = e.clientX;
      this._lastTime = e.timeStamp;
      this._dragging = true;
      this.sliderWrapper.setPointerCapture(e.pointerId);
    });

    this.sliderWrapper.addEventListener("pointermove", (e) => {
      if (!this._dragging || this.startX === undefined) return;

      const dt = e.timeStamp - this._lastTime;
      if (dt > 0) this._velocity = (e.clientX - this._lastX) / dt;
      this._lastX = e.clientX;
      this._lastTime = e.timeStamp;

      this.endX = e.clientX;

      const step = this._step();
      const total = this._dragOffset + (this.endX - this.startX);
      const moved = Math.round(-total / step);

      this._set_state((state) => {
        state.activeIndex = this._dragIndex + moved;
        state.pointer.diff = total + moved * step;
      });
    });

    const endSwipe = () => {
      if (!this._dragging) return;

      const startX = this.startX;
      this.startX = undefined;
      this._dragging = false;

      if (this.config.freemode) {
        this._start_momentum();
        return;
      }

      const step = this._step();
      const total = this._dragOffset + (this.endX - startX);
      const threshold = this._slideWidth() * 0.2;
      const raw = -total / step;

      let moved = 0;
      if (Math.abs(total) >= threshold)
        moved = Math.sign(raw) * Math.max(1, Math.round(Math.abs(raw)));

      this._set_state((state) => {
        state.activeIndex = this._dragIndex + moved;
        state.pointer.diff = 0;
      });
    };

    this.sliderWrapper.addEventListener("pointerup", endSwipe);
    this.sliderWrapper.addEventListener("pointercancel", endSwipe);
    this.sliderWrapper.addEventListener("lostpointercapture", endSwipe);
  }

  // Внутреняя логика
  _set_state(updater) {
    this._stop_momentum();
    const prevIndex = this.state.activeIndex;
    updater(this.state);
    this._update();
    if (this.state.activeIndex !== prevIndex) this._restart_autoplay();
  }

  _stop_momentum() {
    if (!this._momentum) return;
    cancelAnimationFrame(this._momentumFrame);
    this._momentum = false;
  }

  _clamp(value, min, max) {
    return Math.max(min, Math.min(value, max));
  }

  _start_momentum() {
    const step = this._step() || 1;
    const now = performance.now();
    const idle = now - (this._lastTime ?? now);
    const rawVelocity = idle > 120 ? 0 : this._velocity;

    cancelAnimationFrame(this._momentumFrame);

    let velocity = this._clamp((-rawVelocity / step) * 0.7, -0.015, 0.015);

    this._momentum = true;
    this._move_to(this._currentX, false);

    if (Math.abs(velocity) < 0.0005) {
      this._momentum = false;
      this._update();
      return;
    }

    let position = this.state.activeIndex - this.state.pointer.diff / step;
    let last = now;
    const friction = 0.94;

    const tick = (frameNow) => {
      const dt = Math.min(frameNow - last, 32);
      last = frameNow;

      velocity *= Math.pow(friction, dt / 16);
      position += velocity * dt;

      const activeIndex = Math.floor(position);

      this.state.activeIndex = activeIndex;
      this.state.pointer.diff = (activeIndex - position) * step;
      this._update();

      if (Math.abs(velocity) > 0.0005) {
        this._momentumFrame = requestAnimationFrame(tick);
      } else {
        this._momentum = false;
        this._update();
      }
    };

    this._momentumFrame = requestAnimationFrame(tick);
  }

  _apply_breakpoints(width) {
    const breakpoint = this.config.resolveBreakpoint(width) ?? {};

    this._slidesPerView = breakpoint.slidesPerView ?? this.config.slidesPerView;
    this._spaceBetween = breakpoint.spaceBetween ?? this.config.spaceBetween;

    const breakpointClass = breakpoint.class ?? null;
    if (breakpointClass === this._breakpointClass) return;

    if (this._breakpointClass && this.sliderWrapper.classList)
      this.sliderWrapper.classList.remove(this._breakpointClass);

    this._breakpointClass = breakpointClass;

    if (this._breakpointClass && this.sliderWrapper.classList)
      this.sliderWrapper.classList.add(this._breakpointClass);
  }

  _slides_per_view() {
    const count = this.sliderWrapper.children.length;
    return Math.max(1, Math.min(this._slidesPerView, count));
  }

  _slideWidth() {
    const slidesPerView = this._slides_per_view();
    const gaps = this._spaceBetween * (slidesPerView - 1);
    return Math.max((this.state.width - gaps) / slidesPerView, 0);
  }

  _step() {
    return this._slideWidth() + this._spaceBetween;
  }

  _calculate() {
    this._apply_breakpoints(this.state.width);

    const count = this.sliderWrapper.children.length;
    const slidesPerView = this._slides_per_view();
    const step = this._step() || 1;
    const diff = this.state.pointer.diff;
    const maxPosition = Math.max(count - slidesPerView, 0);
    let position = this.state.activeIndex - diff / step;

    let shift = this._domShift;

    if (this.config.loop) {
      while (position < shift) shift -= 1;
      while (position > shift + maxPosition) shift += 1;
    } else {
      this.state.activeIndex = this._clamp(
        this.state.activeIndex,
        0,
        maxPosition,
      );
      position = this._clamp(position, 0, maxPosition);
      shift = 0;
    }

    const rotation = shift - this._domShift;
    const x = -step * (position - shift);

    return {
      x,
      position,
      rotation,
      shift,
      step,
      slideWidth: this._slideWidth(),
      spaceBetween: this._spaceBetween,
    };
  }

  _update() {
    const { x, position, rotation, shift, step, slideWidth, spaceBetween } =
      this._calculate();

    this._render_slides(slideWidth, spaceBetween);

    if (rotation !== 0) {
      this._reorder(rotation);
      this._move_to(this._currentX + rotation * step, false);
      this._force_reflow();
      this._domShift = shift;
    }

    const animated = this._ready && !this._dragging && !this._momentum;
    this._move_to(x, animated);
    this._ready = true;

    if (this.config.hashNavigation && animated) this._sync_hash(position);
  }

  _reorder(rotation) {
    for (let i = 0; i < Math.abs(rotation); i++) {
      if (rotation > 0) {
        this.sliderWrapper.append(this.sliderWrapper.children[0]);
      } else {
        this.sliderWrapper.prepend(
          this.sliderWrapper.children[this.sliderWrapper.children.length - 1],
        );
      }
    }
  }

  _move_to(x, animated) {
    this._currentX = x;
    this.sliderWrapper.style.transition = animated
      ? "transform 0.3s ease-in-out"
      : "none";
    this.sliderWrapper.style.transform = `translateX(${x}px)`;
  }

  _force_reflow() {
    void this.sliderWrapper.offsetWidth;
  }

  _render_slides(slideWidth, spaceBetween) {
    const slides = this.sliderWrapper.querySelectorAll(".slide");

    slides.forEach((el) => {
      el.style.flex = `0 0 ${slideWidth}px`;
      el.style.marginRight = `${spaceBetween}px`;
    });
  }
}
