import { describe, it, expect } from 'vitest';
import { createHash, generateKeyPairSync, sign as nodeSign, type KeyObject } from 'node:crypto';
import { httpbis } from 'http-message-signatures';
import { verifyRfc9421 } from '../webhooks/verify.js';
import { parseDictionary, serializeInnerList } from '../webhooks/structured-fields.js';

/**
 * The RFC 9421 verifier parses Signature-Input and Signature itself. These
 * tests hold it to an independent implementation (`http-message-signatures`,
 * a dev dependency only) for what that library signs, and pin the cases where
 * the SDK is deliberately stricter.
 */

const IDK = 'x-agledger-idempotency-key';
const body = '{"type":"signal.emitted","data":{"recordId":"rec-1"},"id":"evt-1"}';
const digest = `sha-256=:${createHash('sha256').update(body, 'utf8').digest('base64')}:`;
const idem = '11111111-2222-3333-4444-555555555555';
const ed = generateKeyPairSync('ed25519');
const edSpki = ed.publicKey.export({ format: 'der', type: 'spki' }).toString('base64');
const p256 = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
const p256Spki = p256.publicKey.export({ format: 'der', type: 'spki' }).toString('base64');
const now = () => Math.floor(Date.now() / 1000);

function signRaw(privateKey: KeyObject, base: string): string {
  const sig = privateKey.asymmetricKeyType === 'ed25519'
    ? nodeSign(null, Buffer.from(base, 'utf8'), privateKey)
    : nodeSign('sha256', Buffer.from(base, 'utf8'), { key: privateKey, dsaEncoding: 'ieee-p1363' });
  return sig.toString('base64');
}

/** Sign a delivery by hand: `params` is the inner list exactly as sent. */
function deliver(params: string, privateKey: KeyObject = ed.privateKey, label = 'sig1', signedParams = params) {
  const base = [`"content-digest": ${digest}`, `"${IDK}": ${idem}`, `"@signature-params": ${signedParams}`].join('\n');
  return {
    'content-digest': digest,
    [IDK]: idem,
    'signature-input': `${label}=${params}`,
    signature: `${label}=:${signRaw(privateKey, base)}:`,
  };
}

const covered = `("content-digest" "${IDK}")`;

describe('RFC 9421 verification against an independent signer', () => {
  it('verifies what http-message-signatures signs, Ed25519 and ES256', async () => {
    for (const [privateKey, alg, spki] of [[ed.privateKey, 'ed25519', edSpki], [p256.privateKey, 'ecdsa-p256-sha256', p256Spki]] as const) {
      const signed = await httpbis.signMessage(
        {
          key: { id: 'k1', alg, sign: async (data: Buffer) => Buffer.from(signRaw(privateKey, data.toString('utf8')), 'base64') },
          fields: ['content-digest', IDK],
          params: ['created', 'keyid', 'alg'],
        },
        { method: 'POST', url: 'https://receiver.example/hook', headers: { 'content-digest': digest, [IDK]: idem } },
      );
      expect(await verifyRfc9421(signed.headers as Record<string, string>, body, spki), alg).toBe(true);
    }
  });
});

describe('RFC 9421 Signature-Input handling', () => {
  const p = (extra = '') => `${covered};created=${now()};keyid="k1";alg="ed25519"${extra}`;

  it('accepts the Server shape', async () => {
    expect(await verifyRfc9421(deliver(p()), body, edSpki)).toBe(true);
  });

  it('accepts parameters it does not use, signed as sent, in any order', async () => {
    expect(await verifyRfc9421(deliver(p(';nonce="abc";tag="agledger"')), body, edSpki)).toBe(true);
    expect(await verifyRfc9421(deliver(`${covered};keyid="k1";alg="ed25519";created=${now()}`), body, edSpki)).toBe(true);
  });

  it('rebuilds @signature-params from the parsed value, so non-canonical spacing verifies against the canonical form', async () => {
    const canonical = p();
    const spaced = canonical.replace('("content-digest" ', '(  "content-digest"   ').replace('")', '" )');
    expect(await verifyRfc9421(deliver(spaced, ed.privateKey, 'sig1', canonical), body, edSpki)).toBe(true);
  });

  it('verifies when one of several signatures is ours, such as beside an intermediary signature', async () => {
    const ours = deliver(p());
    const other = generateKeyPairSync('ed25519');
    const theirs = deliver(`("${IDK}");created=${now()};keyid="proxy"`, other.privateKey, 'proxy');
    const headers = {
      ...ours,
      'signature-input': `${theirs['signature-input']}, ${ours['signature-input']}`,
      signature: `${theirs.signature}, ${ours.signature}`,
    };
    expect(await verifyRfc9421(headers, body, edSpki)).toBe(true);
    // The intermediary's signature alone is not ours.
    expect(await verifyRfc9421({ ...ours, 'signature-input': theirs['signature-input'], signature: theirs.signature }, body, edSpki)).toBe(false);
  });

  it('refuses a signature whose label has no matching Signature member', async () => {
    const d = deliver(p());
    expect(await verifyRfc9421({ ...d, signature: d.signature.replace('sig1=', 'sig2=') }, body, edSpki)).toBe(false);
  });

  it('refuses a declared alg the key does not carry', async () => {
    expect(await verifyRfc9421(deliver(`${covered};created=${now()};keyid="k1";alg="ecdsa-p256-sha256"`), body, edSpki)).toBe(false);
    expect(await verifyRfc9421(deliver(`${covered};created=${now()};keyid="k1";alg="ed25519"`, p256.privateKey), body, p256Spki)).toBe(false);
  });

  it('holds expires when present', async () => {
    expect(await verifyRfc9421(deliver(p(`;expires=${now() + 60}`)), body, edSpki)).toBe(true);
    expect(await verifyRfc9421(deliver(p(`;expires=${now() - 400}`)), body, edSpki)).toBe(false);
  });

  it('requires created as an Integer and keyid as a String', async () => {
    expect(await verifyRfc9421(deliver(`${covered};created="${now()}";keyid="k1"`), body, edSpki)).toBe(false);
    expect(await verifyRfc9421(deliver(`${covered};created=${now()};keyid=k1`), body, edSpki)).toBe(false);
    expect(await verifyRfc9421(deliver(`${covered};created=${now()}`), body, edSpki)).toBe(false);
    expect(await verifyRfc9421(deliver(`${covered};keyid="k1"`), body, edSpki)).toBe(false);
  });

  it('covers exactly content-digest then the idempotency key, with no component parameters', async () => {
    const t = `;created=${now()};keyid="k1"`;
    expect(await verifyRfc9421(deliver(`("${IDK}" "content-digest")${t}`), body, edSpki)).toBe(false);
    expect(await verifyRfc9421(deliver(`("content-digest";sf "${IDK}")${t}`), body, edSpki)).toBe(false);
    expect(await verifyRfc9421(deliver(`("content-digest" "${IDK}" "@method")${t}`), body, edSpki)).toBe(false);
    expect(await verifyRfc9421(deliver(`("content-digest")${t}`), body, edSpki)).toBe(false);
  });

  it('refuses an ES256 signature that is not 64 bytes', async () => {
    const d = deliver(`${covered};created=${now()};keyid="k1";alg="ecdsa-p256-sha256"`, p256.privateKey);
    const short = Buffer.from(d.signature.slice('sig1=:'.length, -1), 'base64').subarray(0, 63).toString('base64');
    expect(await verifyRfc9421({ ...d, signature: `sig1=:${short}:` }, body, p256Spki)).toBe(false);
  });

  it('refuses fields that are not RFC 8941 dictionaries', async () => {
    const d = deliver(p());
    for (const bad of ['sig1=', 'sig1=:not base64!:', 'Sig1=:AAAA:', 'sig1=:AAAA:,', 'sig1=:AAAA: sig2=:AAAA:']) {
      expect(await verifyRfc9421({ ...d, signature: bad }, body, edSpki), bad).toBe(false);
    }
    for (const bad of [`sig1=${covered};created=1.5;keyid="k1"`, `sig1=${covered};created=${now()};keyid="k\\1"`, 'sig1=("content-digest"']) {
      expect(await verifyRfc9421({ ...d, 'signature-input': bad }, body, edSpki), bad).toBe(false);
    }
  });
});

describe('structured-fields', () => {
  it('round-trips an inner list canonically', () => {
    const dict = parseDictionary('sig1=(  "a"   "b";x=1 );created=17;keyid="k\\"1";t=tok/en;f=?0;b=:AAE=:;flag');
    const member = dict?.get('sig1');
    expect(member?.kind).toBe('inner-list');
    if (member?.kind !== 'inner-list') return;
    expect(serializeInnerList(member)).toBe('("a" "b";x=1);created=17;keyid="k\\"1";t=tok/en;f=?0;b=:AAE=:;flag');
  });

  it('keeps the last of a repeated key, as RFC 8941 specifies', () => {
    const member = parseDictionary('a=1, a=2')?.get('a');
    expect(member?.kind === 'item' ? member.value : null).toBe(2);
  });

  it('refuses what is not a dictionary', () => {
    for (const bad of ['', ' , ', 'A=1', 'a=1,', 'a=1 b=2', 'a="unterminated', 'a=1234567890123456', 'a=1.0', 'a=?2', 'a=(1 2']) {
      expect(parseDictionary(bad) === null || bad === '', bad).toBe(true);
    }
    expect(parseDictionary('')?.size).toBe(0);
  });
});
