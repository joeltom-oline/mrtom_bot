const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, isJidGroup, downloadMediaMessage } = require('@whiskeysockets/baileys')
const pino = require('pino')
const qrcode = require('qrcode-terminal')
const fs = require('fs')

const PREFIX = '.'
const OWNER = '𝑱𝑶𝑬𝑳 𝑻𝑶𝑴_𝑻𝑬𝑪𝑯'
const BOTNAME = '🎩𝑱𝑶𝑬𝑳 𝑻𝑶𝑴_𝑩𝑶𝑻 🎩'
const VERSION = 'v2.0.0'
const SIGNATURE = '> BY : _© 2026 𝑱𝑶𝑬𝑳 𝑻𝑶𝑴_𝑻𝑬𝑪𝑯_'

const LOGO_PATH = './logo.jpg'

// ===== STOCKAGE =====
let antiGst = {} // anti groupe status
let autoDelete = {} // anti suppression
let alwaysOnline = false // toujours en ligne
let autoLike = {} // auto like

const format = (text) => '> ' + text.split('\n').join('\n> ')

function normalizeNumber(number) {
    return String(number).replace(/[^0-9]/g, '') + '@s.whatsapp.net'
}

// ===== MENUS =====
const getMenu = () => format(`╭══════════╮
┃─────((✧ ${BOTNAME} ✧))─────
┃
┃ ➟ OWNER: ${OWNER}
┃ ➟ VERSION: ${VERSION}
┃ ➟ PREFIX: ${PREFIX}
┃ ➟ COMMAND: 17
┃ ➟ DATE: ${new Date().toLocaleDateString('fr-FR')}
┃ ➟ MODE: 🌍 Public
┃
╰══════════════════╯

Utilise :
${PREFIX}pmenu → Menu Privé Config
${PREFIX}gmenu → Menu Groupe Config
${PREFIX}menu → Menu Principal
${PREFIX}aide → Revoir ce message

${SIGNATURE}`)

function getPrivateMenu() {
    return format(`
╭─❒ 「 📩 MENU PRIVÉ - CONFIG GLOBALE 」 ❒
│
│ 🤖 Réglages du bot valables partout
│
├─ 👁️ VUE AUTOMATIQUE
│ Auto-Vu Status : Toujours actif
│
├─ 🛡️ ANTI-SUPPRESSION
│ ${PREFIX}supprimer on
│ Active l'enregistrement des messages
│ ${PREFIX}supprimer off
│ Désactive l'enregistrement
│
├─ 🟢 TOUJOURS EN LIGNE
│ ${PREFIX}en ligne on
│ Force le statut en ligne H24
│ ${PREFIX}en ligne off
│ Retour au statut normal
│
├─ ❤️ AUTO-LIKE STATUS
│ ${PREFIX}like on
│ Réagit auto aux statuts
│ ${PREFIX}like off
│ Désactive les réactions
│ ${PREFIX}like emoji 😂
│ Changer l'emoji
│
╰──────────────❒
⚠️ Accès : Owner + Sudo uniquement
${SIGNATURE}`)
}

function getGroupMenu() {
    return format(`
╭─❒ 「 👥 MENU GROUPE - CONFIG GROUPE 」 ❒
│
│ ⚙️ Réglages valables uniquement pour ce groupe
│
├─ 🚫 ANTI-GROUPE STATUS
│ ${PREFIX}antigst on
│ Active la suppression des statuts de groupe
│ ${PREFIX}antigst off
│ Désactive
│ ${PREFIX}agst on
│ Raccourci pour activer
│ ${PREFIX}agst off
│ Raccourci pour désactiver
│ Note: 2 avertissements puis kick
│
├─ ➕ AJOUTER DES MEMBRES
│ ${PREFIX}add 2376XXXXXXXX 2376YYYY
│ Ajoute des numéros directement
│ ${PREFIX}add 2376XXXXXXXX jd:nom-du-groupe
│ Ajoute à distance depuis le privé
│
╰──────────────❒
⚠️ Requis: Etre admin + Bot admin
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
        if(alwaysOnline) conn.sendPresenceUpdate('available')
    }, 15000)

    // AUTO-VU STATUS
    conn.ev.on('messages.upsert', async ({ messages }) => {
        if (messages[0]?.key?.remoteJid === 'status@broadcast') {
            await conn.readMessages([messages[0].key])
        }
    })

    conn.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update
        if (qr) {
            console.log('\n==== SCANNE CE QR CODE ====\n')
            qrcode.generate(qr, { small: true })
        }
        if (connection === 'open') console.log(`✅ ${BOTNAME} CONNECTÉ`)
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode!== DisconnectReason.loggedOut
            if (shouldReconnect) startBot()
        }
    })

    conn.ev.on('messages.upsert', async ({ messages }) => {
        if (!messages[0]) return
        const mek = messages[0]
        const from = mek.key.remoteJid
        const isGroup = isJidGroup(from)
        const body = mek.message?.conversation || mek.message?.extendedTextMessage?.text || mek.message?.imageMessage?.caption || ''
        const sender = mek.key.participant || mek.key.remoteJid

        if (!body.startsWith(PREFIX)) return

        const command = body.slice(1).trim().split(' ')[0].toLowerCase()
        const q = body.slice(1 + command.length).trim()
        const reply = (text) => conn.sendMessage(from, { text: format(text) }, { quoted: mek })

        const adminCommands = ['open', 'close', 'kick', 'tagall', 'welcome', 'antigst', 'agst', 'add']
        if (!isGroup && adminCommands.includes(command)) {
            return reply('❌ Cette commande fonctionne uniquement dans les groupes.')
        }

        // ===== MENU =====
        if (command === 'menu') {
            if (fs.existsSync(LOGO_PATH)) {
                await conn.sendMessage(from, { image: fs.readFileSync(LOGO_PATH), caption: getMenu() }, { quoted: mek })
            } else {
                reply('❌ Aucun logo. Envoie une image avec.setlogo')
            }
        }

        else if (command === 'pmenu') {
            if (fs.existsSync(LOGO_PATH)) {
                await conn.sendMessage(from, { image: fs.readFileSync(LOGO_PATH), caption: getPrivateMenu() }, { quoted: mek })
            } else {
                reply(getPrivateMenu())
            }
        }

        else if (command === 'gmenu') {
            if (fs.existsSync(LOGO_PATH)) {
                await conn.sendMessage(from, { image: fs.readFileSync(LOGO_PATH), caption: getGroupMenu() }, { quoted: mek })
            } else {
                reply(getGroupMenu())
            }
        }

        // ===== NOUVELLES COMMANDES =====

        // ANTI-GROUPE STATUS
        else if (command === 'antigst' || command === 'agst') {
            const groupMeta = await conn.groupMetadata(from)
            const isSenderAdmin = groupMeta.participants.find(p => p.id === sender)?.admin
            if(!isSenderAdmin) return reply('❌ Admin seulement')

            if (q === 'on') {
                antiGst[from] = true
                reply('✅ ANTI-GST ACTIVÉ\nLes statuts de groupe seront supprimés + 2 avertissements puis kick')
            }
            else if (q === 'off') {
                delete antiGst[from]
                reply('❌ ANTI-GST DÉSACTIVÉ')
            }
            else reply(`Usage : ${PREFIX}antigst on/off`)
        }

        // AJOUTER MEMBRES
        else if (command === 'add') {
            if (!q) return reply(`Usage : ${PREFIX}add 2376XXXXXXXX 2376YYYY`)
            const numbers = q.split(' ').map(n => normalizeNumber(n))
            try {
                await conn.groupParticipantsUpdate(from, numbers, 'add')
                reply(`✅ Ajout en cours de ${numbers.length} membre(s)`)
            } catch(e) {
                reply('❌ Erreur: Bot doit être admin')
            }
        }

        // ANTI SUPPRESSION
        else if (command === 'supprimer') {
            if (q === 'on' || q === 'activé') {
                autoDelete['global'] = true
                reply('✅ ANTI-SUPPRESSION ACTIVÉ\nLes messages supprimés seront récupérés')
            }
            else if (q === 'off' || q === 'désactivé') {
                delete autoDelete['global']
                reply('❌ ANTI-SUPPRESSION DÉSACTIVÉ')
            }
            else reply(`Usage : ${PREFIX}supprimer on/off`)
        }

        // TOUJOURS EN LIGNE
        else if (command === 'en') {
            const arg = q.toLowerCase()
            if (arg === 'on' || arg === 'sur') {
                alwaysOnline = true
                reply('✅ TOUJOURS EN LIGNE ACTIVÉ')
            }
            else if (arg === 'off' || arg === 'désactivé') {
                alwaysOnline = false
                reply('❌ TOUJOURS EN LIGNE DÉSACTIVÉ')
            }
            else reply(`Usage : ${PREFIX}en ligne on/off`)
        }

        // AUTO LIKE STATUS
        else if (command === 'like') {
            if (q === 'on' || q === 'activé') {
                autoLike['global'] = { status: true, emoji: '❤️' }
                reply('✅ AUTO-LIKE ACTIVÉ\nEmoji: ❤️')
            }
            else if (q === 'off' || q === 'désactivé') {
                delete autoLike['global']
                reply('❌ AUTO-LIKE DÉSACTIVÉ')
            }
            else if (q.startsWith('emoji')) {
                const emoji = q.split(' ')[1] || '❤️'
                if(autoLike['global']) autoLike['global'].emoji = emoji
                reply(`✅ Emoji changé: ${emoji}`)
            }
            else reply(`Usage : ${PREFIX}like on/off\n${PREFIX}like emoji 😂`)
        }

        // ===== ANCIENNES COMMANDES =====
        else if (command === 'setlogo') {
            if (mek.message.imageMessage) {
                const buffer = await downloadMediaMessage(mek, 'buffer', {})
                fs.writeFileSync(LOGO_PATH, buffer)
                reply('✅ Logo mis à jour avec succès!\nTest avec.menu')
            } else {
                reply(`📷 Envoie une image depuis ta galerie avec la légende.setlogo`)
            }
        }

        else if (command === 'ping') {
            const start = Date.now()
            if (fs.existsSync(LOGO_PATH)) {
                await conn.sendMessage(from, { image: fs.readFileSync(LOGO_PATH), caption: format('🏓 Test...') }, { quoted: mek })
            } else {
                await conn.sendMessage(from, { text: format('🏓 Test...') }, { quoted: mek })
            }
            const end = Date.now()
            await conn.sendMessage(from, { text: format(`🏓 Pong! ${end - start}ms\nBot: En ligne ✅`) }, { quoted: mek })
        }

        else if (command === 'info') {
            let infoText = format(`*${BOTNAME} ${VERSION}*\nCréé par ${OWNER}\n24/24 Online\n${SIGNATURE}`)
            if (fs.existsSync(LOGO_PATH)) {
                await conn.sendMessage(from, { image: fs.readFileSync(LOGO_PATH), caption: infoText }, { quoted: mek })
            } else {
                reply(infoText)
            }
        }

        else if (command === 'welcome') {
            if (q === 'on') reply('✅ WELCOME ACTIVÉ')
            else if (q === 'off') reply('❌ WELCOME DÉSACTIVÉ')
            else reply(`Usage : ${PREFIX}welcome on/off`)
        }

        else if (command === 'open') {
            await conn.groupSettingUpdate(from, 'not_announcement')
            reply('✅ GROUPE OUVERT')
        }

        else if (command === 'close') {
            await conn.groupSettingUpdate(from, 'announcement')
            reply('🔒 GROUPE FERMÉ')
        }

        else if (command === 'kick') {
            const mentioned = mek.message.extendedTextMessage?.contextInfo?.mentionedJid || []
            if (mentioned.length === 0) return reply(`Usage : ${PREFIX}kick @membre`)
            await conn.groupParticipantsUpdate(from, mentioned, "remove")
            reply('✅ Membre expulsé')
        }

        else if (command === 'tagall') {
            const meta = await conn.groupMetadata(from)
            const members = meta.participants.map(p => p.id)
            let text = `╭── TAG ALL ──╮\n┃ ➟ Groupe: ${meta.subject}\n┃ ➟ Total: ${members.length}\n╰─────────────╯\n\n`
            members.forEach(mem => text += `➟ @${mem.split('@')[0]}\n`)
            await conn.sendMessage(from, { text: format(text), mentions: members }, { quoted: mek })
        }
    })
}

startBot()