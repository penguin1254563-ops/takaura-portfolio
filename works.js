/*
 * ポートフォリオのデータ（ここだけ編集すればサイトが育つ）
 *
 * 作品を足すとき：
 *   1. portfolio/works/<id>/ に素材を置く
 *        video.mp4    本編（クリックで音ありで再生）
 *        poster.jpg   本編のサムネイル
 *        cuts/01.mp4 … 壁のタイルで順番に流れるカット（＋同名の .jpg）
 *      これらは  node scripts/portfolio-cuts.mjs <完成動画> <id>  で自動で作れる
 *   2. WORKS に1件追加する。並び順がそのまま表示順になる
 *
 * - categories の最初の1つで、どのブロック（用途）に入るかが決まる
 * - ratio は "16:9" / "9:16" / "1:1" / "4:5"。横長以外は各ブロックの下に別の列で並ぶ
 * - 任意の項目：concept（制作の狙い。作品ページに出る）、role（担当範囲）、period（制作期間）
 * - 重い本編は YouTube / Vimeo に置いて youtube: "動画ID" / vimeo: "動画ID" でも可
 */

window.SITE = {
  reel: { video: "reel/showreel.mp4", poster: "reel/showreel.jpg", length: "0:47" }, // ショーリール（scripts/portfolio-reel.mjs で作る）
  name: "FUMITAKE TAKAURA",          // 表記名（ローマ字）
  nameJa: "高浦文武",
  role: "AI Film & Image",
  // 依頼の窓口。まずはクラウドワークスだけ（プロフィールのURLに差し替える）
  crowdworks: "https://crowdworks.jp/",
  email: "takaura.studio@gmail.com", // 公開用のメールアドレス。空のあいだはサイトに出ない
  links: [                           // ほかの窓口・SNS。空のあいだはサイトに出ない
    // { label: "ココナラ", url: "https://coconala.com/" },
    // { label: "ランサーズ", url: "https://www.lancers.jp/" },
    // { label: "Instagram", url: "https://www.instagram.com/" },
    // { label: "YouTube", url: "https://www.youtube.com/" },
  ],
};

// 用途＝ブロックの分け方。この順に上から並ぶ（作品がない用途は表示されない）
window.CATEGORIES = {
  ad: { en: "Commercial", ja: "広告・CM" },
  documentary: { en: "Documentary", ja: "ドキュメンタリー" },
  wedding: { en: "Wedding", ja: "ウェディング" },
  sns: { en: "Social", ja: "SNS・ショート" },
  art: { en: "Art & Music Video", ja: "アート・MV" },
};

// トップの壁のチャプター（6種類）。6秒ごとに次のチャプターへ移り、9枠がそのテーマのカットに入れ替わる
// tint はそのチャプターのあいだページ全体にうっすら差す色。cuts は「作品ID/カット番号」。先頭のカットほど優先（1つ目は左上の大きい枠）。
// 9本に満たないチャプターは fill のカット（近い雰囲気のもの）で小さい枠を埋める
window.CHAPTERS = [
  // 並び順：続く2つのチャプターで同じカットがかぶらないようにしている（かぶると、その枠だけ同じ映像が頭から流れ直す）
  { id: "ocean", tint: "#0b1d24", label: "Ocean", cuts: [
    "abundant-sea/01", "abundant-sea/03", "abundant-sea/05", "abundant-sea/04", "abundant-sea/02",
    "unwind-in-nature/05", "unwind-in-nature/02", "unwind-in-nature/03", "unwind-in-nature/01",
  ] },
  { id: "mountain", tint: "#121a22", label: "Mountain", cuts: [
    "beyond-the-road/05", "beyond-the-road/02", "tsukiakari-onsen/05", "time-of-the-earth/03", "beyond-the-road/04",
    "tsukiakari-onsen/03", "time-of-the-earth/01", "beyond-the-road/01", "tsukiakari-onsen/01",
    "beyond-the-road/03", "beyond-the-road/06", "time-of-the-earth/05",
  ] },
  { id: "wildlife", tint: "#151b0e", label: "Wildlife", cuts: [
    "madagascar/01", "abundant-sea/03", "madagascar/02", "abundant-sea/01", "madagascar/03",
    "abundant-sea/05", "madagascar/05", "unwind-in-nature/05", "madagascar/04",
  ] },
  { id: "people", tint: "#1d1712", label: "People", cuts: [
    "beyond-the-road/06", "tsukiakari-onsen/04", "time-of-the-earth/03", "unwind-in-nature/03", "beyond-the-road/03",
    "tsukiakari-onsen/03", "time-of-the-earth/01", "unwind-in-nature/07", "tsukiakari-onsen/01",
    "unwind-in-nature/04", "time-of-the-earth/02", "unwind-in-nature/06",
  ] },
  { id: "forest", tint: "#0c1d13", label: "Forest", cuts: [
    "moss-forest/02", "madagascar/01", "moss-forest/03", "madagascar/02", "moss-forest/04",
    "madagascar/03", "moss-forest/01", "madagascar/04", "moss-forest/05", "madagascar/05", "madagascar/06",
  ] },
  { id: "golden-hour", tint: "#24190c", label: "Golden Hour", cuts: [
    "unwind-in-nature/07", "tsukiakari-onsen/04", "time-of-the-earth/05", "unwind-in-nature/01", "tsukiakari-onsen/02",
    "madagascar/06", "time-of-the-earth/02", "unwind-in-nature/08", "unwind-in-nature/04",
  ] },
];

window.WORKS = [
  // ※タイトル（1本目以外）は仮
  {
    id: "abundant-sea",
    title: "豊かな海",
    titleEn: "Abundant Sea",
    year: 2026,
    ratio: "16:9",
    duration: "0:26",
    categories: ["documentary"],
    featured: true,
    description:
      "ウミガメ、クラゲ、サメ。光の届く浅瀬から深い青まで、海に生きるものたちの営みを追ったネイチャードキュメンタリー。",
    tools: [], // 使用したAIツール（例: "Magnific", "Kling"）
    cuts: 5,
    video: "works/abundant-sea/video.mp4",
    poster: "works/abundant-sea/poster.jpg",
  },
  {
    id: "beyond-the-road",
    title: "道なき道へ",
    titleEn: "Beyond the Road",
    year: 2026,
    ratio: "16:9",
    duration: "0:29",
    categories: ["ad"],
    description:
      "架空のオフロードSUVブランド「TERRAX」のCM。アウトドアを愛する女性がハンドルを握り、岩場の山道を越えて、湖を見下ろす絶景へたどり着く。",
    tools: [], // 使用したAIツール（例: "Magnific", "Kling"）
    cuts: 6,
    video: "works/beyond-the-road/video.mp4",
    poster: "works/beyond-the-road/poster.jpg",
  },
  {
    id: "time-of-the-earth",
    title: "大地の時を刻む",
    titleEn: "Time of the Earth",
    year: 2026,
    ratio: "16:9",
    duration: "0:27",
    categories: ["ad"],
    description:
      "架空の腕時計ブランド「AURUM」のCM。山と湖を望む朝、男性が腕時計を身につけ、雄大な景色の中へ歩み出す。",
    tools: [], // 使用したAIツール（例: "Magnific", "Kling"）
    cuts: 5,
    video: "works/time-of-the-earth/video.mp4",
    poster: "works/time-of-the-earth/poster.jpg",
  },
  {
    id: "madagascar",
    title: "マダガスカル 進化の島",
    titleEn: "Madagascar: Island of Evolution",
    year: 2026,
    ratio: "16:9",
    duration: "0:35",
    categories: ["documentary"],
    description:
      "パンサーカメレオン、葉に擬態するヘラオヤモリ、ヒルヤモリ、ホウシャガメ。マダガスカルにしかいない爬虫類たちと、彼らが暮らす森を紹介するネイチャードキュメンタリー。",
    tools: [], // 使用したAIツール（例: "Magnific", "Kling"）
    cuts: 6,
    video: "works/madagascar/video.mp4",
    poster: "works/madagascar/poster.jpg",
  },
  {
    id: "unwind-in-nature",
    title: "自然にほどける",
    titleEn: "Unwind in Nature",
    year: 2026,
    ratio: "16:9",
    duration: "0:49",
    categories: ["ad"],
    description:
      "架空のリゾート「AURELIA ISLE RESORT」のCM。インフィニティプール、ウミガメと泳ぐ海、スパ、夕日のディナー。島で過ごす一日を描く。",
    tools: [], // 使用したAIツール（例: "Magnific", "Kling"）
    cuts: 8,
    video: "works/unwind-in-nature/video.mp4",
    poster: "works/unwind-in-nature/poster.jpg",
  },
  {
    id: "tsukiakari-onsen",
    title: "月灯温泉郷",
    titleEn: "Moonlit Hot Spring Town",
    year: 2026,
    ratio: "16:9",
    duration: "0:33",
    categories: ["ad"],
    description:
      "架空の温泉街「月灯温泉郷」の観光PR。湯けむりの立つ石畳を歩き、宿ののれんをくぐり、露天風呂と夜の灯りを楽しむ旅人の一日を描く。",
    tools: [], // 使用したAIツール（例: "Magnific", "Kling"）
    cuts: 5,
    video: "works/tsukiakari-onsen/video.mp4",
    poster: "works/tsukiakari-onsen/poster.jpg",
  },
  {
    id: "moss-forest",
    title: "苔むす森",
    titleEn: "Ancient Moss Forest",
    year: 2026,
    ratio: "16:9",
    duration: "0:36",
    categories: ["documentary"],
    description:
      "霧に包まれた山並み、天を突く巨木、苔むした渓流、葉からこぼれるひとしずく。太古から続く原生林の時間を描くネイチャードキュメンタリー。",
    tools: [], // 使用したAIツール（例: "Magnific", "Kling"）
    cuts: 5,
    video: "works/moss-forest/video.mp4",
    poster: "works/moss-forest/poster.jpg",
  },
];
