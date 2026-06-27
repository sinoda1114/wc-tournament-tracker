/**
 * 日本語メッセージ辞書（既定ロケール・正本）。
 * 他言語はこの型 {@link Dictionary} に一致させる（キー欠落を tsc + テストで検出）。
 * 文字列は段階的に増やしていく（まずは nav / header / language）。
 */
export const ja = {
  // 公開ページの metadata（title/description）。#19/T-19 でロケール別の <title>/<meta>/OGP を返す。
  // 動的ページ（groupDetail/teamDetail/matchDetail）は {group} 等のプレースホルダをページ側で置換する。
  meta: {
    home: {
      title: 'MatchFav（マッチファボ）— サッカー2026 試合日程・結果・優勝予想（非公式）',
      description:
        'MatchFav（マッチファボ）は、ワールドカップ2026の日程・結果・順位・会場・出場選手と、みんなの優勝予想をひとつにまとめた非公式ファンサイト。お気に入りの国を登録して、見たい試合をすぐチェックできます（FIFA非公認）。',
    },
    groups: {
      title: 'グループリーグ',
      description:
        '48ヶ国 × 12 グループの順位表と全 72 試合。WC 2026 のグループリーグを日程・結果つきで一覧できます。',
    },
    groupDetail: {
      // {group} = グループの文字（A〜L）。
      title: 'グループ{group}',
      description:
        'WC 2026 グループ{group}の順位表と試合結果。出場国と日程をまとめています。',
    },
    teams: {
      title: '出場国一覧',
      description:
        'WC 2026 の出場国を一覧・検索できます。各国の代表メンバーや監督、所属グループを確認できます。',
    },
    teamDetail: {
      // {name} = 国名（表示言語）、{nameEn} = 英語名。
      title: '{name} 代表',
      description:
        '{name}（{nameEn}）の出場メンバー・監督。WC 2026 の代表スカッドをまとめています。',
      fallback: '出場国',
    },
    matchDetail: {
      // {home}/{away} = 対戦カード、{stage} = ステージ名、{stadium}/{city} = 会場。
      title: '{home} vs {away}（{stage}）',
      description:
        '{stage}「{home} 対 {away}」の日程・会場・結果。{stadium}（{city}）で開催。',
      fallback: '試合詳細',
    },
    prediction: {
      title: '優勝国予想',
      description:
        '過去W杯成績・FIFAランク・WC2026成績・みんなの予想を掛け合わせて優勝確率を算出します。指標のON/OFFで予想が変わります。',
    },
    rankings: {
      title: 'ランキング',
      description:
        'WC 2026 の得点ランキングとカード数。記録のある試合から自動集計します。',
    },
    favorites: {
      title: 'お気に入り',
      description:
        'お気に入りに登録した国と、その試合だけをまとめてチェック。WC 2026 の気になる国を見逃しません。',
    },
    terms: {
      title: '利用規約 | MatchFav',
      description: 'MatchFav（FIFA非公認の非公式ファンサイト）の利用規約です。',
    },
    privacy: {
      title: 'プライバシーポリシー | MatchFav',
      description:
        'MatchFav（FIFA非公認の非公式ファンサイト）のプライバシーポリシーです。',
    },
    tokushoho: {
      title: '特定商取引法に基づく表記 | MatchFav',
      description: 'MatchFav の特定商取引法に基づく表記です。',
    },
    faq: {
      title: 'よくある質問 | MatchFav',
      description:
        'MatchFav（マッチファボ）のよくある質問。料金・無料期間・データ・お気に入り・優勝予想・お問い合わせなどをまとめています。',
    },
  },
  nav: {
    label: '主要ページ',
    groups: 'グループリーグ',
    knockout: '決勝T',
    teams: '出場国',
    prediction: '優勝予想',
    favorites: 'お気に入り',
    rankings: 'ランキング',
  },
  rankings: {
    title: 'ランキング',
    description: '大会の得点ランキングとカード数。記録のある試合から集計します。',
    scorersTitle: '得点ランキング',
    cardsTitle: 'カード',
    cardsNote:
      'イエローカードは累積2枚で次戦出場停止。レッドカードは次戦出場停止。イエローカードの累積はグループステージ終了後と準々決勝終了後の2回リセット。',
    colRank: '#',
    colPlayer: '選手',
    colTeam: '国',
    colGoals: '得点',
    colYellow: '黄',
    colYellowAria: 'イエローカード',
    colRed: '赤',
    colRedAria: 'レッドカード',
    colStatus: '状態',
    suspended: '出場停止',
    suspensionServed: '出場停止 消化済み',
    tbd: '未定',
    previewMeta: '上位{shown}件を表示中（全{total}件）',
    showAllScorers: '得点ランキングをすべて表示（{total}人）',
    showAllCards: 'カード累積をすべて表示（{total}人）',
    allScorersTitle: '得点ランキングすべて',
    allCardsTitle: 'カードランキングすべて',
    allRowsMeta: '全{total}件を表示しています。',
    historicalScorersTitle: '歴代W杯通算得点ランキング',
    historicalNote:
      '歴代ワールドカップ（男子）の通算得点。2022年大会終了時点の確定記録に、現役選手は本大会の得点を自動加算しています。',
    historicalNoteLive: '緑色の得点は本大会（2026）での得点です。',
    historicalLiveHint: 'うち本大会（2026）で{n}得点（通算に含む）',
    colSpan: '出場',
    showAllHistorical: '歴代ランキングを表示(上位{total}名)',
    allHistoricalScorersTitle: '歴代W杯通算得点ランキング（上位{total}名）',
    activeBadge: '現役',
    activeBadgeAria: '2026大会に出場中',
    empty: 'まだ記録がありません。試合が進むと得点・カードがここに集計されます。',
    chartGoalsByCountry: '国別得点数',
    chartCardsByStage: 'ステージ別カード累積',
    chartCardsByCountry: '国別カード枚数',
    showAllCountryCards: '全{total}か国を見る',
    stageGroupStage: 'グループリーグ',
    stageR32: 'R32',
    stageR16: 'R16',
    stageQF: 'QF',
    stageSF: 'SF',
    stageThirdPlace: '3位決定',
    stageFinal: '決勝',
    cardPhaseW1: 'グループステージ',
    cardPhaseW2: '決勝T〜準々決勝',
    cardPhaseW3: '準決勝〜決勝',
    cardPhaseCurrent: '現在',
    cardPhaseNotStarted: 'まだ始まっていません',
  },
  header: {
    admin: '管理画面',
    signIn: 'ログイン',
    skipToContent: 'メインコンテンツへスキップ',
    menu: 'メニュー',
    settings: '設定',
  },
  language: {
    label: '言語',
  },
  // 決勝トーナメント（トップ）ページ固有のテキスト。
  home: {
    title: '決勝トーナメント表',
    description:
      '試合結果を更新すると、勝者が次の試合へ自動反映されます。スマホでは横スクロールで全ラウンドを確認できます。',
    heroTitle: 'どの国が、どこで、いつ戦う？ W杯2026をひと目で。',
    heroTagline: '史上初のアメリカ・カナダ・メキシコ3か国共催。出場国は48か国に増え、試合数も会場もこれまで以上に複雑になりました。MatchFavは、日程・結果・順位・会場・出場国をまとめて、見たい試合にすぐたどり着けるようにします。',
    heroPoint1: 'お気に入りチームを登録して、見たい試合だけすぐ確認',
    heroPoint2: '国・都市・スタジアムまで、会場情報をまとめてチェック',
    heroPoint3: 'グループリーグから決勝トーナメントまで流れを追える',
    heroPoint4: '優勝確率とみんなの優勝予想で、大会の行方を楽しめる',
    heroLead: 'グループステージは無料で楽しめます。',
    heroCta: 'ログインして始める',
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
      title: 'タイムライン',
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
    legendAdvancing: '決勝トーナメント出場',
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
    noteArg:
      '※ アルゼンチン代表は Leonardo Balerdi 選手が負傷のため離脱し、Marcos Senesi 選手が追加招集されました。',
    noteJpn:
      '※ 遠藤航選手は左足の負傷悪化により大会メンバーから離脱し、日本代表からの引退を発表しました。代わって町野修斗選手（FW）が追加招集され、背番号6を引き継いでいます。',
    noteNed:
      '※ オランダ代表は Jurrien Timber 選手が鼠径部の負傷により離脱し、Lutsharel Geertruida 選手（背番号2）が追加招集されました。',
    noteGer:
      '※ ドイツ代表は Lennart Karl 選手が左大腿部の筋損傷により離脱し、Assan Ouédraogo 選手（背番号25）が追加招集されました。',
    noteBra:
      '※ ブラジル代表は Wesley 選手が左太ももの負傷により離脱し、Éderson 選手（MF・背番号2）が追加招集されました。',
    noteSco:
      '※ スコットランド代表は Billy Gilmour 選手が膝の負傷により離脱し、Tyler Fletcher 選手（背番号8）が追加招集されました。',
    noteAut:
      '※ オーストリア代表は Christoph Baumgartner 選手が右太ももの負傷により離脱し、Dejan Ljubičić 選手が追加招集されました。',
    noteTun:
      '※ チュニジア代表はグループF初戦（スウェーデンに1-5）後に Sabri Lamouchi 監督が解任され、2026年大会終了までの契約で Hervé Renard 監督が新たに就任しました。',
  },
  // 優勝国予想（ChampionPrediction）。{count}=チーム数・{name}=国名。
  prediction: {
    title: '優勝国予想',
    description:
      '過去W杯成績・FIFAランク・WC2026成績・みんなの予想を掛け合わせて優勝確率を算出します。指標のON/OFFで予想が変わります。',
    fifaRankFreshness: 'ⓘ FIFAランク: 2026年6月11日公式発表分を反映',
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
      'WC2026成績のみで算出しています。大会序盤は消化試合が少なく、わずかな結果に数字が大きく振られて偏りが出ます。試合が進むほど精度が上がります。',
    teamSquadAria: '{name}の選手を見る',
    eliminatedAria: '{name}は敗退済み（優勝予想の対象外）',
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
      paywall: '決勝トーナメントの投票は購入後にご利用いただけます。',
    },
    sectionAria: 'みんなの予想に投票',
    title: 'あなたの優勝予想',
    closed: '全ステージの投票が締め切られました。みんなの予想は最終結果として固定されます。',
    closedSoon: '次ステージの投票はまもなく開始します。',
    votedPrefix: '{stage}の投票済み：',
    locked: '（このステージはロック中）',
    nextInfo: '{stage}に進むと、もう一度投票できます。最新の票が「みんなの予想」に反映されます。',
    lastVote: 'これが最後の投票です。',
    currentPrefix: '現在のステージは',
    currentSuffix: '。優勝すると思う国を1票選んでください（日本語名・英語名・FIFAコードで検索）。',
    searchAria: '優勝予想の国を検索',
    // 国を未選択の間だけ表示する控えめなガイド（T-69）。
    selectHint: '優勝予想国を選んでください。',
    submit: '投票する',
    noteLine1:
      '大会の進行（{progression}）ごとに1回ずつ投票でき、各ユーザーの最新の票が「みんなの予想」に反映されます。',
    noteNoChange: '同じステージでは投票後の変更はできません。',
    archiveTitle: '過去ラウンドの投票結果（履歴）',
    archiveDesc: '締め切られたラウンドの投票結果は消えずに残ります。各ラウンドの上位を見られます。',
    archiveTotal: '計{count}票',
    archiveVotes: '{count}票',
    archiveEmpty: 'このラウンドの投票はありませんでした。',
  },
  // サイト共通フッタ（SiteFooter）。{year}=西暦。
  // 課金壁の予告バナー（PaywallBanner・#26）。{price}=ロケール別価格。
  paywall: {
    bannerAria: '課金のお知らせ',
    bannerMessage:
      '⏳ 早割 {earlyPrice}(買い切り) は6/28まで。🏆 6/29から {regularPrice}(買い切り)。グループリーグは無料！',
    bannerCta: '購入する',
    bannerCtaAria: '決勝トーナメントを購入する（予想ページへ）',
    lockTitle: '決勝トーナメントは買い切りでフルアクセス',
    lockBody:
      '決勝トーナメントの予想・対戦表は買い切り {price}（MatchFav フルアクセス）でご利用いただけます。一度のお支払いでW杯2026 終了まで使えます。',
    lockCta: '{price} で購入する',
    lockSignIn: 'ログインして購入する',
    earlyTitle: '今だけ早割で先行購入',
    earlyBody:
      '決勝トーナメント（6/29〜）の予想・対戦表を、いまなら早割 {earlyPrice} で先行購入できます。6/29 以降は {regularPrice} になります。買い切り・一度のお支払いでW杯2026 終了まで使えます。',
    earlyCta: '{earlyPrice} で先行購入する',
    offerPeriod: '提供期間: 〜{offerEnd}',
    purchasing: '決済ページへ移動中…',
    purchaseError: '決済ページを開けませんでした。時間をおいて再度お試しください。',
    successTitle: 'ご購入ありがとうございます',
    successBody:
      'MatchFav フルアクセスが有効になりました。決勝トーナメントの予想・対戦表をお楽しみください。反映に少し時間がかかる場合があります。',
    successCta: '決勝トーナメントへ',
    cancelTitle: '購入はキャンセルされました',
    cancelBody: '決済は行われていません。いつでも購入手続きを再開できます。',
    cancelCta: 'トップへ戻る',
  },
  footer: {
    brandTitle: 'MatchFav — W杯2026の「見たい」を、ぜんぶ1か所に',
    brandDesc:
      '2026年に開催される国際サッカー大会の試合日程・結果・出場国を、ファン向けに見やすくまとめる非公式の情報サイトです。',
    navAria: 'フッターナビゲーション',
    linkFaq: 'よくある質問',
    linkTerms: '利用規約',
    linkPrivacy: 'プライバシーポリシー',
    linkTokushoho: '特定商取引法に基づく表記',
    disclaimerStrong: '本サイトは FIFA 非公認の非公式ファンサイトです。',
    disclaimerBody:
      'FIFA（国際サッカー連盟）、各国・各地域のサッカー協会、大会の公式スポンサーその他の権利者とは、一切の提携・後援・推奨関係にありません。「FIFA」「ワールドカップ」その他の名称・エンブレム・公式ロゴは各権利者の商標であり、本サイトではこれらを権利者の商標として尊重し、公式ロゴ・エンブレムは使用していません。また、スタジアム等の会場名としてスポンサー企業名を冠した通称（ネーミングライツ名）が用いられる場合がありますが、これらの名称は各社の商標です。本サイトの情報は速報性・正確性を保証するものではありません。',
    copyright: '(c) MatchFav',
    dataNotice: '掲載データは予告なく変更される場合があります。',
    unofficialNote: '非公式ファンサイト（FIFA非公認）',
    dataAttribution: '試合データの一部は Wikipedia（CC BY-SA）に基づきます。',
    reveal: 'サイト情報・規約',
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
    lineupPending: 'スターティングメンバーは未反映です（取得でき次第表示されます）。',
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
    label: 'スマートフォンにショートカットを追加',
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
    androidIntro:
      'このサイトをホーム画面にショートカットとして追加できます。Chrome では下記の手順で登録してください。',
    androidStep1: '右上の ⋮（メニュー）を開きます。',
    androidStep2: 'メニューの「ホーム画面に追加」を選びます。',
    androidStep3: '「追加」をタップして完了です。',
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
