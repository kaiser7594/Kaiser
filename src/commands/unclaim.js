import { SlashCommandBuilder } from 'discord.js';
import { reply } from '../utils/reply.js';
import { removeVouch } from '../vouchService.js';
import { hasCmdControl } from '../permissions.js';
import { storage } from '../storage.js';
import { logger } from '../logger.js';
import { isAnyTicketChannel } from '../utils/ticketChannel.js';

const claimKey = (gid, tid) => `k:guild:${gid}:ticketclaim:${tid}`;

export default {
  name: 'unclaim',
  aliases: [],
  description: 'Unclaim the current ticket thread (removes the ticket from your count).',
  slash: new SlashCommandBuilder().setName('unclaim').setDescription('Unclaim the current ticket thread.'),
  async run(ctx) {
    const { message, interaction, member, guild } = ctx;
    const channel = message ? message.channel : interaction.channel;

    if (!isAnyTicketChannel(channel)) {
      return reply(ctx, '❌ This command can only be used inside a ticket thread or ticket channel.');
    }

    const rec = await storage.get(claimKey(guild.id, channel.id), null);
    if (!rec) return reply(ctx, '⚠️ This ticket is not currently claimed.');

    const isOwner = rec.userId === member.id;
    const isAdmin = await hasCmdControl(member);
    if (!isOwner && !isAdmin) {
      return reply(ctx, `❌ Only <@${rec.userId}> or a setup admin can unclaim this ticket.`);
    }

    if (channel.name !== 'open') {
      try {
        await channel.setName('open', `Unclaimed by ${member.user.tag}`);
      } catch (e) {
        logger.error('unclaim setName failed', e);
      }
    }

    await removeVouch(guild.id, rec.userId, 'ticket', channel.id);
    await storage.delete(claimKey(guild.id, channel.id));

    return reply(ctx, `✅ Ticket unclaimed. (-1 ticket from <@${rec.userId}>)`);
  },
};
