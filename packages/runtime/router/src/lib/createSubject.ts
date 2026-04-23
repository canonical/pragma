import type { Subject, SubjectObserver, SubjectSubscriber } from "./types.js";

function toObserver<TValue>(
  subscriber: SubjectSubscriber<TValue>,
): SubjectObserver<TValue> {
  if (typeof subscriber === "function") {
    return {
      next: subscriber,
    };
  }

  return subscriber;
}

/** Create a minimal observable subject with callback or observer subscriptions. */
export default function createSubject<TValue>(): Subject<TValue> {
  const subscribers = new Set<SubjectObserver<TValue>>();

  return {
    next(value) {
      for (const subscriber of [...subscribers]) {
        subscriber.next(value);
      }
    },
    subscribe(subscriber) {
      const observer = toObserver(subscriber);

      subscribers.add(observer);

      return () => {
        subscribers.delete(observer);
      };
    },
  };
}
