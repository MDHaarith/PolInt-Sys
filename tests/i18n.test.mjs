import assert from 'node:assert/strict';
import test from 'node:test';
import { LANGUAGES, SPEECH_LOCALE, STRINGS, strings } from '../src/i18n.js';

test('every interface string exists in English and Tamil, with the same shape', () => {
  for (const key of Object.keys(STRINGS.en)) {
    for (const language of LANGUAGES) {
      assert.ok(key in STRINGS[language], `${language} is missing ${key}`);
      assert.equal(typeof STRINGS[language][key], typeof STRINGS.en[key], `${language}.${key} has another type`);
      const value = STRINGS[language][key];
      const text = typeof value === 'function' ? value(2) : value;
      assert.ok(typeof text === 'string' && text.length > 0, `${language}.${key} is empty`);
    }
  }
  assert.deepEqual(Object.keys(STRINGS.ta).sort(), Object.keys(STRINGS.en).sort());
  assert.match(strings('ta').navAsk, /\p{Script=Tamil}/u);
  assert.equal(strings('fr'), STRINGS.en);
  assert.deepEqual(Object.keys(SPEECH_LOCALE).sort(), [...LANGUAGES].sort());
});
