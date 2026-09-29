# Fonts

`jersey-10.woff2` and `jersey-15.woff2` are **Jersey 10** and **Jersey 15** by
Sarah Cadigan-Fried, from Google Fonts, under the SIL Open Font License 1.1
(free to use, embed and ship in games). The other `.woff2` files here were
candidates that were tried and not used.

`bake.js` finds the size where one design pixel is one screen pixel and bakes
every glyph into bitmap rows. The result is `js2/font_hi.js`:

    node tools/fonts/bake.js tools/fonts/jersey-10.woff2 19 > tools/fonts/jersey-10.json
    node tools/fonts/bake.js tools/fonts/jersey-15.woff2 27 > tools/fonts/jersey-15.json
