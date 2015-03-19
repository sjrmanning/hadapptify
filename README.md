<p align="center">
  <img src="https://raw.githubusercontent.com/stafu/hadapptify/master/public/images/logo.png">
</p>

## Setup and Prerequisites
* Update config.js with your Spotify or Facebook username and password.
* Install libspotify. You can do this via homebrew but you'll need to tap the homebrew binary keg by running `brew tap homebrew/binary`. You can then install libspotify by running `brew install libspotify`. You may need to symbolic link the .dylib file to where node-spotify looks for it (you'll get a message about it after running npm start).

## Running
Run `npm install` then start server with `npm start`

## TODO
* Admin (managing queue, pausing, skipping, etc.)
* Flag/reporting, removing from queue by crowd majority.
* Show progress through current song?
* Now playing equalisier CSS animation.
* Album cover art ?
* Real user accounts and user persistence.
