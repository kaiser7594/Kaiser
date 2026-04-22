import { ChannelType } from 'discord.js';

const OPTION_TYPE = {
    SUB_COMMAND: 1,
    SUB_COMMAND_GROUP: 2,
    STRING: 3,
    INTEGER: 4,
    BOOLEAN: 5,
    USER: 6,
    CHANNEL: 7,
    ROLE: 8,
    MENTIONABLE: 9,
    NUMBER: 10,
    ATTACHMENT: 11,
};

function tokenize(input) {
    const tokens = [];
    const re = /"([^"]*)"|'([^']*)'|(\S+)/g;
    let m;
    while ((m = re.exec(input)) !== null) {
        tokens.push(m[1] ?? m[2] ?? m[3]);
    }
    return tokens;
}

function stripMention(str) {
    return String(str || '').replace(/[<@!#&>]/g, '');
}

async function resolveValue(option, raw, message) {
    if (raw === undefined || raw === null) return null;
    const guild = message.guild;
    const client = message.client;
    switch (option.type) {
        case OPTION_TYPE.STRING:
            return String(raw);
        case OPTION_TYPE.INTEGER:
            return parseInt(raw, 10);
        case OPTION_TYPE.NUMBER:
            return parseFloat(raw);
        case OPTION_TYPE.BOOLEAN:
            return /^(true|yes|y|1|on)$/i.test(String(raw));
        case OPTION_TYPE.USER: {
            const id = stripMention(raw);
            return await client.users.fetch(id).catch(() => null);
        }
        case OPTION_TYPE.CHANNEL: {
            const id = stripMention(raw);
            return guild?.channels.cache.get(id) || await guild?.channels.fetch(id).catch(() => null) || null;
        }
        case OPTION_TYPE.ROLE: {
            const id = stripMention(raw);
            return guild?.roles.cache.get(id) || await guild?.roles.fetch(id).catch(() => null) || null;
        }
        case OPTION_TYPE.MENTIONABLE: {
            const id = stripMention(raw);
            return guild?.members.cache.get(id)
                || guild?.roles.cache.get(id)
                || await client.users.fetch(id).catch(() => null);
        }
        default:
            return raw;
    }
}

export function buildPrefixContext(command, message, tokens) {
    const builder = command.data.toJSON ? command.data.toJSON() : command.data;
    const allOptions = builder.options || [];

    let subcommandGroup = null;
    let subcommand = null;
    let activeOptions = allOptions;
    let cursor = 0;

    const firstOpt = allOptions[0];
    if (firstOpt?.type === OPTION_TYPE.SUB_COMMAND_GROUP) {
        subcommandGroup = tokens[cursor++] || null;
        const grp = allOptions.find(o => o.name === subcommandGroup);
        if (grp) {
            subcommand = tokens[cursor++] || null;
            const sub = grp.options?.find(o => o.name === subcommand);
            activeOptions = sub?.options || [];
        } else {
            activeOptions = [];
        }
    } else if (firstOpt?.type === OPTION_TYPE.SUB_COMMAND) {
        subcommand = tokens[cursor++] || null;
        const sub = allOptions.find(o => o.name === subcommand);
        activeOptions = sub?.options || [];
    }

    const remaining = tokens.slice(cursor);
    const values = {};

    for (let i = 0; i < activeOptions.length; i++) {
        const opt = activeOptions[i];
        const isLastString = i === activeOptions.length - 1 && opt.type === OPTION_TYPE.STRING;
        if (isLastString) {
            values[opt.name] = remaining.slice(i).join(' ') || null;
        } else {
            values[opt.name] = remaining[i] ?? null;
        }
    }

    return { subcommandGroup, subcommand, activeOptions, values };
}

export function createInteractionLike(command, message, client, tokens) {
    const { subcommandGroup, subcommand, activeOptions, values } = buildPrefixContext(command, message, tokens);

    let _replied = false;
    let _deferred = false;
    let _firstReplyMessage = null;

    const sendOrEdit = async (payload) => {
        const opts = typeof payload === 'string' ? { content: payload } : { ...payload };
        if (opts.flags) delete opts.flags;
        if (opts.ephemeral) delete opts.ephemeral;
        if (_firstReplyMessage) {
            try {
                return await _firstReplyMessage.edit(opts);
            } catch {
                _firstReplyMessage = await message.channel.send(opts);
                return _firstReplyMessage;
            }
        }
        _firstReplyMessage = await message.reply(opts);
        _replied = true;
        return _firstReplyMessage;
    };

    const optionsApi = {
        getSubcommand: (required = true) => {
            if (required && !subcommand) throw new Error('Subcommand required');
            return subcommand;
        },
        getSubcommandGroup: (required = false) => {
            if (required && !subcommandGroup) throw new Error('Subcommand group required');
            return subcommandGroup;
        },
        getString: (name) => values[name] != null ? String(values[name]) : null,
        getInteger: (name) => values[name] != null ? parseInt(values[name], 10) : null,
        getNumber: (name) => values[name] != null ? parseFloat(values[name]) : null,
        getBoolean: (name) => values[name] != null ? /^(true|yes|y|1|on)$/i.test(String(values[name])) : null,
        getUser: (name) => {
            const raw = values[name];
            if (!raw) return null;
            const id = stripMention(raw);
            return client.users.cache.get(id) || null;
        },
        getMember: (name) => {
            const raw = values[name];
            if (!raw) return null;
            const id = stripMention(raw);
            return message.guild?.members.cache.get(id) || null;
        },
        getChannel: (name) => {
            const raw = values[name];
            if (!raw) return null;
            const id = stripMention(raw);
            return message.guild?.channels.cache.get(id) || null;
        },
        getRole: (name) => {
            const raw = values[name];
            if (!raw) return null;
            const id = stripMention(raw);
            return message.guild?.roles.cache.get(id) || null;
        },
        getMentionable: (name) => {
            const raw = values[name];
            if (!raw) return null;
            const id = stripMention(raw);
            return message.guild?.members.cache.get(id)
                || message.guild?.roles.cache.get(id)
                || client.users.cache.get(id) || null;
        },
        getAttachment: () => null,
        getFocused: () => '',
        get: (name) => {
            if (!(name in values)) return null;
            const raw = values[name];
            const opt = activeOptions.find(o => o.name === name);
            return opt ? { name, type: opt.type, value: raw } : { name, value: raw };
        },
        get data() {
            return activeOptions
                .filter(o => values[o.name] != null)
                .map(o => ({ name: o.name, type: o.type, value: values[o.name] }));
        },
    };

    const interaction = {
        client,
        guild: message.guild,
        guildId: message.guildId,
        channel: message.channel,
        channelId: message.channelId,
        user: message.author,
        member: message.member,
        commandName: command.data.name,
        applicationId: client.application?.id,
        id: message.id,
        createdTimestamp: message.createdTimestamp,
        get deferred() { return _deferred; },
        get replied() { return _replied; },
        isCommand: () => true,
        isChatInputCommand: () => true,
        isRepliable: () => true,
        inGuild: () => !!message.guild,
        options: optionsApi,
        _isPrefix: true,
        _resolveOptions: async () => {
            for (const opt of activeOptions) {
                const raw = values[opt.name];
                if (raw == null) continue;
                if ([OPTION_TYPE.USER, OPTION_TYPE.CHANNEL, OPTION_TYPE.ROLE, OPTION_TYPE.MENTIONABLE].includes(opt.type)) {
                    const resolved = await resolveValue(opt, raw, message);
                    if (resolved && resolved.id) {
                        // Cache for getUser/getChannel/getRole sync access
                        if (opt.type === OPTION_TYPE.USER) client.users.cache.set(resolved.id, resolved);
                    }
                }
            }
        },
        async deferReply() {
            _deferred = true;
            try {
                await message.channel.sendTyping();
            } catch {}
            return null;
        },
        async reply(payload) { return await sendOrEdit(payload); },
        async editReply(payload) { return await sendOrEdit(payload); },
        async followUp(payload) {
            const opts = typeof payload === 'string' ? { content: payload } : { ...payload };
            if (opts.flags) delete opts.flags;
            if (opts.ephemeral) delete opts.ephemeral;
            return await message.channel.send(opts);
        },
        async deleteReply() {
            if (_firstReplyMessage) {
                await _firstReplyMessage.delete().catch(() => {});
                _firstReplyMessage = null;
            }
        },
        async fetchReply() { return _firstReplyMessage; },
        async showModal() {
            await message.reply('This command requires using the slash command version.');
        },
    };

    return interaction;
}
