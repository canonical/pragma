/* @canonical/generator-ds 0.9.0-experimental.20 */
import type React from 'react';
import type { CatachterCounterProps } from './types.js';
import './styles.css';
import { useState } from 'react';
import cat1 from '../assets/cat_PNG50525-94615533.png';
import cat2 from '../assets/cats-images-download-28-2796236301.png';
import cat3 from '../assets/cute-cat-images-download-7-2942337465.png';
import { mapToColor, pseudoRandom2DMap } from 'ui/CatachterCounter/utils.js';

const componentCssClassName = 'ds catachter-counter';

const catSrcs = [cat1, cat2, cat3];

/**
 * description of the CatachterCounter component
 * @returns {React.ReactElement} - Rendered CatachterCounter
 */
const CatachterCounter = ({
  id,
  children,
  className,
  style,
  maxNumCharacters,
}: CatachterCounterProps): React.ReactElement => {
  const [text, setText] = useState('');

  const num = text.length;

  return (
    <div
      id={id}
      style={style}
      className={[componentCssClassName, className].filter(Boolean).join(' ')}
    >
      <textarea
        onChange={(e) => setText(e.target.value)}
        maxLength={maxNumCharacters}
        value={text}
        style={{
          backgroundColor: mapToColor(num, 0, maxNumCharacters),
        }}
      />
      <div>
        {num}/{maxNumCharacters}
      </div>
      {Array.from({ length: num }).map((_, i) => {
        const [x, y] = pseudoRandom2DMap(i, i, 0, maxNumCharacters, 0, 100);

        return (
          <img
            key={i}
            src={catSrcs[i % catSrcs.length]}
            className="image"
            style={{
              left: `${x}%`,
              top: `${y}%`,
            }}
          />
        );
      })}
    </div>
  );
};

export default CatachterCounter;
