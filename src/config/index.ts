export const CONFIG = {
  profileImage: '/images/profile.png',
  username: '@overthinkerimam',

  instagramUrl: 'https://instagram.com/overthinkerimam',
  youtubeUrl: 'https://youtube.com/@OverthinkerImam',
  facebookUrl: 'https://www.facebook.com/profile.php?id=61593412310090',
  githubUrl: 'https://github.com/OverthinkerImam',

  instagramHandle: '@overthinkerimam',
  youtubeHandle: '@OverthinkerImam',
  facebookHandle: '@Overthinker-Imam',
  githubHandle: '@OverthinkerImam',

  revealDuration: 10,
  postRevealDuration: 8,

  timeline: {
    introStart: 0,
    introEnd: 4,
    suspenseStart: 4,
    suspenseEnd: 9,
    scanStart: 9,
    scanEnd: 13,
    countdownStart: 13,
    countdownEnd: 19,
    revealAt: 19,
    revealAnimEnd: 21,
    thatsMeStart: 21,
    thatsMeEnd: 24,
    socialCardsStart: 24,
    socialCardsEnd: 28,
    finalCtaStart: 28,
    finalCtaEnd: 34,
  },

  audio: {
    intro: '/audio/intro.mp3',
  },
};

export type Config = typeof CONFIG;