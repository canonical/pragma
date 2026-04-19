export interface HeadMeta {
  readonly name?: string;
  readonly property?: string;
  readonly content: string;
  readonly httpEquiv?: string;
}

export interface HeadLink {
  readonly rel: string;
  readonly href: string;
  readonly type?: string;
  readonly sizes?: string;
  readonly media?: string;
  readonly crossOrigin?: "" | "anonymous" | "use-credentials";
}

export interface HeadTags {
  readonly title?: string;
  readonly meta?: readonly HeadMeta[];
  readonly link?: readonly HeadLink[];
}

export interface HeadCollector {
  add(id: string, tags: HeadTags): void;
  remove(id: string): void;
  toHtml(): string;
}
