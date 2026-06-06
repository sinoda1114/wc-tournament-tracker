/**
 * 日本語メッセージ辞書（既定ロケール・正本）。
 * 他言語はこの型 {@link Dictionary} に一致させる（キー欠落を tsc + テストで検出）。
 * 文字列は段階的に増やしていく（まずは nav / header / language）。
 */
export const ja = {
  nav: {
    label: '主要ページ',
    groups: 'グループリーグ',
    knockout: '決勝T',
    teams: '出場国',
    prediction: '優勝予想',
    favorites: 'お気に入り',
  },
  header: {
    admin: '管理画面',
    skipToContent: 'メインコンテンツへスキップ',
  },
  language: {
    label: '言語',
  },
  // 決勝トーナメント（トップ）ページ固有のテキスト。
  home: {
    title: '決勝トーナメント表',
    description:
      '試合結果を更新すると、勝者が次の試合へ自動反映されます。スマホでは横スクロールで全ラウンドを確認できます。',
  },
  // トーナメント表示の切替・見出し（決勝/3位決定戦）。
  tournament: {
    viewLabel: '表示切替',
    bracket: 'ブラケット',
    cards: 'カード',
    final: '🏆 決勝',
    thirdPlace: '🥉 3位決定戦',
  },
  // 「お気に入りのみ表示」トグル。
  favoriteFilter: {
    groupLabel: 'お気に入りフィルター',
    onlyStarred: '☆のみを表示',
    onlyStarredAria: '☆を付けた試合のみ表示',
    teamsUnit: 'チーム',
    hint: '★ ボタンで気になる国を登録できます',
  },
  // 試合の共通表現（複数画面で共有）。stage/status のキーは
  // MatchStage / MatchStatus と一致させる（lib/bracket 側の代入で型検証）。
  // slot のテンプレートは {n}=試合番号・{g}=グループ記号 を置換して使う。
  match: {
    versus: 'vs',
    jst: '日本時間（JST）',
    venueHostingAria: '{country} 開催',
    venueAria: '会場 {country}',
    venueTitle: '会場: {country} / {stadium}',
    stage: {
      group_stage: 'グループリーグ',
      round_of_32: 'ラウンド32',
      round_of_16: 'ラウンド16',
      quarter_final: '準々決勝',
      semi_final: '準決勝',
      third_place: '3位決定戦',
      final: '決勝',
    },
    status: {
      scheduled: '予定',
      in_progress: '試合中',
      finished: '終了',
    },
    slot: {
      winner: '勝者 #{n}',
      loser: '敗者 #{n}',
      groupFirst: '{g} 1位',
      groupSecond: '{g} 2位',
      groupThird: '{g} 3位',
      winnerTitle: '第{n}試合の勝者',
      loserTitle: '第{n}試合の敗者',
      groupFirstTitle: 'グループ{g} 1位',
      groupSecondTitle: 'グループ{g} 2位',
      groupThirdTitle: 'グループ {g} のいずれかの3位',
    },
    weekdays: ['日', '月', '火', '水', '木', '金', '土'],
  },
  // グループリーグ（一覧・詳細）ページ。{letter}=組記号 を置換。
  groups: {
    title: 'グループリーグ',
    description:
      '48ヶ国 × 12 グループの順位表と全 72 試合を一覧表示します（同勝点時は得失点差 → 総得点 → 直接対決の順で並びます）。',
    emptyDate: 'この日に試合はありません。',
    favoriteEmpty:
      'お気に入りチームの所属するグループはありません。フィルターを解除するか、別のチームを ★ で登録してください。',
    backToList: '← グループリーグ一覧',
    groupHeading: 'グループ{letter}',
    detailDescription:
      'グループ{letter} の順位表と試合結果。スコア入力後に再読み込みすると順位が更新されます。',
    detailEmptyDate: 'この日にグループ{letter}の試合はありません。',
  },
  // 順位表（GroupCard）。略号ヘッダは title/aria で正式名称を補う。
  standings: {
    groupAria: 'グループ{letter}',
    detailAria: 'グループ{letter} の詳細',
    tableAria: 'グループ{letter} 順位表',
    matchesAria: 'グループ{letter} 試合一覧',
    posAria: '順位',
    country: '国',
    team: 'チーム',
    played: '試',
    playedAria: '試合数',
    win: '勝',
    winAria: '勝',
    draw: '分',
    drawAria: '分',
    loss: '負',
    lossAria: '負',
    goalsFor: '得',
    goalsForAria: '得点',
    goalsAgainst: '失',
    goalsAgainstAria: '失点',
    goalDiff: '差',
    goalDiffAria: '得失点差',
    points: '勝点',
    pointsAria: '勝点',
    legendAdvancing: '突破（上位2）',
    legendPlayoff: '3位通過枠',
    noMatches: 'このグループの試合データはまだありません。',
    noMatchesFilter: 'この条件に合致する試合はまだありません。',
    favoriteNoMatches: 'お気に入りチームの試合はこのグループにはありません。',
  },
  // 日付フィルターバー（DateFilterBar）。
  dateFilter: {
    groupAria: '日付フィルター',
    quickAria: 'クイック日付',
    all: 'すべて',
    yesterday: '昨日',
    today: '今日',
    tomorrow: '明日',
    dayAfterTomorrow: '明後日',
    openCalendar: 'カレンダーから日付を選ぶ',
    calendar: 'カレンダー',
    reset: '日付フィルターを解除',
  },
  // 出場国（一覧・検索）。{count}=国数。
  teams: {
    heading: '出場国（{count}）',
    description:
      '日本語名・英語名・FIFA 3文字コード（例: 日本 / Japan / JPN）で検索できます。国を選ぶと監督と選手が表示されます。',
    searchAria: '出場国を検索',
    searchPlaceholder: '日本 / Japan / JPN で検索',
    searchEmpty: '該当する国はありません',
    favoriteRegistered: 'お気に入り登録済',
    favoriteEmpty: 'お気に入りに登録した国がありません。各国の ★ から登録できます。',
    backToList: '← 出場国一覧に戻る',
  },
  // 大陸連盟ラベル（CONFEDERATION_LABELS の正本）。
  confederations: {
    AFC: 'アジア（AFC）',
    UEFA: 'ヨーロッパ（UEFA）',
    CONMEBOL: '南米（CONMEBOL）',
    CAF: 'アフリカ（CAF）',
    CONCACAF: '北中米カリブ（CONCACAF）',
    OFC: 'オセアニア（OFC）',
  },
  // 選手・監督パネル（SquadPanel）。{label}=ポジション略号・{count}=人数。
  squad: {
    empty: 'この国のメンバー情報は準備中です。',
    coach: '監督',
    positionOther: 'その他',
    ageSuffix: '歳',
    groupCount: '{label}（{count}）',
  },
  // 優勝国予想（ChampionPrediction）。{count}=チーム数・{name}=国名。
  prediction: {
    title: '優勝国予想',
    description:
      '過去W杯成績・FIFAランク・WC2026成績・みんなの予想を掛け合わせて優勝確率を算出します。指標のON/OFFで予想が変わります。',
    sectionAria: '優勝国予想',
    togglesAria: '予想に使う指標の切替',
    factorPastWorldCup: '過去W杯成績',
    factorFifaRank: 'FIFAランク',
    factorWc2026: 'WC2026成績',
    factorCrowd: 'みんなの予想',
    noneActive:
      '指標を1つ以上選んでください。すべてOFFだと全チームが同じ確率になり、予想になりません。',
    flat: '選んだ指標にはまだデータがありません。全チームが横並びになり予想にならないため、データが入るまで表示しません（試合が進むと参考値として表示されます）。',
    onlyWc2026:
      'WC2026成績のみで算出しています。大会序盤は消化試合が少なく、わずかな結果に数字が大きく振られて偏りが出ます。試合が進むほど精度が上がるため、現時点ではおおまかな傾向としてご覧ください。',
    teamSquadAria: '{name}の選手を見る',
    showTop: '上位だけ表示',
    showAll: '全{count}チームを表示',
  },
  // みんなの予想に投票（VotePanel）。{stage}=ステージ名・{progression}=進行順。
  vote: {
    sectionAria: 'みんなの予想に投票',
    title: 'あなたの優勝予想',
    closed: '全ステージの投票が締め切られました。みんなの予想は最終結果として固定されます。',
    votedPrefix: '{stage}の投票済み：',
    locked: '（このステージはロック中）',
    nextInfo: '{stage}に進むと、もう一度投票できます。最新の票が「みんなの予想」に反映されます。',
    lastVote: 'これが最後の投票です。',
    currentPrefix: '現在は',
    currentSuffix: '。優勝すると思う国を1票選んでください（日本語名・英語名・FIFAコードで検索）。',
    searchAria: '優勝予想の国を検索',
    submit: '投票する',
    noteLine1:
      '大会の進行（{progression}）ごとに1回ずつ投票でき、各ユーザーの最新の票が「みんなの予想」に反映されます。',
    noteNoChange: '同じステージでは投票後の変更はできません。',
  },
  // サイト共通フッタ（SiteFooter）。{year}=西暦。
  footer: {
    brandTitle: 'WC 2026 決勝トーナメント トラッカー',
    brandDesc:
      '2026年に開催される国際サッカー大会の試合日程・結果・出場国を、ファン向けに見やすくまとめる非公式の情報サイトです。',
    navAria: 'フッターナビゲーション',
    linkTerms: '利用規約',
    linkPrivacy: 'プライバシーポリシー',
    linkTokushoho: '特定商取引法に基づく表記',
    disclaimerStrong: '本サイトは FIFA 非公認の非公式ファンサイトです。',
    disclaimerBody:
      'FIFA（国際サッカー連盟）、各国・各地域のサッカー協会、大会の公式スポンサーその他の権利者とは、一切の提携・後援・推奨関係にありません。「FIFA」「ワールドカップ」その他の名称・エンブレム・公式ロゴは各権利者の商標であり、本サイトではこれらを権利者の商標として尊重し、公式ロゴ・エンブレムは使用していません。また、スタジアム等の会場名としてスポンサー企業名を冠した通称（ネーミングライツ名）が用いられる場合がありますが、これらの名称は各社の商標です。本サイトの情報は速報性・正確性を保証するものではありません。',
    copyright: '(c) WC 2026 Tracker',
    dataNotice: '掲載データは予告なく変更される場合があります。',
  },
  // 会場情報カード（VenueInfoCard）。{stadium}=会場名。値（屋根/芝等）は lib/venue。
  venue: {
    cardAria: '{stadium} の会場情報',
    capacity: '収容人数',
    capacityUnit: '人',
    roof: '屋根',
    pitch: 'ピッチ',
    elevation: '標高',
    highAltitude: '高地',
    stageSummary: 'この大会での担当',
    pastWorldCups: '過去のW杯',
    mapLink: 'Googleマップで開く',
    mapAria: '{stadium} を Google マップで開く（新しいタブ）',
  },
  // 試合詳細ページ（/matches/[id]）。{n}=試合番号。
  matchDetail: {
    number: '第{n}試合',
  },
  timezone: {
    label: 'タイムゾーン',
  },
};

export type Dictionary = typeof ja;
