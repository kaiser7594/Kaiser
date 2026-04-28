import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { reply } from '../utils/reply.js';
import { getConfig } from '../guildConfig.js';

export default {
  name: 'config',
  aliases: ['settings'],
  description: 'View current server setup.',
  slash: new SlashCommandBuilder().setName('config').setDescription('View current server setup.'),
  async run(ctx) {
    const { guild } = ctx;
    const c = await getConfig(guild.id);
    const fmtRoles = (arr) => (arr && arr.length ? arr.map((r) => `<@&${r}>`).join(', ') : '_not set_');
    const fmtChan = (id) => (id ? `<#${id}>` : '_not set_');
    const embed = new EmbedBuilder()
      .setTitle(`⚙️ Configuration for ${guild.name}`)
      .addFields(
        { name: 'Middleman Channel', value: fmtChan(c.mmChannelId), inline: true },
        { name: 'Pilot Channel', value: fmtChan(c.pilotChannelId), inline: true },
        { name: 'Staff Channel', value: fmtChan(c.staffChannelId), inline: true },
        { name: 'Ticket Log Channel', value: fmtChan(c.ticketChannelId), inline: true },
        { name: 'Trainee Approval Channel', value: fmtChan(c.traineeChannelId), inline: true },
        { name: 'Staff Quota Report Channel', value: fmtChan(c.staffQuotaChannelId), inline: true },
        { name: 'MM Vouch Roles', value: fmtRoles(c.mmVouchRoleIds), inline: true },
        { name: 'Pilot Vouch Roles', value: fmtRoles(c.pilotVouchRoleIds), inline: true },
        { name: 'Staff Roles', value: fmtRoles(c.staffRoleIds), inline: true },
        { name: 'MM Quota', value: c.mmQuota > 0 ? String(c.mmQuota) : '_off_', inline: true },
        { name: 'Pilot Quota', value: c.pilotQuota > 0 ? String(c.pilotQuota) : '_off_', inline: true },
        { name: 'Staff Quota', value: c.staffQuota > 0 ? String(c.staffQuota) : '_off_', inline: true },
        { name: 'Setup Cmd Roles', value: fmtRoles(c.cmdControlRoleIds), inline: false },
        { name: 'High Team Roles', value: fmtRoles(c.highTeamRoleIds), inline: false },
        { name: 'Low Team (Trainee) Roles', value: fmtRoles(c.lowTeamRoleIds), inline: false },
      )
      .setColor(0x95a5a6);
    return reply(ctx, { embeds: [embed], allowedMentions: { parse: [] } });
  },
};
