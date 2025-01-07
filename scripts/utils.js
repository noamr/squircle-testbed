"use strict";

class DOMUtils {
    static removeAllChildren(element)
    {
        while (element.firstChild)
            element.firstChild.remove();
    }
}