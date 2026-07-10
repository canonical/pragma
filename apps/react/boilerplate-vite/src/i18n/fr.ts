import type { MessageValue } from "@canonical/i18n-core";
import type { MessageKey } from "./en.js";

/**
 * French messages. Typed against the English key set, so the catalogs can
 * never drift apart silently.
 */
const fr: Record<MessageKey, MessageValue> = {
  "nav.label": "Principale",
  "nav.home": "Accueil",
  "nav.guide": "Guide",
  "nav.catalog": "Catalogue",
  "nav.contact": "Contact",
  "nav.signIn": "Connexion démo",
  "theme.label": "Thème de couleur",
  "theme.system": "Système",
  "theme.light": "Clair",
  "theme.dark": "Sombre",
  "locale.label": "Langue",
  "notFound.heading": "Page introuvable",
  "notFound.body": "La page que vous recherchez n'existe pas.",
  "home.title": "Accueil — Boilerplate",
  "home.heading": "Accueil",
  "home.tagline": "Bienvenue dans le boilerplate du routeur pragma.",
  "home.exampleHeading": "Composant d'exemple",
  "home.streamingHeading": "Streaming avec Suspense",
  "home.streamFallback": "Chargement du contenu diffusé…",
  "guide.title": "{slug} — Guides",
  "guide.body": "Contenu du guide pour {slug}.",
  "account.title": "Compte — Boilerplate",
  "account.heading": "Compte",
  "account.body": "Page de compte protégée. Vous êtes connecté.",
  "login.title": "Connexion — Boilerplate",
  "login.heading": "Connexion",
  "login.hintBefore": "Connexion de démonstration. Ajoutez",
  "login.hintAfter":
    "à n'importe quelle URL protégée pour simuler l'authentification.",
  "login.redirect": "Vous serez redirigé vers {from} après la connexion.",
  "contact.title": "Contact",
  "contact.heading": "Contact",
  "contact.name": "Nom complet",
  "contact.email": "Adresse e-mail",
  "contact.emailRequired": "L'adresse e-mail est requise",
  "contact.subject": "Objet",
  "contact.subjectGeneral": "Demande générale",
  "contact.subjectSupport": "Assistance",
  "contact.subjectFeedback": "Retour d'expérience",
  "contact.message": "Message",
  "contact.messageHint": "500 caractères maximum",
  "contact.send": "Envoyer le message",
  "catalog.title": "Catalogue — Boilerplate",
  "catalog.heading": "Catalogue",
  "catalog.loading": "Chargement du catalogue…",
  "catalog.error":
    "Le chargement du catalogue a échoué. Rechargez la page pour réessayer.",
  "catalog.listLabel": "Catalogue de produits",
  "catalog.signedInAs": "Connecté en tant que",
  // "affichage de" keeps the wording invariant while the plural agrees with
  // the total ({count}), which is what drives Intl.PluralRules selection.
  "catalog.showing": {
    one: "— affichage de {shown} sur {count} produit.",
    other: "— affichage de {shown} sur {count} produits.",
  },
  "catalog.more": "D'autres produits sont disponibles.",
  "catalog.rating": "noté {rating} / 5",
  "catalog.inStock": "en stock",
  "catalog.outOfStock": "en rupture de stock",
};

export default fr;
