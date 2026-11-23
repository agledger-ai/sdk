/**
 * Tagged template for a request path. Every interpolated value is
 * percent-encoded as one path segment, so an identifier containing `/`, `?`,
 * `#` or `..` reaches the Server as that literal identifier rather than
 * changing which route is called. An identifier that is exactly `.` or `..`
 * is refused, since no encoding stops a URL parser from resolving it.
 */
export function path(strings: TemplateStringsArray, ...values: unknown[]): string {
  let out = strings[0] ?? '';
  for (let i = 0; i < values.length; i++) {
    const segment = String(values[i]);
    // `.` and `..` survive percent-encoding and URL parsing still reads them
    // (and their `%2e` spellings) as dot segments that climb out of the route.
    if (segment === '.' || segment === '..') {
      throw new RangeError(`"${segment}" is not a valid identifier in a request path.`);
    }
    out += encodeURIComponent(segment) + (strings[i + 1] ?? '');
  }
  return out;
}
