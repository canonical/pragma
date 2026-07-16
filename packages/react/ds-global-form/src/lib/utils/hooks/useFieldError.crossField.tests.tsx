import { fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithForm } from "../../../testing/renderWithForm.js";
import { TextField } from "../../component/TextField/index.js";

// Regression test for https://github.com/canonical/pragma/issues/236 —
// cross-field revalidation: changing one field (country) tightens another
// field's minimum-age constraint. The age field stays in an error state, but
// its error MESSAGE text must re-render rather than remain stale.
//
// A form-level resolver is the constraint source (its message is recomputed on
// every validation, unlike a per-field `validate` closure which the field
// wrapper freezes), and `deps` makes the country change revalidate the age
// field. The age field lives inside a nested group so its error sits deep in
// the `errors` tree: the previous `useFieldError` memoised the resolved error
// against a hand-unrolled, fixed-depth list of parent references, so a
// message-only change beyond that depth left the rendered message stale.

type Values = {
  country: string;
  applicant: { contact: { details: { age: string } } };
};

const AGE_FIELD = "applicant.contact.details.age";

const resolver = (values: Values) => {
  const min = values.country === "ca" ? 18 : 13;
  const age = Number(values.applicant?.contact?.details?.age);
  const errors =
    age >= min
      ? {}
      : {
          applicant: {
            contact: {
              details: {
                age: { type: "min", message: `Age must be at least ${min}` },
              },
            },
          },
        };
  return { values, errors };
};

const CrossFieldForm = () => (
  <>
    <TextField
      name="country"
      label="Country"
      registerProps={{ deps: [AGE_FIELD] }}
    />
    <TextField name={AGE_FIELD} label="Age" />
  </>
);

describe("useFieldError cross-field revalidation", () => {
  it("re-renders the error message when it changes while the field stays errored", async () => {
    renderWithForm(<CrossFieldForm />, {
      formProps: {
        mode: "onChange",
        // biome-ignore lint/suspicious/noExplicitAny: local resolver shape
        resolver: resolver as any,
        defaultValues: {
          country: "us",
          applicant: { contact: { details: { age: "" } } },
        },
      },
    });

    // Query by label (TextField wires label→input via htmlFor) rather than by
    // textbox order, so adding another field can't silently break this test.
    const countryInput = screen.getByLabelText("Country");
    const ageInput = screen.getByLabelText("Age");

    // Put the (nested) age field into an error state under the default (13) constraint.
    fireEvent.change(ageInput, { target: { value: "10" } });
    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Age must be at least 13",
      );
    });

    // Changing the country tightens the age constraint: the age field stays
    // errored, but its message text must update from 13 to 18.
    fireEvent.change(countryInput, { target: { value: "ca" } });
    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Age must be at least 18",
      );
    });
  });
});
