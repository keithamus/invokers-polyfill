(() => {
  if (
    typeof HTMLButtonElement === "undefined" ||
    typeof HTMLButtonElement.prototype !== "object" ||
    "invokeTargetElement" in HTMLButtonElement.prototype
  ) {
    return;
  }

  // XXX: https://bugs.chromium.org/p/chromium/issues/detail?id=1523183
  // Chrome will dispatch invoke events even with the flag disabled; so
  // we need to capture those to prevent duplicate events.
  document.addEventListener('invoke', (e) => {
    if (e.type == 'invoke' && e.isTrusted) {
      e.stopImmediatePropagation();
    }
  }, true);

  function makeEnumerable(obj, key) {
    Object.defineProperty(obj, key, {
      ...Object.getOwnPropertyDescriptor(obj, key),
      enumerable: true,
    });
  }

  function getRootNode(node) {
    if (node && typeof node.getRootNode === "function") {
      return node.getRootNode();
    }
    if (node && node.parentNode) return getRootNode(node.parentNode);
    return node;
  }

  const ShadowRoot = globalThis.ShadowRoot || function () {};

  const invokeEventInvokers = new WeakMap();
  const invokeEventActions = new WeakMap();

  class InvokeEvent extends Event {
    constructor(type, invokeEventInit = {}) {
      super(type, invokeEventInit);
      const { invoker, action } = invokeEventInit;
      if (invoker != null && !(invoker instanceof Element)) {
        throw new TypeError(`invoker must be an element`);
      }
      invokeEventInvokers.set(this, invoker || null);
      invokeEventActions.set(
        this,
        action !== undefined ? String(action) : "auto",
      );
    }

    get [Symbol.toStringTag]() {
      return "InvokeEvent";
    }

    get invoker() {
      if (!invokeEventInvokers.has(this)) {
        throw new TypeError("illegal invocation");
      }
      const invoker = invokeEventInvokers.get(this);
      if (!(invoker instanceof Element)) return null;
      const invokerRoot = getRootNode(invoker);
      if (invokerRoot !== getRootNode(this.target || document)) {
        return invokerRoot.host;
      }
      return invoker;
    }

    get action() {
      if (!invokeEventActions.has(this)) {
        throw new TypeError("illegal invocation");
      }
      return invokeEventActions.get(this);
    }
  }
  makeEnumerable(InvokeEvent.prototype, "invoker");
  makeEnumerable(InvokeEvent.prototype, "action");

  const invokerAssociatedElements = new WeakMap();

  function applyInvokerMixin(ElementClass) {
    Object.defineProperties(ElementClass.prototype, {
      invokeTargetElement: {
        enumerable: true,
        configurable: true,
        set(targetElement) {
          if (targetElement === null) {
            this.removeAttribute("invoketarget");
            invokerAssociatedElements.delete(this);
          } else if (!(targetElement instanceof Element)) {
            throw new TypeError(
              `invokeTargetElement must be an element or null`,
            );
          } else {
            this.setAttribute("invoketarget", "");
            const targetRootNode = getRootNode(targetElement);
            const thisRootNode = getRootNode(this);
            if (
              thisRootNode === targetRootNode ||
              targetRootNode === this.ownerDocument
            ) {
              invokerAssociatedElements.set(this, targetElement);
            } else {
              invokerAssociatedElements.delete(this);
            }
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
          if (
            (root instanceof Document || root instanceof ShadowRoot) &&
            idref
          ) {
            return root.getElementById(idref) || null;
          }
          return null;
        },
      },
      invokeAction: {
        enumerable: true,
        configurable: true,
        get() {
          const value = this.getAttribute("invokeaction") || "";
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
    if (event.defaultPrevented) return;
    if (event.type !== 'click') return;
    const invoker = event.target.closest('button[invoketarget], input[invoketarget]')
    if (!invoker) return

    const invokee = invoker.invokeTargetElement;
    const invokeEvent = new InvokeEvent("invoke", {
      action: invoker.invokeAction,
      invoker,
    });
    invokee.dispatchEvent(invokeEvent);
    if (invokeEvent.defaultPrevented) return;

    const action = invokeEvent.action.toLowerCase();

    if (invokee.popover) {
      const canShow = !invokee.matches(":popover-open");
      const shouldShow =
        canShow &&
          (action === "auto" ||
            action === "togglepopover" ||
            action === "showpopover");
      const shouldHide =
        !canShow && (action === "auto" || action === "hidepopover");

      if (shouldShow) {
        invokee.showPopover();
      } else if (shouldHide) {
        invokee.hidePopover();
      }
    } else if (invokee.localName === "dialog") {
      const canShow = !invokee.hasAttribute("open");
      const shouldShow =
        canShow && (action === "auto" || action === "showmodal");
      const shouldHide =
        !canShow && (action === "auto" || action === "close");

      if (shouldShow) {
        invokee.showModal();
      } else if (shouldHide) {
        invokee.close();
      }
    }
  }

  function setupInvokeListeners(target) {
    target.addEventListener("click", handleInvokerActivation, true);
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

  applyInvokerMixin(globalThis.HTMLButtonElement || function () {});
  applyInvokerMixin(globalThis.HTMLInputElement || function () {});

  observeShadowRoots(globalThis.HTMLElement || function () {}, (shadow) => {
    setupInvokeListeners(shadow);
  });

  setupInvokeListeners(document);

  Object.defineProperty(window, "InvokeEvent", {
    value: InvokeEvent,
    configurable: true,
    writable: true,
  });
})();
