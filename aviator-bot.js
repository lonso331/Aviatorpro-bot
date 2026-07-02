  // ══════════════════════════════════════════
// AVIATOR PRO — BOT DE TELEGRAM
// Node.js + node-telegram-bot-api
// ══════════════════════════════════════════

const TelegramBot = require('node-telegram-bot-api')
const { createClient } = require('@supabase/supabase-js')

// CONFIG
const BOT_TOKEN = '8632737868:AAGj-ZS2_ZYtHNTZRsdbhOGxIlnsbZgKqSA'
const ADMIN_CHAT_ID = '6195243235'
const SB_URL = 'https://ugqhqctaqeffkcjmhevk.supabase.co'
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVncWhxY3RhcWVmZmtjam1oZXZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxMDEwODQsImV4cCI6MjA5NTY3NzA4NH0.T5jOP3mnK1GAcRZDaYcXbN3exMD9-WU7qWZVU6BuhsA'
const APP_URL = 'https://nemesis-aviator-pro.netlify.app'

const bot = new TelegramBot(BOT_TOKEN, { polling: true })
const sb = createClient(SB_URL, SB_KEY)

// Estado temporal de registro
const registros = {}

// ══ DISPARADORES ══
const DISPARADORES = [
  {val:8.8, conf:100, prom:47.59, nivel:'ULTRA'},
  {val:6.0, conf:100, prom:5.89,  nivel:'ULTRA'},
  {val:6.8, conf:100, prom:3.10,  nivel:'ULTRA'},
  {val:5.9, conf:100, prom:8.82,  nivel:'ULTRA'},
  {val:7.6, conf:93,  prom:3.12,  nivel:'ULTRA'},
  {val:5.7, conf:90,  prom:2.83,  nivel:'ULTRA'},
  {val:4.2, conf:89,  prom:3.84,  nivel:'ALTO'},
  {val:6.6, conf:83,  prom:2.46,  nivel:'ALTO'},
  {val:9.2, conf:80,  prom:9.77,  nivel:'ALTO'},
  {val:4.6, conf:78,  prom:4.54,  nivel:'MEDIO'},
  {val:5.0, conf:78,  prom:3.48,  nivel:'MEDIO'},
  {val:3.4, conf:73,  prom:5.88,  nivel:'MEDIO'},
  {val:3.1, conf:73,  prom:5.35,  nivel:'MEDIO'},
  {val:1.9, conf:72,  prom:4.14,  nivel:'MEDIO'},
  {val:2.7, conf:72,  prom:4.64,  nivel:'MEDIO'},
  {val:2.1, conf:71,  prom:13.88, nivel:'MEDIO'},
  {val:2.4, conf:71,  prom:19.88, nivel:'MEDIO'},
  {val:2.3, conf:70,  prom:9.47,  nivel:'MEDIO'},
  {val:2.9, conf:70,  prom:4.09,  nivel:'MEDIO'},
  {val:3.7, conf:70,  prom:9.85,  nivel:'MEDIO'},
]

function detectarDisparador(v){
  return DISPARADORES.find(d => Math.abs(v - d.val) <= 0.05) || null
}

function salidaSugerida(d){
  if(d.prom >= 10) return '3.00x+ 🚀 (historial alto)'
  if(d.prom >= 5)  return '2.00x'
  return '1.50x'
}

function iconNivel(nivel){
  if(nivel==='ULTRA') return '🔥'
  if(nivel==='ALTO')  return '💎'
  return '✅'
}

// ══ ENVIAR SEÑAL ══
async function enviarSenal(coef, disparador, jugador){
  const icono = iconNivel(disparador.nivel)
  const salida = salidaSugerida(disparador)
  
  const msg = `
${icono} *DISPARADOR DETECTADO*
━━━━━━━━━━━━━━━━━━━━
📊 Valor: *${coef}x* → Disparador *${disparador.val}x*
🎯 Nivel: *${disparador.nivel}*
📈 Confianza: *${disparador.conf}%*
💰 Promedio histórico: *${disparador.prom}x*
👤 Detectado por: *${jugador || 'Sistema'}*
━━━━━━━━━━━━━━━━━━━━
✅ *ENTRAR AHORA*
🎯 Salida sugerida: *${salida}*
━━━━━━━━━━━━━━━━━━━━
⚡ Basado en análisis de 6.005 rondas reales
`

  // Enviar al admin
  await bot.sendMessage(ADMIN_CHAT_ID, msg, {parse_mode:'Markdown'})

  // Enviar a todos los jugadores suscritos al bot
  try{
    const {data:jugadores} = await sb
      .from('jugadores')
      .select('telegram_chat_id')
      .not('telegram_chat_id', 'is', null)
      .eq('habilitado', true)
    
    if(jugadores){
      for(const j of jugadores){
        if(j.telegram_chat_id && j.telegram_chat_id !== ADMIN_CHAT_ID){
          try{
            await bot.sendMessage(j.telegram_chat_id, msg, {parse_mode:'Markdown'})
          }catch(e){}
        }
      }
    }
  }catch(e){}
}

// ══ COMANDO /start ══
bot.onText(/\/start(.*)/, async (msg, match) => {
  const chatId = msg.chat.id.toString()
  const param = match[1].trim()

  // Verificar si ya está registrado
  const {data:existente} = await sb
    .from('jugadores')
    .select('*')
    .eq('telegram_chat_id', chatId)
    .limit(1)

  if(existente && existente.length > 0){
    await bot.sendMessage(chatId,
      `👋 Ya estás registrado como *${existente[0].nombre}*\\!\n\n` +
      `Recibirás las señales aquí automáticamente\\.`,
      {parse_mode:'MarkdownV2'}
    )
    return
  }

  // Verificar link de invitación
  if(param && param.startsWith('inv_')){
    registros[chatId] = {paso:'nombre', invitacion:param}
    await bot.sendMessage(chatId,
      `🎯 *AVIATOR PRO SEÑALES*\n\n` +
      `Bienvenido\\! Para recibir las señales solo necesito tu nombre\\.\n\n` +
      `👤 ¿Cuál es tu nombre?`,
      {parse_mode:'MarkdownV2'}
    )
  } else {
    await bot.sendMessage(chatId,
      `🔒 *AVIATOR PRO SEÑALES*\n\n` +
      `Necesitas un link de invitación para unirte\\.\n` +
      `Contacta al administrador\\.`,
      {parse_mode:'MarkdownV2'}
    )
  }
})

// ══ COMANDO /señal (para pruebas desde app) ══
bot.onText(/\/senal (.+)/, async (msg, match) => {
  if(msg.chat.id.toString() !== ADMIN_CHAT_ID) return
  const coef = parseFloat(match[1])
  if(isNaN(coef)){
    await bot.sendMessage(ADMIN_CHAT_ID, '❌ Uso: /senal 6.80')
    return
  }
  const d = detectarDisparador(coef)
  if(d){
    await enviarSenal(coef, d, 'Admin')
  } else {
    await bot.sendMessage(ADMIN_CHAT_ID, `ℹ️ ${coef}x no es un disparador confirmado`)
  }
})

// ══ COMANDO /invitar ══
bot.onText(/\/invitar/, async (msg) => {
  if(msg.chat.id.toString() !== ADMIN_CHAT_ID) return
  const codigo = 'inv_' + Math.random().toString(36).substring(2,10).toUpperCase()
  const link = `https://t.me/${(await bot.getMe()).username}?start=${codigo}`
  await bot.sendMessage(ADMIN_CHAT_ID,
    `🔗 *Link de invitación generado:*\n\n` +
    `\`${link}\`\n\n` +
    `⏰ Válido para 1 registro\\.`,
    {parse_mode:'Markdown'}
  )
})

// ══ COMANDO /jugadores ══
bot.onText(/\/jugadores/, async (msg) => {
  if(msg.chat.id.toString() !== ADMIN_CHAT_ID) return
  const {data:jug} = await sb
    .from('jugadores')
    .select('nombre,habilitado,telegram_chat_id')
    .order('created_at')
  
  if(!jug || !jug.length){
    await bot.sendMessage(ADMIN_CHAT_ID, 'Sin jugadores registrados')
    return
  }
  
  let txt = `👥 *JUGADORES REGISTRADOS* (${jug.length})\n\n`
  jug.forEach(j => {
    const estado = j.habilitado !== false ? '✅' : '❌'
    const tg = j.telegram_chat_id ? '📱' : '🌐'
    txt += `${estado} ${tg} ${j.nombre}\n`
  })
  await bot.sendMessage(ADMIN_CHAT_ID, txt, {parse_mode:'Markdown'})
})

// ══ COMANDO /suspender ══
bot.onText(/\/suspender (.+)/, async (msg, match) => {
  if(msg.chat.id.toString() !== ADMIN_CHAT_ID) return
  const nombre = match[1].trim()
  const {error} = await sb.from('jugadores').update({habilitado:false}).eq('nombre', nombre)
  if(error){
    await bot.sendMessage(ADMIN_CHAT_ID, `❌ Error: ${error.message}`)
  } else {
    await bot.sendMessage(ADMIN_CHAT_ID, `✅ ${nombre} suspendido correctamente`)
  }
})

// ══ COMANDO /activar ══
bot.onText(/\/activar (.+)/, async (msg, match) => {
  if(msg.chat.id.toString() !== ADMIN_CHAT_ID) return
  const nombre = match[1].trim()
  const {error} = await sb.from('jugadores').update({habilitado:true}).eq('nombre', nombre)
  if(error){
    await bot.sendMessage(ADMIN_CHAT_ID, `❌ Error: ${error.message}`)
  } else {
    await bot.sendMessage(ADMIN_CHAT_ID, `✅ ${nombre} activado correctamente`)
  }
})

// ══ FLUJO DE REGISTRO SIMPLIFICADO (solo nombre) ══
bot.on('message', async (msg) => {
  const chatId = msg.chat.id.toString()
  const texto = msg.text || ''
  if(texto.startsWith('/')) return
  const estado = registros[chatId]
  if(!estado) return

  if(estado.paso === 'nombre'){
    if(texto.length < 2 || texto.length > 20){
      await bot.sendMessage(chatId, '⚠️ Nombre debe tener entre 2 y 20 caracteres\\. Intenta de nuevo:', {parse_mode:'MarkdownV2'})
      return
    }
    // Verificar nombre disponible
    const {data:existe} = await sb.from('jugadores').select('id').eq('nombre', texto)
    if(existe && existe.length > 0){
      await bot.sendMessage(chatId, '⚠️ Ese nombre ya está en uso\\. Elige otro:', {parse_mode:'MarkdownV2'})
      return
    }

    // Crear cuenta solo con nombre y telegram_chat_id
    const colores = ['#00d4ff','#f5a623','#00e5a0','#a78bfa','#ff7b2c','#ff3d5a','#ffd166']
    const color = colores[Math.floor(Math.random()*colores.length)]

    const {data:nuevo, error} = await sb.from('jugadores').insert({
      nombre: texto,
      pin: '0000',
      avatar_color: color,
      es_admin: false,
      telegram_chat_id: chatId
    }).select()

    delete registros[chatId]

    if(error){
      await bot.sendMessage(chatId, `❌ Error: ${error.message}`)
      return
    }

    const nomEsc = texto.replace(/[_*[\]()~`>#+=|{}.!-]/g,'\\$&')
    await bot.sendMessage(chatId,
      `🎉 *¡Listo ${nomEsc}\\!*\n\n` +
      `✅ Ya estás suscrito a las señales de AviatorPro\\.\n` +
      `📲 Recibirás alertas aquí cada vez que el motor detecte un disparador\\.`,
      {parse_mode:'MarkdownV2'}
    )

    // Notificar al admin
    await bot.sendMessage(ADMIN_CHAT_ID,
      `✅ Nuevo suscriptor: *${nomEsc}*`,
      {parse_mode:'MarkdownV2'}
    )
  }
})

// ══ API ENDPOINT para recibir señales desde la app ══
// La app llama a esta función cuando detecta un disparador
async function recibirSenal(coef, jugadorNombre){
  const d = detectarDisparador(parseFloat(coef))
  if(d){
    await enviarSenal(coef, d, jugadorNombre)
  }
}

// Exportar para uso externo
module.exports = { recibirSenal }

console.log('🤖 AviatorPro Bot iniciado')
console.log('Comandos disponibles:')
console.log('  /invitar — generar link de invitación')
console.log('  /jugadores — ver lista de jugadores')
console.log('  /suspender [nombre] — suspender jugador')
console.log('  /activar [nombre] — activar jugador')
console.log('  /senal [coef] — probar señal manual')
