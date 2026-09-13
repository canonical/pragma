/**
 * The registry pairing each provider with its internal host. Held weakly,
 * so a provider nothing else holds is collected with its host; keyed by
 * the provider object, so a structural copy finds nothing; held untyped,
 * since one map serves every field list and record type — a host is read
 * back at the type of the provider it was registered with.
 */
export const PROVIDER_HOSTS = new WeakMap<object, unknown>();
