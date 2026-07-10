import { useTranslation } from "@canonical/i18n-react";
import { Button } from "@canonical/react-ds-global";
import { Field, Form } from "@canonical/react-ds-global-form";
import { useHead } from "@canonical/react-head";
import type { ReactElement } from "react";

function handleSubmit(data: Record<string, unknown>) {
  console.log("Form submitted:", data);
}

export default function ContactPage(): ReactElement {
  const { t } = useTranslation();
  useHead({ title: t("contact.title") });

  return (
    <section aria-labelledby="contact-title">
      <h1 id="contact-title">{t("contact.heading")}</h1>
      <Form onSubmit={handleSubmit}>
        <Field name="name" inputType="text" label={t("contact.name")} />
        <Field
          name="email"
          inputType="text"
          label={t("contact.email")}
          registerProps={{ required: t("contact.emailRequired") }}
        />
        <Field
          name="subject"
          inputType="select"
          label={t("contact.subject")}
          options={[
            { value: "general", label: t("contact.subjectGeneral") },
            { value: "support", label: t("contact.subjectSupport") },
            { value: "feedback", label: t("contact.subjectFeedback") },
          ]}
        />
        <Field
          name="message"
          inputType="textarea"
          label={t("contact.message")}
          description={t("contact.messageHint")}
        />
        <Button type="submit">{t("contact.send")}</Button>
      </Form>
    </section>
  );
}
