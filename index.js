const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    delay
} = require('@whiskeysockets/baileys')

const qrcode = require('qrcode-terminal')
const pino = require('pino')
const fs = require('fs')

// ================= CONFIGURATION =================

let PREFIX = '.'
let BOTNAME = 'MR TOM_BOT'
const OWNER = 'JOEL TOM_TECH'
const OWNER_NUMBER = '237654145540'
const VERSION = '1.0.0'

const SIGNATURE = `⚡ ${BOTNAME} ⚡
BY JOEL TOM_TECH
+${OWNER_NUMBER}`

// ================= DATABASE =================

const DATA_DIR = './database'

if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
}

const loadJSON = (file, defaultValue = {}) => {
    const path = `${DATA_DIR}/${file}`

    if (!fs.existsSync(path)) {
        fs.writeFileSync(path, JSON.stringify(defaultValue, null, 2))
        return defaultValue
    }

    try {
        return JSON.parse(fs.readFileSync(path))
    } catch {
        return defaultValue
    }
}

const saveJSON = (file, data) => {
    fs.writeFileSync(
        `${DATA_DIR}/${file}`,
        JSON.stringify(data, null, 2)
    )
}

let settings = loadJSON('settings.json', {})
let sudoUsers = loadJSON('sudo.json', [])
let antiLink = loadJSON('antilink.json', {})
let welcome = loadJSON('welcome.json', {})
let goodbye = loadJSON('goodbye.json', {})
let badwords = loadJSON('badwords.json', {})
let rules = loadJSON('rules.json', {})
let autoReact = loadJSON('autoreact.json', {})
let users = loadJSON('users.json', {})

// ================= OUTILS =================

const format = (text) => {
    return '> ' + text.split('\n').join('\n> ')
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

function isOwner(sender) {
    const number = sender.split('@')[0]
    return number === OWNER_NUMBER
}

function isSudo(sender) {
    const number = sender.split('@')[0]

    return isOwner(sender) ||
        sudoUsers.includes(number)
}

async function isAdmin(conn, group, sender) {
    const metadata = await conn.groupMetadata(group)

    const member = metadata.participants.find(
        p => p.id === sender
    )

    return member?.admin === 'admin' ||
           member?.admin === 'superadmin'
}

async function isBotAdmin(conn, group) {
    const metadata = await conn.groupMetadata(group)

    const bot = metadata.participants.find(
        p => p.id === conn.user.id.split(':')[0] + '@s.whatsapp.net'
    )

    return bot?.admin === 'admin' ||
           bot?.admin === 'superadmin'
}

function getMentioned(mek) {
    return mek.message?.extendedTextMessage?.contextInfo?.mentionedJid || []
}

// ================= MENU =================

function getMenu() {

return format(`
━━━━━━━━━━━━━━━━━━━━━━━━━━
┃      🤖 𝑴𝑹 𝑻𝑶𝑴_𝑩𝑶𝑻 ⚡
┃         𝑪𝑶𝑴𝑴𝑨𝑵𝑫 𝑴𝑬𝑵𝑼
━━━━━━━━━━━━━━━━━━━━━━━━━━

╭━━〔 👑 OWNER / SUDO 〕━━╮
┃ ${PREFIX}owner
┃ ${PREFIX}sudo add <numéro>
┃ ${PREFIX}sudo del <numéro>
┃ ${PREFIX}sudo list
┃ ${PREFIX}sudo on
┃ ${PREFIX}sudo off
┃ ${PREFIX}setprefix <préfixe>
┃ ${PREFIX}setname <nom>
┃ ${PREFIX}setbio <texte>
┃ ${PREFIX}broadcast <message>
┃ ${PREFIX}restart
┃ ${PREFIX}shutdown
╰━━━━━━━━━━━━━━━━━━━━╯

╭━━〔 🔧 SYSTÈME 〕━━╮
┃ ${PREFIX}menu
┃ ${PREFIX}help
┃ ${PREFIX}commands
┃ ${PREFIX}botinfo
┃ ${PREFIX}version
┃ ${PREFIX}status
┃ ${PREFIX}stats
┃ ${PREFIX}logs
┃ ${PREFIX}support
┃ ${PREFIX}ping
┃ ${PREFIX}uptime
╰━━━━━━━━━━━━━━━━━━━━╯

╭━━〔 🟢 ALIVE / PRÉSENCE 〕━━╮
┃ ${PREFIX}alive
┃ ${PREFIX}alive on
┃ ${PREFIX}alive off
┃ ${PREFIX}alive set <message>
┃ ${PREFIX}alwaysonline on
┃ ${PREFIX}alwaysonline off
┃ ${PREFIX}presence online
┃ ${PREFIX}presence offline
╰━━━━━━━━━━━━━━━━━━━━╯

╭━━〔 👥 GESTION DU GROUPE 〕━━╮
┃ ${PREFIX}groupinfo
┃ ${PREFIX}grouplink
┃ ${PREFIX}revoke
┃ ${PREFIX}invite
┃ ${PREFIX}add <numéro>
┃ ${PREFIX}remove @membre
┃ ${PREFIX}kick @membre
┃ ${PREFIX}promote @membre
┃ ${PREFIX}demote @membre
┃ ${PREFIX}mute @membre
┃ ${PREFIX}unmute @membre
╰━━━━━━━━━━━━━━━━━━━━╯

╭━━〔 ⚙️ CONFIGURATION GROUPE 〕━━╮
┃ ${PREFIX}group open
┃ ${PREFIX}group close
┃ ${PREFIX}group lock
┃ ${PREFIX}group unlock
┃ ${PREFIX}setsubject <nom>
┃ ${PREFIX}setdescription <texte>
┃ ${PREFIX}setrules <texte>
┃ ${PREFIX}rules
╰━━━━━━━━━━━━━━━━━━━━╯

╭━━〔 🛡️ PROTECTION 〕━━╮
┃ ${PREFIX}antispam on/off
┃ ${PREFIX}antispam limit <nombre>
┃ ${PREFIX}antiflood on/off
┃ ${PREFIX}antiflood limit <nombre>
┃ ${PREFIX}antilink on/off
┃ ${PREFIX}antibot on/off
┃ ${PREFIX}antifake on/off
┃ ${PREFIX}antimention on/off
┃ ${PREFIX}antigroupstatus on/off
┃ ${PREFIX}grouplock on/off
╰━━━━━━━━━━━━━━━━━━━━╯

╭━━〔 🚫 BADWORD 〕━━╮
┃ ${PREFIX}badword on/off
┃ ${PREFIX}badword add <mot>
┃ ${PREFIX}badword del <mot>
┃ ${PREFIX}badword list
┃ ${PREFIX}badword clear
╰━━━━━━━━━━━━━━━━━━━━╯

╭━━〔 ✏️ ANTI-EDIT / DELETE 〕━━╮
┃ ${PREFIX}antiedit on/off
┃ ${PREFIX}antidelete on/off
┃ ${PREFIX}deleted
┃ ${PREFIX}edited
┃ ${PREFIX}recover
╰━━━━━━━━━━━━━━━━━━━━╯

╭━━〔 📞 CALL / PRIVACY 〕━━╮
┃ ${PREFIX}anticall on/off
┃ ${PREFIX}anticall message <texte>
┃ ${PREFIX}privacy on/off
╰━━━━━━━━━━━━━━━━━━━━╯

╭━━〔 📢 MENTIONS 〕━━╮
┃ ${PREFIX}tagall
┃ ${PREFIX}tagadmins
┃ ${PREFIX}tagmods
┃ ${PREFIX}hidetag <message>
┃ ${PREFIX}mentionall
╰━━━━━━━━━━━━━━━━━━━━╯

╭━━〔 👋 WELCOME / GOODBYE 〕━━╮
┃ ${PREFIX}welcome on/off
┃ ${PREFIX}welcome set <message>
┃ ${PREFIX}welcome reset
┃ ${PREFIX}goodbye on/off
┃ ${PREFIX}goodbye set <message>
┃ ${PREFIX}goodbye reset
╰━━━━━━━━━━━━━━━━━━━━╯

╭━━〔 ❤️ AUTO REACTION 〕━━╮
┃ ${PREFIX}autoreact on/off
┃ ${PREFIX}rct triggers
┃ ${PREFIX}rct add <mot> <emoji>
┃ ${PREFIX}rct del <mot>
┃ ${PREFIX}rct list
┃ ${PREFIX}rct clear
╰━━━━━━━━━━━━━━━━━━━━╯

╭━━〔 👁️ STATUS WHATSAPP 〕━━╮
┃ ${PREFIX}statusreact on/off
┃ ${PREFIX}autoview on/off
┃ ${PREFIX}statusreply on/off
╰━━━━━━━━━━━━━━━━━━━━╯

╭━━〔 💬 AUTOMATISATION PM 〕━━╮
┃ ${PREFIX}pmauto on/off
┃ ${PREFIX}pmreply add <mot> <réponse>
┃ ${PREFIX}pmreply del <mot>
┃ ${PREFIX}pmreply list
┃ ${PREFIX}pmreply clear
╰━━━━━━━━━━━━━━━━━━━━╯

╭━━〔 📥 DOWNLOAD / MÉDIAS 〕━━╮
┃ ${PREFIX}download on/off
┃ ${PREFIX}ytdl <lien>
┃ ${PREFIX}tiktok <lien>
┃ ${PREFIX}igdl <lien>
┃ ${PREFIX}fb <lien>
┃ ${PREFIX}twitter <lien>
┃ ${PREFIX}spotify <lien>
┃ ${PREFIX}pinterest <lien>
┃ ${PREFIX}mediafire <lien>
╰━━━━━━━━━━━━━━━━━━━━╯

╭━━〔 🧠 IA / AI 〕━━╮
┃ ${PREFIX}ai on/off
┃ ${PREFIX}ai <question>
┃ ${PREFIX}ask <question>
┃ ${PREFIX}imagine <description>
┃ ${PREFIX}summarize
┃ ${PREFIX}translate <langue>
╰━━━━━━━━━━━━━━━━━━━━╯

╭━━〔 👤 UTILISATEURS / DATABASE 〕━━╮
┃ ${PREFIX}users
┃ ${PREFIX}userinfo <numéro>
┃ ${PREFIX}userdb on/off
┃ ${PREFIX}userdb delete <numéro>
┃ ${PREFIX}userdb list
┃ ${PREFIX}userdb clear
╰━━━━━━━━━━━━━━━━━━━━╯

╭━━〔 🎉 FUN / DIVERS 〕━━╮
┃ ${PREFIX}joke
┃ ${PREFIX}quote
┃ ${PREFIX}fact
┃ ${PREFIX}ship @user @user
┃ ${PREFIX}love @user
┃ ${PREFIX}8ball <question>
╰━━━━━━━━━━━━━━━━━━━━╯

╭━━〔 🖼️ CONVERSION 〕━━╮
┃ ${PREFIX}sticker
┃ ${PREFIX}toimg
┃ ${PREFIX}tomp3
╰━━━━━━━━━━━━━━━━━━━━╯

╭━━━━━━━━━━━━━━━━━━━━━━╮
┃     🌐 𝑳𝑨𝑵𝑮𝑼𝑨𝑮𝑬 𝑩𝑶𝑻
┃ 🇫🇷 ${PREFIX}lang fr
┃ 🇬🇧 ${PREFIX}lang en
┃ 🌍 ${PREFIX}lang auto
╰━━━━━━━━━━━━━━━━━━━━━━╯

╭━━━━━━━━━━━━━━━━━━━━━━╮
┃      ⚡ 𝑴𝑹 𝑻𝑶𝑴_𝑩𝑶𝑻 ⚡
┃       𝑩𝒀 𝑱𝑶𝑬𝑳 𝑻𝑶𝑴_𝑻𝑬𝑪𝑯
┃       +237654145540
╰━━━━━━━━━━━━━━━━━━━━━━╯
`)
}

// ================= BOT =================

let startTime = Date.now()
let messageCount = 0

async function startBot() {

    const { state, saveCreds } =
        await useMultiFileAuthState('./session')

    const { version } =
        await fetchLatestBaileysVersion()

    const conn = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: true,
        browser: ['MR TOM_BOT', 'Chrome', '120.0.0'],
        logger: pino({ level: 'fatal' })
    })

    conn.ev.on('creds.update', saveCreds)

    // ================= CONNECTION =================

    conn.ev.on('connection.update', update => {

        const {
            connection,
            lastDisconnect,
            qr
        } = update

        if (qr) {
            console.log('\n')
            console.log('======================================')
            console.log('       SCANNE LE QR WHATSAPP')
            console.log('          MR TOM_BOT')
            console.log('======================================')
            qrcode.generate(qr, { small: true })
        }

        if (connection === 'open') {
            startTime = Date.now()

            console.log(`
======================================
        MR TOM_BOT CONNECTÉ
======================================
OWNER : ${OWNER}
NUMERO : +${OWNER_NUMBER}
PREFIX : ${PREFIX}
VERSION : ${VERSION}
======================================
`)
        }

        if (connection === 'close') {

            const shouldReconnect =
                lastDisconnect?.error?.output?.statusCode !==
                DisconnectReason.loggedOut

            if (shouldReconnect) {
                console.log('Connexion fermée. Reconnexion...')
                startBot()
            } else {
                console.log('Session déconnectée.')
            }
        }
    })

    // ================= MESSAGES =================

    conn.ev.on('messages.upsert', async ({ messages }) => {

        if (!messages[0]) return

        const mek = messages[0]

        if (!mek.message) return

        messageCount++

        const from = mek.key.remoteJid

        const body =
            mek.message.conversation ||
            mek.message.extendedTextMessage?.text ||
            ''

        const isGroup = from.endsWith('@g.us')

        const sender =
            mek.key.participant ||
            mek.key.remoteJid

        // Enregistrement utilisateur
        const number = sender.split('@')[0]

        if (!users[number]) {
            users[number] = {
                number,
                messages: 0,
                firstSeen: new Date().toISOString()
            }
        }

        users[number].messages++
        saveJSON('users.json', users)

        // ================= ANTILINK =================

        if (isGroup && antiLink[from]) {

            const linkRegex =
                /chat\.whatsapp\.com\/[0-9A-Za-z]{20,30}/i

            if (linkRegex.test(body)) {

                try {

                    const senderAdmin =
                        await isAdmin(conn, from, sender)

                    const botAdmin =
                        await isBotAdmin(conn, from)

                    if (!senderAdmin && botAdmin) {

                        await conn.sendMessage(
                            from,
                            {
                                text: format(
                                    `❌ LIEN WHATSAPP DÉTECTÉ

@${number} a été expulsé.

🛡️ ANTI-LINK ACTIF`
                                ),
                                mentions: [sender]
                            },
                            { quoted: mek }
                        )

                        await conn.groupParticipantsUpdate(
                            from,
                            [sender],
                            'remove'
                        )

                        return
                    }

                } catch (e) {
                    console.log(e)
                }
            }
        }

        // ================= BADWORD =================

        if (isGroup && badwords[from]?.enabled) {

            const words =
                badwords[from].words || []

            const message =
                body.toLowerCase()

            const found =
                words.find(word =>
                    message.includes(word.toLowerCase())
                )

            if (found) {

                try {

                    if (await isBotAdmin(conn, from)) {

                        await conn.sendMessage(
                            from,
                            {
                                delete: mek.key
                            }
                        )

                        await conn.sendMessage(
                            from,
                            {
                                text: format(
                                    `🚫 MOT INTERDIT

@${number}, ce mot est interdit dans ce groupe.`
                                ),
                                mentions: [sender]
                            }
                        )
                    }

                } catch (e) {
                    console.log(e)
                }

                return
            }
        }

        // ================= PREFIX =================

        if (!body.startsWith(PREFIX)) return

        const args =
            body.slice(PREFIX.length)
                .trim()
                .split(/\s+/)

        const command =
            args.shift()?.toLowerCase()

        const q = args.join(' ')

        const reply = text =>
            conn.sendMessage(
                from,
                {
                    text: format(text)
                },
                {
                    quoted: mek
                }
            )

        // ================= COMMANDS =================

        if (command === 'menu' ||
            command === 'help' ||
            command === 'commands') {

            return reply(getMenu())
        }

        // ================= OWNER =================

        if (command === 'owner') {

            return reply(`
👑 OWNER

Nom : ${OWNER}
WhatsApp : +${OWNER_NUMBER}

⚡ ${BOTNAME}
Version : ${VERSION}
`)
        }

        // ================= SUDO =================

        if (command === 'sudo') {

            if (!isOwner(sender))
                return reply('❌ OWNER SEULEMENT')

            const action = args[0]
            const numberArg = args[1]

            if (action === 'add') {

                if (!numberArg)
                    return reply(
                        `Usage : ${PREFIX}sudo add 237XXXXXXXXX`
                    )

                const num =
                    numberArg.replace(/\D/g, '')

                if (!sudoUsers.includes(num))
                    sudoUsers.push(num)

                saveJSON('sudo.json', sudoUsers)

                return reply(
                    `✅ ${num} ajouté aux SUDO`
                )
            }

            if (action === 'del') {

                if (!numberArg)
                    return reply(
                        `Usage : ${PREFIX}sudo del 237XXXXXXXXX`
                    )

                sudoUsers =
                    sudoUsers.filter(
                        n => n !== numberArg.replace(/\D/g, '')
                    )

                saveJSON('sudo.json', sudoUsers)

                return reply('✅ SUDO supprimé')
            }

            if (action === 'list') {

                return reply(
                    `👑 LISTE SUDO\n\n` +
                    (sudoUsers.length
                        ? sudoUsers.map(
                            n => `➟ +${n}`
                          ).join('\n')
                        : 'Aucun SUDO')
                )
            }

            return reply(
                `Usage :
${PREFIX}sudo add <numéro>
${PREFIX}sudo del <numéro>
${PREFIX}sudo list`
            )
        }

        // ================= SET PREFIX =================

        if (command === 'setprefix') {

            if (!isOwner(sender))
                return reply('❌ OWNER SEULEMENT')

            if (!q)
                return reply(
                    `Usage : ${PREFIX}setprefix !`
                )

            PREFIX = q

            return reply(
                `✅ Nouveau préfixe : ${PREFIX}`
            )
        }

        // ================= SET NAME =================

        if (command === 'setname') {

            if (!isOwner(sender))
                return reply('❌ OWNER SEULEMENT')

            if (!q)
                return reply(
                    `Usage : ${PREFIX}setname MonBot`
                )

            BOTNAME = q

            return reply(
                `✅ Nom changé en : ${BOTNAME}`
            )
        }

        // ================= BOT INFO =================

        if (command === 'botinfo' ||
            command === 'version') {

            return reply(`
🤖 ${BOTNAME}

📦 Version : ${VERSION}
⚡ Prefix : ${PREFIX}
👑 Owner : ${OWNER}
🌍 Mode : Public
📱 WhatsApp Bot
`)
        }

        // ================= PING =================

        if (command === 'ping') {

            const start = Date.now()

            await delay(100)

            const ping = Date.now() - start

            return reply(
                `🏓 PONG !

⚡ Speed : ${ping} ms
🤖 ${BOTNAME}
🟢 ONLINE`
            )
        }

        // ================= UPTIME =================

        if (command === 'uptime') {

            const uptime =
                Date.now() - startTime

            const seconds =
                Math.floor(uptime / 1000)

            const minutes =
                Math.floor(seconds / 60)

            const hours =
                Math.floor(minutes / 60)

            return reply(`
⏱️ UPTIME

🕐 ${hours}h ${minutes % 60}m ${seconds % 60}s
`)
        }

        // ================= STATUS =================

        if (command === 'status') {

            return reply(`
🟢 BOT STATUS

Bot : ${BOTNAME}
Status : ONLINE
Version : ${VERSION}
Messages : ${messageCount}
`)
        }

        // ================= GROUP INFO =================

        if (command === 'groupinfo') {

            if (!isGroup)
                return reply(
                    '❌ Commande groupe seulement'
                )

            const meta =
                await conn.groupMetadata(from)

            return reply(`
👥 GROUPE

📌 Nom : ${meta.subject}
👤 Membres : ${meta.participants.length}
🆔 ID : ${from}
`)
        }

        // ================= GROUP LINK =================

        if (command === 'grouplink' ||
            command === 'invite') {

            if (!isGroup)
                return reply(
                    '❌ Groupe seulement'
                )

            if (!await isAdmin(conn, from, sender))
                return reply(
                    '❌ Admin seulement'
                )

            if (!await isBotAdmin(conn, from))
                return reply(
                    '❌ Je dois être admin'
                )

            const code =
                await conn.groupInviteCode(from)

            return reply(
                `🔗 LIEN DU GROUPE

https://chat.whatsapp.com/${code}`
            )
        }

        // ================= KICK =================

        if (command === 'kick' ||
            command === 'remove') {

            if (!isGroup)
                return reply(
                    '❌ Groupe seulement'
                )

            if (!await isAdmin(conn, from, sender))
                return reply(
                    '❌ Admin seulement'
                )

            const mentioned =
                getMentioned(mek)

            if (!mentioned.length)
                return reply(
                    `Usage : ${PREFIX}kick @membre`
                )

            if (!await isBotAdmin(conn, from))
                return reply(
                    '❌ Je dois être admin'
                )

            await conn.groupParticipantsUpdate(
                from,
                mentioned,
                'remove'
            )

            return reply('✅ Membre expulsé')
        }

        // ================= PROMOTE =================

        if (command === 'promote') {

            if (!isGroup)
                return reply('❌ Groupe seulement')

            if (!await isAdmin(conn, from, sender))
                return reply('❌ Admin seulement')

            const mentioned =
                getMentioned(mek)

            if (!mentioned.length)
                return reply(
                    `Usage : ${PREFIX}promote @membre`
                )

            await conn.groupParticipantsUpdate(
                from,
                mentioned,
                'promote'
            )

            return reply('👑 Membre promu admin')
        }

        // ================= DEMOTE =================

        if (command === 'demote') {

            if (!isGroup)
                return reply('❌ Groupe seulement')

            if (!await isAdmin(conn, from, sender))
                return reply('❌ Admin seulement')

            const mentioned =
                getMentioned(mek)

            if (!mentioned.length)
                return reply(
                    `Usage : ${PREFIX}demote @membre`
                )

            await conn.groupParticipantsUpdate(
                from,
                mentioned,
                'demote'
            )

            return reply('✅ Admin rétrogradé')
        }

        // ================= GROUP OPEN =================

        if (command === 'open') {

            if (!isGroup)
                return reply('❌ Groupe seulement')

            if (!await isAdmin(conn, from, sender))
                return reply('❌ Admin seulement')

            await conn.groupSettingUpdate(
                from,
                'not_announcement'
            )

            return reply('🔓 GROUPE OUVERT')
        }

        // ================= GROUP CLOSE =================

        if (command === 'close') {

            if (!isGroup)
                return reply('❌ Groupe seulement')

            if (!await isAdmin(conn, from, sender))
                return reply('❌ Admin seulement')

            await conn.groupSettingUpdate(
                from,
                'announcement'
            )

            return reply('🔒 GROUPE FERMÉ')
        }

        // ================= TAG ALL =================

        if (command === 'tagall' ||
            command === 'mentionall') {

            if (!isGroup)
                return reply('❌ Groupe seulement')

            const meta =
                await conn.groupMetadata(from)

            const members =
                meta.participants.map(
                    p => p.id
                )

            let text =
                `📢 TAG ALL\n\n`

            members.forEach(
                member => {
                    text +=
                        `➟ @${member.split('@')[0]}\n`
                }
            )

            if (q)
                text =
                    `${q}\n\n${text}`

            return conn.sendMessage(
                from,
                {
                    text: format(text),
                    mentions: members
                },
                {
                    quoted: mek
                }
            )
        }

        // ================= HIDETAG =================

        if (command === 'hidetag') {

            if (!isGroup)
                return reply('❌ Groupe seulement')

            const meta =
                await conn.groupMetadata(from)

            const members =
                meta.participants.map(
                    p => p.id
                )

            return conn.sendMessage(
                from,
                {
                    text: q || '📢 Message',
                    mentions: members
                },
                {
                    quoted: mek
                }
            )
        }

        // ================= ANTILINK =================

        if (command === 'antilink') {

            if (!isGroup)
                return reply('❌ Groupe seulement')

            if (!await isAdmin(conn, from, sender))
                return reply('❌ Admin seulement')

            if (q === 'on') {

                antiLink[from] = true

                saveJSON(
                    'antilink.json',
                    antiLink
                )

                return reply(
                    '🛡️ ANTILINK ACTIVÉ'
                )
            }

            if (q === 'off') {

                delete antiLink[from]

                saveJSON(
                    'antilink.json',
                    antiLink
                )

                return reply(
                    '❌ ANTILINK DÉSACTIVÉ'
                )
            }

            return reply(
                `Usage : ${PREFIX}antilink on/off`
            )
        }

        // ================= BADWORD =================

        if (command === 'badword') {

            if (!isGroup)
                return reply('❌ Groupe seulement')

            if (!await isAdmin(conn, from, sender))
                return reply('❌ Admin seulement')

            const action = args[0]
            const word = args.slice(1).join(' ')

            if (!badwords[from]) {
                badwords[from] = {
                    enabled: false,
                    words: []
                }
            }

            if (action === 'on') {
                badwords[from].enabled = true
            }

            else if (action === 'off') {
                badwords[from].enabled = false
            }

            else if (action === 'add') {

                if (!word)
                    return reply(
                        `Usage : ${PREFIX}badword add <mot>`
                    )

                if (!badwords[from].words.includes(word))
                    badwords[from].words.push(word)
            }

            else if (action === 'del') {

                badwords[from].words =
                    badwords[from].words.filter(
                        w => w !== word
                    )
            }

            else if (action === 'list') {

                return reply(
                    `🚫 BADWORDS\n\n` +
                    (badwords[from].words.length
                        ? badwords[from].words.join('\n')
                        : 'Aucun mot')
                )
            }

            else if (action === 'clear') {

                badwords[from].words = []
            }

            else {
                return reply(`
${PREFIX}badword on
${PREFIX}badword off
${PREFIX}badword add <mot>
${PREFIX}badword del <mot>
${PREFIX}badword list
${PREFIX}badword clear
`)
            }

            saveJSON(
                'badwords.json',
                badwords
            )

            return reply(
                '✅ BADWORD MIS À JOUR'
            )
        }

        // ================= WELCOME =================

        if (command === 'welcome') {

            if (!isGroup)
                return reply('❌ Groupe seulement')

            if (!await isAdmin(conn, from, sender))
                return reply('❌ Admin seulement')

            const action = args[0]

            if (!welcome[from]) {
                welcome[from] = {
                    enabled: false,
                    message:
                        '👋 Bienvenue @user dans le groupe !'
                }
            }

            if (action === 'on') {
                welcome[from].enabled = true
            }

            else if (action === 'off') {
                welcome[from].enabled = false
            }

            else if (action === 'set') {

                const msg =
                    args.slice(1).join(' ')

                if (!msg)
                    return reply(
                        `Usage : ${PREFIX}welcome set <message>`
                    )

                welcome[from].message = msg
            }

            else if (action === 'reset') {

                welcome[from] = {
                    enabled: false,
                    message:
                        '👋 Bienvenue @user dans le groupe !'
                }
            }

            else {
                return reply(`
${PREFIX}welcome on
${PREFIX}welcome off
${PREFIX}welcome set <message>
${PREFIX}welcome reset
`)
            }

            saveJSON(
                'welcome.json',
                welcome
            )

            return reply(
                '✅ WELCOME MIS À JOUR'
            )
        }

        // ================= RULES =================

        if (command === 'setrules') {

            if (!isGroup)
                return reply('❌ Groupe seulement')

            if (!await isAdmin(conn, from, sender))
                return reply('❌ Admin seulement')

            if (!q)
                return reply(
                    `Usage : ${PREFIX}setrules <texte>`
                )

            rules[from] = q

            saveJSON(
                'rules.json',
                rules
            )

            return reply(
                '✅ RÈGLES ENREGISTRÉES'
            )
        }

        if (command === 'rules') {

            return reply(
                rules[from] ||
                '📜 Aucune règle définie.'
            )
        }

        // ================= USERS =================

        if (command === 'users') {

            return reply(
                `👤 UTILISATEURS ENREGISTRÉS : ${Object.keys(users).length}`
            )
        }

        if (command === 'userinfo') {

            const num =
                args[0]?.replace(/\D/g, '')

            if (!num)
                return reply(
                    `Usage : ${PREFIX}userinfo <numéro>`
                )

            const data = users[num]

            if (!data)
                return reply(
                    '❌ Utilisateur introuvable'
                )

            return reply(`
👤 USER INFO

📱 Numéro : +${data.number}
💬 Messages : ${data.messages}
📅 Première connexion :
${data.firstSeen}
`)
        }

        // ================= 8BALL =================

        if (command === '8ball') {

            if (!q)
                return reply(
                    `Usage : ${PREFIX}8ball <question>`
                )

            const answers = [
                'Oui.',
                'Non.',
                'Certainement.',
                'Impossible.',
                'Peut-être.',
                'Je ne pense pas.',
                'Très probable.',
                'Demande-moi plus tard.'
            ]

            const answer =
                answers[
                    Math.floor(
                        Math.random() * answers.length
                    )
                ]

            return reply(
                `🎱 8BALL\n\n${answer}`
            )
        }

        // ================= LOVE =================

        if (command === 'love') {

            const percent =
                Math.floor(
                    Math.random() * 101
                )

            const mentioned =
                getMentioned(mek)

            const user =
                mentioned[0]
                    ? `@${mentioned[0].split('@')[0]}`
                    : 'Cette personne'

            return conn.sendMessage(
                from,
                {
                    text: format(
                        `❤️ LOVE METER

${user}

💘 Compatibilité : ${percent}%`
                    ),
                    mentions: mentioned
                },
                {
                    quoted: mek
                }
            )
        }

        // ================= LANG =================

        if (command === 'lang') {

            if (!q)
                return reply(`
🌐 LANGUE ACTUELLE

🇫🇷 Français
`)
            
            if (q === 'fr')
                return reply(
                    '🇫🇷 Langue sélectionnée : Français'
                )

            if (q === 'en')
                return reply(
                    '🇬🇧 Selected language: English'
                )

            if (q === 'auto')
                return reply(
                    '🌍 Détection automatique activée.'
                )

            return reply(
                `Usage : ${PREFIX}lang fr/en/auto`
            )
        }

        // ================= RESTART =================

        if (command === 'restart') {

            if (!isOwner(sender))
                return reply('❌ OWNER SEULEMENT')

            await reply(
                '🔄 Redémarrage du bot...'
            )

            process.exit(0)
        }

        // ================= SHUTDOWN =================

        if (command === 'shutdown') {

            if (!isOwner(sender))
                return reply('❌ OWNER SEULEMENT')

            await reply(
                '🛑 ARRÊT DU BOT...'
            )

            process.exit(0)
        }

    })

    // ================= WELCOME / GOODBYE =================

    conn.ev.on(
        'group-participants.update',
        async update => {

            const {
                id,
                participants,
                action
            } = update

            if (!welcome[id]?.enabled &&
                action === 'add')
                return

            if (!goodbye[id]?.enabled &&
                action === 'remove')
                return

            for (const participant of participants) {

                const number =
                    participant.split('@')[0]

                if (action === 'add') {

                    const message =
                        welcome[id].message
                            .replace(
                                '@user',
                                `@${number}`
                            )

                    await conn.sendMessage(
                        id,
                        {
                            text: format(message),
                            mentions: [participant]
                        }
                    )
                }

                if (action === 'remove') {

                    const message =
                        goodbye[id]?.message ||
                        `👋 @${number} a quitté le groupe.`

                    await conn.sendMessage(
                        id,
                        {
                            text: format(
                                message.replace(
                                    '@user',
                                    `@@${number}`
                                )
                            ),
                            mentions: [participant]
                        }
                    )
                }
            }
        }
    )
}

startBot()