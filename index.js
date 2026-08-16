const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    downloadMediaMessage,
    isJidGroup
} = require('@whiskeysockets/baileys')

const pino = require('pino')
const qrcode = require('qrcode-terminal')
const fs = require('fs')

const PREFIX = '.'
const OWNER_NAME = '𝑱𝑶𝑬𝑳 𝑻𝑶𝑴_𝑻𝑬𝑪𝑯'
const OWNER_NUMBER = '2376XXXXXXXX'
const BOTNAME = '🎩𝑱𝑶𝑬𝑳 𝑻𝑶𝑴_𝑩𝑶𝑻 🎩'
const VERSION = 'v3.0.0'
const SIGNATURE = '> BY : _© 2026 𝑱𝑶𝑬𝑳 𝑻𝑶𝑴_𝑻𝑬𝑪𝑯_'

const LOGO_PATH = './logo.jpg'
const SESSION_PATH = './session'

const antiGst = {}
const welcome = {}
const warnings = {}

let alwaysOnline = false
let antiDelete = false

const autoLike = {
    enabled: false,
    emoji: '❤️'
}

const messageStore = new Map()

function format(text) {
    return '> ' + String(text).split('\n').join('\n> ')
}

function normalizeNumber(number) {
    const clean = String(number).replace(/[^0-9]/g, '')
    return clean ? clean + '@s.whatsapp.net' : null
}

function getUserNumber(jid) {
    return jid ? jid.split('@')[0].split(':')[0].replace(/[^0-9]/g, '') : ''
}

function isOwner(jid) {
    return getUserNumber(jid) === OWNER_NUMBER
}

function getBody(message) {
    return (
        message?.conversation ||
        message?.extendedTextMessage?.text ||
        message?.imageMessage?.caption ||
        message?.videoMessage?.caption ||
        message?.documentMessage?.caption ||
        message?.buttonsResponseMessage?.selectedButtonId ||
        message?.listResponseMessage?.singleSelectReply?.selectedRowId ||
        ''
    )
}

function getMenu() {
    return format(`╭════════════════════╮
┃     ✧ ${BOTNAME} ✧
╰════════════════════╯

👑 OWNER : ${OWNER_NAME}
🤖 VERSION : ${VERSION}
⚙️ PREFIX : ${PREFIX}
🌍 MODE : PUBLIC

━━━━━━━━━━━━━━━━━━━━
📌 COMMANDES PRINCIPALES
━━━━━━━━━━━━━━━━━━━━

${PREFIX}menu
${PREFIX}pmenu
${PREFIX}gmenu
${PREFIX}aide
${PREFIX}ping
${PREFIX}info
${PREFIX}setlogo

━━━━━━━━━━━━━━━━━━━━
🛡️ CONFIGURATION
━━━━━━━━━━━━━━━━━━━━

${PREFIX}supprimer on/off
${PREFIX}en ligne on/off
${PREFIX}like on/off
${PREFIX}like emoji 😂

━━━━━━━━━━━━━━━━━━━━
👥 GROUPE
━━━━━━━━━━━━━━━━━━━━

${PREFIX}antigst on/off
${PREFIX}agst on/off
${PREFIX}welcome on/off
${PREFIX}add 2376XXXXXXXX
${PREFIX}kick @membre
${PREFIX}tagall
${PREFIX}open
${PREFIX}close

${SIGNATURE}`)
}

function getPrivateMenu() {
    return format(`╭─❒ 「 📩 MENU PRIVÉ 」 ❒

🛡️ ANTI-SUPPRESSION
${PREFIX}supprimer on
${PREFIX}supprimer off

🟢 TOUJOURS EN LIGNE
${PREFIX}en ligne on
${PREFIX}en ligne off

❤️ AUTO-LIKE STATUS
${PREFIX}like on
${PREFIX}like off
${PREFIX}like emoji 😂

⚠️ Configuration réservée au propriétaire.

${SIGNATURE}`)
}

function getGroupMenu() {
    return format(`╭─❒ 「 👥 MENU GROUPE 」 ❒

🚫 ANTI-GROUPE
${PREFIX}antigst on
${PREFIX}antigst off

👋 WELCOME
${PREFIX}welcome on
${PREFIX}welcome off

➕ AJOUT
${PREFIX}add 2376XXXXXXXX

🔨 ADMINISTRATION
${PREFIX}kick @membre
${PREFIX}tagall
${PREFIX}open
${PREFIX}close

⚠️ Admin + Bot admin requis.

${SIGNATURE}`)
}

async function getGroupMetadata(sock, jid) {
    try { return await sock.groupMetadata(jid) } catch { return null }
}

async function isGroupAdmin(sock, groupJid, userJid) {
    const metadata = await getGroupMetadata(sock, groupJid)
    if (!metadata) return false
    const p = metadata.participants.find(x => x.id === userJid)
    return !!(p && (p.admin === 'admin' || p.admin === 'superadmin' || p.admin === true))
}

async function isBotAdmin(sock, groupJid) {
    const metadata = await getGroupMetadata(sock, groupJid)
    if (!metadata || !sock.user?.id) return false
    const botNumber = getUserNumber(sock.user.id)
    const p = metadata.participants.find(x => getUserNumber(x.id) === botNumber)
    return !!(p && (p.admin === 'admin' || p.admin === 'superadmin' || p.admin === true))
}

function storeMessage(message) {
    if (!message?.key?.id) return
    messageStore.set(message.key.id, message)
    if (messageStore.size > 1000) {
        messageStore.delete(messageStore.keys().next().value)
    }
}

async function restoreDeletedMessage(sock, key) {
    if (!antiDelete) return
    const saved = messageStore.get(key.id)
    if (!saved?.message) return

    try {
        const text = getBody(saved.message)
        if (text) {
            await sock.sendMessage(key.remoteJid, {
                text: format(`🗑️ MESSAGE SUPPRIMÉ\n\n${text}`)
            })
            return
        }

        for (const type of ['imageMessage', 'videoMessage', 'documentMessage']) {
            if (saved.message[type]) {
                const buffer = await downloadMediaMessage(
                    saved, 'buffer', {}, { logger: pino({ level: 'silent' }) }
                )
                if (type === 'imageMessage') {
                    await sock.sendMessage(key.remoteJid, {
                        image: buffer, caption: '🗑️ IMAGE SUPPRIMÉE'
                    })
                } else if (type === 'videoMessage') {
                    await sock.sendMessage(key.remoteJid, {
                        video: buffer, caption: '🗑️ VIDÉO SUPPRIMÉE'
                    })
                } else {
                    await sock.sendMessage(key.remoteJid, {
                        document: buffer,
                        mimetype: saved.message.documentMessage.mimetype || 'application/octet-stream',
                        fileName: saved.message.documentMessage.fileName || 'document'
                    })
                }
                return
            }
        }
    } catch (e) {
        console.log('❌ Anti-delete:', e.message)
    }
}

async function startBot() {
    try {
        const { state, saveCreds } = await useMultiFileAuthState(SESSION_PATH)

        const sock = makeWASocket({
            auth: state,
            logger: pino({ level: 'silent' }),
            printQRInTerminal: false,
            browser: ['Ubuntu', 'Chrome', '20.0.04'],
            markOnlineOnConnect: false
        })

        sock.ev.on('creds.update', saveCreds)

        sock.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
            if (qr) {
                console.log('\n📱 SCANNE LE QR CODE\n')
                qrcode.generate(qr, { small: true })
            }

            if (connection === 'open') {
                console.log(`\n✅ ${BOTNAME} CONNECTÉ - ${VERSION}\n`)
            }

            if (connection === 'close') {
                const code = lastDisconnect?.error?.output?.statusCode
                if (code === DisconnectReason.loggedOut) {
                    console.log('❌ Session déconnectée. Supprime ./session puis relance.')
                    return
                }
                console.log('⚠️ Connexion perdue. Reconnexion dans 5 secondes...')
                setTimeout(startBot, 5000)
            }
        })

        setInterval(async () => {
            if (alwaysOnline) {
                try { await sock.sendPresenceUpdate('available') } catch {}
            }
        }, 15000)

        sock.ev.on('messages.delete', async event => {
            if (!antiDelete) return
            for (const key of (event.keys || [])) await restoreDeletedMessage(sock, key)
        })

        sock.ev.on('group-participants.update', async ({ id, participants, action }) => {
            try {
                if (action === 'add' && welcome[id]) {
                    const metadata = await sock.groupMetadata(id)
                    for (const participant of participants) {
                        await sock.sendMessage(id, {
                            text: format(`👋 BIENVENUE @${getUserNumber(participant)} !\n\n🎉 Bienvenue dans : ${metadata.subject}\n\n🤖 ${BOTNAME}\n${SIGNATURE}`),
                            mentions: [participant]
                        })
                    }
                }

                if (action === 'add' && antiGst[id]) {
                    warnings[id] ||= {}
                    for (const participant of participants) {
                        warnings[id][participant] = (warnings[id][participant] || 0) + 1
                        const count = warnings[id][participant]

                        if (count >= 2) {
                            try {
                                await sock.groupParticipantsUpdate(id, [participant], 'remove')
                                await sock.sendMessage(id, {
                                    text: format(`🚫 @${getUserNumber(participant)} a reçu 2 avertissements et a été expulsé.`),
                                    mentions: [participant]
                                })
                            } catch {}
                            delete warnings[id][participant]
                        } else {
                            await sock.sendMessage(id, {
                                text: format(`⚠️ AVERTISSEMENT ${count}/2\n\n@${getUserNumber(participant)}\n\nEncore une infraction et le membre sera expulsé.`),
                                mentions: [participant]
                            })
                        }
                    }
                }
            } catch (e) {
                console.log('❌ Participant event:', e.message)
            }
        })

        sock.ev.on('messages.upsert', async ({ messages }) => {
            try {
                const mek = messages?.[0]
                if (!mek?.message) return

                const from = mek.key.remoteJid
                if (!from) return

                const sender = mek.key.participant || from
                const body = getBody(mek.message)

                if (antiDelete) storeMessage(mek)

                if (from === 'status@broadcast') {
                    try { await sock.readMessages([mek.key]) } catch {}

                    if (autoLike.enabled) {
                        try {
                            await sock.sendMessage('status@broadcast', {
                                react: { text: autoLike.emoji, key: mek.key }
                            })
                        } catch (e) {
                            console.log('❌ Auto-like:', e.message)
                        }
                    }
                    return
                }

                if (!body.startsWith(PREFIX)) return

                const commandText = body.slice(PREFIX.length).trim()
                if (!commandText) return

                const args = commandText.split(/\s+/)
                const command = args.shift().toLowerCase()
                const q = args.join(' ').trim()

                const reply = text => sock.sendMessage(
                    from,
                    { text: format(text) },
                    { quoted: mek }
                )

                if (command === 'menu' || command === 'aide') {
                    if (fs.existsSync(LOGO_PATH)) {
                        return sock.sendMessage(from, {
                            image: fs.readFileSync(LOGO_PATH),
                            caption: getMenu()
                        }, { quoted: mek })
                    }
                    return reply(getMenu())
                }

                if (command === 'pmenu') return reply(getPrivateMenu())

                if (command === 'gmenu') {
                    if (!isJidGroup(from)) return reply('❌ Cette commande est réservée aux groupes.')
                    return reply(getGroupMenu())
                }

                if (command === 'ping') {
                    return reply('🏓 PONG !\n\n🟢 Bot opérationnel')
                }

                if (command === 'info') {
                    return reply(`${BOTNAME}\n\n👑 Owner : ${OWNER_NAME}\n📦 Version : ${VERSION}\n🟢 Statut : En ligne\n⚙️ Prefix : ${PREFIX}\n\n${SIGNATURE}`)
                }

                if (command === 'setlogo') {
                    if (!isOwner(sender)) return reply('❌ Owner uniquement.')
                    if (!mek.message.imageMessage) return reply(`📷 Envoie une image avec ${PREFIX}setlogo comme légende.`)

                    try {
                        const buffer = await downloadMediaMessage(
                            mek, 'buffer', {}, { logger: pino({ level: 'silent' }) }
                        )
                        fs.writeFileSync(LOGO_PATH, buffer)
                        return reply('✅ Logo enregistré !')
                    } catch {
                        return reply('❌ Erreur lors de l’enregistrement du logo.')
                    }
                }

                if (['supprimer', 'en', 'like'].includes(command) && !isOwner(sender)) {
                    return reply('❌ Cette commande est réservée au propriétaire du bot.')
                }

                if (command === 'supprimer') {
                    if (q.toLowerCase() === 'on') {
                        antiDelete = true
                        return reply('✅ ANTI-SUPPRESSION ACTIVÉ')
                    }
                    if (q.toLowerCase() === 'off') {
                        antiDelete = false
                        messageStore.clear()
                        return reply('❌ ANTI-SUPPRESSION DÉSACTIVÉ')
                    }
                    return reply(`Usage : ${PREFIX}supprimer on/off`)
                }

                if (command === 'en') {
                    const parts = q.toLowerCase().split(/\s+/)
                    if (parts[0] === 'ligne' && parts[1] === 'on') {
                        alwaysOnline = true
                        try { await sock.sendPresenceUpdate('available') } catch {}
                        return reply('🟢 TOUJOURS EN LIGNE ACTIVÉ')
                    }
                    if (parts[0] === 'ligne' && parts[1] === 'off') {
                        alwaysOnline = false
                        return reply('🔴 TOUJOURS EN LIGNE DÉSACTIVÉ')
                    }
                    return reply(`Usage : ${PREFIX}en ligne on/off`)
                }

                if (command === 'like') {
                    const parts = q.split(/\s+/)
                    const action = parts[0]?.toLowerCase()

                    if (action === 'on') {
                        autoLike.enabled = true
                        return reply(`❤️ AUTO-LIKE ACTIVÉ\nEmoji : ${autoLike.emoji}`)
                    }

                    if (action === 'off') {
                        autoLike.enabled = false
                        return reply('❌ AUTO-LIKE DÉSACTIVÉ')
                    }

                    if (action === 'emoji') {
                        const emoji = parts.slice(1).join(' ').trim()
                        if (!emoji) return reply(`Usage : ${PREFIX}like emoji 😂`)
                        autoLike.emoji = emoji
                        return reply(`✅ Emoji auto-like : ${emoji}`)
                    }

                    return reply(`Usage :\n${PREFIX}like on\n${PREFIX}like off\n${PREFIX}like emoji 😂`)
                }

                const groupCommands = ['antigst', 'agst', 'welcome', 'add', 'kick', 'tagall', 'open', 'close']

                if (groupCommands.includes(command)) {
                    if (!isJidGroup(from)) return reply('❌ Cette commande fonctionne uniquement dans un groupe.')

                    if (!await isGroupAdmin(sock, from, sender)) {
                        return reply('❌ Admin du groupe uniquement.')
                    }

                    if (!await isBotAdmin(sock, from)) {
                        return reply('❌ Le bot doit être administrateur.')
                    }
                }

                if (command === 'antigst' || command === 'agst') {
                    if (q.toLowerCase() === 'on') {
                        antiGst[from] = true
                        warnings[from] = {}
                        return reply('✅ ANTI-GST ACTIVÉ\n\n2 avertissements avant expulsion.')
                    }
                    if (q.toLowerCase() === 'off') {
                        delete antiGst[from]
                        delete warnings[from]
                        return reply('❌ ANTI-GST DÉSACTIVÉ')
                    }
                    return reply(`Usage : ${PREFIX}antigst on/off`)
                }

                if (command === 'welcome') {
                    if (q.toLowerCase() === 'on') {
                        welcome[from] = true
                        return reply('✅ WELCOME ACTIVÉ')
                    }
                    if (q.toLowerCase() === 'off') {
                        delete welcome[from]
                        return reply('❌ WELCOME DÉSACTIVÉ')
                    }
                    return reply(`Usage : ${PREFIX}welcome on/off`)
                }

                if (command === 'add') {
                    if (!q) return reply(`Usage : ${PREFIX}add 2376XXXXXXXX`)

                    const numbers = q.split(/\s+/).map(normalizeNumber).filter(Boolean)
                    if (!numbers.length) return reply('❌ Aucun numéro valide.')

                    try {
                        const result = await sock.groupParticipantsUpdate(from, numbers, 'add')
                        const ok = result.filter(r => String(r.status) === '200').length
                        return reply(`✅ Demande envoyée.\n\n👥 ${numbers.length} numéro(s)\n✅ Réussi : ${ok}`)
                    } catch {
                        return reply('❌ Impossible d’ajouter les membres.')
                    }
                }

                if (command === 'kick') {
                    const mentioned = mek.message?.extendedTextMessage?.contextInfo?.mentionedJid || []
                    if (!mentioned.length) return reply(`Usage : ${PREFIX}kick @membre`)

                    try {
                        await sock.groupParticipantsUpdate(from, mentioned, 'remove')
                        return reply(`✅ ${mentioned.length} membre(s) expulsé(s).`)
                    } catch {
                        return reply('❌ Impossible d’expulser le membre.')
                    }
                }

                if (command === 'open') {
                    try {
                        await sock.groupSettingUpdate(from, 'not_announcement')
                        return reply('🔓 GROUPE OUVERT')
                    } catch {
                        return reply('❌ Impossible d’ouvrir le groupe.')
                    }
                }

                if (command === 'close') {
                    try {
                        await sock.groupSettingUpdate(from, 'announcement')
                        return reply('🔒 GROUPE FERMÉ')
                    } catch {
                        return reply('❌ Impossible de fermer le groupe.')
                    }
                }

                if (command === 'tagall') {
                    try {
                        const metadata = await sock.groupMetadata(from)
                        const members = metadata.participants.map(p => p.id)

                        let text = `╭── 「 TAG ALL 」 ──╮\n│ 👥 Groupe : ${metadata.subject}\n│ 👤 Membres : ${members.length}\n╰────────────────╯\n\n`

                        for (const member of members) {
                            text += `➟ @${getUserNumber(member)}\n`
                        }

                        return sock.sendMessage(from, {
                            text: format(text),
                            mentions: members
                        }, { quoted: mek })
                    } catch {
                        return reply('❌ Impossible de récupérer les membres.')
                    }
                }

            } catch (e) {
                console.log('❌ MESSAGE ERROR:', e.message)
            }
        })

    } catch (e) {
        console.log('❌ START ERROR:', e.message)
        setTimeout(startBot, 5000)
    }
}

console.log(`
╔══════════════════════════════════╗
║      ${BOTNAME}
║      VERSION ${VERSION}
║      DÉMARRAGE...
╚══════════════════════════════════╝
`)

startBot()
