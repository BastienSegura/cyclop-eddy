import { InMemoryRegistrationThrottle } from "./registration-throttle";

export const defaultLoginThrottle = new InMemoryRegistrationThrottle({
  maxAttempts: 10,
  windowMs: 10 * 60 * 1000,
});
