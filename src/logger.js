const fmt = (lvl) => `[${new Date().toISOString()}] [${lvl}]`;

export const logger = {
  info: (...a) => console.log(fmt('info'), ...a),
  warn: (...a) => console.warn(fmt('warn'), ...a),
  error: (...a) => console.error(fmt('error'), ...a),
  debug: (...a) => process.env.LOG_LEVEL === 'debug' && console.log(fmt('debug'), ...a),
};
