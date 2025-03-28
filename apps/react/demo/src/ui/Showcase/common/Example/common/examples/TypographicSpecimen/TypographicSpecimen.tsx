import type React from "react";
import "./styles.css";
import type { ShowcaseComponent } from "../../../types.js";

const TypographicSpecimen: ShowcaseComponent = () => {
  const updateHeadingHierarchy = () => {};

  return (
    <div className="specimen-container">
      <div className="top-bar">
        <button type="button" onClick={updateHeadingHierarchy}>
          Update heading hierarchy
        </button>
      </div>

      <section className="heading-section">
        <h1>This is an h1 heading</h1>
        <p>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Praesent
          finibus quam molestie elit porttitor faucibus. Duis eu orci tempor,
          sodales dolor nec, aliquam neque. Nunc tempor odio eget arcu lobortis,
          pellentesque pretium urna condimentum. Vivamus sit amet leo a lectus
          maximus tristique sed lobortis leo. Nunc fermentum lobortis urna,
          lacinia tincidunt est sagittis nec. Aenean mauris metus, elementum id
          rhoncus eget, scelerisque ut lectus.
        </p>

        <h2>THIS IS AN H2 HEADING</h2>
        <p>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Praesent
          finibus quam molestie elit porttitor faucibus. Duis eu orci tempor,
          sodales dolor nec, aliquam neque. Nunc tempor odio eget arcu lobortis,
          pellentesque pretium urna condimentum. Vivamus sit amet leo a lectus
          maximus tristique sed lobortis leo. Nunc fermentum lobortis urna,
          lacinia tincidunt est sagittis nec. Aenean mauris metus, elementum id
          rhoncus eget, scelerisque ut lectus.
        </p>

        <h3>This is an h3 heading</h3>

        <h4>THIS IS AN H4 HEADING</h4>
        <p>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Praesent
          finibus quam molestie elit porttitor faucibus. Duis eu orci tempor,
          sodales dolor nec, aliquam neque. Nunc tempor odio eget arcu lobortis,
          pellentesque pretium urna condimentum. Vivamus sit amet leo a lectus
          maximus tristique sed lobortis leo. Nunc fermentum lobortis urna,
          lacinia tincidunt est sagittis nec. Aenean mauris metus, elementum id
          rhoncus eget, scelerisque ut lectus.
        </p>

        <h5>THIS IS AN H5 HEADING</h5>
        <p>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Praesent
          finibus quam molestie elit porttitor faucibus. Duis eu orci tempor,
          sodales dolor nec, aliquam neque. Nunc tempor odio eget arcu lobortis,
          pellentesque pretium urna condimentum. Vivamus sit amet leo a lectus
          maximus tristique sed lobortis leo. Nunc fermentum lobortis urna,
          lacinia tincidunt est sagittis nec. Aenean mauris metus, elementum id
          rhoncus eget, scelerisque ut lectus.
        </p>

        <h6>This is an h6 heading</h6>
      </section>

      <section className="grid-section">
        <h2>Grid</h2>
        <div className="grid-container">
          <div className="grid-item col-1">
            <p>Lorem ipsum dolor sit amet consectetur.</p>
          </div>
          <div className="grid-item col-2">
            <p>Lorern ipsum dolor sit amet consectetur.</p>
          </div>
          <div className="grid-item col-3">
            <p>
              Gravida leo sit a lobortis. Vulputate leo at eu pellentesque
              mattis amet volutpat sapien volutpat.
            </p>
          </div>
          <div className="grid-item col-4">
            <p>
              Proin ut pretium purus ipsum ipsum id egestas. In eget aliquam
              gravida nunc senectus cras. Duis ac ut.
            </p>
          </div>
        </div>
      </section>

      <section className="text-examples-section">
        <div className="text-example-grid">
          <div className="text-example-item">
            <p className="the-quick-brown-fox">
              The quick brown fox jumps over the lazy dog
            </p>
            <p className="lorem-ipsum-small">
              Lorem ipsum dolor sit amet consectetur. Odio eu at sapien urna dis
              sociis nisi. Elementum tristique fermentum tempus a sagittis
              fermentum vitae. Dis sit faucibus maecenas lectus suspendisse
              vitae sagittis posuere lobortis, Varius.
            </p>
          </div>
          <div className="text-example-item">
            <p className="the-quick-brown-fox">
              The quick brown fox jumps over the lazy dog
            </p>
            <p className="lorem-ipsum-small">
              Lorem ipsum dolor sit amet consectetur. Odio eu at sapien urna dis
              sociis nisi. Elementum tristique fermentum tempus a sagittis
              fermentum vitae. Dis sit faucibus maecenas lectus suspendisse
              vitae sagittis posuere lobortis, Varius.
            </p>
          </div>
          <div className="text-example-item">
            <p className="the-quick-brown-fox">
              The quick brown fox jumps over the lazy dog
            </p>
            <p className="lorem-ipsum-small">
              Lorem ipsum dolor sit amet consectetur, Odio eu at sapien urna dis
              sociis nisi. Elementum tristique fermentum tempus a sagittis
              fermentum vitae. Dis sit faucibus maecenas lectus suspendisse
              vitae sagittis posuere lobortis, Varius.
            </p>
          </div>
          <div className="text-example-item">
            <p className="the-quick-brown-fox">
              The quick brown fox jumps over the lazy dog
            </p>
            <p className="lorem-ipsum-small">
              Lorem ipsum dolor sit amet consectetur. Odio eu at sapien urna dis
              sociis nisi. Elementum tristique fermentum tempus a sagittis
              fermentum vitae, Dis sit faucibus maecenas lectus suspendisse
              vitae sagittis posuere lobortis, Varius.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default TypographicSpecimen;
