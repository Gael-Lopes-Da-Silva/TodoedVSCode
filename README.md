<div align="center">
	<h1>Todoed</h1>
</div>

<div align="center">
	<img width="400px" src="./resources/logo.png" alt="">
</div>

<div align="center">
    <a href="https://github.com/Gael-Lopes-Da-Silva/TodoedVSCode">https://github.com/Gael-Lopes-Da-Silva/TodoedVSCode</a>
</div>

<br>

<div align="center">
	<img src="https://img.shields.io/visual-studio-marketplace/r/gael-lopes-da-silva.todoed?style=for-the-badge&labelColor=000000" alt="">
	<img src="https://img.shields.io/visual-studio-marketplace/i/gael-lopes-da-silva.todoed?style=for-the-badge&labelColor=000000" alt="">
	<img src="https://img.shields.io/visual-studio-marketplace/d/gael-lopes-da-silva.todoed?style=for-the-badge&labelColor=000000" alt="">
</div>

<div align="center">
	<a href="./LICENSE.md">
		<img src="https://img.shields.io/badge/license-BSD%203--Clause-blue?style=for-the-badge&labelColor=000000" alt="">
	</a>
</div>

Description
------------------------------------------------------------------

Todoed is a simple extension to highlight keywords like TODO, FIXME, NOTE... I have added some options to modify the keywords and their colors.

If you find any bugs or have suggestions, fell free to report it [here](https://github.com/Gael-Lopes-Da-Silva/TodoedVSCode/issues/new/choose). This would help me a lot.


Options
------------------------------------------------------------------

Todoed has 2 command available right now. `Todoed: Toggle Hightlight` that turn on or off the keywords highlight and `Todoed: List Keywords` that give you a list of all keywords in the document and their position.

The following is the default configuration.
~~~json
{
	"todoed.keywords": { // Keywords and thier color
		"BUG": "#FF3333", // could also be rgb or rgba colors like rgb(255, 51, 51) or rgba(255, 51, 51, 50%)
		"FIXME": "#FF3333", // you can use regexp as keyword like FIXME-\\d+ to highlight FIXME-numbers
		"HACK": "#FF00FF",
		"INFO": "#1E90FF",
		"NOTE": "#1E90FF",
		"TODO": "#FF3333",
		"WIP": "#A9A9A9",
		"XXX": "#FF00FF"
	},
	"todoed.borderRadius": 0, // Raduis of the keyword background if set to true
	"todoed.isBold": true, // Enable or disable bold font
	"todoed.isItalic": false, // Enable or disable italic text decoration
	"todoed.isUnderline": false, // Enable or disable underline text decoration
	"todoed.keywordColor": "#000000", // Keywords color if background and foreground are set to true
	"todoed.showBackground": false, // Enable or disable keywords background
	"todoed.showForeground": true, // Enable or disable keywords foreground
	"todoed.highlight": true, // Enable or disable todoed
    "todoed.maxFileSize": 1000000, // The maximum file size to work with (1mb)
    "todoed.maxLineCount": 10000, // The maximum number of line to work with
}
~~~


Screenshots
------------------------------------------------------------------

![](./screenshots/todoed_1.png)
![](./screenshots/todoed_2.png)


How to build
------------------------------------------------------------------

If you want a build of Todoed you can find it in the release section or in the [build](./build/) folder. Else use `vsce package` in the project folder.


How to install
------------------------------------------------------------------

To install, open visual studio code and go to the extention menu. Click on the three dots and click on `Install from VSIX` and choose the `todoed-X.X.X.vsix` file. Or just install it on the market place.