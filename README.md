# CrossPoint Sleep Screen Text Utility

https://rosefae.github.io/crosspoint-sleep-screen-text-utility/

Have your Xteink / CrossPoint device display some useful text when it sleeps. Probably no one wants this but me.

This is meant to be a standalone web utility that generates the `sleep.bmp` file, which you then have to put on to the root of the SD card yourself. There will in future also be a fork of the Crosspoint firmware to include this in the file transfer web server, which would automatically put the bitmap where it needs to go and therefore allow users to essentially update the text on fly with their phone or laptop.

## Possible future features

- Font drop down to select different fonts. Probably just a small list of different fonts instead of polling the whole of Google Fonts.
- Improve bitmap saving to maybe be smaller / grayscale channels only
- Apply dithering somehow to better work with the hardware display
- PWA? Would need to serve the fonts locally instead of using Google Fonts API
