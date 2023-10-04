[Exposed=Window]
interface InvokeEvent : Event {
    constructor(DOMString type, optional InvokeEventInit eventInitDict = {});
    readonly attribute EventTarget? relatedTarget;
    readonly attribute DOMString action;
};

dictionary InvokeEventInit : EventInit {
    EventTarget? relatedTarget = null;
    DOMString action = "auto";
};
