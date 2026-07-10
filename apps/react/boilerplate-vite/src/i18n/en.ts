import type { Messages } from "@canonical/i18n-core";

/**
 * English messages — the reference catalog. Its keys define the app's full
 * message surface; the other locales are typed against them (see `fr.ts`),
 * so adding a key here without translating it is a compile error.
 *
 * Keys are dotted namespaces per UI area. Values interpolate `{placeholder}`
 * slots via `createTranslator`; plural entries select a branch from
 * `vars.count` through `Intl.PluralRules`.
 */
const en = {
  "nav.label": "Main",
  "nav.home": "Home",
  "nav.guide": "Guide",
  "nav.catalog": "Catalog",
  "nav.contact": "Contact",
  "nav.signIn": "Demo sign-in",
  "theme.label": "Color theme",
  "theme.system": "System",
  "theme.light": "Light",
  "theme.dark": "Dark",
  "locale.label": "Language",
  "notFound.heading": "Page not found",
  "notFound.body": "The page you are looking for does not exist.",
  "home.title": "Home — Boilerplate",
  "home.heading": "Home",
  "home.tagline": "Welcome to the pragma router boilerplate.",
  "home.exampleHeading": "Example component",
  "home.streamingHeading": "Streaming with Suspense",
  "home.streamFallback": "Loading streamed content…",
  "guide.title": "{slug} — Guides",
  "guide.body": "Guide content for {slug}.",
  "account.title": "Account — Boilerplate",
  "account.heading": "Account",
  "account.body": "Protected account page. You are signed in.",
  "login.title": "Login — Boilerplate",
  "login.heading": "Login",
  "login.hintBefore": "Demo login. Add",
  "login.hintAfter": "to any protected URL to simulate authentication.",
  "login.redirect": "You will be redirected to {from} after login.",
  "contact.title": "Contact",
  "contact.heading": "Contact",
  "contact.name": "Full name",
  "contact.email": "Email address",
  "contact.emailRequired": "Email is required",
  "contact.subject": "Subject",
  "contact.subjectGeneral": "General enquiry",
  "contact.subjectSupport": "Support",
  "contact.subjectFeedback": "Feedback",
  "contact.message": "Message",
  "contact.messageHint": "Maximum 500 characters",
  "contact.send": "Send message",
  "catalog.title": "Catalog — Boilerplate",
  "catalog.heading": "Catalog",
  "catalog.loading": "Loading catalog…",
  "catalog.error": "The catalog failed to load. Reload the page to try again.",
  "catalog.listLabel": "Product catalog",
  "catalog.signedInAs": "Signed in as",
  "catalog.showing": {
    one: "— showing {shown} of {count} product.",
    other: "— showing {shown} of {count} products.",
  },
  "catalog.more": "More products are available.",
  "catalog.rating": "rated {rating} / 5",
  "catalog.inStock": "in stock",
  "catalog.outOfStock": "out of stock",
} satisfies Messages;

/** Every message key the app can translate. */
export type MessageKey = keyof typeof en;

export default en;
