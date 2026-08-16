const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    isJidGroup,
    downloadMediaMessage
} = require('@whiskeysockets/baileys')

const pino = require('pino')
const qrcode = require('qrcode-terminal')
const fs = require('fs')

// ═══════════════════════════════════════
//              CONFIGURATION
// ═══════════════════════════════════════

const PREFIX = '.'
const OWNER = '𝑱𝑶𝑬𝑳 𝑻𝑶𝑴_𝑻𝑬𝑪𝑯💻'
const BOTNAME = '🎩𝑱𝑶𝑬𝑳 𝑻𝑶𝑴_𝑩𝑶𝑻 🎩'
const VERSION = 'v1.0.0'
const SIGNATURE = '> BY : _© 2026 𝑱𝑶𝑬𝑳 𝑻𝑶𝑴_𝑻𝑬𝑪𝑯💻_'

const LOGO_PATH = './logo.jpg'
const SESSION_PATH = './session'

// ═══════════════════════════════════════
//              FORMATAGE
// ═══════════════════════════════════════

const format = (text) => {
    return '> ' + text.split('\n').join('\n> ')
}

// ═══════════════════════════════════════
//                 MENU
// ═══════════════════════════════════════

const getMenu = () => format(`
╭━━━〔 ✦ ${BOTNAME} ✦ 〕━━━╮
┃
┃  👑 OWNER    : ${OWNER}
┃  🤖 VERSION  : ${VERSION}
┃  ⚡ PREFIX   : ${PREFIX}
┃  🌍 MODE     : PUBLIC
┃  📅 DATE     : ${new Date().toLocaleDateString('fr-FR')}
┃  📚 COMMANDS : 11
┃
╰━━━━━━━━━━━━━━━━━━━━━━╯

╭━━━〔 ⚙️ SYSTEM 〕━━━╮
┃
┃  ${PREFIX}menu
┃  ${PREFIX}ping
┃  ${PREFIX}info
┃  ${PREFIX}setlogo
┃
╰━━━━━━━━━━━━━━━━━━━━╯

╭━━━〔 🛡️ ADMIN 〕━━━╮
┃
┃  ${PREFIX}open
┃  ${PREFIX}close
┃  ${PREFIX}kick @tag
┃  ${PREFIX}tagall
┃  ${PREFIX}welcome on/off
┃
╰━━━━━━━━━━━━━━━━━━━━╯

╭━━━〔 ✦ ${BOTNAME} ✦ 〕━━━╮
┃
┃  🚀 Bot Status : ONLINE
┃  🔰 Developer  : ${OWNER}
┃  💠 Version    : ${VERSION}
┃
╰━━━━━━━━━━━━━━━━━━━━╯

${SIGNATURE}
`)

// ═══════════════════════════════════════
//              DÉMARRAGE BOT
// ═══════════════════════════════════════

async function startBot() {

    try {

        const { state, saveCreds } =
            await useMultiFileAuthState(SESSION_PATH)

        const { version } =
            await fetchLatestBaileysVersion()

        const conn = makeWASocket({
            version,
            auth: state,
            printQRInTerminal: false,

            logger: pino({
                level: 'silent'
            }),

            browser: [
                'Ubuntu',
                'Chrome',
                '20.0.04'
            ]
        })

        // ═══════════════════════════════════
        //              SESSION
        // ═══════════════════════════════════

        conn.ev.on(
            'creds.update',
            saveCreds
        )

        // ═══════════════════════════════════
        //          CONNEXION
        // ═══════════════════════════════════

        conn.ev.on(
            'connection.update',
            (update) => {

                const {
                    connection,
                    lastDisconnect,
                    qr
                } = update

                if (qr) {

                    console.log(
                        '\n╔════════════════════════════╗'
                    )

                    console.log(
                        '║     📱 SCANNE LE QR CODE    ║'
                    )

                    console.log(
                        '╚════════════════════════════╝\n'
                    )

                    qrcode.generate(
                        qr,
                        {
                            small: true
                        }
                    )
                }

                if (connection === 'open') {

                    console.log(
                        `\n✅ ${BOTNAME} CONNECTÉ`
                    )

                    console.log(
                        `🤖 VERSION : ${VERSION}`
                    )

                    console.log(
                        `👑 OWNER   : ${OWNER}\n`
                    )
                }

                if (connection === 'close') {

                    const shouldReconnect =
                        lastDisconnect?.error?.output?.statusCode
                        !== DisconnectReason.loggedOut

                    if (shouldReconnect) {

                        console.log(
                            '🔄 Reconnexion du bot...'
                        )

                        startBot()

                    } else {

                        console.log(
                            '❌ Session déconnectée.'
                        )

                    }
                }
            }
        )

        // ═══════════════════════════════════
        //             MESSAGES
        // ═══════════════════════════════════

        conn.ev.on(
            'messages.upsert',
            async ({ messages }) => {

                try {

                    if (!messages || !messages[0])
                        return

                    const mek = messages[0]

                    if (!mek.message)
                        return

                    const from =
                        mek.key.remoteJid

                    if (!from)
                        return

                    const isGroup =
                        isJidGroup(from)

                    // ═══════════════════════════════
                    //          TEXTE MESSAGE
                    // ═══════════════════════════════

                    const body =
                        mek.message?.conversation ||
                        mek.message?.extendedTextMessage?.text ||
                        mek.message?.imageMessage?.caption ||
                        mek.message?.videoMessage?.caption ||
                        ''

                    if (!body)
                        return

                    if (!body.startsWith(PREFIX))
                        return

                    // ═══════════════════════════════
                    //           COMMANDE
                    // ═══════════════════════════════

                    const command =
                        body
                            .slice(PREFIX.length)
                            .trim()
                            .split(/\s+/)[0]
                            .toLowerCase()

                    const q =
                        body
                            .slice(
                                PREFIX.length +
                                command.length
                            )
                            .trim()

                    // ═══════════════════════════════
                    //              REPLY
                    // ═══════════════════════════════

                    const reply = async (text) => {

                        await conn.sendMessage(
                            from,
                            {
                                text: format(text)
                            },
                            {
                                quoted: mek
                            }
                        )

                    }

                    // ═══════════════════════════════
                    //        COMMANDES ADMIN
                    // ═══════════════════════════════

                    const adminCommands = [
                        'open',
                        'close',
                        'kick',
                        'tagall',
                        'welcome'
                    ]

                    if (
                        !isGroup &&
                        adminCommands.includes(command)
                    ) {

                        return reply(
                            '❌ Cette commande fonctionne uniquement dans les groupes.'
                        )
                    }

                    // ═══════════════════════════════
                    //              MENU
                    // ═══════════════════════════════

                    if (command === 'menu') {

                        if (fs.existsSync(LOGO_PATH)) {

                            await conn.sendMessage(
                                from,
                                {
                                    image:
                                        fs.readFileSync(
                                            LOGO_PATH
                                        ),

                                    caption:
                                        getMenu()
                                },
                                {
                                    quoted: mek
                                }
                            )

                        } else {

                            await reply(
                                '❌ Aucun logo trouvé.\n\n📷 Envoie une image avec la légende :\n.setlogo'
                            )
                        }
                    }

                    // ═══════════════════════════════
                    //              PING
                    // ═══════════════════════════════

                    else if (command === 'ping') {

                        const start =
                            Date.now()

                        if (
                            fs.existsSync(
                                LOGO_PATH
                            )
                        ) {

                            await conn.sendMessage(
                                from,
                                {
                                    image:
                                        fs.readFileSync(
                                            LOGO_PATH
                                        ),

                                    caption:
                                        format(
                                            '🏓 TEST DE CONNEXION...'
                                        )
                                },
                                {
                                    quoted: mek
                                }
                            )

                        } else {

                            await conn.sendMessage(
                                from,
                                {
                                    text:
                                        format(
                                            '🏓 TEST DE CONNEXION...'
                                        )
                                },
                                {
                                    quoted: mek
                                }
                            )
                        }

                        const end =
                            Date.now()

                        await reply(
                            `🏓 PONG !\n\n⚡ Latence : ${end - start} ms\n🤖 Bot : EN LIGNE ✅`
                        )
                    }

                    // ═══════════════════════════════
                    //              INFO
                    // ═══════════════════════════════

                    else if (command === 'info') {

                        const infoText =
                            format(`
╭━━━〔 🤖 BOT INFO 〕━━━╮
┃
┃  ✦ BOT     : ${BOTNAME}
┃  ✦ VERSION : ${VERSION}
┃  ✦ OWNER   : ${OWNER}
┃  ✦ MODE    : PUBLIC
┃  ✦ STATUS  : ONLINE
┃
╰━━━━━━━━━━━━━━━━━━━━╯

${SIGNATURE}
`)

                        if (
                            fs.existsSync(
                                LOGO_PATH
                            )
                        ) {

                            await conn.sendMessage(
                                from,
                                {
                                    image:
                                        fs.readFileSync(
                                            LOGO_PATH
                                        ),

                                    caption:
                                        infoText
                                },
                                {
                                    quoted: mek
                                }
                            )

                        } else {

                            await reply(
                                infoText
                            )
                        }
                    }

                    // ═══════════════════════════════
                    //             SETLOGO
                    // ═══════════════════════════════

                    else if (command === 'setlogo') {

                        if (
                            mek.message.imageMessage
                        ) {

                            const buffer =
                                await downloadMediaMessage(
                                    mek,
                                    'buffer',
                                    {}
                                )

                            fs.writeFileSync(
                                LOGO_PATH,
                                buffer
                            )

                            await reply(
                                '✅ Logo mis à jour avec succès !\n\nUtilise maintenant .menu'
                            )

                        } else {

                            await reply(
                                `📷 Envoie une image avec la légende ${PREFIX}setlogo`
                            )
                        }
                    }

                    // ═══════════════════════════════
                    //             WELCOME
                    // ═══════════════════════════════

                    else if (command === 'welcome') {

                        if (q === 'on') {

                            await reply(
                                '✅ WELCOME ACTIVÉ'
                            )

                        }

                        else if (q === 'off') {

                            await reply(
                                '❌ WELCOME DÉSACTIVÉ'
                            )

                        }

                        else {

                            await reply(
                                `Usage : ${PREFIX}welcome on/off`
                            )
                        }
                    }

                    // ═══════════════════════════════
                    //               OPEN
                    // ═══════════════════════════════

                    else if (command === 'open') {

                        try {

                            await conn.groupSettingUpdate(
                                from,
                                'not_announcement'
                            )

                            await reply(
                                '🔓 GROUPE OUVERT\n\n✅ Tous les membres peuvent maintenant envoyer des messages.'
                            )

                        } catch (error) {

                            await reply(
                                '❌ Impossible d’ouvrir le groupe.\nLe bot doit être administrateur.'
                            )
                        }
                    }

                    // ═══════════════════════════════
                    //              CLOSE
                    // ═══════════════════════════════

                    else if (command === 'close') {

                        try {

                            await conn.groupSettingUpdate(
                                from,
                                'announcement'
                            )

                            await reply(
                                '🔒 GROUPE FERMÉ\n\n✅ Seuls les administrateurs peuvent envoyer des messages.'
                            )

                        } catch (error) {

                            await reply(
                                '❌ Impossible de fermer le groupe.\nLe bot doit être administrateur.'
                            )
                        }
                    }

                    // ═══════════════════════════════
                    //               KICK
                    // ═══════════════════════════════

                    else if (command === 'kick') {

                        const mentioned =
                            mek.message
                                ?.extendedTextMessage
                                ?.contextInfo
                                ?.mentionedJid || []

                        if (
                            mentioned.length === 0
                        ) {

                            return reply(
                                `❌ Usage : ${PREFIX}kick @membre`
                            )
                        }

                        try {

                            await conn.groupParticipantsUpdate(
                                from,
                                mentioned,
                                'remove'
                            )

                            await reply(
                                '✅ Membre expulsé avec succès.'
                            )

                        } catch (error) {

                            await reply(
                                '❌ Impossible d’expulser ce membre.\nVérifie que le bot est administrateur.'
                            )
                        }
                    }

                    // ═══════════════════════════════
                    //             TAGALL
                    // ═══════════════════════════════

                    else if (command === 'tagall') {

                        try {

                            const meta =
                                await conn.groupMetadata(
                                    from
                                )

                            const members =
                                meta.participants
                                    .map(
                                        p => p.id
                                    )

                            let text = `
╭━━━〔 📢 TAG ALL 〕━━━╮
┃
┃ 👥 Groupe : ${meta.subject}
┃ 👤 Membres : ${members.length}
┃
╰━━━━━━━━━━━━━━━━━━╯

`

                            members.forEach(
                                mem => {

                                    text +=
                                        `➟ @${mem.split('@')[0]}\n`
                                }
                            )

                            await conn.sendMessage(
                                from,
                                {
                                    text:
                                        format(text),

                                    mentions:
                                        members
                                },
                                {
                                    quoted: mek
                                }
                            )

                        } catch (error) {

                            await reply(
                                '❌ Impossible de récupérer les membres du groupe.'
                            )
                        }
                    }

                } catch (error) {

                    console.log(
                        '❌ Erreur message :',
                        error
                    )

                }

            }
        )

    } catch (error) {

        console.log(
            '❌ Erreur démarrage :',
            error
        )

        setTimeout(
            startBot,
            5000
        )
    }
}

// ═══════════════════════════════════════
//              LANCEMENT
// ═══════════════════════════════════════

console.log(`
╔══════════════════════════════════╗
║        🤖 ${BOTNAME}
║        ⚡ ${VERSION}
║        👑 ${OWNER}
╚══════════════════════════════════╝
`)

startBot()