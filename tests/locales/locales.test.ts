import fs from 'fs';
import path from 'path';

describe('i18n locales integrity & parity', () => {
  const localesDir = path.resolve(__dirname, '../../src/locales');
  const esDir = path.join(localesDir, 'es');
  const enDir = path.join(localesDir, 'en');

  const namespaces = [
    'auth',
    'common',
    'create',
    'errors',
    'feed',
    'landing',
    'profile',
    'search',
    'settings',
  ];

  it('should have headerTitle and headerSubtitle in create namespace', () => {
    const esCreate = JSON.parse(
      fs.readFileSync(path.join(esDir, 'create.json'), 'utf-8')
    );
    const enCreate = JSON.parse(
      fs.readFileSync(path.join(enDir, 'create.json'), 'utf-8')
    );

    expect(esCreate.headerTitle).toBe('Crear Dato Curioso');
    expect(esCreate.headerSubtitle).toBe('Comparte algo interesante con el mundo');
    expect(enCreate.headerTitle).toBe('Create Fact');
    expect(enCreate.headerSubtitle).toBe('Share something interesting with the world');
  });

  namespaces.forEach((ns) => {
    it(`should maintain exact key parity for namespace "${ns}" between es and en`, () => {
      const esPath = path.join(esDir, `${ns}.json`);
      const enPath = path.join(enDir, `${ns}.json`);

      expect(fs.existsSync(esPath)).toBe(true);
      expect(fs.existsSync(enPath)).toBe(true);

      const esJson = JSON.parse(fs.readFileSync(esPath, 'utf-8'));
      const enJson = JSON.parse(fs.readFileSync(enPath, 'utf-8'));

      const esKeys = Object.keys(esJson).sort();
      const enKeys = Object.keys(enJson).sort();

      const missingInEn = esKeys.filter((k) => !enKeys.includes(k));
      const missingInEs = enKeys.filter((k) => !esKeys.includes(k));

      expect(missingInEn).toEqual([]);
      expect(missingInEs).toEqual([]);
      expect(esKeys).toEqual(enKeys);
    });
  });
});
