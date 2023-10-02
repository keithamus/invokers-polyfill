export function isSupported() {
  return (
    typeof HTMLButtonElement !== "undefined" &&
    typeof HTMLButtonElement.prototype === "object" &&
    "invokerTargetElement" in HTMLButtonElement.prototype
  );
}

const ShadowRoot = globalThis.ShadowRoot || function () {};

class InvokeEvent extends Event {
  constructor(invokeEventInit = {}) {
    super("invoke", invokeEventInit);
    this.#relatedTarget = invokeEventInit.relatedTarget || null;
    this.#action = invokeEventInit.action || "auto";
  }

  #relatedTarget = null;
  get relatedTarget() {
    return this.#relatedTarget;
  }

  #action = "auto";
  get action() {
    return this.#action;
  }
}

class InterestEvent extends Event {
  constructor(type, interestEventInit = {}) {
    super(type, interestEventInit);
    this.#relatedTarget = interestEventInit.relatedTarget || null;
  }

  #relatedTarget = null;
  get relatedTarget() {
    return this.#relatedTarget;
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
    invokerTargetElement: {
      enumerable: true,
      configurable: true,
      set(targetElement) {
        if (targetElement === null) {
          this.removeAttribute("invokertarget");
          invokerAssociatedElements.delete(this);
          teardownInvokeListeners(this);
        } else if (!(targetElement instanceof Element)) {
          throw new TypeError(
            `invokerTargetElement must be an element or null`,
          );
        } else {
          this.setAttribute("invokertarget", "");
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
        const idref = this.getAttribute("invokertarget");
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
        const value = (this.getAttribute("invokeraction") || "").toLowerCase();
        if (value) return value;
        return "auto";
      },
      set(value) {
        this.setAttribute("invokeraction", value);
      },
    },
  });
}

function applyInterestMixin(ElementClass) {
  Object.defineProperties(ElementClass.prototype, {
    interestTargetElement: {
      enumerable: true,
      configurable: true,
      set(targetElement) {
        if (targetElement === null) {
          this.removeAttribute("interesttarget");
          invokerAssociatedElements.delete(this);
          teardownInterestListeners(this);
        } else if (!(targetElement instanceof Element)) {
          throw new TypeError(
            `invokerTargetElement must be an element or null`,
          );
        } else {
          this.setAttribute("interesttarget", "");
          invokerAssociatedElements.set(this, targetElement);
          setupInterestListeners(this);
        }
      },
      get() {
        if (
          this.localName !== "button" &&
          this.localName !== "a" &&
          this.localName !== "input"
        ) {
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
        const idref = this.getAttribute("interesttarget");
        if ((root instanceof Document || root instanceof ShadowRoot) && idref) {
          return root.getElementById(idref) || null;
        }
        return null;
      },
    },
  });
}

function handleInvokerActivation(event) {
  if (!event.isTrusted) return;
  if (event.defaultPrevented) return;
  const relatedTarget = event.target;

  if (!relatedTarget.invokerTargetElement) {
    return teardownInvokeListeners(relatedTarget);
  }

  switch (event.type) {
    case "click": {
      return handleDefaultInvoke(relatedTarget);
    }
  }
}

const lastVolumes = new WeakMap();
function handleDefaultInvoke(invoker) {
  const invokee = invoker.invokerTargetElement;
  const event = new InvokeEvent({
    action: invoker.invokerAction,
    relatedTarget: invoker,
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

function handleInterestActivation(event) {
  if (!event.isTrusted) return;
  if (event.defaultPrevented) return;
  const relatedTarget = event.target;

  if (!relatedTarget.interestTargetElement) {
    return teardownInterestListeners(relatedTarget);
  }

  switch (event.type) {
    case "focusin":
    case "pointerover": {
      return handleDefaultGainInterest(relatedTarget);
    }
    case "focusout":
    case "pointerout": {
      return handleDefaultLoseInterest(relatedTarget);
    }
  }
}

function handleDefaultGainInterest(invoker) {
  const invokee = invoker.interestTargetElement;
  console.log(" interest", invoker, invokee);
  const event = new InterestEvent("interest", { relatedTarget: invoker });
  invokee.dispatchEvent(event);
  if (event.defaultPrevented) return;

  if (invokee.popover && !event.target.matches(":popover-open")) {
    invokee.showPopover();
  }
}

function handleDefaultLoseInterest(invoker) {
  const invokee = invoker.interestTargetElement;
  console.log("lose interest", invoker, invokee);
  const event = new InterestEvent("loseinterest", { relatedTarget: invoker });
  invokee.dispatchEvent(event);
  if (event.defaultPrevented) return;

  if (invokee.popover && event.target.matches(":popover-open")) {
    invokee.hidePopover();
  }
}

function setupInvokeListeners(target) {
  target.addEventListener("click", handleInvokerActivation);
}

function setupInterestListeners(target) {
  target.addEventListener("pointerover", handleInterestActivation);
  target.addEventListener("pointerout", handleInterestActivation);
  target.addEventListener("focusin", handleInterestActivation);
  target.addEventListener("focusout", handleInterestActivation);
}

function teardownInvokeListeners(target) {
  target.removeEventListener("click", handleInvokerActivation);
}

function teardownInterestListeners(target) {
  target.removeEventListener("pointerover", handleInterestActivation);
  target.removeEventListener("pointerout", handleInterestActivation);
  target.removeEventListener("focusin", handleInterestActivation);
  target.removeEventListener("focusout", handleInterestActivation);
}

function observeShadowRoots(ElementClass, callback) {
  const attachShadow = ElementClass.prototype.attachShadow;
  ElementClass.prototype.attachShadow = function (init) {
    const shadow = attachShadow.call(this, init);
    callback(shadow);
    return shadow;
  };
}

export function apply() {
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === "attributes") {
        if (
          mutation.attributeName === "invokertarget" &&
          mutation.target.invokerTargetElement
        ) {
          setupInvokeListeners(mutation.target);
        } else if (
          mutation.attributeName === "invokertarget" &&
          mutation.target.invokerTargetElement
        ) {
          setupInterestListeners(mutation.target);
        }
      }
    }
  });
  const observerOptions = {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["invokertarget", "interesttarget"],
  };
  observer.observe(document, observerOptions);

  applyInvokerMixin(globalThis.HTMLButtonElement || function () {});
  applyInvokerMixin(globalThis.HTMLInputElement || function () {});

  applyInterestMixin(globalThis.HTMLButtonElement || function () {});
  applyInterestMixin(globalThis.HTMLInputElement || function () {});
  applyInterestMixin(globalThis.HTMLAnchorElement || function () {});

  observeShadowRoots(globalThis.HTMLElement || function () {}, (shadow) => {
    observer.observe(shadow, observerOptions);
  });

  for (const invoker of document.querySelectorAll("[invokertarget]")) {
    setupInvokeListeners(invoker);
  }
  for (const invoker of document.querySelectorAll("[interesttarget]")) {
    setupInterestListeners(invoker);
  }
}
