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
  },
  {
    year: 1993,
    era: { zh: '1993—1996年', en: '1993–1996' },
    text: {
      zh: '圣母殿落架大修：整座木构被逐件拆下、修补，再按原样装回。',
      en: 'The hall is taken apart piece by piece, repaired, and reassembled exactly as before.',
    },
  },
  {
    year: 1961,
    era: { zh: '1961年3月', en: 'March 1961' },
    text: {
      zh: '晋祠被国务院公布为第一批全国重点文物保护单位。',
      en: 'Jinci is listed in the first batch of China’s Major Historical and Cultural Sites.',
    },
  },
  {
    year: 1934,
    era: { zh: '民国二十三年 · 1934年', en: '1934' },
    text: {
      zh: '梁思成、林徽因考察晋汾古建筑，在《晋汾古建筑预查纪略》中称飞梁前的宋代铁狮“灵动如生”。',
      en: 'Liang Sicheng and Lin Huiyin survey Shanxi’s old buildings and praise the Song iron lions as “alive and moving”.',
    },
  },
  {
    year: 1932,
    era: { zh: '民国二十一年 · 1932年', en: '1932' },
    text: {
      zh: '张庆亨编《晋祠指南》出版，书中印有晋祠最早的一批风景照片。',
      en: 'Zhang Qingheng’s “Guide to Jinci” is printed, with some of the earliest published photos of the site.',
    },
    photo: 'assets/photos/guide1932-plate-1-2.jpg',
    photoCaption: { zh: '《晋祠指南》图版（1932，公有领域）', en: '1932 Guide to Jinci, plate (public domain)' },
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
};
