# PostCSS Plugin Custom Variations

[PostCSS] plugin for generating preset variations of a given rule.

[PostCSS]: https://github.com/postcss/postcss

```css
/* Input example */
.black {
    color: white;
    background: black;
    @variation hover;
}
```

```css
/* Output example */
.black {
    color: white;
    background: black;
}
.black\@hover:hover {
    color: white;
    background: black;
}
```

## Usage

Check you project for existed PostCSS config: `postcss.config.js`
in the project root, `"postcss"` section in `package.json`
or `postcss` in bundle config.

If you already use PostCSS, add the plugin to plugins list:

```diff
module.exports = {
  plugins: [
+   require('postcss-plugin-custom-variations'),
    require('autoprefixer')
  ]
}
```

If you do not use PostCSS, add it according to [official docs]
and set this plugin in settings.

[official docs]: https://github.com/postcss/postcss#usage
