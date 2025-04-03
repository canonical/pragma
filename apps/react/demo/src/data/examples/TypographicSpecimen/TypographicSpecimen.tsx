import typographicSpecimenLinesImg from "assets/typographic-specimen-lines.png";
import type { ShowcaseComponent } from "ui/index.js";
import style from "./styles.css?inline";

const TypographicSpecimen: ShowcaseComponent = () => {
  return (
    <>
      <style>{style}</style>
      <div className="typographic-specimen-container">
        <hr className="highlighted" />

        <div className="top-section-wrapper">
          <div className="column">
            <h1>This is an h1 heading</h1>
            <hr />
            <h2>THIS IS AN H2 HEADING</h2>
            <hr />
            <h3>This is an h3 heading</h3>
            <hr />
            <h4>THIS IS AN H4 HEADING</h4>
            <hr />
            <h5>THIS IS AN H5 HEADING</h5>
            <hr />
            <h6>This is an h6 heading</h6>
          </div>

          <div className="column">
            <p>
              This tool allows you to perfect your layout and typography without
              having to learn the codebase first. Adjust the settings to your
              liking press submit. Your customizations will update the vanilla
              config.
            </p>
            <h4>THIS IS AN H4 HEADING</h4>
            <p>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Praesent
              finibus quam molestie elit porttitor faucibus. Duis eu orci
              tempor, sodales dolor nec, aliquam neque. Nunc tempor odio eget
              arcu lobortis, pellentesque pretium urna condimentum. Vivamus sit
              amet leo a lectus maximus tristique sed lobortis leo. Nunc
              fermentum lobortis urna, lacinia tincidunt est sagittis nec.
              Aenean mauris metus, elementum id rhoncus eget, scelerisque ut
              lectus.
            </p>
            <h5>THIS IS AN H5 HEADING</h5>
            <p>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Praesent
              finibus quam molestie elit porttitor faucibus. Duis eu orci
              tempor, sodales dolor nec, aliquam neque. Nunc tempor odio eget
              arcu lobortis, pellentesque pretium urna condimentum. Vivamus sit
              amet leo a lectus maximus tristique sed lobortis leo. Nunc
              fermentum lobortis urna, lacinia tincidunt est sagittis nec.
              Aenean mauris metus, elementum id rhoncus eget, scelerisque ut
              lectus.
            </p>
            <h6>This is an H6 heading</h6>
            <p>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Praesent
              finibus quam molestie elit porttitor faucibus. Duis eu orci
              tempor, sodales dolor nec, aliquam neque. Nunc tempor odio eget
              arcu lobortis, pellentesque pretium urna condimentum. Vivamus sit
              amet leo a lectus maximus tristique sed lobortis leo. Nunc
              fermentum lobortis urna, lacinia tincidunt est sagittis nec.
              Aenean mauris metus, elementum id rhoncus eget, scelerisque ut
              lectus.
            </p>
          </div>
        </div>

        <hr className="highlighted mid-section-hr" />

        <div className="mid-section">
          <h2 className="grid-title">Grid</h2>

          <div className="lorem-ipsum-block">
            <h6>
              <strong>Lorem ipsum dolor sit</strong>
            </h6>
            <p>
              Lorem ipsum dolor sit amet consectetur. Gravida leo sit a
              lobortis. Vulputate leo at eu pellentesque mattis amet volutpat
              sapien volutpat. Proin ut pretium purus ipsum ipsum id egestas. In
              eget aliquam gravida nunc senectus cras. Duis ac ut.
            </p>
          </div>

          <img
            src={typographicSpecimenLinesImg}
            alt="Abstract pattern lines"
            className="mid-section-image"
          />
        </div>

        <div className="bottom-grid-container">
          <div className="grid-item">
            <hr />
            <h5>The quick brown fox jumps over the lazy dog</h5>
            <p>
              Lorem ipsum dolor sit amet consectetur. Odio eu at sapien urna dis
              sociis nisi. Elementum tristique fermentum tempus a sagittis
              fermentum vitae. Dis sit faucibus maecenas lectus suspendisse
              vitae sagittis posuere lobortis. Varius.
            </p>
          </div>

          <div className="grid-item">
            <hr />
            <h5>The quick brown fox jumps over the lazy dog</h5>
            <p>
              Lorem ipsum dolor sit amet consectetur. Odio eu at sapien urna dis
              sociis nisi. Elementum tristique fermentum tempus a sagittis
              fermentum vitae. Dis sit faucibus maecenas lectus suspendisse
              vitae sagittis posuere lobortis. Varius.
            </p>
          </div>

          <div className="grid-item">
            <hr />
            <h5>The quick brown fox jumps over the lazy dog</h5>
            <p>
              Lorem ipsum dolor sit amet consectetur. Odio eu at sapien urna dis
              sociis nisi. Elementum tristique fermentum tempus a sagittis
              fermentum vitae. Dis sit faucibus maecenas lectus suspendisse
              vitae sagittis posuere lobortis. Varius.
            </p>
          </div>

          <div className="grid-item">
            <hr />
            <h5>The quick brown fox jumps over the lazy dog</h5>
            <p>
              Lorem ipsum dolor sit amet consectetur. Odio eu at sapien urna dis
              sociis nisi. Elementum tristique fermentum tempus a sagittis
              fermentum vitae. Dis sit faucibus maecenas lectus suspendisse
              vitae sagittis posuere lobortis. Varius.
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default TypographicSpecimen;
