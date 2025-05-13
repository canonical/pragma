/* @canonical/generator-ds 0.9.0-experimental.20 */
import type React from 'react';
import { useState } from "react";
import type { PasswordToggleProps } from './types.js';
  
/**
 * description of the PasswordToggle component
 * @returns {React.ReactElement} - Rendered PasswordToggle
 */
const PasswordToggle = ({
  id,
  className,
  style
}: PasswordToggleProps): React.ReactElement => {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [password, setPassword] = useState("");

  const toggleVisisbility = () => {
    setIsPasswordVisible(!isPasswordVisible);
  };

  return (
    <div>
      <input type={isPasswordVisible ? "text" : "password" } value={password} onChange={(e)=> {setPassword(e.target.value)}} />
      <button
        type="button"
        onClick={toggleVisisbility}
        className={className}
        style={style}
        id={id}
      >
        {isPasswordVisible ? "Hide" : "Show"}
      </button>
    </div>
  )
};

export default PasswordToggle;