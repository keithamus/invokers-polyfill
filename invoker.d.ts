interface InvokerMixin {
  invokeTargetElement: HTMLElement | null;
  invokeAction: string;
}

declare global {
  interface InvokeEvent extends Event {
    invoker: Element;
    action: string;
  }
  /* eslint-disable @typescript-eslint/no-empty-interface */
  interface HTMLButtonElement extends InvokerMixin {}
  interface HTMLInputElement extends InvokerMixin {}
  /* eslint-enable @typescript-eslint/no-empty-interface */
  interface Window {
    InvokeEvent: InvokeEvent;
  }
}
