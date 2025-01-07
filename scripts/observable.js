"use strict";

// Observers are expected to implement `observe(arg)`.

class Observable {
    constructor()
    {
        this.observers = new Set;
    }

    subscribe(observer)
    {
        this.observers.add(observer);
    }

    unsubscribe()
    {
        this.observers.remove(observer);
    }
    
    notify()
    {
        this.observers.forEach((observer) => observer.observe(this));
    }
};
