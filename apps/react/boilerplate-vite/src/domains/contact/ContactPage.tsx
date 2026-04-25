import { Button } from "@canonical/react-ds-global";
import { Field, Form } from "@canonical/react-ds-global-form";
import { useHead } from "@canonical/react-head";
import type { ReactElement } from "react";

function handleSubmit(data: Record<string, unknown>) {
  console.log("Form submitted:", data);
}

export default function ContactPage(): ReactElement {
  useHead({ title: "Contact" });

  return (
    <section aria-labelledby="contact-title">
      <h1 id="contact-title">Contact</h1>
      <Form onSubmit={handleSubmit}>
        <Field name="name" inputType="text" label="Full name" />
        <Field
          name="email"
          inputType="text"
          label="Email address"
          registerProps={{ required: "Email is required" }}
        />
        <Field
          name="subject"
          inputType="select"
          label="Subject"
          options={[
            { value: "general", label: "General enquiry" },
            { value: "support", label: "Support" },
            { value: "feedback", label: "Feedback" },
          ]}
        />
        <Field
          name="message"
          inputType="textarea"
          label="Message"
          description="Maximum 500 characters"
        />
        <Button type="submit">Send message</Button>
      </Form>
    </section>
  );
}
