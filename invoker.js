export function isSupported() {
  return (
    typeof HTMLButtonElement !== "undefined" &&
    typeof HTMLButtonElement.prototype === "object" &&
    "invokeTargetElement" in HTMLButtonElement.prototype
  );
}

const ShadowRoot = globalThis.ShadowRoot || function () {};

class InvokeEvent extends Event {
  constructor(invokeEventInit = {}) {
    super("invoke", invokeEventInit);
    this.#invoker = invokeEventInit.invoker || null;
    this.#action = String(invokeEventInit.action) || "auto";
  }

  #invoker = null;
  get invoker() {
    return this.#invoker;
  }

  #action = "auto";
  get action() {
    return this.#action;
  }
}

const invokerAssociatedElements = new WeakMap();

function getRootNode(node) {
  if (typeof node.getRootNode === "function") {
    return node.getRootNode();
  }
  if (node.parentNode) return getRootNode(node.parentNode);
  return node;
}

function applyInvokerMixin(ElementClass) {
  Object.defineProperties(ElementClass.prototype, {
    invokeTargetElement: {
      enumerable: true,
      configurable: true,
      set(targetElement) {
        if (targetElement === null) {
          this.removeAttribute("invoketarget");
          invokerAssociatedElements.delete(this);
          teardownInvokeListeners(this);
        } else if (!(targetElement instanceof Element)) {
          throw new TypeError(`invokeTargetElement must be an element or null`);
        } else {
          this.setAttribute("invoketarget", "");
          invokerAssociatedElements.set(this, targetElement);
          setupInvokeListeners(this);
        }
      },
      get() {
        if (this.localName !== "button" && this.localName !== "input") {
          return null;
        }
        if (
          this.localName === "input" &&
          this.type !== "reset" &&
          this.type !== "image" &&
          this.type !== "button"
        ) {
          return null;
        }
        if (this.disabled) {
          return null;
        }
        if (this.form && this.type === "submit") {
          return null;
        }
        const targetElement = invokerAssociatedElements.get(this);
        if (targetElement) {
          if (targetElement.isConnected) {
            return targetElement;
          } else {
            invokerAssociatedElements.delete(this);
            return null;
          }
        }
        const root = getRootNode(this);
        const idref = this.getAttribute("invoketarget");
        if ((root instanceof Document || root instanceof ShadowRoot) && idref) {
          return root.getElementById(idref) || null;
        }
        return null;
      },
    },
    invokerAction: {
      enumerable: true,
      configurable: true,
      get() {
        const value = (this.getAttribute("invokeaction") || "").toLowerCase();
        if (value) return value;
        return "auto";
      },
      set(value) {
        this.setAttribute("invokeaction", value);
      },
    },
  });
}

function handleInvokerActivation(event) {
  if (!event.isTrusted) return;
  if (event.defaultPrevented) return;
  const invoker = event.target;

  if (!invoker.invokeTargetElement) {
    return teardownInvokeListeners(invoker);
  }

  switch (event.type) {
    case "click": {
      return handleDefaultInvoke(invoker);
    }
  }
}

const lastVolumes = new WeakMap();
function handleDefaultInvoke(invoker) {
  const invokee = invoker.invokeTargetElement;
  const event = new InvokeEvent({
    action: invoker.invokerAction,
    invoker,
  });
  invokee.dispatchEvent(event);
  if (event.defaultPrevented) return;

  if (event.action === "requestfullscreen") {
    event.target.requestFullscreen();
    return;
  } else if (event.action === "exitfullscreen") {
    document.exitFullscreen();
    return;
  } else if (event.action === "togglefullscreen") {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      event.target.requestFullscreen();
    }
    return;
  }

  switch (invokee.localName) {
    case "input": {
      if (event.action === "auto" || event.action === "showpicker") {
        event.target.showPicker();
      }
      break;
    }
    case "select": {
      if (event.action === "auto" || event.action === "showpicker") {
        event.target.showPicker?.();
      }
      break;
    }

    case "details": {
      switch (event.action) {
        case "auto": {
          if (event.target.hasAttribute("open")) {
            event.target.removeAttribute("open");
          } else {
            event.target.setAttribute("open", "");
          }
          break;
        }
        case "close": {
          if (event.target.hasAttribute("open")) {
            event.target.removeAttribute("open");
          }
          break;
        }
        case "open": {
          if (!event.target.hasAttribute("open")) {
            event.target.setAttribute("open", "");
          }
          break;
        }
      }
      break;
    }

    case "dialog": {
      switch (event.action) {
        case "auto": {
          if (event.target.hasAttribute("open")) {
            event.target.close();
          } else {
            event.target.showModal();
          }
          break;
        }
        case "showModal": {
          if (!event.target.hasAttribute("open")) {
            event.target.showModal();
          }
          break;
        }
        case "close": {
          if (event.target.hasAttribute("open")) {
            event.target.close();
          }
          break;
        }
      }
      break;
    }

    case "video": {
      switch (event.action) {
        case "auto": {
          if (event.target.paused) {
            event.target.play();
          } else {
            event.target.pause();
          }
          break;
        }
        case "play": {
          event.target.play();
          break;
        }
        case "pause": {
          event.target.pause();
          break;
        }
        case "mute": {
          if (event.target.volume === 0) {
            event.target.volume = lastVolumes.get(event.target) || 1;
          } else {
            lastVolumes.set(event.target, event.target.volume);
            event.target.volume = 0;
          }
          break;
        }
      }
      break;
    }
  }
}

function setupInvokeListeners(target) {
  target.addEventListener("click", handleInvokerActivation);
}

function teardownInvokeListeners(target) {
  target.removeEventListener("click", handleInvokerActivation);
}

function observeShadowRoots(ElementClass, callback) {
  const attachShadow = ElementClass.prototype.attachShadow;
  ElementClass.prototype.attachShadow = function (init) {
    const shadow = attachShadow.call(this, init);
    callback(shadow);
    return shadow;
  };
  const attachInternals = ElementClass.prototype.attachInternals;
  ElementClass.prototype.attachInternals = function () {
    const internals = attachInternals.call(this);
    if (internals.shadowRoot) callback(internals.shadowRoot);
    return internals;
  };
}

export function apply() {
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === "attributes") {
        if (
          mutation.attributeName === "invoketarget" &&
          mutation.target.invokeTargetElement
        ) {
          setupInvokeListeners(mutation.target);
        }
      }
    }
  });
  const observerOptions = {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["invoketarget"],
  };
  observer.observe(document, observerOptions);

  applyInvokerMixin(globalThis.HTMLButtonElement || function () {});
  applyInvokerMixin(globalThis.HTMLInputElement || function () {});

  observeShadowRoots(globalThis.HTMLElement || function () {}, (shadow) => {
    observer.observe(shadow, observerOptions);
  });

  for (const invoker of document.querySelectorAll("[invoketarget]")) {
    setupInvokeListeners(invoker);
  }
}
