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
    signIn: 'ログイン',
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
    events: {
      title: '試合のできごと',
      aria: '試合中の得点・カード・交代',
      assist: 'アシスト',
      type: {
        goal: '得点',
        own_goal: 'オウンゴール',
        penalty_goal: 'PK',
        yellow_card: 'イエロー',
        red_card: 'レッド',
        substitution: '交代',
      },
    },
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
    errors: {
      closed: '投票は終了しました。',
      wrong_stage: 'ステージが更新されました。最新の状態で投票してください。',
      invalid_team: 'そのチームには投票できません。',
      locked: 'このステージはすでに投票済みです。',
      error: '投票に失敗しました。時間をおいて再度お試しください。',
      auth: 'ログインすると投票できます。',
    },
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
    brandTitle: 'MatchFav — W杯2026 試合・優勝予想・お気に入りトラッカー（非公式）',
    brandDesc:
      '2026年に開催される国際サッカー大会の試合日程・結果・出場国を、ファン向けに見やすくまとめる非公式の情報サイトです。',
    navAria: 'フッターナビゲーション',
    linkTerms: '利用規約',
    linkPrivacy: 'プライバシーポリシー',
    linkTokushoho: '特定商取引法に基づく表記',
    disclaimerStrong: '本サイトは FIFA 非公認の非公式ファンサイトです。',
    disclaimerBody:
      'FIFA（国際サッカー連盟）、各国・各地域のサッカー協会、大会の公式スポンサーその他の権利者とは、一切の提携・後援・推奨関係にありません。「FIFA」「ワールドカップ」その他の名称・エンブレム・公式ロゴは各権利者の商標であり、本サイトではこれらを権利者の商標として尊重し、公式ロゴ・エンブレムは使用していません。また、スタジアム等の会場名としてスポンサー企業名を冠した通称（ネーミングライツ名）が用いられる場合がありますが、これらの名称は各社の商標です。本サイトの情報は速報性・正確性を保証するものではありません。',
    copyright: '(c) MatchFav',
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
    stageSummary: '開催試合',
    pastWorldCups: 'W杯開催実績',
    mapLink: 'Googleマップで開く',
    mapAria: '{stadium} を Google マップで開く（新しいタブ）',
    weather: {
      title: '試合日の天気',
      aria: '会場の試合日の天気予報',
      chanceOfRain: '降水確率 {n}%',
    },
  },
  // 試合詳細ページ（/matches/[id]）。{n}=試合番号。
  matchDetail: {
    number: '第{n}試合',
  },
  timezone: {
    label: 'タイムゾーン',
  },
  // ルートのエラー境界（error.tsx）。{digest}=エラーID。
  errorBoundary: {
    title: '問題が発生しました',
    body: 'データの読み込み中にエラーが発生しました。時間をおいて再度お試しください。問題が続く場合は、しばらくしてからアクセスしてください。',
    errorIdPrefix: 'エラーID: ',
    retry: '再試行',
    backHome: 'トップへ戻る',
  },
  // 最上位フォールバック（global-error.tsx）。layout/Providers 非適用のため辞書を直接埋め込む。
  globalError: {
    title: '予期しないエラーが発生しました',
    body: 'アプリの読み込みに失敗しました。お手数ですが、ページを再読み込みしてください。',
    errorIdPrefix: 'エラーID: ',
    reload: '再読み込み',
  },
  // 404 ページ（not-found.tsx）。
  notFound: {
    title: 'ページが見つかりません',
    body: 'お探しのページは存在しないか、移動した可能性があります。URL をご確認のうえ、トップページからお進みください。',
    backHome: 'トップへ戻る',
    viewGroups: 'グループリーグを見る',
  },
  // 読み込み中 UI（loading.tsx）。
  loading: {
    text: '読み込み中…',
  },
  // Cookie/ストレージ同意バナー（CookieConsent）。リンク前後で文を分割。
  consent: {
    dialogAria: 'Cookie・ストレージ利用への同意',
    bodyBefore:
      '本サイトでは、お気に入り登録や投票などの機能のために Cookie およびブラウザのローカルストレージを使用します。利用を続けることで、これらの使用に同意したものとみなされます。詳しくは',
    policyLink: 'プライバシーポリシー',
    bodyAfter: 'をご覧ください。',
    dismiss: '閉じる',
    accept: '同意する',
  },
  // ホーム画面に追加（AddToHomeScreen）。iOS 手順は太字部分を分割。
  addToHome: {
    label: 'ホーム画面に追加',
    intro: 'このサイトをアプリのようにホーム画面へ追加できます。Safari の下記の手順で登録してください。',
    step1Before: '画面下部の',
    shareButton: ' 共有ボタン ',
    step1After: 'をタップします。',
    step2Before: 'メニューを下にスクロールし',
    addToHomeItem: '「ホーム画面に追加」',
    step2After: 'を選びます。',
    step3Before: '右上の',
    addButton: '「追加」',
    step3After: 'をタップして完了です。',
  },
  // ライト/ダーク切替（ThemeToggle）。
  theme: {
    switchToLight: 'ライトモードに切り替え',
    switchToDark: 'ダークモードに切り替え',
  },
  // お気に入りページ（/favorites・FavoritesPageView）。{count}=件数・{name}=国名。
  favorites: {
    pageTitle: 'お気に入りチーム',
    pageDescription:
      '48ヶ国から気になるチームを ★ で選ぶと、決勝T・グループリーグの試合カードに金色の枠が付き、「お気に入りのみ」フィルターで素早く確認できるようになります。設定はこのブラウザに保存されます。',
    selectTeamTitle: 'チームを選択',
    selectTeamDescription:
      '日本語名・英語名・FIFA 3文字コード（例: 日本 / Japan / JPN）で検索できます。選択するとお気に入りに登録され、試合カードに金色の枠が付きます。',
    currentCount: '現在のお気に入り（{count} 件）',
    loading: '読み込み中…',
    emptyPicker: '上の検索で気になる国を選んでください。',
    listAria: 'お気に入りチーム一覧',
    removeAria: '{name} をお気に入りから削除',
    matchesTitle: 'お気に入りチームの試合',
    matchesDescription: 'お気に入りに登録したチームが関わる試合を時系列で表示します。',
    emptyMatches: 'まだお気に入りのチームがありません。上の検索から気になる国を選んでください。',
    noMatches: '該当する試合はありません。',
    pickerSearchAria: 'お気に入り国を検索',
    registeredBadge: '✓ 登録済',
    registeredAria: '登録済',
  },
  // お気に入りトグル星（FavoriteStar）。{name}=国名。
  favoriteStar: {
    addAria: '{name} をお気に入りに追加',
    removeAria: '{name} をお気に入りから削除',
  },
};

export type Dictionary = typeof ja;
