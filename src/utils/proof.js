// Get a proof image attachment from either a slash interaction's option,
// the message's own attachments, or by waiting for the user to upload one.
export async function getProofAttachment(ctx, timeoutMs = 90_000) {
  const isImage = (att) => {
    if (!att) return false;
    if (att.contentType?.startsWith('image/')) return true;
    const name = (att.name || att.url || '').toLowerCase();
    return /\.(png|jpe?g|gif|webp)(\?|$)/.test(name);
  };

  if (ctx.interaction) {
    const att = ctx.interaction.options.getAttachment?.('proof');
    if (att && isImage(att)) return att;
    return null;
  }

  // Prefix path
  const inMsg = ctx.message.attachments.find(isImage);
  if (inMsg) return inMsg;

  await ctx.message.reply({
    content: '📎 Please send an image as **proof** within 90 seconds (just upload it in this channel).',
    allowedMentions: { repliedUser: false },
  });

  try {
    const collected = await ctx.message.channel.awaitMessages({
      filter: (m) => m.author.id === ctx.message.author.id && m.attachments.some(isImage),
      max: 1,
      time: timeoutMs,
      errors: ['time'],
    });
    return collected.first().attachments.find(isImage) || null;
  } catch {
    return null;
  }
}
