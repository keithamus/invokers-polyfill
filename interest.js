class InterestEvent extends Event {
  constructor(type, interestEventInit = {}) {
    super(type, interestEventInit);
    this.#invoker = interestEventInit.invoker || null;
  }

  #invoker = null;
  get invoker() {
    return this.#invoker;
  }
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
          throw new TypeError(`invokeTargetElement must be an element or null`);
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

function handleInterestActivation(event) {
  if (!event.isTrusted) return;
  if (event.defaultPrevented) return;
  const invoker = event.target;

  if (!invoker.interestTargetElement) {
    return teardownInterestListeners(invoker);
  }

  switch (event.type) {
    case "focusin":
    case "pointerover": {
      return handleDefaultGainInterest(invoker);
    }
    case "focusout":
    case "pointerout": {
      return handleDefaultLoseInterest(invoker);
    }
  }
}

function handleDefaultGainInterest(invoker) {
  const invokee = invoker.interestTargetElement;
  console.log(" interest", invoker, invokee);
  const event = new InterestEvent("interest", { invoker });
  invokee.dispatchEvent(event);
  if (event.defaultPrevented) return;

  if (invokee.popover && !event.target.matches(":popover-open")) {
    invokee.showPopover();
  }
}

function handleDefaultLoseInterest(invoker) {
  const invokee = invoker.interestTargetElement;
  const event = new InterestEvent("loseinterest", { invoker });
  invokee.dispatchEvent(event);
  if (event.defaultPrevented) return;

  if (invokee.popover && event.target.matches(":popover-open")) {
    invokee.hidePopover();
  }
}

function setupInterestListeners(target) {
  target.addEventListener("pointerover", handleInterestActivation);
  target.addEventListener("pointerout", handleInterestActivation);
  target.addEventListener("focusin", handleInterestActivation);
  target.addEventListener("focusout", handleInterestActivation);
}

function teardownInterestListeners(target) {
  target.removeEventListener("pointerover", handleInterestActivation);
  target.removeEventListener("pointerout", handleInterestActivation);
  target.removeEventListener("focusin", handleInterestActivation);
  target.removeEventListener("focusout", handleInterestActivation);
}

export function apply() {
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === "attributes") {
        if (
          mutation.attributeName === "interesttarget" &&
          mutation.target.interestTargetElement
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
    attributeFilter: ["interesttarget"],
  };
  observer.observe(document, observerOptions);

  applyInterestMixin(globalThis.HTMLButtonElement || function () {});
  applyInterestMixin(globalThis.HTMLInputElement || function () {});
  applyInterestMixin(globalThis.HTMLAnchorElement || function () {});

  observeShadowRoots(globalThis.HTMLElement || function () {}, (shadow) => {
    observer.observe(shadow, observerOptions);
  });

  for (const invoker of document.querySelectorAll("[interesttarget]")) {
    setupInterestListeners(invoker);
  }
}
