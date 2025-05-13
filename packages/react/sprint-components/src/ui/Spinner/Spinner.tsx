/* @canonical/generator-ds 0.9.0-experimental.20 */
import type React from 'react';
import type { SpinnerProps } from './types.js';
import './styles.css';
import SpinnerLogo from './spinner.svg';

const componentCssClassName = "ds spinner";
  
/**
 * description of the Spinner component
 * @returns {React.ReactElement} - Rendered Spinner
 */
const Spinner = ({
  id,
  className,
  style,
  label,
  size = 'medium',
  speed = 'medium',
}: SpinnerProps): React.ReactElement => {
  let sizeNumber = 40;
  let fontSize = 1.5;
  switch (size) {
    case 'small':
      sizeNumber = 20;
      fontSize = 1;
      break;
    case 'medium':
      sizeNumber = 40;
      fontSize = 1.5;
      break;
    case 'large':
      sizeNumber = 60;
      fontSize = 2;
      break;
    default:
      break;
  };

  let spinSpeed = 1;
  switch (speed) {
    case 'slow':
      spinSpeed = 2;
      break;
    case 'medium':
      spinSpeed = 1;
      break;
    case 'fast':
      spinSpeed = 0.5;
      break;
    default:
      break;
  };
  return (
    <div
      id={id}
      style={{
        "--font-size": `${fontSize}rem`,
        "--spin-speed": `${spinSpeed}s`,
        ...style,
      }}
      className={[
                componentCssClassName,
        className
      ].filter(Boolean).join(" ")}
    >
      <img width={sizeNumber} height={sizeNumber} src={SpinnerLogo} alt="Loading..." />
      {label && <span className="label">{label}</span>}
    </div>
  )
};

export default Spinner;