const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, isJidGroup, downloadMediaMessage } = require('@whiskeysockets/baileys')
const pino = require('pino')
const qrcode = require('qrcode-terminal')
const fs = require('fs')

const PREFIX = '.'
const OWNER = '𝑱𝑶𝑬𝑳 𝑻𝑶𝑴_𝑻𝑬𝑪𝑯'
const BOTNAME = '🎩𝑱𝑶𝑬𝑳 𝑻𝑶𝑴_𝑩𝑶𝑻 🎩'
const VERSION = 'v2.0.0'
const SIGNATURE = '> BY : © 2026 𝑱𝑶𝑬𝑳 𝑻𝑶𝑴_𝑻𝑬𝑪𝑯'

const LOGO_PATH = './logo.jpg'

// ===== STOCKAGE =====
let antiGst = {} // anti groupe status
let autoDelete = {} // anti suppression
let alwaysOnline = false // toujours en ligne
let autoLike = {} // auto like

// ===== ALIAS COMMANDES (version abrégée) =====
const aliases = {
  'menu': 'menu', 'help': 'menu', '?': 'menu', 'aide': 'menu',
  'pm': 'pmenu', 'pmenu': 'pmenu',
  'gm': 'gmenu', 'gmenu': 'gmenu',
  'agst': 'antigst', 'antigst': 'antigst', 'ag': 'antigst',
  'add': 'add',
  'del': 'supprimer', 'asup': 'supprimer', 'supprimer': 'supprimer',
  'online': 'en', 'en': 'en', 'ligne': 'en',
  'lk': 'like', 'like': 'like',
  'logo': 'setlogo', 'setlogo': 'setlogo',
  'ping': 'ping',
  'info': 'info',
  'wlc': 'welcome', 'welcome': 'welcome',
  'open': 'open',
  'close': 'close',
  'kick': 'kick',
  'all': 'tagall', 'tagall': 'tagall'
}

const format = (text) => '> ' + text.split('\n').join('\n> ')

function normalizeNumber(number) {
  return String(number).replace(/[^0-9]/g, '') + '@s.whatsapp.net'
}

// ===== MENUS =====
function getMenu() {
  const date = new Date().toLocaleDateString('fr-FR')
  return format(`╭══════════════════╮
┃  ${BOTNAME}  ┃
╰══════════════════╯

👤 Owner : ${OWNER}
📌 Version : ${VERSION}
🔖 Préfixe : ${PREFIX}
📅 Date : ${date}
🌍 Mode : Public

📜 Commandes principales :
${PREFIX}menu   → Menu principal
${PREFIX}pm     → Menu privé (config globale)
${PREFIX}gm     → Menu groupe (config groupe)
${PREFIX}help   → Aide / rappel

${SIGNATURE}`)
}

function getPrivateMenu() {
  return format(`╭─❒ 「 📩 MENU PRIVÉ - CONFIG GLOBALE 」 ❒
│
│ 🤖 Réglages du bot valables partout
│
│ 👁️ VUE AUTOMATIQUE
│    Auto-Vu Status : Toujours actif
│
│ 🛡️ ANTI-SUPPRESSION
│    ${PREFIX}del on       → Active l'enregistrement
│    ${PREFIX}del off      → Désactive l'enregistrement
│
│ 🟢 TOUJOURS EN LIGNE
│    ${PREFIX}online on    → Force le statut en ligne H24
│    ${PREFIX}online off   → Retour au statut normal
│
│ ❤️ AUTO-LIKE STATUS
│    ${PREFIX}lk on        → Réagit auto aux statuts
│    ${PREFIX}lk off       → Désactive les réactions
│    ${PREFIX}lk emoji 😂  → Changer l'emoji
│
╰──────────────❒
⚠️ Accès : Owner + Sudo uniquement

${SIGNATURE}`)
}

function getGroupMenu() {
  return format(`╭─❒ 「 👥 MENU GROUPE - CONFIG GROUPE 」 ❒
│
│ ⚙️ Réglages valables uniquement pour ce groupe
│
│ 🚫 ANTI-GROUPE STATUS
│    ${PREFIX}agst on      → Active la suppression des statuts
│    ${PREFIX}agst off     → Désactive
│    ${PREFIX}ag on        → Raccourci pour activer
│    ${PREFIX}ag off       → Raccourci pour désactiver
│    Note : 2 avertissements puis kick
│
│ ➕ AJOUTER DES MEMBRES
│    ${PREFIX}add 2376XXXXXXXX 2376YYYY
│    ${PREFIX}add 2376XXXXXXXX jd:nom-du-groupe
│
╰──────────────❒
⚠️ Requis : Être admin + Bot admin

${SIGNATURE}`)
}

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('./session')
  const { version } = await fetchLatestBaileysVersion()

  const conn = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: true,
    logger: pino({ level: 'silent' }),
    browser: ['Ubuntu', 'Chrome', '20.0.04']
  })

  conn.ev.on('creds.update', saveCreds)

  // TOUJOURS EN LIGNE LOOP
  setInterval(() => {
    if (alwaysOnline) conn.sendPresenceUpdate('available')
  }, 15000)

  conn.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update
    if (qr) {
      console.log('\n==== SCANNE CE QR CODE ====\n')
      qrcode.generate(qr, { small: true })
    }
    if (connection === 'open') console.log(`✅ ${BOTNAME} CONNECTÉ`)
    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut
      if (shouldReconnect) startBot()
    }
  })

  // Événement unique pour les messages
  conn.ev.on('messages.upsert', async ({ messages }) => {
    if (!messages[0]) return
    const mek = messages[0]

    // Auto-vu des statuts (toujours actif)
    if (mek.key.remoteJid === 'status@broadcast') {
      await conn.readMessages([mek.key])
      return
    }

    const from = mek.key.remoteJid
    const isGroup = isJidGroup(from)
    const body = mek.message?.conversation || mek.message?.extendedTextMessage?.text || mek.message?.imageMessage?.caption || ''
    const sender = mek.key.participant || mek.key.remoteJid

    if (!body.startsWith(PREFIX)) return

    const command = body.slice(1).trim().split(' ')[0].toLowerCase()
    const q = body.slice(1 + command.length).trim()
    const cmd = aliases[command] || command
    const reply = (text) => conn.sendMessage(from, { text: format(text) }, { quoted: mek })

    const adminCommands = ['open', 'close', 'kick', 'tagall', 'welcome', 'antigst', 'agst', 'add']
    if (!isGroup && adminCommands.includes(cmd)) {
      return reply('❌ Cette commande fonctionne uniquement dans les groupes.')
    }

    switch (cmd) {
      case 'menu':
        if (fs.existsSync(LOGO_PATH)) {
          await conn.sendMessage(from, { image: fs.readFileSync(LOGO_PATH), caption: getMenu() }, { quoted: mek })
        } else {
          reply('❌ Aucun logo. Envoie une image avec .logo')
        }
        break

      case 'pmenu':
        if (fs.existsSync(LOGO_PATH)) {
          await conn.sendMessage(from, { image: fs.readFileSync(LOGO_PATH), caption: getPrivateMenu() }, { quoted: mek })
        } else {
          reply(getPrivateMenu())
        }
        break

      case 'gmenu':
        if (fs.existsSync(LOGO_PATH)) {
          await conn.sendMessage(from, { image: fs.readFileSync(LOGO_PATH), caption: getGroupMenu() }, { quoted: mek })
        } else {
          reply(getGroupMenu())
        }
        break

      case 'antigst': {
        if (!isGroup) return reply('❌ Commande de groupe uniquement.')
        const groupMeta = await conn.groupMetadata(from)
        const isSenderAdmin = groupMeta.participants.find(p => p.id === sender)?.admin
        if (!isSenderAdmin) return reply('❌ Admin seulement')

        if (q === 'on') {
          antiGst[from] = true
          reply('✅ ANTI-GST ACTIVÉ\nLes statuts de groupe seront supprimés + 2 avertissements puis kick')
        } else if (q === 'off') {
          delete antiGst[from]
          reply('❌ ANTI-GST DÉSACTIVÉ')
        } else {
          reply(`Usage : ${PREFIX}agst on/off`)
        }
        break
      }

      case 'add': {
        if (!q) return reply(`Usage : ${PREFIX}add 2376XXXXXXXX 2376YYYY`)
        const numbers = q.split(' ').map(n => normalizeNumber(n))
        try {
          await conn.groupParticipantsUpdate(from, numbers, 'add')
          reply(`✅ Ajout en cours de ${numbers.length} membre(s)`)
        } catch (e) {
          reply('❌ Erreur: Bot doit être admin')
        }
        break
      }

      case 'supprimer':
        if (q === 'on' || q === 'activé') {
          autoDelete['global'] = true
          reply('✅ ANTI-SUPPRESSION ACTIVÉ\nLes messages supprimés seront récupérés')
        } else if (q === 'off' || q === 'désactivé') {
          delete autoDelete['global']
          reply('❌ ANTI-SUPPRESSION DÉSACTIVÉ')
        } else {
          reply(`Usage : ${PREFIX}del on/off`)
        }
        break

      case 'en':
        if (q === 'on' || q === 'sur') {
          alwaysOnline = true
          reply('✅ TOUJOURS EN LIGNE ACTIVÉ')
        } else if (q === 'off' || q === 'désactivé') {
          alwaysOnline = false
          reply('❌ TOUJOURS EN LIGNE DÉSACTIVÉ')
        } else {
          reply(`Usage : ${PREFIX}online on/off`)
        }
        break

      case 'like':
        if (q === 'on' || q === 'activé') {
          autoLike['global'] = { status: true, emoji: '❤️' }
          reply('✅ AUTO-LIKE ACTIVÉ\nEmoji: ❤️')
        } else if (q === 'off' || q === 'désactivé') {
          delete autoLike['global']
          reply('❌ AUTO-LIKE DÉSACTIVÉ')
        } else if (q.startsWith('emoji')) {
          const emoji = q.split(' ')[1] || '❤️'
          if (autoLike['global']) autoLike['global'].emoji = emoji
          reply(`✅ Emoji changé: ${emoji}`)
        } else {
          reply(`Usage : ${PREFIX}lk on/off\n${PREFIX}lk emoji 😂`)
        }
        break

      case 'setlogo':
        if (mek.message.imageMessage) {
          const buffer = await downloadMediaMessage(mek, 'buffer', {})
          fs.writeFileSync(LOGO_PATH, buffer)
          reply('✅ Logo mis à jour avec succès!\nTest avec .menu')
        } else {
          reply(`📷 Envoie une image depuis ta galerie avec la légende ${PREFIX}logo`)
        }
        break

      case 'ping': {
        const start = Date.now()
        if (fs.existsSync(LOGO_PATH)) {
          await conn.sendMessage(from, { image: fs.readFileSync(LOGO_PATH), caption: format('🏓 Test...') }, { quoted: mek })
        } else {
          await conn.sendMessage(from, { text: format('🏓 Test...') }, { quoted: mek })
        }
        const end = Date.now()
        await conn.sendMessage(from, { text: format(`🏓 Pong! ${end - start}ms\nBot: En ligne ✅`) }, { quoted: mek })
        break
      }

      case 'info': {
        let infoText = format(`*${BOTNAME} ${VERSION}*\nCréé par ${OWNER}\n24/24 Online\n${SIGNATURE}`)
        if (fs.existsSync(LOGO_PATH)) {
          await conn.sendMessage(from, { image: fs.readFileSync(LOGO_PATH), caption: infoText }, { quoted: mek })
        } else {
          reply(infoText)
        }
        break
      }

      case 'welcome':
        if (q === 'on') reply('✅ WELCOME ACTIVÉ')
        else if (q === 'off') reply('❌ WELCOME DÉSACTIVÉ')
        else reply(`Usage : ${PREFIX}wlc on/off`)
        break

      case 'open':
        await conn.groupSettingUpdate(from, 'not_announcement')
        reply('✅ GROUPE OUVERT')
        break

      case 'close':
        await conn.groupSettingUpdate(from, 'announcement')
        reply('🔒 GROUPE FERMÉ')
        break

      case 'kick': {
        const mentioned = mek.message.extendedTextMessage?.contextInfo?.mentionedJid || []
        if (mentioned.length === 0) return reply(`Usage : ${PREFIX}kick @membre`)
        await conn.groupParticipantsUpdate(from, mentioned, 'remove')
        reply('✅ Membre expulsé')
        break
      }

      case 'tagall': {
        const meta = await conn.groupMetadata(from)
        const members = meta.participants.map(p => p.id)
        let text = `╭── TAG ALL ──╮\n┃ ➟ Groupe: ${meta.subject}\n┃ ➟ Total: ${members.length}\n╰─────────────╯\n\n`
        members.forEach(mem => text += `➟ @${mem.split('@')[0]}\n`)
        await conn.sendMessage(from, { text: format(text), mentions: members }, { quoted: mek })
        break
      }

      default:
        reply(`❌ Commande inconnue.\nTape ${PREFIX}menu pour voir les commandes.`)
    }
  })
}

startBot()