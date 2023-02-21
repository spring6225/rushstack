import path from 'path';
import EmbeddedDependenciesWebpackPlugin from '../';

import { LICENSE_FILES_REGEXP, COPYRIGHT_REGEX } from '../regexpUtils';

import { Testing } from '@rushstack/webpack-plugin-utilities';
import { FileSystem } from '@rushstack/node-core-library';

const TESTS_FOLDER_PATH: string = path.resolve(path.join(process.cwd(), 'src', 'test'));
const FIXTURES_FOLDER_PATH: string = path.resolve(path.join(TESTS_FOLDER_PATH, 'fixtures'));
const FAKE_NODE_MODULES_FOLDER_PATH: string = path.resolve(path.join(TESTS_FOLDER_PATH, 'node_modules'));

const fixtures: string[] = FileSystem.readFolderItemNames(FIXTURES_FOLDER_PATH);

console.log(`Fixtures: ${fixtures}`);

const defaultConfigurationWithPlugin = {
  context: TESTS_FOLDER_PATH,
  plugins: [new EmbeddedDependenciesWebpackPlugin()]
};

const defaultConfigurationCustomOutputFileName = {
  context: TESTS_FOLDER_PATH,
  plugins: [new EmbeddedDependenciesWebpackPlugin({ outputFileName: 'custom-file-name.json' })]
};

const configurationWithLicenseFileGenerated = {
  context: TESTS_FOLDER_PATH,
  plugins: [new EmbeddedDependenciesWebpackPlugin({ generateLicenseFile: true })]
};

describe('COPYRIGHT_REGEX', () => {
  it('should extract the right copyright from apache 2.0 license', () => {
    const license = FileSystem.readFile(
      path.join(FAKE_NODE_MODULES_FOLDER_PATH, 'fake-package-apache-with-copyleft-dep', 'LICENSE.txt')
    );
    const match = license.match(COPYRIGHT_REGEX);

    expect(match).toBeDefined();
    expect(match?.[0]).toBe('Copyright 2023 Fake Package Apache License w/ AGPL Transitive');
  });

  it('should extract the right copyright from mit license', () => {
    const license = FileSystem.readFile(
      path.join(FAKE_NODE_MODULES_FOLDER_PATH, 'fake-package-mit-license', 'LICENSE-MIT.txt')
    );
    const match = license.match(COPYRIGHT_REGEX);

    expect(match).toBeDefined();
    expect(match?.[0]).toBe('Copyright © 2023 FAKE-PACKAGE-MIT-LICENSE');
  });

  it('should extract the right copyright from agpl license', () => {
    const license = FileSystem.readFile(
      path.join(FAKE_NODE_MODULES_FOLDER_PATH, 'fake-package-agpl-license', 'LICENSE')
    );
    const match = license.match(COPYRIGHT_REGEX);

    expect(match).toBeDefined();
    expect(match?.[0]).toBe('Copyright (C) 2007 Free Software Foundation, Inc. <https://fsf.org/>');
  });

  it('should extract the right copyright from agpl license', () => {
    const license = FileSystem.readFile(
      path.join(FAKE_NODE_MODULES_FOLDER_PATH, 'fake-package-copyleft-license', 'license')
    );
    const match = license.match(COPYRIGHT_REGEX);

    expect(match).toBeDefined();
    expect(match?.[0]).toBe('Copyright (C) 2007 Free Software Foundation, Inc. <https://fsf.org/>');
  });
});

describe('LICENSE_FILES_REGEXP', () => {
  for (const filename of ['LICENSE', 'LICENSE-MIT.txt', 'LICENSE.md', 'LICENSE.txt', 'license']) {
    it(`should match ${filename}`, () => {
      expect(LICENSE_FILES_REGEXP.test(filename)).toBe(true);
    });
  }
});

for (const fixture of fixtures) {
  describe('WebpackEmbeddedDependenciesPlugin', () => {
    it('should run', async () => {
      const stats = await Testing.getTestingWebpackCompiler(
        `./fixtures/${fixture}/src`,
        defaultConfigurationWithPlugin
      );

      expect(stats).toBeDefined();
    });

    it('should generate a secondary asset with the correct default name', async () => {
      const stats = await Testing.getTestingWebpackCompiler(
        `./fixtures/${fixture}/src`,
        defaultConfigurationWithPlugin
      );
      const embeddedDepAsset = stats
        ?.toJson({ all: false, assets: true })
        .assets?.some((asset) => asset.name === 'embedded-dependencies.json');

      expect(embeddedDepAsset).toBe(true);
    });

    it('should generate a secondary asset with a custom outputFileName', async () => {
      const stats = await Testing.getTestingWebpackCompiler(
        `./fixtures/${fixture}/src`,
        defaultConfigurationCustomOutputFileName
      );
      const embeddedDepAsset = stats
        ?.toJson({ all: false, assets: true })
        .assets?.some((asset) => asset.name === 'custom-file-name.json');

      expect(embeddedDepAsset).toBe(true);
    });

    it('should generate a tertiary asset if generating a license file', async () => {
      const stats = await Testing.getTestingWebpackCompiler(
        `./fixtures/${fixture}/src`,
        configurationWithLicenseFileGenerated
      );
      const embeddedDepAsset = stats
        ?.toJson({ all: false, assets: true })
        .assets?.some((asset) => asset.name === 'THIRD-PARTY-NOTICES.html');

      // No dependencies fixture should not generate a license file
      // and emit a warning so we'll exclude it here, but also should test separately
      if (fixture !== 'no-dependencies') {
        expect(embeddedDepAsset).toBe(true);
      }
    });
  });

  switch (fixture) {
    case 'dependencies-with-copyleft-licenses':
      break;
    case 'dependencies-with-licenses':
      break;
    case 'dependencies-with-transient-copyleft-license':
      break;
    case 'no-dependencies':
      it('should emit a warning if there are no third party deps but license generation is set to true', async () => {
        const stats = await Testing.getTestingWebpackCompiler(
          `./fixtures/${fixture}/src`,
          configurationWithLicenseFileGenerated
        );

        const warnings = stats?.toJson({ all: false, warnings: true }).warnings;

        expect(warnings).toBeDefined();
        expect(warnings?.length).toBe(1);
        expect(warnings?.[0].message).toContain('[embedded-dependencies-webpack-plugin]');
        expect(warnings?.[0].message).toContain('No third party dependencies were found');
      });

      break;
    default:
      break;
  }
}
