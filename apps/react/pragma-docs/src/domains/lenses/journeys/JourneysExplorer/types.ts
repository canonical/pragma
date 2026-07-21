export interface JourneysExplorerProps {
  /** Additional CSS class names. */
  className?: string;
  /** The selected job (graph URI), or undefined on `/journeys`. */
  readonly job: string | undefined;
}
