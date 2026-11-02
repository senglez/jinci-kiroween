// Content for the game: time-travel milestones and puzzle knowledge cards.
// Every fact here is traceable to research/SOURCES.md. Keep zh/en in sync.

export const MILESTONES = [
  {
    year: 2026,
    era: { zh: '公元2026年 · 万圣夜', en: 'AD 2026 · Halloween night' },
    text: {
      zh: '你站在鱼沼飞梁上。夜风穿过周柏，圣母殿檐下的灯笼忽然自己亮了……',
      en: 'You stand on the Flying Bridge. Wind stirs the Zhou cypress, and the lanterns under the eaves light up by themselves...',
    },
    photo: 'assets/photos/hall-sunset.jpg',
    photoCaption: { zh: '夕阳下，从鱼沼飞梁望圣母殿 · Patrick20242023 摄 CC BY-SA 4.0', en: 'The hall at dusk, seen from the Flying Bridge · photo Patrick20242023, CC BY-SA 4.0' },
  },
  {
    year: 1993,
    era: { zh: '1993—1996年', en: '1993–1996' },
    text: {
      zh: '圣母殿落架大修：整座木构被逐件拆下、修补，再按原样装回。',
      en: 'The hall is taken apart piece by piece, repaired, and reassembled exactly as before.',
    },
    photo: 'assets/photos/dougong.jpg',
    photoCaption: { zh: '大修时逐件拆下又装回的斗拱（今貌）· Patrick20242023 摄 CC BY-SA 4.0', en: 'Brackets like these were taken apart and refitted (today) · photo Patrick20242023, CC BY-SA 4.0' },
  },
  {
    year: 1961,
    era: { zh: '1961年3月', en: 'March 1961' },
    text: {
      zh: '晋祠被国务院公布为第一批全国重点文物保护单位。',
      en: 'Jinci is listed in the first batch of China’s Major Historical and Cultural Sites.',
    },
    photo: 'assets/photos/hall-front-2025.jpg',
    photoCaption: { zh: '受保护至今的圣母殿（2025）· Yumeto 摄 CC BY-SA 4.0', en: 'The protected hall today (2025) · photo Yumeto, CC BY-SA 4.0' },
  },
  {
    year: 1934,
    era: { zh: '民国二十三年 · 1934年', en: '1934' },
    text: {
      zh: '梁思成、林徽因考察晋汾古建筑，在《晋汾古建筑预查纪略》中称飞梁前的宋代铁狮“灵动如生”。',
      en: 'Liang Sicheng and Lin Huiyin survey Shanxi’s old buildings and praise the Song iron lions as “alive and moving”.',
    },
    photo: 'assets/photos/guide1932-nanlao-pavilion.jpg',
    photoCaption: { zh: '考察前两年的难老泉亭：《晋祠指南》图版（1932，公有领域）', en: 'Nanlao Spring Pavilion two years before the survey: 1932 guidebook plate (public domain)' },
  },
  {
    year: 1932,
    era: { zh: '民国二十一年 · 1932年', en: '1932' },
    text: {
      zh: '张庆亨编《晋祠指南》出版，书中印有晋祠最早的一批风景照片。',
      en: 'Zhang Qingheng’s “Guide to Jinci” is printed, with some of the earliest published photos of the site.',
    },
    photo: 'assets/photos/guide1932-chaoyang.jpg',
    photoCaption: { zh: '《晋祠指南》图版：朝阳洞（1932，公有领域）', en: '1932 Guide to Jinci plate: Chaoyang Cave (public domain)' },
  },
  {
    year: 1875,
    era: { zh: '清光绪元年 · 1875年', en: 'Qing dynasty · 1875' },
    text: {
      zh: '光绪帝题写“三晋遗封”匾额，至今仍悬于圣母殿前。',
      en: 'The Guangxu Emperor writes the plaque “San Jin Yi Feng”, which still hangs at the hall.',
    },
    photo: 'assets/photos/plaque-sanjin-yifeng.jpg',
    photoCaption: { zh: '“三晋遗封”匾 · 林高志 摄 CC BY-SA 4.0', en: 'Plaque · photo 林高志, CC BY-SA 4.0' },
  },
  {
    year: 1168,
    era: { zh: '金大定八年 · 1168年', en: 'Jin dynasty · 1168' },
    text: {
      zh: '鱼沼飞梁以东建起献殿，专为向圣母献祭品。',
      en: 'The Offering Hall is built east of the Flying Bridge, for presenting gifts to the Holy Mother.',
    },
    photo: 'assets/gallery/summer-4.jpg',
    photoCaption: { zh: '金代献殿 · xin 摄 CC BY-SA 4.0', en: 'The Jin-dynasty Offering Hall · photo xin, CC BY-SA 4.0' },
  },
  {
    year: 1118,
    era: { zh: '北宋政和八年 · 1118年', en: 'Northern Song · 1118' },
    text: {
      zh: '飞梁前铸成一对铁狮，狮身题记“政和八年四月二十六日”。',
      en: 'A pair of iron lions is cast before the bridge, inscribed with the date of the 26th day, 4th month, Zhenghe 8.',
    },
    photo: 'assets/photos/iron-lion-1118.jpg',
    photoCaption: { zh: '宋代铁狮 · 林高志 摄 CC BY-SA 4.0', en: 'Song iron lion · photo 林高志, CC BY-SA 4.0' },
  },
  {
    year: 1102,
    era: { zh: '北宋崇宁元年 · 1102年', en: 'Northern Song · 1102' },
    text: {
      zh: '圣母殿重修。殿内的宋代彩塑侍女，千年来一直静静守着圣母。',
      en: 'The hall is rebuilt. Inside, Song-dynasty painted clay attendants keep their silent watch over the Holy Mother.',
    },
    photo: 'assets/photos/song-maids.jpg',
    photoCaption: { zh: '宋塑侍女像 · 林高志 摄 CC BY-SA 4.0', en: 'Song attendants · photo 林高志, CC BY-SA 4.0' },
  },
  {
    year: 1023,
    era: { zh: '北宋天圣年间 · 1023—1032年', en: 'Northern Song · 1023–1032' },
    text: {
      zh: '宋仁宗追封唐叔虞为汾东王，并为其母邑姜修建圣母殿。工地上，木料已经备齐，只差一位营造匠人——就是你。',
      en: 'Emperor Renzong honours Tang Shuyu and builds this hall for his mother, Yi Jiang. The timber is ready. The site needs one more builder: you.',
    },
    photo: 'assets/photos/dragon-column.jpg',
    photoCaption: { zh: '北宋木雕盘龙柱，至今仍在前廊 · 林高志 摄 CC BY-SA 4.0', en: 'A Northern Song carved dragon column, still on the porch · photo 林高志, CC BY-SA 4.0' },
  },
];

// Puzzle pieces, bottom-up. `needs` lists pieces that must already stand
// before this one can be placed (structural logic, as in the Song building code).
export const PIECES = [
  {
    id: 'platform', needs: [],
    name: { zh: '台基', en: 'Stone platform' },
    fact: {
      zh: '圣母殿坐西朝东，台基正面宽约26.71米，侧面约21.15米。',
      en: 'The hall faces east. Its platform is about 26.71 m wide and 21.15 m deep.',
    },
  },
  {
    id: 'walls', needs: ['platform'],
    name: { zh: '殿身隔扇', en: 'Inner walls & doors' },
    fact: {
      zh: '殿内采用“减柱造”，省去部分内柱，殿内和前廊都格外开阔。',
      en: 'Builders left out some interior columns (“reduced-column” method), so the inside and the porch feel open.',
    },
  },
  {
    id: 'columns', needs: ['platform'],
    name: { zh: '盘龙柱', en: 'Dragon columns' },
    fact: {
      zh: '前廊八根木雕盘龙柱是中国现存最早的木雕盘龙。龙与柱分开雕刻，再用榫卯盘在柱上。',
      en: 'The eight wooden dragon columns are the oldest surviving carved wooden dragons in China. Dragons and columns were carved separately and joined with mortise and tenon.',
    },
  },
  {
    id: 'lowerBrackets', needs: ['columns'],
    name: { zh: '阑额与下檐斗拱', en: 'Lower beams & brackets' },
    fact: {
      zh: '斗拱一层层向外出挑，把屋檐的重量传到柱上。下檐柱头为五铺作。',
      en: 'Brackets (dougong) step outward layer by layer, carrying the eave’s weight down to the columns.',
    },
  },
  {
    id: 'lowerRoof', needs: ['lowerBrackets', 'walls'],
    name: { zh: '下檐屋面', en: 'Lower roof' },
    fact: {
      zh: '殿身四周加一圈回廊，称“副阶周匝”。前廊进深两间，比一般殿宇宽一倍。',
      en: 'A full ring of porch (fujie zhouza) wraps the core. The front porch is two bays deep, twice the usual depth.',
    },
  },
  {
    id: 'upperBrackets', needs: ['lowerRoof'],
    name: { zh: '上檐斗拱', en: 'Upper brackets' },
    fact: {
      zh: '上檐柱头为六铺作，比下檐多出一跳，托起更高更远的上层屋檐。',
      en: 'The upper brackets reach one step further than the lower ones, holding the higher eave farther out.',
    },
  },
  {
    id: 'plaque', needs: ['upperBrackets'],
    name: { zh: '“圣母殿”匾', en: 'Name plaque' },
    fact: {
      zh: '上下檐之间悬着竖匾“圣母殿”。这里供奉的是唐叔虞之母邑姜。',
      en: 'A vertical plaque between the eaves names the hall. It honours Yi Jiang, mother of Tang Shuyu.',
    },
  },
  {
    id: 'upperRoof', needs: ['upperBrackets'],
    name: { zh: '重檐歇山顶', en: 'Double-eave hip-gable roof' },
    fact: {
      zh: '重檐歇山顶，面阔七间、进深六间，殿高约19米，柱有侧脚和生起，屋檐两端微微翘起。',
      en: 'Seven bays wide, six deep, about 19 m tall. Columns lean slightly inward and rise toward the corners, lifting the eaves.',
    },
  },
  {
    id: 'ridge', needs: ['upperRoof'],
    name: { zh: '正脊与鸱吻', en: 'Ridge & chiwen' },
    fact: {
      zh: '正脊两端的鸱吻是传说中的水兽，人们相信它能镇住火灾，护佑木构千年。',
      en: 'The chiwen at each ridge end is a water beast of legend, believed to ward off fire from the wooden hall.',
    },
  },
];

export const UI = {
  pageTitle: { zh: '夜穿千年 · 晋祠圣母殿 | Kiroween 2026', en: 'A Night Across Ten Centuries · Jinci | Kiroween 2026' },
  title: { zh: '夜穿千年 · 晋祠圣母殿', en: 'A Night Across Ten Centuries' },
  subtitle: { zh: 'Kiroween 2026 · 山西太原', en: 'The Hall of the Holy Mother, Jinci · Kiroween 2026' },
  start: { zh: '点亮灯笼，开始穿越', en: 'Light the lantern & travel back' },
  skip: { zh: '跳过 ›', en: 'Skip ›' },
  arrive: { zh: '千年之后，它依然在这里。', en: 'A thousand years on, it still stands.' },
  scatter: { zh: '一阵阴风……圣母殿散成了千年前的木料！', en: 'A ghostly wind... the hall falls apart into its old timbers!' },
  goal: { zh: '把构件拖回原位，自下而上重建圣母殿', en: 'Drag each part home and rebuild the hall from the ground up' },
  wrong: { zh: '这里不是它的位置', en: 'That is not where it goes' },
  hint: { zh: '灯灵提示', en: 'Lantern hint' },
  hintText: { zh: '试试这块：', en: 'Try this one:' },
  winTitle: { zh: '功德圆满 · 圣母殿重现！', en: 'Success! The hall stands again!' },
  winText: {
    zh: '你按照宋代营造的顺序，亲手把圣母殿重新立了起来。',
    en: 'You rebuilt the Hall of the Holy Mother in the order Song builders would have.',
  },
  time: { zh: '用时', en: 'Time' },
  moves: { zh: '尝试', en: 'Attempts' },
  again: { zh: '再穿越一次', en: 'Travel again' },
  credits: { zh: '图片与资料来源', en: 'Image & source credits' },
  close: { zh: '关闭', en: 'Close' },
  sound: { zh: '声音', en: 'Sound' },

  // ---------- timeline (Req 9) ----------
  timeline: { zh: '时间线', en: 'Timeline' },
  timelineNow: { zh: '今', en: 'Now' },
  timelinePast: { zh: '古', en: 'Past' },
  timelineContinue: { zh: '继续', en: 'Continue' },
  timelinePrev: { zh: '‹ 更近', en: '‹ Later' },
  timelineNext: { zh: '更早 ›', en: 'Earlier ›' },

  // ---------- 晋祠美景 gallery (spec: jinci-gallery) ----------
  gallery: { zh: '晋祠美景', en: 'Jinci in four seasons' },
  galleryPrev: { zh: '上一张', en: 'Previous photo' },
  galleryNext: { zh: '下一张', en: 'Next photo' },

  // ---------- hidden level 鬼手营造 (spec: gesture-bonus-level) ----------
  bonusUnlocked: { zh: '隐藏关卡已解锁：鬼手营造', en: 'Hidden level unlocked: Ghost-Hand Builder' },
  bonusUnlockedText: {
    zh: '你两分钟内就重建了圣母殿。千年前的匠人想借你的手，凌空再搭一次。',
    en: 'You rebuilt the hall in under two minutes. The builders of a thousand years ago want to borrow your hand and build it once more, in mid-air.',
  },
  bonusEnter: { zh: '进入隐藏关卡', en: 'Enter the hidden level' },
  bonusTitle: { zh: '鬼手营造', en: 'Ghost-Hand Builder' },
  bonusGoal: { zh: '捏住构件，带回原位，用一只手重建圣母殿', en: 'Pinch a part, carry it home, rebuild the hall with one hand' },
  privacyTitle: { zh: '借你的手一用', en: 'Lend us your hand' },
  privacyText: {
    zh: '这一关用电脑摄像头识别你的一只手。画面只在这个浏览器里处理，不会录制、保存或上传。离开这一关，摄像头立即关闭。',
    en: 'This level uses your computer’s camera to follow one hand. The video is processed only in this browser. Nothing is recorded, saved, or uploaded. The camera turns off as soon as you leave the level.',
  },
  cameraOffHidden: {
    zh: '你切换了页面，摄像头已经关闭。要继续，请再次开启。',
    en: 'You switched away, so the camera turned off. Turn it on again to continue.',
  },
  cameraOn: { zh: '开启摄像头', en: 'Turn on camera' },
  back: { zh: '返回', en: 'Back' },
  loadingCamera: { zh: '正在打开摄像头……', en: 'Opening the camera…' },
  loadingModel: { zh: '正在召唤鬼手（加载手势识别，约 22 MB）……', en: 'Summoning the ghost hand (loading hand tracking, about 22 MB)…' },
  errTitle: { zh: '鬼手没能现身', en: 'The ghost hand could not appear' },
  err_nocameraapi: { zh: '这个浏览器不支持摄像头。', en: 'This browser cannot use a camera.' },
  err_denied: {
    zh: '你没有允许使用摄像头。可以点地址栏里的摄像头图标，改为允许后再试。',
    en: 'Camera access was not allowed. You can allow it from the camera icon in the address bar and try again.',
  },
  err_nocamera: { zh: '没有找到可用的摄像头。', en: 'No usable camera was found.' },
  err_busy: { zh: '摄像头正被别的程序占用。关掉那个程序后再试。', en: 'Another app is using the camera. Close it and try again.' },
  err_unsupported: { zh: '这个浏览器太旧，无法运行手势识别。请换用新版 Chrome、Edge、Firefox 或 Safari。', en: 'This browser is too old to run hand tracking. Please use a current Chrome, Edge, Firefox, or Safari.' },
  err_loadfailed: { zh: '手势识别加载失败。请刷新页面后再试。', en: 'Hand tracking failed to load. Please reload the page and try again.' },
  tutTitle: { zh: '先练一练', en: 'Quick practice' },
  tutHand: { zh: '把一只手举到摄像头前', en: 'Hold one hand up to the camera' },
  tutPinch: { zh: '拇指和食指捏在一起：抓起', en: 'Pinch thumb and index finger together: grab' },
  tutRelease: { zh: '再把两指分开：放下', en: 'Open them again: drop' },
  tutDone: { zh: '很好！阴风要来了……', en: 'Well done! Here comes the ghost wind…' },
  noHand: { zh: '看不到你的手', en: 'Can’t see your hand' },
  handLost: { zh: '手不见了，构件回到了托盘', en: 'Hand lost. The part went back to the tray.' },
  exit: { zh: '退出', en: 'Exit' },
  camBadge: { zh: '摄像头开启', en: 'Camera on' },
  bonusWinTitle: { zh: '鬼手匠师 · 隐藏关卡完成！', en: 'Ghost-Hand Master! Hidden level complete!' },
  bonusWinText: {
    zh: '你只用一只手，凌空把圣母殿又搭了一遍。摄像头已经关闭。',
    en: 'With one hand, in mid-air, you built the hall once more. The camera is now off.',
  },
  bonusAgain: { zh: '再玩一次隐藏关卡', en: 'Play the hidden level again' },
  // easter egg 合十 (Req 10) — only shown after the pose has been held for 1 s
  prayerHold: { zh: '心诚则灵……', en: 'Sincerity moves timber…' },
  prayerDone: { zh: '心诚则灵！构件自己飞回了原位', en: 'Your sincerity is answered: the parts fly home by themselves' },
  prayerWinTitle: { zh: '心诚则灵 · 圣母殿自成！', en: 'Sincerity answered! The hall built itself!' },
  prayerWinText: {
    zh: '你双手合十，静候五息，千年前的匠人替你把圣母殿搭好了。摄像头已经关闭。',
    en: 'You pressed your palms together and waited. The builders of a thousand years ago finished the hall for you. The camera is now off.',
  },
  toTitle: { zh: '回到开始', en: 'Back to start' },
};
