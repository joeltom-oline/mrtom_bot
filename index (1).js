const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    DisconnectReason, 
    fetchLatestBaileysVersion, 
    isJidGroup, 
    downloadMediaMessage,
    jidNormalizedUser
} = require('@whiskeysockets/baileys')
const pino = require('pino')
const qrcode = require('qrcode-terminal')
const fs = require('fs')

// ====== CONFIG ======
const OWNER_NUM = '237654145540' // Ton numéro SANS +
const PREFIX = '.'
const OWNER = '𝑱𝑶𝑬𝑳 𝑻𝑶𝑴_𝑻𝑬𝑪𝑯'
const BOTNAME = '𝑱𝑶𝑬𝑳 𝑻𝑶𝑴_𝑩𝑶𝑻'
const VERSION = 'v1.1.0'
const SIGNATURE = '© 2026 𝑱𝑶𝑬𝑳 𝑻𝑶𝑴_𝑻𝑬𝑪𝑯'
const LOGO_PATH = './logo.jpg'

const startTime = Date.now()

// ====== DB ======
let antilinkDB = {}
let welcomeDB = {}
let muteDB = {}
let rulesDB = {}
let warnDB = {}

if (fs.existsSync('./antilink.json')) antilinkDB = JSON.parse(fs.readFileSync('./antilink.json'))
if (fs.existsSync('./welcome.json')) welcomeDB = JSON.parse(fs.readFileSync('./welcome.json'))
if (fs.existsSync('./mute.json')) muteDB = JSON.parse(fs.readFileSync('./mute.json'))
if (fs.existsSync('./rules.json')) rulesDB = JSON.parse(fs.readFileSync('./rules.json'))
if (fs.existsSync('./warn.json')) warnDB = JSON.parse(fs.readFileSync('./warn.json'))

const saveDB = () => {
    fs.writeFileSync('./antilink.json', JSON.stringify(antilinkDB, null, 2))
    fs.writeFileSync('./welcome.json', JSON.stringify(welcomeDB, null, 2))
    fs.writeFileSync('./mute.json', JSON.stringify(muteDB, null, 2))
    fs.writeFileSync('./rules.json', JSON.stringify(rulesDB, null, 2))
    fs.writeFileSync('./warn.json', JSON.stringify(warnDB, null, 2))
}

const formatUptime = (ms) => {
    const s = Math.floor(ms / 1000)
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const sec = s % 60
    return `${h}h ${m}m ${sec}s`
}

const getMenu = () => `🤖 *${BOTNAME} ${VERSION}*

📌 *GÉNÉRAL*
🏓 ${PREFIX}ping
📖 ${PREFIX}menu
👑 ${PREFIX}owner
⏱️ ${PREFIX}runtime
👀 ${PREFIX}vv
🖼️ ${PREFIX}sticker

👥 *GESTION GROUPE*
🔗 ${PREFIX}antilink on/off
👋 ${PREFIX}welcome on/off
👢 ${PREFIX}kick @user
⬆️ ${PREFIX}promote @user
⬇️ ${PREFIX}demote @user
🔇 ${PREFIX}mute
🔊 ${PREFIX}unmute
🗑️ ${PREFIX}delete (répondre à un message)
📢 ${PREFIX}tagall
🔗 ${PREFIX}link (lien d'invitation)
ℹ️ ${PREFIX}infogroup
📜 ${PREFIX}rules / ${PREFIX}setrules
⚠️ ${PREFIX}warn @user
⚠️ ${PREFIX}warnings @user

⚙️ *OWNER*
🖼️ ${PREFIX}setlogo

${SIGNATURE}`

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('./session')
    const { version } = await fetchLatestBaileysVersion()

    const conn = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: true,
        logger: pino({ level: 'silent' }),
        syncFullHistory: false,
        markOnlineOnConnect: true
    })

    conn.ev.on('creds.update', saveCreds)

    conn.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update
        if (qr) qrcode.generate(qr, { small: true })
        if (connection === 'open') {
            console.log(`\n✅ ${BOTNAME} ${VERSION} CONNECTÉ`)
            console.log(`📱 Bot : ${conn.user?.id}\n`)
        }
        if (connection === 'close') {
            const code = lastDisconnect?.error?.output?.statusCode
            const shouldReconnect = code !== DisconnectReason.loggedOut
            console.log('Connexion fermée. Reconnexion :', shouldReconnect)
            if (shouldReconnect) startBot()
        }
    })

    // ====================== MESSAGES ======================
    conn.ev.on('messages.upsert', async ({ messages }) => {
        try {
            const mek = messages[0]
            if (!mek || !mek.message) return

            const from = mek.key.remoteJid
            const isGroup = isJidGroup(from)
            const isFromMe = mek.key.fromMe
            const sender = isGroup ? mek.key.participant : mek.key.remoteJid
            const senderNum = sender.split('@')[0]
            const botNumber = (conn.user?.id || '').split(':')[0]

            const isOwner = senderNum === OWNER_NUM || senderNum === botNumber || isFromMe

            if (isFromMe && !isOwner) return

            const reply = async (text) => {
                await conn.sendMessage(from, { text }, { quoted: mek })
            }

            let body = mek.message.conversation
                || mek.message.extendedTextMessage?.text
                || mek.message.imageMessage?.caption
                || mek.message.videoMessage?.caption
                || mek.message.documentMessage?.caption
                || ''

            // ====================== MUTE (groupe en mode admin-only côté bot) ======================
            if (isGroup && muteDB[from] === true) {
                const metadataCheck = await conn.groupMetadata(from)
                const adminsCheck = metadataCheck.participants.filter(p => p.admin).map(p => p.id)
                const isAdminCheck = adminsCheck.includes(sender) || isOwner
                const isCmdCheck = body.startsWith(PREFIX)
                if (!isAdminCheck && !isCmdCheck) {
                    await conn.sendMessage(from, { delete: mek.key })
                    return
                }
            }

            // ====================== ANTILINK ======================
            if (isGroup && antilinkDB[from] === true) {
                const linkRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)|(wa\.me\/[^\s]+)|(t\.me\/[^\s]+)|(chat\.whatsapp\.com\/[^\s]+)/gi
                
                if (linkRegex.test(body) && !isOwner) {
                    const metadata = await conn.groupMetadata(from)
                    const admins = metadata.participants.filter(p => p.admin).map(p => p.id)
                    const isAdmin = admins.includes(sender) || isOwner

                    if (!isAdmin) {
                        await conn.sendMessage(from, { delete: mek.key })
                        await conn.sendMessage(from, {
                            text: `🚫 *Lien détecté !*\n@${senderNum} les liens sont interdits ici.`,
                            mentions: [sender]
                        })
                        return
                    }
                }
            }

            if (!body) return

            const isCommand = body.startsWith(PREFIX)
            if (!isCommand) {
                if (!isGroup) {
                    const msg = body.toLowerCase()
                    if (['salut', 'slt', 'bonjour', 'hello', 'bonsoir', 'yo'].some(w => msg.includes(w))) {
                        return reply(`👋 Salut Master !\nTape *${PREFIX}menu*`)
                    }
                }
                return
            }

            const args = body.slice(PREFIX.length).trim().split(/ +/)
            const command = args.shift().toLowerCase()

            console.log(`[CMD] ${command} | De: ${senderNum} | Groupe: ${isGroup}`)

            // ====================== COMMANDES GÉNÉRALES ======================

            if (command === 'ping') {
                return reply(`🏓 *Pong !*\nBot: ${BOTNAME} ${VERSION}`)
            }

            if (command === 'menu') {
                return reply(getMenu())
            }

            if (command === 'owner') {
                return reply(`👑 *Owner*\nNom : ${OWNER}\nNuméro : ${OWNER_NUM}`)
            }

            if (command === 'runtime' || command === 'uptime') {
                return reply(`⏱️ *Uptime*\n${formatUptime(Date.now() - startTime)}`)
            }

            // ---------- .vv ----------
            if (command === 'vv') {
                const context = mek.message?.extendedTextMessage?.contextInfo
                if (!context?.quotedMessage) {
                    return reply(`👀 Réponds à une *image ou vidéo View Once* avec *${PREFIX}vv*`)
                }

                try {
                    const quotedMsg = context.quotedMessage
                    let type = null
                    let media = null

                    if (quotedMsg.imageMessage) {
                        type = 'image'
                        media = quotedMsg.imageMessage
                    } else if (quotedMsg.videoMessage) {
                        type = 'video'
                        media = quotedMsg.videoMessage
                    } else if (quotedMsg.viewOnceMessageV2?.message?.imageMessage) {
                        type = 'image'
                        media = quotedMsg.viewOnceMessageV2.message.imageMessage
                    } else if (quotedMsg.viewOnceMessageV2?.message?.videoMessage) {
                        type = 'video'
                        media = quotedMsg.viewOnceMessageV2.message.videoMessage
                    } else if (quotedMsg.viewOnceMessage?.message?.imageMessage) {
                        type = 'image'
                        media = quotedMsg.viewOnceMessage.message.imageMessage
                    } else if (quotedMsg.viewOnceMessage?.message?.videoMessage) {
                        type = 'video'
                        media = quotedMsg.viewOnceMessage.message.videoMessage
                    } else if (quotedMsg.viewOnceMessageV2Extension?.message?.imageMessage) {
                        type = 'image'
                        media = quotedMsg.viewOnceMessageV2Extension.message.imageMessage
                    } else if (quotedMsg.viewOnceMessageV2Extension?.message?.videoMessage) {
                        type = 'video'
                        media = quotedMsg.viewOnceMessageV2Extension.message.videoMessage
                    }

                    if (!media) {
                        return reply('❌ Ce message n\'est pas une image/vidéo View Once')
                    }

                    media.viewOnce = false

                    const buffer = await downloadMediaMessage(
                        {
                            key: {
                                remoteJid: from,
                                id: context.stanzaId,
                                fromMe: false,
                                participant: context.participant
                            },
                            message: { [type + 'Message']: media }
                        },
                        'buffer',
                        {},
                        { logger: pino({ level: 'silent' }), reuploadRequest: conn.updateMediaMessage }
                    )

                    if (type === 'image') {
                        await conn.sendMessage(from, {
                            image: buffer,
                            caption: '👀 *View Once débloqué*'
                        }, { quoted: mek })
                    } else {
                        await conn.sendMessage(from, {
                            video: buffer,
                            caption: '👀 *View Once débloqué*'
                        }, { quoted: mek })
                    }

                } catch (err) {
                    console.error('Erreur VV:', err)
                    return reply('❌ Impossible d\'ouvrir ce View Once')
                }
                return
            }

            // ---------- .sticker (image -> sticker) ----------
            // Nécessite : npm install sharp
            if (command === 'sticker' || command === 's') {
                try {
                    const sharp = require('sharp')
                    let buffer = null

                    if (mek.message.imageMessage) {
                        buffer = await downloadMediaMessage(mek, 'buffer', {}, { logger: pino({ level: 'silent' }), reuploadRequest: conn.updateMediaMessage })
                    } else if (mek.message.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage) {
                        const quoted = {
                            key: {
                                remoteJid: from,
                                id: mek.message.extendedTextMessage.contextInfo.stanzaId,
                                fromMe: false,
                                participant: mek.message.extendedTextMessage.contextInfo.participant
                            },
                            message: mek.message.extendedTextMessage.contextInfo.quotedMessage
                        }
                        buffer = await downloadMediaMessage(quoted, 'buffer', {}, { logger: pino({ level: 'silent' }), reuploadRequest: conn.updateMediaMessage })
                    }

                    if (!buffer) {
                        return reply(`🖼️ Envoie une *image* avec la légende *${PREFIX}sticker*\nOu réponds à une image avec *${PREFIX}sticker*`)
                    }

                    const webpBuffer = await sharp(buffer)
                        .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
                        .webp()
                        .toBuffer()

                    await conn.sendMessage(from, { sticker: webpBuffer }, { quoted: mek })
                } catch (err) {
                    console.error('Erreur sticker:', err)
                    return reply('❌ Erreur lors de la création du sticker (module "sharp" requis : npm install sharp)')
                }
                return
            }

            // ---------- .setlogo (CHANGE VRAIMENT LA PHOTO DE PROFIL) ----------
            if (command === 'setlogo') {
                if (!isOwner) return reply('❌ Owner only')

                try {
                    let buffer = null

                    // Cas 1 : Photo envoyée avec légende .setlogo
                    if (mek.message.imageMessage) {
                        buffer = await downloadMediaMessage(
                            mek,
                            'buffer',
                            {},
                            { logger: pino({ level: 'silent' }), reuploadRequest: conn.updateMediaMessage }
                        )
                    }
                    // Cas 2 : Réponse à une photo
                    else if (mek.message.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage) {
                        const quoted = {
                            key: {
                                remoteJid: from,
                                id: mek.message.extendedTextMessage.contextInfo.stanzaId,
                                fromMe: false,
                                participant: mek.message.extendedTextMessage.contextInfo.participant
                            },
                            message: mek.message.extendedTextMessage.contextInfo.quotedMessage
                        }
                        buffer = await downloadMediaMessage(
                            quoted,
                            'buffer',
                            {},
                            { logger: pino({ level: 'silent' }), reuploadRequest: conn.updateMediaMessage }
                        )
                    }

                    if (!buffer) {
                        return reply(`📷 Envoie une *photo* avec la légende *${PREFIX}setlogo*\nOu réponds à une photo avec *${PREFIX}setlogo*`)
                    }

                    // 1. Sauvegarde le fichier local
                    fs.writeFileSync(LOGO_PATH, buffer)

                    // 2. Change vraiment la photo de profil du bot
                    await conn.updateProfilePicture(conn.user.id, buffer)

                    console.log('✅ Logo + Photo de profil mis à jour')
                    return reply('✅ Logo du bot mis à jour avec succès !\nLa photo de profil a été changée.')

                } catch (err) {
                    console.error('Erreur setlogo:', err)
                    return reply('❌ Erreur lors de la mise à jour du logo.\nRéessaie avec une nouvelle photo.')
                }
            }

            // ====================== GROUPES UNIQUEMENT ======================
            if (!isGroup) return reply('❌ Cette commande est réservée aux groupes')

            const metadata = await conn.groupMetadata(from)
            const participants = metadata.participants
            const admins = participants.filter(p => p.admin).map(p => p.id)
            const isAdmin = admins.includes(sender) || isOwner
            const botJid = jidNormalizedUser(conn.user.id)
            const botIsAdmin = admins.includes(botJid) || admins.includes(conn.user.id)

            // Aide pour récupérer une cible (mention, reply, ou numéro en argument)
            const getTarget = () => {
                if (mek.message.extendedTextMessage?.contextInfo?.mentionedJid?.length) {
                    return mek.message.extendedTextMessage.contextInfo.mentionedJid
                }
                if (mek.message.extendedTextMessage?.contextInfo?.participant) {
                    return [mek.message.extendedTextMessage.contextInfo.participant]
                }
                if (args[0]) {
                    const num = args[0].replace(/[^0-9]/g, '')
                    if (num) return [`${num}@s.whatsapp.net`]
                }
                return []
            }

            if (command === 'welcome') {
                if (!isAdmin) return reply('❌ Admin only')
                const q = (args[0] || '').toLowerCase()
                if (q !== 'on' && q !== 'off') return reply(`Utilise :\n${PREFIX}welcome on\n${PREFIX}welcome off`)
                welcomeDB[from] = q === 'on'
                saveDB()
                return reply(`✅ Welcome *${q === 'on' ? 'activé' : 'désactivé'}*`)
            }

            if (command === 'antilink') {
                if (!isAdmin) return reply('❌ Admin only')
                const q = (args[0] || '').toLowerCase()
                if (q !== 'on' && q !== 'off') return reply(`Utilise :\n${PREFIX}antilink on\n${PREFIX}antilink off`)
                antilinkDB[from] = q === 'on'
                saveDB()
                return reply(`✅ Antilink *${q === 'on' ? 'activé' : 'désactivé'}*`)
            }

            if (command === 'kick') {
                if (!isAdmin) return reply('❌ Admin only')
                if (!botIsAdmin) return reply('❌ Le bot doit être administrateur')

                const target = getTarget()
                if (target.length === 0) {
                    return reply(`Mentionne quelqu'un :\n${PREFIX}kick @user`)
                }

                await conn.groupParticipantsUpdate(from, target, 'remove')
                return reply('👢 Membre exclu avec succès')
            }

            if (command === 'promote') {
                if (!isAdmin) return reply('❌ Admin only')
                if (!botIsAdmin) return reply('❌ Le bot doit être administrateur')

                const target = getTarget()
                if (target.length === 0) {
                    return reply(`Mentionne quelqu'un :\n${PREFIX}promote @user`)
                }

                await conn.groupParticipantsUpdate(from, target, 'promote')
                return reply('⬆️ Membre promu administrateur')
            }

            if (command === 'demote') {
                if (!isAdmin) return reply('❌ Admin only')
                if (!botIsAdmin) return reply('❌ Le bot doit être administrateur')

                const target = getTarget()
                if (target.length === 0) {
                    return reply(`Mentionne quelqu'un :\n${PREFIX}demote @user`)
                }

                await conn.groupParticipantsUpdate(from, target, 'demote')
                return reply('⬇️ Administrateur rétrogradé')
            }

            if (command === 'mute') {
                if (!isAdmin) return reply('❌ Admin only')
                muteDB[from] = true
                saveDB()
                return reply('🔇 Groupe mis en mode *silencieux* (seuls les admins peuvent parler)')
            }

            if (command === 'unmute') {
                if (!isAdmin) return reply('❌ Admin only')
                muteDB[from] = false
                saveDB()
                return reply('🔊 Groupe *réactivé*, tout le monde peut parler')
            }

            if (command === 'delete' || command === 'del') {
                if (!isAdmin) return reply('❌ Admin only')
                const context = mek.message?.extendedTextMessage?.contextInfo
                if (!context?.stanzaId) {
                    return reply(`🗑️ Réponds au message à supprimer avec *${PREFIX}delete*`)
                }
                await conn.sendMessage(from, {
                    delete: {
                        remoteJid: from,
                        id: context.stanzaId,
                        participant: context.participant,
                        fromMe: false
                    }
                })
                return
            }

            if (command === 'tagall') {
                if (!isAdmin) return reply('❌ Admin only')

                let teks = `📢 *TAG ALL*\n\n`
                const mentions = []

                for (let p of participants) {
                    teks += `• @${p.id.split('@')[0]}\n`
                    mentions.push(p.id)
                }

                await conn.sendMessage(from, {
                    text: teks,
                    mentions
                }, { quoted: mek })
                return
            }

            if (command === 'link' || command === 'invitelink') {
                if (!isAdmin) return reply('❌ Admin only')
                if (!botIsAdmin) return reply('❌ Le bot doit être administrateur')
                try {
                    const code = await conn.groupInviteCode(from)
                    return reply(`🔗 *Lien d'invitation*\nhttps://chat.whatsapp.com/${code}`)
                } catch (err) {
                    console.error('Erreur link:', err)
                    return reply('❌ Impossible de récupérer le lien')
                }
            }

            if (command === 'infogroup' || command === 'groupinfo') {
                const desc = metadata.desc || 'Aucune description'
                return reply(`ℹ️ *Infos du groupe*\n\n📛 Nom : ${metadata.subject}\n👥 Membres : ${participants.length}\n👮 Admins : ${admins.length}\n📝 Description :\n${desc}`)
            }

            if (command === 'setrules') {
                if (!isAdmin) return reply('❌ Admin only')
                const text = args.join(' ')
                if (!text) return reply(`Utilise : ${PREFIX}setrules <texte des règles>`)
                rulesDB[from] = text
                saveDB()
                return reply('✅ Règles du groupe mises à jour')
            }

            if (command === 'rules') {
                const rules = rulesDB[from]
                if (!rules) return reply('📜 Aucune règle définie pour ce groupe')
                return reply(`📜 *Règles du groupe*\n\n${rules}`)
            }

            if (command === 'warn') {
                if (!isAdmin) return reply('❌ Admin only')
                const target = getTarget()
                if (target.length === 0) {
                    return reply(`Mentionne quelqu'un :\n${PREFIX}warn @user`)
                }
                const key = `${from}_${target[0]}`
                warnDB[key] = (warnDB[key] || 0) + 1
                saveDB()
                const count = warnDB[key]
                await conn.sendMessage(from, {
                    text: `⚠️ @${target[0].split('@')[0]} a reçu un avertissement (${count}/3)`,
                    mentions: target
                })
                if (count >= 3 && botIsAdmin) {
                    await conn.groupParticipantsUpdate(from, target, 'remove')
                    warnDB[key] = 0
                    saveDB()
                    await conn.sendMessage(from, {
                        text: `👢 @${target[0].split('@')[0]} a atteint 3 avertissements et a été exclu`,
                        mentions: target
                    })
                }
                return
            }

            if (command === 'warnings') {
                const target = getTarget()
                if (target.length === 0) {
                    return reply(`Mentionne quelqu'un :\n${PREFIX}warnings @user`)
                }
                const key = `${from}_${target[0]}`
                const count = warnDB[key] || 0
                return reply(`⚠️ @${target[0].split('@')[0]} a ${count}/3 avertissement(s)`)
            }

        } catch (e) {
            console.error('ERREUR messages.upsert:', e)
        }
    })

    // ====================== WELCOME ======================
    conn.ev.on('group-participants.update', async (update) => {
        try {
            const { id, participants, action } = update
            if (action !== 'add') return
            if (!welcomeDB[id]) return

            for (let user of participants) {
                await conn.sendMessage(id, {
                    text: `👋 Bienvenue @${user.split('@')[0]} !\n\nTape *${PREFIX}menu* pour voir les commandes.`,
                    mentions: [user]
                })
            }
        } catch (e) {
            console.error('Erreur welcome:', e)
        }
    })
}

startBot()
