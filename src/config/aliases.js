// Short names for prefix commands (nh!b @user → nh!ban @user)
export const COMMAND_MAP = {
    // Moderation
    b: 'ban',
    k: 'kick',
    t: 'timeout',
    ut: 'untimeout',
    ub: 'unban',
    w: 'warn',
    p: 'purge',
    l: 'lock',
    ul: 'unlock',
    q: 'quarantine',
    uq: 'unquarantine',
    cf: 'flip',
    // Welcome / roles
    ar: 'autorole',
    // Reaction roles
    rr: 'reactroles',
    // Utility
    ui: 'userinfo',
    si: 'serverinfo',
    av: 'avatar',
    td: 'todo',
    // Leveling
    lb: 'leaderboard',
    rk: 'rank',
    // Fun
    r: 'roll',
    f: 'flip',
    // Core
    h: 'help',
    // Ticket
    tk: 'ticket',
};
