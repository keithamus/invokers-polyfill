export function isSupported() {
  return (
    typeof HTMLButtonElement !== "undefined" &&
    typeof HTMLButtonElement.prototype === "object" &&
    "invokerTargetElement" in HTMLButtonElement.prototype
  );
}

const ShadowRoot = globalThis.ShadowRoot || function () {};

const trustedEvents = new WeakSet();
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
        } else if (!(targetElement instanceof Element)) {
          throw new TypeError(
            `invokerTargetElement must be an element or null`,
          );
        } else {
          this.setAttribute("invokertarget", "");
          invokerAssociatedElements.set(this, targetElement);
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
        } else if (!(targetElement instanceof Element)) {
          throw new TypeError(
            `invokerTargetElement must be an element or null`,
          );
        } else {
          this.setAttribute("interesttarget", "");
          invokerAssociatedElements.set(this, targetElement);
        }
      },
      get() {
        if (
          this.localName !== "button" &&
          this.localName !== "input" &&
          this.localName !== "a"
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
    relatedTarget.removeEventListener("click", handleInvokerActivation);
    return;
  }

  switch (event.type) {
    case "click": {
      const event = new InvokeEvent({
        action: relatedTarget.invokerAction,
        relatedTarget,
      });
      trustedEvents.add(event);
      relatedTarget.invokerTargetElement.dispatchEvent(event);
      break;
    }
  }
}

const lastVolumes = new WeakMap();
function handleDefaultInvoke(event) {
  if (!trustedEvents.has(event)) return;
  if (event.defaultPrevented) return;

  switch (event.target.localName) {
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
        case "fullscreen": {
          event.target.requestFullscreen();
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
    relatedTarget.removeEventListener("pointerover", handleInterestActivation);
    relatedTarget.removeEventListener("pointerout", handleInterestActivation);
    relatedTarget.removeEventListener("focusin", handleInterestActivation);
    relatedTarget.removeEventListener("focusout", handleInterestActivation);
    return;
  }

  switch (event.type) {
    case "focusin":
    case "pointerover": {
      const event = new InterestEvent("interest", { relatedTarget });
      trustedEvents.add(event);
      relatedTarget.interestTargetElement.dispatchEvent(event);
      break;
    }
    case "focusout":
    case "pointerout": {
      const event = new InterestEvent("loseinterest", { relatedTarget });
      trustedEvents.add(event);
      relatedTarget.interestTargetElement.dispatchEvent(event);
      break;
    }
  }
}

function handleDefaultInterest(event) {
  switch (event.type) {
    case "interest": {
      if (event.target.popover && !event.target.matches(":popover-open")) {
        event.target.showPopover();
      }
    }
    case "loseinterest": {
      if (event.target.popover && event.target.matches(":popover-open")) {
        event.target.hidePopover();
      }
    }
  }
}

export function apply() {
  new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === "attributes") {
        if (
          mutation.attributeName === "invokertarget" &&
          mutation.target.invokerTargetElement
        ) {
          mutation.target.addEventListener("click", handleInvokerActivation);
          mutation.target.addEventListener("keypress", handleInvokerActivation);
        } else if (
          mutation.attributeName === "invokertarget" &&
          mutation.target.invokerTargetElement
        ) {
          mutation.target.addEventListener(
            "pointerover",
            handleInterestActivation,
          );
          mutation.target.addEventListener(
            "pointerout",
            handleInterestActivation,
          );
          mutation.target.addEventListener("focusin", handleInterestActivation);
          mutation.target.addEventListener(
            "focusout",
            handleInterestActivation,
          );
        }
      }
    }
  }).observe(document, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["invokertarget", "interesttarget"],
  });

  applyInvokerMixin(globalThis.HTMLButtonElement || function () {});
  applyInvokerMixin(globalThis.HTMLInputElement || function () {});

  applyInterestMixin(globalThis.HTMLInputElement || function () {});
  applyInterestMixin(globalThis.HTMLButtonElement || function () {});
  applyInterestMixin(globalThis.HTMLAnchorElement || function () {});

  document.addEventListener("click", handleInvokerActivation);

  document.addEventListener("pointerover", handleInterestActivation);
  document.addEventListener("pointerout", handleInterestActivation);
  document.addEventListener("focusin", handleInterestActivation);
  document.addEventListener("focusout", handleInterestActivation);

  document.addEventListener("invoke", handleDefaultInvoke, {
    capture: true,
  });
  document.addEventListener("interest", handleDefaultInterest, {
    capture: true,
  });
  document.addEventListener("loseinterest", handleDefaultInterest, {
    capture: true,
  });
}
