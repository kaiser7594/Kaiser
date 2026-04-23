// Unified reply helper for both message and interaction contexts.
export async function reply(ctx, payload) {
  if (typeof payload === 'string') payload = { content: payload };
  if (ctx.interaction) {
    if (ctx.interaction.deferred || ctx.interaction.replied) {
      return ctx.interaction.editReply(payload);
    }
    return ctx.interaction.reply(payload);
  }
  return ctx.message.reply({ ...payload, allowedMentions: { repliedUser: false, ...(payload.allowedMentions || {}) } });
}

export async function send(ctx, payload) {
  if (typeof payload === 'string') payload = { content: payload };
  if (ctx.interaction) {
    if (ctx.interaction.deferred || ctx.interaction.replied) {
      return ctx.interaction.followUp(payload);
    }
    return ctx.interaction.reply(payload);
  }
  return ctx.message.channel.send(payload);
}
