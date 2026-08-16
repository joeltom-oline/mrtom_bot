# JOEL TOM BOT v3.0.0

## Installation Termux

```bash
pkg update -y
pkg install nodejs git -y
cd ~/joel-tom-bot
npm install
node index.js
```

## Important

Avant le premier lancement, ouvre `index.js` et remplace :

const OWNER_NUMBER = '2376XXXXXXXX'

par ton numéro WhatsApp sans `+`, espaces ou caractères.

Exemple :
const OWNER_NUMBER = '237612345678'

Le QR apparaîtra dans Termux.

Commandes principales :
.menu
.pmenu
.gmenu
.aide
.ping
.info
.setlogo
.supprimer on/off
.en ligne on/off
.like on/off
.like emoji 😂
.antigst on/off
.agst on/off
.welcome on/off
.add 2376XXXXXXXX
.kick @membre
.tagall
.open
.close
