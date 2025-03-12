export type BaseInputProps = {
  id?: string;
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  name: string;
  registerProps?: Record<string, unknown>; //TODO improve
};
