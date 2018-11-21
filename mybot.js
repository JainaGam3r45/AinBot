const Discord = require("discord.js");
const  client = new Discord.Client();
const config = require("./config.json");

client.on("ready", () => {
   console.log("Estoy listo!");

   client.user.setPresence( {
       status: "online",
       game: {
           name: "-help | Versión 1.1",
           type: "PLAYING"
       }
   } );

});
var prefix = config.prefix;

client.on("message", (message) => {
  const args = message.content.slice(prefix.length).trim().split(/ +/g);
  const command = args.shift().toLowerCase();

      if (message.content.startsWith(prefix + "avatar")) {
      let img = message.mentions.users.first()
      if (!img) {
          const embed = new Discord.RichEmbed()
          .addField('**¡WOW!, QUE BUENA FOTO!**' , '+100 Likes!')
          .setImage(`${message.author.avatarURL}`)
          .setColor(0x66b3ff)
          .setFooter(`Avatar de ${message.author.username}#${message.author.discriminator}`);
          message.channel.send({ embed });
      } else if (img.avatarURL === null) {
          message.channel.sendMessage("El usuario ("+ img.username +") no tiene avatar!");
      } else {
          const embed = new Discord.RichEmbed()
          .setImage(`${img.avatarURL}`)
          .setColor(0x66b3ff)
          .setFooter(`Avatar de ${img.username}#${img.discriminator}`);
          message.channel.send({ embed });
      };

  }

  if (message.content.startsWith(prefix + "ping")) {
  let ping = Math.floor(message.client.ping);

message.channel.send(":ping_pong: ¡Este es tu ping!")
  .then(m => {

      m.edit(`:incoming_envelope: Ping Mensajes: \`${Math.floor(m.createdTimestamp - Date.now())} ms\`\n:satellite_orbital: Ping DiscordAPI: \`${ping} ms\``);
  });

}

if (message.content.startsWith(prefix + "server")) {
var server = message.guild;

const embed = new Discord.RichEmbed()
.setThumbnail(server.iconURL)
.setAuthor(server.name, server.iconURL)
.addField('ID', server.id, true)
.addField('Region', server.region, true)
.addField('Creado el', server.joinedAt.toDateString(), true)
.addField('Dueño del Servidor', server.owner.user.username+'#'+server.owner.user.discriminator+' ('+server.owner.user.id +')', true)
.addField('Miembros', server.memberCount, true)
.addField('Roles', server.roles.size, true)
.setColor(0x66b3ff)

message.channel.send({ embed });

}

if(message.content.startsWith(prefix + 'help')){
    message.channel.send(':mailbox_with_mail: **Mi lista de comandos fue enviada a tus mensajes privados.**');
    const embed = new Discord.RichEmbed()
  .addField(":clipboard: • **Lista de comandos**",
    "¡Hola! me llamo FunBot2 n.n, y esta es mi lista de comandos. Si necesitas ayuda detallada con algún comando, sólo contáctanos mediante nuestro correo eléctronico ``dubecraft.original@gmail.com``.")
  .setColor("#e69032")
  .addField(":scroll: • **Comandos Informativos**", "__`help`__ , __`server`__ , __`donate`__")
  .addField(":ledger: • **Comandos de reacción**", "__`avatar`__ , __`8ball`__ , __`ping`__")
  .addField(":hammer_pick: • **Comandos de Staff**", "__`kick`__ , __`ban`__ , __`say`__ , __`esay`__ , __`clear`__")
  .addField(":books: • **Comandos de Soporte**", "__`invite`__ , __`debug`__")
  .setFooter("Prefix principal - | Total de comandos: 13", client.user.avatarURL)
  .setTimestamp()

  message.author.send({embed});
  message.delete();

}

if(message.content.startsWith(prefix + '8ball')){
  let argss = args.join(" ");
  var rpts = ["Sí n.n", "No o.o", "Tal vez...", "No lo sé :S", "¡Claro!", "Tenlo por seguro 7w7", "Error! intentalo luego más tarde...", "Quizás...", "No entiendo tu pregunta...", "Imposible...", "Es problable uwu", "Eso es interesante o.o", "¡Por supuesto!", "No digas eso...", "No hay duda acerca de ello.", ""];

  if (!argss) return message.reply(`Escriba una pregunta.`);
  const embed = new Discord.RichEmbed()
  .setTitle('🎱 | Pregunta 8ball')
  .addField('**Tu pregunta:**', `\`\`\`${argss}\`\`\``)
  .addField('**Mi respuesta:**', `\`\`\`${rpts[Math.floor(Math.random() * rpts.length)]}\`\`\``)
  .setThumbnail(message.author.avatarURL)
  .setFooter(`${message.author.tag}`)
  .setTimestamp()
  .setColor("#e69032");
  message.channel.send({embed});

}

 if(message.content.startsWith(prefix + 'say')){
 let texto = args.join(" ");

 if(!texto) return message.reply(', Escribe el mensaje a repetir.');

 message.channel.send(texto);
 message.delete();
 let permiso = message.member.hasPermission("ADMINISTRATOR");

 if(!permiso) return message.channel.send('No tienes suficientes permisos para eso.');

}

if(message.content.startsWith(prefix + 'debug')){
  message.channel.send(':mailbox_with_mail: **Revisa tus mensajes privados.**');
  const embed = new Discord.RichEmbed()
.addField(":clipboard: ► **Reportar bug**",
  "**¿Has encontrado un bug o error, y quieres reportarlo?** Contáctanos a nuestro correo eléctronico **--->** __**dubecraft.original@gmail.com**__. ¡Gracias!")
.setTimestamp()

message.author.send({embed});
message.delete();

}

if(message.content.startsWith(prefix + 'donate')){
  message.channel.send('Te he enviado el método de donación a tus mensajes privados.');
  const embed = new Discord.RichEmbed()
.addField(":dollar:  ► **Donaciones**",
  "Actualmente contamos con ``PayPal`` para recibir donaciones. ¡Donando podrás acceder a contenido exclusivo y demás cosas! :heart:")
.setColor("#e69032")
.addField("PayPal:", "[Click acá para donar.](https://www.paypal.com/donate/?token=XAcSgwGRQVSzQzxcs6xjMSvNOVfn3RDlIvt7t5YyCUtjhAh3wHERTh-WywZuajrh4zeR7W&country.x=AL&locale.x=AL)")
.setTimestamp()

message.author.send({embed});
message.delete();

}

if(message.content.startsWith(prefix + 'esay')){
  let texto = args.join(" ");

  if(!texto) return message.reply('**Debes de escribir el mensaje que quieres que el bot repita!**');

  message.delete();
  message.channel.send({embed: {
    color: 3447003,
    description: `${texto}`
  }});
  let permiso = message.member.hasPermission("ADMINISTRATOR");

  if(!permiso) return message.channel.send('**No tienes suficientes permisos para eso.**');

}

if(message.content.startsWith(prefix + 'clear')){
let cantidad = parseInt(args[0]);
let permiso = message.member.hasPermission("MANAGE_MESSAGES");

if(!permiso) return message.channel.send('**No tienes suficientes permisos para eso.**');
if(!cantidad) return message.reply('***Debes de colocar la cantidad de mensajes que quieres borrar!***');

message.channel.bulkDelete(cantidad)
message.channel.send(`¡Se borraron **${cantidad}** mensajes con éxito!`).then(m => {
        m.delete(3000);

});
}

if(message.content.startsWith(prefix + 'ban')){
let user = message.mentions.users.first();
let razon = args.slice(1).join(' ');
let permiso = message.member.hasPermission("BAN_MEMBERS");

if(!permiso) return message.channel.send('No tienes permisos suficientes para poder banear!');

if (message.mentions.users.size < 1) return message.reply(' menciona al usuario que banearás.').catch(console.error);
if(!razon) return message.channel.send('Escriba un razón, `-ban @username [razón]`');
if (!message.guild.member(user).bannable) return message.reply('No puedo banear al usuario mencionado.');


message.guild.member(user).ban(razon);
message.channel.send(`:white_check_mark: **${user.username}**, fue baneado del servidor debido a **'${razon}'**.`);

}

if(message.content.startsWith(prefix + 'kick')){
let user = message.mentions.users.first();
let razon = args.slice(1).join(' ');
let permiso = message.member.hasPermission("KICK_MEMBERS");

if(!permiso) return message.channel.send('No tienes permisos suficientes para poder kickar!');

if (message.mentions.users.size < 1) return message.reply(' menciona al usuario que expulsarás.').catch(console.error);
if (!razon) return message.channel.send('Escriba una razón, `-kick @username [razón]`');
if (!message.guild.member(user).kickable) return message.reply('No puedo patear al usuario mencionado.');

message.guild.member(user).kick(razon);
message.channel.send(`:white_check_mark: **${user.username}**, fue expulsado del servidor debido a **${razon}**.`);

}

    if(message.content.startsWith(prefix + 'warn')){
    let mencionado = message.mentions.users.first();
    let razon = args.slice(1).join(' ');
    let permiso = message.member.hasPermission("KICK_MEMBERS");
      
 if(!permiso) return message.channel.send('No tienes permisos suficientes para utilizar este comando.')
 if(!mencionado) return message.channel.send('Error!, debes de mencionar a alguien para completar esta acción!')
 if(!razon) return message.channel.send('Erro!, debes de colocar una razón para poder completar esta acción!')
      

    message.channel.send(`${mencionado.username} ha sido advertido!`).then((m) => {
      m.react("✅")
      m.delete(5000);
    message.delete();
  const embed = new Discord.RichEmbed()
    .setTitle("Nueva advertencia!")
    .addField("**Usuario**", `${mencionado.username}`)
    .addField("Motivos:",`${razon}`)
    .setFooter("Usuario advertido!")
    .setTimestamp()
    .setColor("#e69032");
  let canal = client.channels.get("510111668853014528")
    canal.send(embed);
      
    });
    
  }

});
client.login(config.token);
