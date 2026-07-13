import { Button } from "@canonical/react-ds-global";
import { type ReactNode, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import Field from "../../pattern/Field/Field.js";
import { SpikeBox, SpikeRows } from "./mocks.js";
import "./density.testbed.css";

/**
 * Baseline-alignment spike harness (WORK IN PROGRESS)
 *
 * Explores a 4px baseline grid and an alternative alignment model for boxed
 * controls (top border on grid + symmetric interior nudges + external margin
 * compensation, instead of forcing both borders onto the grid).
 *
 * The baseline grid overlay is applied automatically by the storybook addon
 * (the story sets `parameters: { baseline: true }`), so there is no manual grid
 * toggle here — only the CURRENT ↔ PROPOSED model switch.
 *
 * Each bucket puts a NARROW column of short baseline-aligned words beside the
 * components (side by side, each growing equally) so control baselines can be
 * read against the reference words and against each other on the same grid.
 */

type Model = "current" | "proposed";

/** A narrow reference column: a few short words on the baseline grid. */
const Ref = () => (
  <div className="density-testbed__ref">
    <p className="p">Abg</p>
    <p className="p">xyz</p>
    <p className="p">Ref</p>
  </div>
);

/** react-hook-form context so the real Field components render. */
const FormShell = ({ children }: { children: ReactNode }) => {
  const methods = useForm({ mode: "onChange" });
  return (
    <FormProvider {...methods}>
      <form
        className="ds form subgrid"
        onSubmit={methods.handleSubmit(() => {})}
        style={{ display: "flex", flexDirection: "column", gap: 0 }}
      >
        {children}
      </form>
    </FormProvider>
  );
};

/** A bucket: title, then the narrow reference column beside the components. */
const Bucket = ({
  title,
  components,
}: { title: string; components: ReactNode }) => (
  <section className="density-testbed__bucket">
    <h3 className="density-testbed__bucket-title">{title}</h3>
    <div className="density-testbed__compare">
      <Ref />
      <div className="density-testbed__row">{components}</div>
    </div>
  </section>
);

/** Controls bucket — boxed controls + a real Button and input, side by side. */
const ControlsBucket = () => (
  <Bucket
    title="Controls — buttons · inputs"
    components={
      <>
        <SpikeBox as="button">Save</SpikeBox>
        <SpikeBox>Value</SpikeBox>
        <Button importance="primary">Real</Button>
        <FormShell>
          <Field inputType="text" name="name" placeholder="Input" />
        </FormShell>
      </>
    }
  />
);

/** Navigation bucket — tab / side-nav item stand-ins, side by side. */
const NavigationBucket = () => (
  <Bucket
    title="Navigation — tabs · side-nav items"
    components={
      <>
        <SpikeBox>Overview</SpikeBox>
        <SpikeBox>Instances</SpikeBox>
        <SpikeBox>Storage</SpikeBox>
      </>
    }
  />
);

/** Lists bucket — list rows / table rows / accordion items (shared-border case). */
const ListsBucket = () => (
  <Bucket
    title="Lists — list rows · table rows · accordion items"
    components={<SpikeRows rows={["node-01", "node-02", "node-03"]} />}
  />
);

export const Spike = ({
  initialModel = "current",
}: { initialModel?: Model }) => {
  const [model, setModel] = useState<Model>(initialModel);

  return (
    <div
      className={["density-testbed", "density-comfortable", `model-${model}`].join(
        " ",
      )}
    >
      <div className="density-testbed__toolbar">
        <span className="density-testbed__toolbar-label">
          Baseline 4px · alignment spike
        </span>
        <div className="density-testbed__controls">
          {(["current", "proposed"] as Model[]).map((m) => (
            <label
              key={m}
              style={{ display: "inline-flex", gap: "0.25rem", alignItems: "center" }}
            >
              <input
                type="radio"
                name="spike-model"
                value={m}
                checked={model === m}
                onChange={() => setModel(m)}
              />
              {m}
            </label>
          ))}
        </div>
      </div>

      <ControlsBucket />
      <NavigationBucket />
      <ListsBucket />
    </div>
  );
};
