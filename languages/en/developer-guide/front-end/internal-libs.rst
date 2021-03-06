.. _dev-internal-libs:

Internal Javascript Libraries
=============================

In which situation do I need a library ?
----------------------------------------

- When you need to share code between two apps or endpoints
- When the shared code **does not** use dynamic import
- When the shared code has at least one NPM dependency
- When the shared code needs translated strings (gettext)
- When you want a common endpoint to include Javascript and CSS styles
- When you need to share code between a TypeScript app and a plain Javascript app
- When you want to share a Vue component

When NOT to create a library ?
------------------------------

- When the code uses dynamic import, for example to load polyfills or translations. In this case,
  use a standard webpack configuration
- When you need to output a file with a revision hash in its name, for example ``my-lib-name-0123456aea.js``.
  In this case, use a standard webpack configuration.

Folder structure of an internal library
---------------------------------------

Create a ``scripts/lib/`` folder in Tuleap Core or in the plugin where code is shared:

 .. code-block:: sh

    # In core
    $> mkdir -p tuleap/src/scripts/lib/my-lib-name/ && cd tuleap/src/scripts/lib/my-lib-name/
    # In a plugin
    $> mkdir -p tuleap/plugins/my-plugin/scripts/lib/my-lib-name/ && cd tuleap/plugins/my-plugin/scripts/lib/my-lib-name/

Here is the folder structure you should follow:

 .. code-block:: sh

    my-plugin/
     |-- build-manifest.json # Edit it to declare your lib for translations
     |-- scripts/
          |-- lib/
               |-- my-lib-name/
                    |-- .gitignore          # Exclude dist/ from git
                    |-- jest.config.js      # Unit tests bootstrapping
                    |-- package.json        # Declares the library name, its dependencies and its build scripts.
                    |-- package-lock.json   # Generated by npm. Never edit manually.
                    |-- tsconfig.json       # Typescript configuration
                    |-- webpack.common.js   # Webpack configuration to build the App
                    |-- webpack.dev.js      # Inherits webpack configuration for production
                    |-- webpack.prod.js     # Inherits webpack configuration for development
                    |-- dist/                               # Generated assets. Must be excluded from git
                         |-- my-lib-name.js                 # Javascript bundle, it is referenced in "main" in package.json
                         |-- my-lib-name-style.css          # CSS bundle, it is referenced in "style" in package.json
                         |-- src/
                              |--index.d.ts                 # Typescript declarations for the entrypoint, it is referenced in "types" in package.json
                              |-- subfolder/
                                   |-- my-other-source.d.ts # Other source files also generate Typescript declarations. They are not used.
                    |-- po/                                 # Localization strings
                         |-- fr_FR.po                       # Localized strings for French
                    |-- src/                                # The lib source-code
                         |-- index.ts                       # Entrypoint for your library
                         |-- subfolder/
                              |-- my-other-source.ts
                    |-- themes/                             # The lib styles
                         |-- style.scss                     # Entrypoint for your library styles

Build your internal library
---------------------------

The build system will read ``build-manifest.json`` to understand how and where it needs to extract translated strings.

 .. code-block:: JavaScript

    // tuleap/plugins/my-plugin/build-manifest.json
    {
        "name": "my-plugin",
        "gettext-ts": {
            "my-lib-name": {
                "src": "src/scripts/lib/my-lib-name/src",
                "po": "src/scripts/lib/my-lib-name/po"
            }
        }
    }

To build up your application, you will have to create a ``webpack.common.js`` file.
This file should be located in ``my-lib-name/``.

 .. code-block:: JavaScript

    // tuleap/plugins/my-plugin/scripts/lib/my-lib-name/webpack.config.js
    const path = require("path");
    const webpack_configurator = require("../../../../../tools/utils/scripts/webpack-configurator.js");
    const FixStyleOnlyEntriesPlugin = require("../../../../../node_modules/webpack-fix-style-only-entries");
    const MiniCssExtractPlugin = require("../../../../../node_modules/mini-css-extract-plugin");

    const context = __dirname;

    const webpack_config = {
        entry: {
            "my-lib-name": "./src/index.ts",
            "my-lib-name-style": "./themes/style.scss",
        },
        context,
        output: {
            path: path.join(context, "./dist/"),
            library: "MyLibName",
            libraryTarget: "umd",
        },
        resolve: {
            extensions: [".js", ".ts"],
        },
        module: {
            rules: [
                ...webpack_configurator.configureTypescriptLibraryRules(
                    webpack_configurator.babel_options_ie11
                ),
                webpack_configurator.rule_po_files,
                webpack_configurator.rule_scss_loader,
            ],
        },
        plugins: [
            webpack_configurator.getCleanWebpackPlugin(),
            new FixStyleOnlyEntriesPlugin({
                extensions: ["scss", "css"],
                silent: true,
            }),
            new MiniCssExtractPlugin(),
        ],
    };

    module.exports = [webpack_config];

Once you have a webpack config, you will need a ``package.json`` in ``my-lib-name/``.

 .. code-block:: JavaScript

    // tuleap/plugins/my-plugin/scripts/lib/my-lib-name/package.json
    {
      "author": "Enalean Team",                   // or yourself
      "name": "@tuleap/my-lib-name",
      "homepage": "https://tuleap.org",           // or your lib's homepage
      "license": "GPL-2.0-or-later",              // or your license
      "private": true,
      "version": "0.0.0",
      "main": "dist/my-lib-name.js",              // The Javascript bundle of your lib
      "types": "dist/src/index.d.ts",             // The Typescript declarations for the endpoint of your lib
      "style": "dist/my-lib-name-style.css",      // The CSS bundle of your lib
      "dependencies": {
        "dompurify": "^2.2.2"
      },
      "devDependencies": {},
      "config": {
        "bin": "../../../../../node_modules/.bin" // This should point to the node_modules/.bin folder in tuleap/ root folder
      },
      "scripts": {
        "build": "$npm_package_config_bin/webpack --config webpack.prod.js",
        "watch": "$npm_package_config_bin/webpack --config webpack.dev.js --watch",
        "test": "$npm_package_config_bin/jest"
      }
    }

.. NOTE:: All the webpack/jest dependencies are available at the tuleap root folder, hence the ``config.bin``.

Use the npm scripts to build the library or to launch the unit tests.

 .. code-block:: sh

    npm run build # For a production build, outputs minified code.
    npm run watch # Build the lib in watch mode.
    npm test      # Run the Jest unit tests only once.

 .. warning::

    In order to test the library in real conditions (with your browser), you
    need to also include it in an application AND also rebuild that application.

Once you have a ``package.json`` file, you will also need a ``tsconfig.json``
file to configure Typescript.

 .. code-block:: JavaScript

    // tuleap/plugins/my-plugin/scripts/lib/my-lib-name/tsconfig.json
    {
        "extends": "../../../../../tools/utils/scripts/tsconfig-for-libraries.json",
        "compilerOptions": {
            "lib": ["ES2015"],  // Add values like "DOM" if your lib interacts with the DOM
            "outDir": "dist/"
        },
        "include": ["src/**/*"]
    }

You also need a Jest config, but this one has nothing special.

 .. code-block:: Javascript

    // tuleap/plugins/my-plugin/scripts/lib/my-lib-name/jest.config.js
    const base_config = require("../../../../../tests/jest/jest.base.config.js");

    module.exports = {
        ...base_config,
        displayName: "my-lib-name",
    };

Add a ``.gitignore`` file to remove the ``dist/`` folder from source control.
It contains only generated files and should not be committed.

 .. code-block:: text

    // tuleap/plugins/my-plugin/scripts/lib/my-lib-name/.gitignore
    dist/

If you have gettext translations with node-gettext, you will need a
``pofile-shim.d.ts`` so that TypeScript understands what is returned by ``import "file.po"``.

 .. code-block:: Typescript

    // tuleap/plugins/my-plugin/scripts/lib/my-lib-name/src/pofile-shim.d.ts
    declare module "*.po" {
        // See https://github.com/smhg/gettext-parser for the file format reference
        interface Translation {
            readonly msgid: string;
            readonly msgstr: string;
        }

        interface TranslatedStrings {
            readonly [key: string]: Translation;
        }

        export interface Contexts {
            readonly [key: string]: TranslatedStrings;
        }

        export interface GettextParserPoFile {
            readonly translations: Contexts;
        }

        const content: GettextParserPoFile;
        export default content;
    }

Finally, your ``index.ts`` file (the lib entrypoint) should export types that
callers will need. Exporting them will ensure that the generated ``index.d.ts``
declaration file references those types.

 .. code-block:: Typescript

    // tuleap/plugins/my-plugin/scripts/lib/my-lib-name/src/index.ts
    import { MyType, MyOtherType } from "./types";

    export { MyType, MyOtherType };
    export function myFunction(param: MyType): MyOtherType {
        //...
    }


Use your library from another application
-----------------------------------------

To use your library from another application, you must first declare it as a
dependency in the app's ``package.json`` file.

 .. code-block:: Javascript

    // tuleap/plugins/other-plugin/package.json
    {
      "name": "@tuleap/other-plugin",
      // ...
      "dependencies": {
        "@tuleap/my-lib-name": "file:../my-plugin/scripts/lib/my-lib-name" // Add your lib as a dependency. Reference it with file: protocol to create a symlink
      },
      "scripts": {
        "build": "...",
        "postshrinkwrap": "php ../../tools/utils/scripts/clean-lockfile-from-local-tuleap-dep.php \"$(pwd)\"" // Don't forget to add this script, otherwise package-lock.json will copy all your lib's dependencies
      }
    }

Use the library like any other "npm module" in Javascript / Typescript files:

 .. code-block:: Typescript

    // tuleap/plugins/other-plugin/scripts/other-app/src/other-file.ts
    import { myFunction, MyOtherType } from "@tuleap/my-lib-name";

    const result: MyOtherType = myFunction(param);

Import the CSS styles like any other "npm module" in SCSS files:

 .. code-block:: SCSS

    // tuleap/plugins/other-plugin/themes/BurningParrot/src/other-file.scss
    @import '~@tuleap/my-lib-name';

Making changes to your library
------------------------------

 .. warning::

    While working on your library, changes will NOT be automatically visible
    from the application. Both the library and the application MUST be rebuilt
    in order to see your changes.

 .. code-block:: sh

    $> (cd tuleap/plugins/my-plugin/scripts/lib/my-lib-name/ && npm run watch)
    # In another terminal usually
    $> (cd tuleap/plugins/other-plugin/ && npm run watch)
