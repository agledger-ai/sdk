/**
 * The part of RFC 8941 (Structured Field Values for HTTP) that RFC 9421
 * `Signature-Input` and `Signature` use: a Dictionary whose members are Items
 * or Inner Lists, with Parameters. Parsing follows the RFC's algorithms and is
 * strict: anything it does not accept parses to null, and a caller treats null
 * as a delivery that does not verify.
 *
 * Serialization covers what the `@signature-params` line of a signature base
 * needs: an Inner List with its Parameters, in canonical form (RFC 8941
 * section 4.1), so the base is rebuilt from the parsed value, not from the
 * bytes the sender happened to send.
 */

export type BareItem = number | string | boolean | Token | ByteSequence;

/** An RFC 8941 Token, kept distinct from a String so it serializes unquoted. */
export class Token {
  constructor(readonly value: string) {}
}

/** An RFC 8941 Byte Sequence: the decoded bytes. */
export class ByteSequence {
  constructor(readonly bytes: Uint8Array) {}
}

export type Parameters = Map<string, BareItem>;
export interface Item { kind: 'item'; value: BareItem; params: Parameters }
export interface InnerList { kind: 'inner-list'; items: Item[]; params: Parameters }
export type Member = Item | InnerList;

class ParseError extends Error {}

class Parser {
  private i = 0;
  constructor(private readonly s: string) {}

  dictionary(): Map<string, Member> {
    const out = new Map<string, Member>();
    this.skipSP();
    while (this.i < this.s.length) {
      const key = this.key();
      let member: Member;
      if (this.peek() === '=') {
        this.i++;
        member = this.itemOrInnerList();
      } else {
        member = { kind: 'item', value: true, params: this.parameters() };
      }
      out.set(key, member);
      this.skipOWS();
      if (this.i >= this.s.length) return out;
      if (this.next() !== ',') throw new ParseError('expected a comma between dictionary members');
      this.skipOWS();
      if (this.i >= this.s.length) throw new ParseError('trailing comma');
    }
    return out;
  }

  private itemOrInnerList(): Member {
    return this.peek() === '(' ? this.innerList() : this.item();
  }

  private innerList(): InnerList {
    this.expect('(');
    const items: Item[] = [];
    while (this.i < this.s.length) {
      this.skipSP();
      if (this.peek() === ')') {
        this.i++;
        return { kind: 'inner-list', items, params: this.parameters() };
      }
      items.push(this.item());
      const c = this.peek();
      if (c !== ' ' && c !== ')') throw new ParseError('expected a space or a closing parenthesis');
    }
    throw new ParseError('unterminated inner list');
  }

  private item(): Item {
    return { kind: 'item', value: this.bareItem(), params: this.parameters() };
  }

  private parameters(): Parameters {
    const params: Parameters = new Map();
    while (this.peek() === ';') {
      this.i++;
      this.skipSP();
      const key = this.key();
      let value: BareItem = true;
      if (this.peek() === '=') {
        this.i++;
        value = this.bareItem();
      }
      params.set(key, value);
    }
    return params;
  }

  private key(): string {
    const start = this.i;
    if (!/[a-z*]/.test(this.peek())) throw new ParseError('a key starts with a lowercase letter or *');
    while (/[a-z0-9_\-.*]/.test(this.peek())) this.i++;
    return this.s.slice(start, this.i);
  }

  private bareItem(): BareItem {
    const c = this.peek();
    if (c === '-' || /[0-9]/.test(c)) return this.number();
    if (c === '"') return this.string();
    if (c === ':') return this.byteSequence();
    if (c === '?') return this.boolean();
    if (/[A-Za-z*]/.test(c)) return this.token();
    throw new ParseError('not a bare item');
  }

  /**
   * An Integer. A Decimal is refused rather than parsed: no RFC 9421
   * parameter is one, and a JS number cannot keep the fraction digits a
   * canonical re-serialization would need (`1.0` would come back as `1`).
   */
  private number(): number {
    const m = /^-?\d{1,15}/.exec(this.s.slice(this.i));
    if (!m) throw new ParseError('not an integer');
    this.i += m[0].length;
    if (/[.0-9]/.test(this.peek())) throw new ParseError('integer too long, or a decimal');
    return Number(m[0]);
  }

  private string(): string {
    this.expect('"');
    let out = '';
    while (this.i < this.s.length) {
      const c = this.next();
      if (c === '\\') {
        const e = this.next();
        if (e !== '"' && e !== '\\') throw new ParseError('bad escape in string');
        out += e;
      } else if (c === '"') {
        return out;
      } else {
        const code = c.charCodeAt(0);
        if (code < 0x20 || code > 0x7e) throw new ParseError('string holds a character outside printable ASCII');
        out += c;
      }
    }
    throw new ParseError('unterminated string');
  }

  private token(): Token {
    const m = /^[A-Za-z*][!#$%&'*+\-.^_`|~0-9A-Za-z:/]*/.exec(this.s.slice(this.i));
    if (!m) throw new ParseError('not a token');
    this.i += m[0].length;
    return new Token(m[0]);
  }

  private byteSequence(): ByteSequence {
    this.expect(':');
    const end = this.s.indexOf(':', this.i);
    if (end < 0) throw new ParseError('unterminated byte sequence');
    const b64 = this.s.slice(this.i, end);
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(b64) || b64.length % 4 !== 0) throw new ParseError('byte sequence is not base64');
    this.i = end + 1;
    return new ByteSequence(new Uint8Array(Buffer.from(b64, 'base64')));
  }

  private boolean(): boolean {
    this.expect('?');
    const c = this.next();
    if (c === '1') return true;
    if (c === '0') return false;
    throw new ParseError('not a boolean');
  }

  private peek(): string {
    return this.s.charAt(this.i);
  }

  private next(): string {
    return this.s.charAt(this.i++);
  }

  private expect(c: string): void {
    if (this.next() !== c) throw new ParseError(`expected ${c}`);
  }

  private skipSP(): void {
    while (this.peek() === ' ') this.i++;
  }

  private skipOWS(): void {
    while (this.peek() === ' ' || this.peek() === '\t') this.i++;
  }
}

/** Parse an RFC 8941 Dictionary field value, or null if it is not one. */
export function parseDictionary(value: string): Map<string, Member> | null {
  try {
    // Leading and trailing SP are discarded before parsing (RFC 8941 4.2).
    return new Parser(value.replaceAll(/^ +| +$/g, '')).dictionary();
  } catch (err) {
    if (err instanceof ParseError) return null;
    throw err;
  }
}

function serializeBareItem(v: BareItem): string {
  if (typeof v === 'boolean') return v ? '?1' : '?0';
  if (typeof v === 'number') return String(v);
  if (typeof v === 'string') return `"${v.replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`;
  if (v instanceof Token) return v.value;
  return `:${Buffer.from(v.bytes).toString('base64')}:`;
}

function serializeParameters(params: Parameters): string {
  let out = '';
  for (const [key, value] of params) out += value === true ? `;${key}` : `;${key}=${serializeBareItem(value)}`;
  return out;
}

/** Serialize an Inner List with its Parameters, canonically (RFC 8941 4.1.1.1). */
export function serializeInnerList(list: InnerList): string {
  const items = list.items.map((item) => serializeBareItem(item.value) + serializeParameters(item.params));
  return `(${items.join(' ')})${serializeParameters(list.params)}`;
}
