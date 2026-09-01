import type { MessageValue } from "@canonical/i18n-core";
import type { MessageKey } from "./en.js";

/**
 * Arabic messages. Typed against the English key set, so the catalogs can
 * never drift apart silently.
 *
 * Arabic is the app's right-to-left demonstration locale, and its plural
 * system uses all six CLDR categories — `catalog.showing` spells them out,
 * which `Intl.PluralRules("ar")` selects from at runtime.
 */
const ar: Record<MessageKey, MessageValue> = {
  "nav.label": "رئيسي",
  "nav.home": "الرئيسية",
  "nav.guide": "الدليل",
  "nav.catalog": "الكتالوج",
  "nav.contact": "اتصل بنا",
  "nav.signIn": "تسجيل دخول تجريبي",
  "theme.label": "سمة الألوان",
  "theme.system": "النظام",
  "theme.light": "فاتح",
  "theme.dark": "داكن",
  "locale.label": "اللغة",
  "notFound.heading": "الصفحة غير موجودة",
  "notFound.body": "الصفحة التي تبحث عنها غير موجودة.",
  "home.title": "الرئيسية — Boilerplate",
  "home.heading": "الرئيسية",
  "home.tagline": "مرحبًا بك في تطبيق pragma النموذجي.",
  "home.exampleHeading": "مكوّن مثال",
  "home.streamingHeading": "البث مع Suspense",
  "home.streamFallback": "جارٍ تحميل المحتوى المتدفق…",
  "guide.title": "{slug} — أدلة",
  "guide.body": "محتوى الدليل عن {slug}.",
  "account.title": "الحساب — Boilerplate",
  "account.heading": "الحساب",
  "account.body": "صفحة حساب محمية. أنت مسجّل الدخول.",
  "login.title": "تسجيل الدخول — Boilerplate",
  "login.heading": "تسجيل الدخول",
  "login.hintBefore": "تسجيل دخول تجريبي. أضف",
  "login.hintAfter": "إلى أي عنوان محمي لمحاكاة المصادقة.",
  "login.redirect": "ستتم إعادة توجيهك إلى {from} بعد تسجيل الدخول.",
  "contact.title": "اتصل بنا",
  "contact.heading": "اتصل بنا",
  "contact.name": "الاسم الكامل",
  "contact.email": "البريد الإلكتروني",
  "contact.emailRequired": "البريد الإلكتروني مطلوب",
  "contact.subject": "الموضوع",
  "contact.subjectGeneral": "استفسار عام",
  "contact.subjectSupport": "الدعم",
  "contact.subjectFeedback": "ملاحظات",
  "contact.message": "الرسالة",
  "contact.messageHint": "500 حرف كحد أقصى",
  "contact.send": "إرسال الرسالة",
  "catalog.title": "الكتالوج — Boilerplate",
  "catalog.heading": "الكتالوج",
  "catalog.loading": "جارٍ تحميل الكتالوج…",
  "catalog.error": "تعذّر تحميل الكتالوج. أعد تحميل الصفحة للمحاولة مرة أخرى.",
  "catalog.listLabel": "كتالوج المنتجات",
  "catalog.signedInAs": "مسجّل الدخول باسم",
  "catalog.showing": {
    zero: "— لا توجد منتجات.",
    one: "— عرض {shown} من منتج واحد.",
    two: "— عرض {shown} من منتجين.",
    few: "— عرض {shown} من {count} منتجات.",
    many: "— عرض {shown} من {count} منتجًا.",
    other: "— عرض {shown} من {count} منتج.",
  },
  "catalog.more": "تتوفر منتجات إضافية.",
  "catalog.rating": "التقييم {rating} من 5",
  "catalog.inStock": "متوفر",
  "catalog.outOfStock": "غير متوفر",
};

export default ar;
