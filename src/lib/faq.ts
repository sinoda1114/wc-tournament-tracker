import type { Locale } from '@/lib/i18n/config';

/**
 * トップページ下部の「よくある質問（FAQ）」コンテンツ（T-94）。
 *
 * - i18n メッセージ辞書（messages/*）を肥大化させないため、FAQ は本モジュールに集約する。
 *   `Record<Locale, FaqContent>` で全ロケールの提供を tsc が型強制する。
 * - 事実（料金・提供終了日・無料期間・返金・連絡先・順位タイブレーク）は実装／特商法ページと
 *   一致させてある（料金は市場別: ja=¥680/¥980、その他=US$5/$7。lib/pricing の PRICE_TABLE と整合）。
 * - 商標配慮: タイトル同様、本文でも大会の正式名称（FIFA系商標）は避け、一般的な表現で記述する。
 *   FIFA への言及は「無関係である」という打ち消し（非公式の明示）に限る。
 */

export type FaqItem = {
  /** 質問。 */
  q: string;
  /** 回答（段落の配列）。メールアドレス単体の段落は FaqSection 側で mailto リンク化する。 */
  a: string[];
};

export type FaqCategory = {
  heading: string;
  items: FaqItem[];
};

export type FaqContent = {
  title: string;
  categories: FaqCategory[];
};

const ja: FaqContent = {
  title: 'よくある質問',
  categories: [
    {
      heading: 'MatchFav について',
      items: [
        {
          q: 'MatchFav とは何ですか？',
          a: [
            'MatchFav（マッチファボ）は、2026年に北中米3か国（アメリカ・カナダ・メキシコ）で開催されるサッカーの世界大会について、試合日程・結果・順位表・出場国・会場情報・優勝予想などをまとめて確認できるファン向けサービスです。',
            'お気に入りチームを登録して見たい試合だけを確認したり、グループリーグから決勝トーナメントまで大会の流れを追ったりできます。',
          ],
        },
        {
          q: '公式サービスですか？',
          a: [
            'いいえ。MatchFav は FIFA や大会主催者、各国サッカー協会などとは関係のない非公式ファンサイトです。',
            '公式発表が必要な情報は、必ず公式サイトや公式発表もあわせてご確認ください。',
          ],
        },
        {
          q: 'どんな情報を見られますか？',
          a: [
            'おもに次の情報を確認できます。',
            'グループリーグの試合日程・結果／各グループの順位表／決勝トーナメント表／出場国一覧／会場・都市・スタジアム情報／得点ランキング／カード（警告・出場停止）情報／優勝確率・みんなの優勝予想',
          ],
        },
        {
          q: 'スマホでも使えますか？',
          a: [
            'はい。スマートフォンでも利用できます。',
            '決勝トーナメント表など横に長い表示は、スマホでは横スクロールで確認できます。',
          ],
        },
      ],
    },
    {
      heading: '無料・料金について',
      items: [
        {
          q: '無料で使えますか？',
          a: [
            'グループステージ期間は無料で利用できます。',
            'グループステージ終了後（決勝トーナメント期間の開始）以降に新しく登録した場合も、登録から72時間は無料で利用できます。',
            'その後に一部機能を利用するには、買い切りの購入が必要です。',
          ],
        },
        {
          q: '料金はいくらですか？',
          a: [
            '早割期間中は税込680円の買い切りです。',
            '早割終了後は税込980円の買い切り価格になります。',
          ],
        },
        {
          q: '月額課金ですか？',
          a: [
            'いいえ。月額・年額のサブスクリプションではありません。',
            '一度のお支払いで、サービス提供終了（2026年9月30日予定）まで利用できます。',
          ],
        },
        {
          q: '自動で課金されますか？',
          a: ['いいえ。無料期間中にお支払いをしなくても、自動的に課金されることはありません。'],
        },
        {
          q: '支払い方法は何ですか？',
          a: ['クレジットカード決済に対応しています。'],
        },
        {
          q: '購入後に返金できますか？',
          a: [
            'デジタルコンテンツという商品の性質上、決済完了後のお客様都合による返金・キャンセルには原則として応じられません。',
            'ただし、二重決済や、当方の責に帰すべき事由により相当期間ご利用いただけなかった場合などは、個別に対応します。お問い合わせ先までご連絡ください。',
          ],
        },
      ],
    },
    {
      heading: 'ログイン・アカウントについて',
      items: [
        {
          q: '利用にはログインが必要ですか？',
          a: [
            '一部機能の利用にはログインが必要です。',
            'ログインすると、お気に入りチームの登録や優勝予想への投票など、ユーザーごとの機能を利用できます。',
          ],
        },
        {
          q: 'パスワードは保存されますか？',
          a: ['外部の認証サービスを利用しているため、MatchFav 側でパスワードを保持することはありません。'],
        },
      ],
    },
    {
      heading: 'お気に入り機能について',
      items: [
        {
          q: 'お気に入りチームとは何ですか？',
          a: ['気になるチームをお気に入り登録しておくと、そのチームに関連する試合を見つけやすくなる機能です。'],
        },
        {
          q: '「☆のみを表示」とは何ですか？',
          a: [
            'お気に入り登録したチームに関連する情報だけにしぼり込んで表示する機能です。',
            '見たい試合だけをすばやく確認したいときに便利です。',
          ],
        },
      ],
    },
    {
      heading: '優勝予想について',
      items: [
        {
          q: '優勝予想とは何ですか？',
          a: ['過去の大会成績、FIFA ランク、今大会の成績、みんなの予想などをもとに、優勝確率を表示する機能です。'],
        },
        {
          q: '自分でも優勝予想に投票できますか？',
          a: ['はい。ログイン後、優勝すると思う国を選んで投票できます。'],
        },
        {
          q: '投票は何回できますか？',
          a: [
            '大会の各ステージごとに1回投票できます。',
            '同じステージ内では、投票後の変更はできません。',
          ],
        },
        {
          q: '優勝確率は公式な予想ですか？',
          a: [
            'いいえ。MatchFav 独自の計算によるファン向けの参考情報です。',
            '娯楽目的のコンテンツとしてお楽しみください。',
          ],
        },
      ],
    },
    {
      heading: 'データ・表示について',
      items: [
        {
          q: '試合日程や結果は正確ですか？',
          a: [
            '可能な範囲で正確な情報の掲載に努めていますが、外部の公開データソースを利用しているため、情報の欠落・遅延・誤りが生じる場合があります。',
            '重要な情報は、必ず公式発表もあわせてご確認ください。',
          ],
        },
        {
          q: '順位表はどのように並びますか？',
          a: ['勝点が同じ場合は、得失点差、総得点、当該チーム間の直接対決の順で並びます。'],
        },
        {
          q: '天気情報は正確ですか？',
          a: [
            '天気情報は予報のため、実際の天候と異なる場合があります。',
            '観戦や移動の判断には、公式の天気予報や交通情報もあわせてご確認ください。',
          ],
        },
        {
          q: '得点ランキングやカード情報も見られますか？',
          a: [
            'はい。記録のある試合から、得点ランキングやカード（警告・出場停止）情報を確認できます。',
            'イエローカードの累積は、グループステージ終了後と準々決勝終了後の2回リセットされます。',
          ],
        },
      ],
    },
    {
      heading: 'サービス提供期間について',
      items: [
        {
          q: 'いつまで利用できますか？',
          a: [
            'MatchFav は大会に関連した期間限定サービスです。',
            'サービス提供は 2026年9月30日まで（予定）です。',
          ],
        },
        {
          q: '大会終了後も使えますか？',
          a: [
            '大会終了後は、サービス提供を終了する予定です。',
            '終了日が変更になる場合は、サイト上で事前にお知らせします。',
          ],
        },
      ],
    },
    {
      heading: 'お問い合わせ',
      items: [
        {
          q: '問い合わせ先はどこですか？',
          a: ['お問い合わせは、次のメールアドレスまでご連絡ください。', 'info@matchfav.com'],
        },
      ],
    },
  ],
};

const en: FaqContent = {
  title: 'Frequently asked questions',
  categories: [
    {
      heading: 'About MatchFav',
      items: [
        {
          q: 'What is MatchFav?',
          a: [
            'MatchFav is a fan-focused service for the 2026 international soccer tournament hosted across three North American countries (the USA, Canada and Mexico). It brings together fixtures, results, standings, participating nations, venue information and champion predictions in one place.',
            'You can save your favorite teams to focus on the matches you care about, and follow the tournament from the group stage through the knockout rounds.',
          ],
        },
        {
          q: 'Is this an official service?',
          a: [
            'No. MatchFav is an unofficial fan site and is not affiliated with FIFA, the tournament organizers, or any national football association.',
            'For anything that requires an official source, please also check the official websites and announcements.',
          ],
        },
        {
          q: 'What information can I see?',
          a: [
            'You can mainly check the following:',
            'Group-stage fixtures and results / standings for each group / the knockout bracket / the list of participating nations / venue, city and stadium info / the top-scorer ranking / card (caution and suspension) information / win probability and everyone’s champion predictions.',
          ],
        },
        {
          q: 'Does it work on a phone?',
          a: [
            'Yes. MatchFav works on smartphones.',
            'Wide layouts such as the knockout bracket can be viewed by scrolling horizontally on a phone.',
          ],
        },
      ],
    },
    {
      heading: 'Free use and pricing',
      items: [
        {
          q: 'Can I use it for free?',
          a: [
            'The group-stage period is free to use.',
            'If you register after the group stage ends (the start of the knockout period), you also get 72 hours free from the time of registration.',
            'After that, a one-time purchase is required to use some features.',
          ],
        },
        {
          q: 'How much does it cost?',
          a: [
            'During the early-bird period it is a one-time purchase of US$5.',
            'After the early-bird period it becomes a one-time purchase of US$7.',
          ],
        },
        {
          q: 'Is it a subscription?',
          a: [
            'No. It is not a monthly or annual subscription.',
            'A single payment lets you use the service until it closes (planned for September 30, 2026).',
          ],
        },
        {
          q: 'Will I be charged automatically?',
          a: ['No. If you do not pay during the free period, you will never be charged automatically.'],
        },
        {
          q: 'What payment methods are accepted?',
          a: ['We accept credit card payments.'],
        },
        {
          q: 'Can I get a refund after purchase?',
          a: [
            'Because this is digital content, we generally cannot offer refunds or cancellations for customer-side reasons after payment is completed.',
            'However, in cases such as a double charge, or if the service was unavailable for a significant period due to a fault on our side, please contact us and we will handle it individually.',
          ],
        },
      ],
    },
    {
      heading: 'Login and accounts',
      items: [
        {
          q: 'Do I need to log in to use it?',
          a: [
            'Some features require logging in.',
            'Logging in lets you use per-user features such as saving favorite teams and voting in champion predictions.',
          ],
        },
        {
          q: 'Are passwords stored?',
          a: ['We use an external authentication service, so MatchFav never stores your password.'],
        },
      ],
    },
    {
      heading: 'Favorites',
      items: [
        {
          q: 'What are favorite teams?',
          a: ['Saving the teams you care about as favorites makes it easier to find matches involving those teams.'],
        },
        {
          q: 'What does “Show favorites only” do?',
          a: [
            'It filters the display down to information related only to the teams you have saved as favorites.',
            'It is handy when you want to quickly check just the matches you care about.',
          ],
        },
      ],
    },
    {
      heading: 'Champion predictions',
      items: [
        {
          q: 'What are champion predictions?',
          a: ['A feature that shows win probability based on factors such as past tournament results, FIFA ranking, results in the current tournament, and everyone’s predictions.'],
        },
        {
          q: 'Can I vote in the champion predictions too?',
          a: ['Yes. After logging in, you can pick the nation you think will win and cast a vote.'],
        },
        {
          q: 'How many times can I vote?',
          a: [
            'You can vote once per tournament stage.',
            'Within the same stage, you cannot change your vote after submitting it.',
          ],
        },
        {
          q: 'Is the win probability an official prediction?',
          a: [
            'No. It is reference information for fans, based on MatchFav’s own calculation.',
            'Please enjoy it as entertainment content.',
          ],
        },
      ],
    },
    {
      heading: 'Data and display',
      items: [
        {
          q: 'Are the fixtures and results accurate?',
          a: [
            'We strive to publish accurate information as far as possible, but because we use external public data sources, information may be missing, delayed, or incorrect.',
            'For important information, please also check official announcements.',
          ],
        },
        {
          q: 'How are the standings ordered?',
          a: ['When points are equal, teams are ordered by goal difference, then goals scored, then head-to-head results between the tied teams.'],
        },
        {
          q: 'Is the weather information accurate?',
          a: [
            'Weather information is a forecast and may differ from the actual conditions.',
            'When deciding about attending or traveling, please also check official weather forecasts and transport information.',
          ],
        },
        {
          q: 'Can I see scorer rankings and card information?',
          a: [
            'Yes. From matches with records, you can check the top-scorer ranking and card (caution and suspension) information.',
            'Accumulated yellow cards are reset twice: after the group stage and after the quarter-finals.',
          ],
        },
      ],
    },
    {
      heading: 'Service period',
      items: [
        {
          q: 'How long can I use it?',
          a: [
            'MatchFav is a limited-period service tied to the tournament.',
            'The service is scheduled to run until September 30, 2026.',
          ],
        },
        {
          q: 'Can I still use it after the tournament?',
          a: [
            'After the tournament ends, the service is scheduled to close.',
            'If the closing date changes, we will announce it on the site in advance.',
          ],
        },
      ],
    },
    {
      heading: 'Contact',
      items: [
        {
          q: 'How can I contact you?',
          a: ['For inquiries, please contact us at the following email address:', 'info@matchfav.com'],
        },
      ],
    },
  ],
};

const es: FaqContent = {
  title: 'Preguntas frecuentes',
  categories: [
    {
      heading: 'Sobre MatchFav',
      items: [
        {
          q: '¿Qué es MatchFav?',
          a: [
            'MatchFav es un servicio para aficionados sobre el torneo internacional de fútbol de 2026, que se celebra en tres países de Norteamérica (Estados Unidos, Canadá y México). Reúne en un solo lugar el calendario, los resultados, las clasificaciones, las selecciones participantes, la información de las sedes y los pronósticos de campeón.',
            'Puedes guardar tus selecciones favoritas para centrarte en los partidos que te interesan y seguir el torneo desde la fase de grupos hasta las eliminatorias.',
          ],
        },
        {
          q: '¿Es un servicio oficial?',
          a: [
            'No. MatchFav es un sitio de aficionados no oficial y no está afiliado a la FIFA, a los organizadores del torneo ni a ninguna federación nacional de fútbol.',
            'Para todo lo que requiera una fuente oficial, consulta también los sitios y comunicados oficiales.',
          ],
        },
        {
          q: '¿Qué información puedo ver?',
          a: [
            'Principalmente puedes consultar lo siguiente:',
            'Calendario y resultados de la fase de grupos / clasificación de cada grupo / cuadro de eliminatorias / lista de selecciones participantes / información de sedes, ciudades y estadios / ranking de goleadores / información de tarjetas (amonestaciones y sanciones) / probabilidad de título y pronósticos de campeón de todos.',
          ],
        },
        {
          q: '¿Funciona en el móvil?',
          a: [
            'Sí. MatchFav funciona en teléfonos móviles.',
            'Las vistas anchas, como el cuadro de eliminatorias, se pueden ver desplazándose horizontalmente en el móvil.',
          ],
        },
      ],
    },
    {
      heading: 'Uso gratuito y precios',
      items: [
        {
          q: '¿Puedo usarlo gratis?',
          a: [
            'El periodo de la fase de grupos es de uso gratuito.',
            'Si te registras después de que termine la fase de grupos (el inicio del periodo de eliminatorias), también tienes 72 horas gratis desde el momento del registro.',
            'Después, se requiere una compra única para usar algunas funciones.',
          ],
        },
        {
          q: '¿Cuánto cuesta?',
          a: [
            'Durante el periodo de descuento anticipado, es una compra única de 5 US$.',
            'Tras el periodo de descuento anticipado, pasa a ser una compra única de 7 US$.',
          ],
        },
        {
          q: '¿Es una suscripción?',
          a: [
            'No. No es una suscripción mensual ni anual.',
            'Un único pago te permite usar el servicio hasta su cierre (previsto para el 30 de septiembre de 2026).',
          ],
        },
        {
          q: '¿Se me cobrará automáticamente?',
          a: ['No. Si no pagas durante el periodo gratuito, nunca se te cobrará de forma automática.'],
        },
        {
          q: '¿Qué métodos de pago se aceptan?',
          a: ['Aceptamos pagos con tarjeta de crédito.'],
        },
        {
          q: '¿Puedo obtener un reembolso tras la compra?',
          a: [
            'Al tratarse de contenido digital, por lo general no podemos ofrecer reembolsos ni cancelaciones por motivos del cliente una vez completado el pago.',
            'No obstante, en casos como un cobro duplicado, o si el servicio no estuvo disponible durante un periodo considerable por causa nuestra, contáctanos y lo gestionaremos de forma individual.',
          ],
        },
      ],
    },
    {
      heading: 'Inicio de sesión y cuentas',
      items: [
        {
          q: '¿Necesito iniciar sesión para usarlo?',
          a: [
            'Algunas funciones requieren iniciar sesión.',
            'Iniciar sesión te permite usar funciones por usuario, como guardar selecciones favoritas y votar en los pronósticos de campeón.',
          ],
        },
        {
          q: '¿Se guardan las contraseñas?',
          a: ['Usamos un servicio de autenticación externo, por lo que MatchFav nunca almacena tu contraseña.'],
        },
      ],
    },
    {
      heading: 'Favoritos',
      items: [
        {
          q: '¿Qué son las selecciones favoritas?',
          a: ['Guardar como favoritas las selecciones que te interesan facilita encontrar los partidos en los que participan.'],
        },
        {
          q: '¿Qué hace «Mostrar solo favoritos»?',
          a: [
            'Filtra la vista para mostrar solo la información relacionada con las selecciones que has guardado como favoritas.',
            'Resulta útil cuando quieres consultar rápidamente solo los partidos que te interesan.',
          ],
        },
      ],
    },
    {
      heading: 'Pronósticos de campeón',
      items: [
        {
          q: '¿Qué son los pronósticos de campeón?',
          a: ['Una función que muestra la probabilidad de título según factores como los resultados en torneos anteriores, el ranking FIFA, los resultados en el torneo actual y los pronósticos de todos.'],
        },
        {
          q: '¿Yo también puedo votar en los pronósticos?',
          a: ['Sí. Tras iniciar sesión, puedes elegir la selección que crees que ganará y emitir tu voto.'],
        },
        {
          q: '¿Cuántas veces puedo votar?',
          a: [
            'Puedes votar una vez por cada fase del torneo.',
            'Dentro de la misma fase, no puedes cambiar tu voto después de enviarlo.',
          ],
        },
        {
          q: '¿La probabilidad de título es un pronóstico oficial?',
          a: [
            'No. Es información de referencia para aficionados, basada en el cálculo propio de MatchFav.',
            'Disfrútala como contenido de entretenimiento.',
          ],
        },
      ],
    },
    {
      heading: 'Datos y visualización',
      items: [
        {
          q: '¿El calendario y los resultados son exactos?',
          a: [
            'Nos esforzamos por publicar información exacta en la medida de lo posible, pero como usamos fuentes de datos públicas externas, la información puede faltar, llegar con retraso o ser incorrecta.',
            'Para información importante, consulta también los comunicados oficiales.',
          ],
        },
        {
          q: '¿Cómo se ordena la clasificación?',
          a: ['Cuando los puntos son iguales, se ordena por diferencia de goles, luego goles a favor y, después, el resultado del enfrentamiento directo entre los equipos empatados.'],
        },
        {
          q: '¿La información del tiempo es exacta?',
          a: [
            'La información del tiempo es un pronóstico y puede diferir de las condiciones reales.',
            'Para decidir sobre asistir o desplazarte, consulta también los pronósticos meteorológicos y la información de transporte oficiales.',
          ],
        },
        {
          q: '¿Puedo ver el ranking de goleadores y la información de tarjetas?',
          a: [
            'Sí. A partir de los partidos con registros, puedes consultar el ranking de goleadores y la información de tarjetas (amonestaciones y sanciones).',
            'Las tarjetas amarillas acumuladas se reinician dos veces: tras la fase de grupos y tras los cuartos de final.',
          ],
        },
      ],
    },
    {
      heading: 'Periodo del servicio',
      items: [
        {
          q: '¿Hasta cuándo puedo usarlo?',
          a: [
            'MatchFav es un servicio de duración limitada vinculado al torneo.',
            'El servicio está previsto que funcione hasta el 30 de septiembre de 2026.',
          ],
        },
        {
          q: '¿Podré usarlo después del torneo?',
          a: [
            'Tras el final del torneo, está previsto el cierre del servicio.',
            'Si la fecha de cierre cambia, lo anunciaremos en el sitio con antelación.',
          ],
        },
      ],
    },
    {
      heading: 'Contacto',
      items: [
        {
          q: '¿Cómo puedo contactaros?',
          a: ['Para consultas, contáctanos en la siguiente dirección de correo electrónico:', 'info@matchfav.com'],
        },
      ],
    },
  ],
};

const pt: FaqContent = {
  title: 'Perguntas frequentes',
  categories: [
    {
      heading: 'Sobre o MatchFav',
      items: [
        {
          q: 'O que é o MatchFav?',
          a: [
            'O MatchFav é um serviço para torcedores sobre o torneio internacional de futebol de 2026, realizado em três países da América do Norte (Estados Unidos, Canadá e México). Ele reúne em um só lugar os jogos, resultados, classificações, seleções participantes, informações das sedes e palpites de campeão.',
            'Você pode salvar suas seleções favoritas para focar nos jogos que te interessam e acompanhar o torneio da fase de grupos até as eliminatórias.',
          ],
        },
        {
          q: 'É um serviço oficial?',
          a: [
            'Não. O MatchFav é um site de fãs não oficial e não tem vínculo com a FIFA, os organizadores do torneio ou qualquer federação nacional de futebol.',
            'Para tudo o que exigir uma fonte oficial, confira também os sites e comunicados oficiais.',
          ],
        },
        {
          q: 'Quais informações posso ver?',
          a: [
            'Você pode consultar principalmente o seguinte:',
            'Jogos e resultados da fase de grupos / classificação de cada grupo / chave das eliminatórias / lista de seleções participantes / informações de sedes, cidades e estádios / ranking de artilheiros / informações de cartões (advertências e suspensões) / probabilidade de título e palpites de campeão de todos.',
          ],
        },
        {
          q: 'Funciona no celular?',
          a: [
            'Sim. O MatchFav funciona em smartphones.',
            'Visualizações largas, como a chave das eliminatórias, podem ser vistas rolando horizontalmente no celular.',
          ],
        },
      ],
    },
    {
      heading: 'Uso gratuito e preços',
      items: [
        {
          q: 'Posso usar de graça?',
          a: [
            'O período da fase de grupos é de uso gratuito.',
            'Se você se registrar após o fim da fase de grupos (o início do período das eliminatórias), também tem 72 horas gratuitas a partir do momento do registro.',
            'Depois disso, é necessária uma compra única para usar alguns recursos.',
          ],
        },
        {
          q: 'Quanto custa?',
          a: [
            'Durante o período de desconto antecipado, é uma compra única de US$ 5.',
            'Após o período de desconto antecipado, passa a ser uma compra única de US$ 7.',
          ],
        },
        {
          q: 'É uma assinatura?',
          a: [
            'Não. Não é uma assinatura mensal nem anual.',
            'Um único pagamento permite usar o serviço até o encerramento (previsto para 30 de setembro de 2026).',
          ],
        },
        {
          q: 'Serei cobrado automaticamente?',
          a: ['Não. Se você não pagar durante o período gratuito, nunca será cobrado automaticamente.'],
        },
        {
          q: 'Quais formas de pagamento são aceitas?',
          a: ['Aceitamos pagamento com cartão de crédito.'],
        },
        {
          q: 'Posso pedir reembolso após a compra?',
          a: [
            'Por se tratar de conteúdo digital, em geral não podemos oferecer reembolso ou cancelamento por motivos do cliente após a conclusão do pagamento.',
            'No entanto, em casos como cobrança em dobro, ou se o serviço ficou indisponível por um período considerável por culpa nossa, entre em contato e trataremos individualmente.',
          ],
        },
      ],
    },
    {
      heading: 'Login e contas',
      items: [
        {
          q: 'Preciso fazer login para usar?',
          a: [
            'Alguns recursos exigem login.',
            'Fazer login permite usar recursos por usuário, como salvar seleções favoritas e votar nos palpites de campeão.',
          ],
        },
        {
          q: 'As senhas são armazenadas?',
          a: ['Usamos um serviço de autenticação externo, portanto o MatchFav nunca armazena sua senha.'],
        },
      ],
    },
    {
      heading: 'Favoritos',
      items: [
        {
          q: 'O que são seleções favoritas?',
          a: ['Salvar como favoritas as seleções que te interessam facilita encontrar os jogos em que elas participam.'],
        },
        {
          q: 'O que faz «Mostrar apenas favoritos»?',
          a: [
            'Filtra a exibição para mostrar apenas as informações relacionadas às seleções que você salvou como favoritas.',
            'É útil quando você quer conferir rapidamente apenas os jogos que te interessam.',
          ],
        },
      ],
    },
    {
      heading: 'Palpites de campeão',
      items: [
        {
          q: 'O que são os palpites de campeão?',
          a: ['Um recurso que mostra a probabilidade de título com base em fatores como resultados em torneios anteriores, ranking da FIFA, resultados no torneio atual e os palpites de todos.'],
        },
        {
          q: 'Eu também posso votar nos palpites?',
          a: ['Sim. Após fazer login, você pode escolher a seleção que acha que vai vencer e registrar seu voto.'],
        },
        {
          q: 'Quantas vezes posso votar?',
          a: [
            'Você pode votar uma vez por fase do torneio.',
            'Dentro da mesma fase, não é possível alterar o voto após enviá-lo.',
          ],
        },
        {
          q: 'A probabilidade de título é um palpite oficial?',
          a: [
            'Não. É uma informação de referência para fãs, com base no cálculo próprio do MatchFav.',
            'Aproveite como conteúdo de entretenimento.',
          ],
        },
      ],
    },
    {
      heading: 'Dados e exibição',
      items: [
        {
          q: 'Os jogos e resultados são precisos?',
          a: [
            'Nos esforçamos para publicar informações precisas na medida do possível, mas como usamos fontes de dados públicas externas, as informações podem faltar, atrasar ou conter erros.',
            'Para informações importantes, confira também os comunicados oficiais.',
          ],
        },
        {
          q: 'Como a classificação é ordenada?',
          a: ['Quando os pontos são iguais, a ordem é por saldo de gols, depois gols marcados e, em seguida, o confronto direto entre as seleções empatadas.'],
        },
        {
          q: 'A informação do tempo é precisa?',
          a: [
            'A informação do tempo é uma previsão e pode diferir das condições reais.',
            'Para decidir sobre ir ao estádio ou se deslocar, confira também as previsões do tempo e as informações de transporte oficiais.',
          ],
        },
        {
          q: 'Posso ver o ranking de artilheiros e as informações de cartões?',
          a: [
            'Sim. A partir dos jogos com registros, você pode conferir o ranking de artilheiros e as informações de cartões (advertências e suspensões).',
            'Os cartões amarelos acumulados são zerados duas vezes: após a fase de grupos e após as quartas de final.',
          ],
        },
      ],
    },
    {
      heading: 'Período do serviço',
      items: [
        {
          q: 'Até quando posso usar?',
          a: [
            'O MatchFav é um serviço por tempo limitado, ligado ao torneio.',
            'O serviço está previsto para funcionar até 30 de setembro de 2026.',
          ],
        },
        {
          q: 'Poderei usar após o torneio?',
          a: [
            'Após o fim do torneio, está previsto o encerramento do serviço.',
            'Se a data de encerramento mudar, avisaremos no site com antecedência.',
          ],
        },
      ],
    },
    {
      heading: 'Contato',
      items: [
        {
          q: 'Qual é o contato?',
          a: ['Para dúvidas, entre em contato pelo seguinte endereço de e-mail:', 'info@matchfav.com'],
        },
      ],
    },
  ],
};

const zh: FaqContent = {
  title: '常见问题',
  categories: [
    {
      heading: '关于 MatchFav',
      items: [
        {
          q: 'MatchFav 是什么？',
          a: [
            'MatchFav 是一个面向球迷的服务，围绕 2026 年在北美三国（美国、加拿大、墨西哥）举办的国际足球大赛，把赛程、比分、积分榜、参赛球队、球场信息以及夺冠预测等汇总在一处。',
            '你可以收藏喜欢的球队，只关注想看的比赛，并从小组赛一路追到淘汰赛。',
          ],
        },
        {
          q: '这是官方服务吗？',
          a: [
            '不是。MatchFav 是非官方球迷网站，与 FIFA、赛事主办方及各国足球协会均无关联。',
            '凡是需要官方来源的信息，请同时查阅官方网站和官方公告。',
          ],
        },
        {
          q: '可以看到哪些信息？',
          a: [
            '主要可以查看以下内容：',
            '小组赛赛程与比分／各小组积分榜／淘汰赛对阵图／参赛球队一览／球场、城市与体育场信息／射手榜／纸牌（警告与停赛）信息／夺冠概率与大家的夺冠预测。',
          ],
        },
        {
          q: '手机上能用吗？',
          a: [
            '可以。MatchFav 支持在智能手机上使用。',
            '像淘汰赛对阵图这类较宽的内容，在手机上可以左右滑动查看。',
          ],
        },
      ],
    },
    {
      heading: '免费与收费',
      items: [
        {
          q: '可以免费使用吗？',
          a: [
            '小组赛期间可免费使用。',
            '如果在小组赛结束（淘汰赛期间开始）之后才注册，自注册起也有 72 小时免费使用。',
            '在那之后，使用部分功能需要一次性购买。',
          ],
        },
        {
          q: '价格是多少？',
          a: [
            '早鸟期间为一次性购买 5 美元。',
            '早鸟结束后为一次性购买 7 美元。',
          ],
        },
        {
          q: '是按月订阅吗？',
          a: [
            '不是。这不是按月或按年的订阅。',
            '一次付款即可使用至服务结束（预计 2026 年 9 月 30 日）。',
          ],
        },
        {
          q: '会自动扣费吗？',
          a: ['不会。即使在免费期间不付款，也不会自动扣费。'],
        },
        {
          q: '支持哪些支付方式？',
          a: ['支持信用卡支付。'],
        },
        {
          q: '购买后可以退款吗？',
          a: [
            '由于是数字内容，付款完成后原则上无法因用户自身原因办理退款或取消。',
            '但如出现重复扣费，或因我方原因导致服务在较长时间内无法使用等情况，请联系我们，我们将逐一处理。',
          ],
        },
      ],
    },
    {
      heading: '登录与账户',
      items: [
        {
          q: '使用需要登录吗？',
          a: [
            '部分功能需要登录。',
            '登录后即可使用按用户区分的功能，例如收藏球队和参与夺冠预测投票。',
          ],
        },
        {
          q: '会保存密码吗？',
          a: ['我们使用外部认证服务，因此 MatchFav 不会保存你的密码。'],
        },
      ],
    },
    {
      heading: '收藏功能',
      items: [
        {
          q: '收藏球队是什么？',
          a: ['把感兴趣的球队加入收藏后，可以更方便地找到与这些球队相关的比赛。'],
        },
        {
          q: '“仅显示收藏”是什么？',
          a: [
            '将显示内容筛选为仅与你收藏的球队相关的信息。',
            '当你只想快速查看自己关注的比赛时很方便。',
          ],
        },
      ],
    },
    {
      heading: '夺冠预测',
      items: [
        {
          q: '夺冠预测是什么？',
          a: ['一项根据往届大赛成绩、FIFA 排名、本届成绩以及大家的预测等因素，显示夺冠概率的功能。'],
        },
        {
          q: '我也能参与夺冠预测投票吗？',
          a: ['可以。登录后，你可以选择你认为会夺冠的球队进行投票。'],
        },
        {
          q: '可以投票几次？',
          a: [
            '每个赛事阶段可投票一次。',
            '在同一阶段内，提交后无法更改投票。',
          ],
        },
        {
          q: '夺冠概率是官方预测吗？',
          a: [
            '不是。这是基于 MatchFav 自有计算、供球迷参考的信息。',
            '请作为娱乐内容来享受。',
          ],
        },
      ],
    },
    {
      heading: '数据与显示',
      items: [
        {
          q: '赛程和比分准确吗？',
          a: [
            '我们会尽可能发布准确的信息，但由于使用外部公开数据源，信息可能出现缺失、延迟或错误。',
            '重要信息请同时查阅官方公告。',
          ],
        },
        {
          q: '积分榜如何排序？',
          a: ['积分相同时，依次按净胜球、进球数，以及并列球队之间的相互对战成绩排序。'],
        },
        {
          q: '天气信息准确吗？',
          a: [
            '天气信息为预报，可能与实际天气不同。',
            '在决定观赛或出行时，请同时查阅官方天气预报和交通信息。',
          ],
        },
        {
          q: '也能查看射手榜和纸牌信息吗？',
          a: [
            '可以。从有记录的比赛中，你可以查看射手榜和纸牌（警告与停赛）信息。',
            '累计黄牌会清零两次：小组赛结束后与四分之一决赛结束后。',
          ],
        },
      ],
    },
    {
      heading: '服务期间',
      items: [
        {
          q: '可以使用到什么时候？',
          a: [
            'MatchFav 是与本届大赛相关的限期服务。',
            '服务预计运营至 2026 年 9 月 30 日。',
          ],
        },
        {
          q: '大赛结束后还能用吗？',
          a: [
            '大赛结束后，服务预计终止。',
            '如果终止日期有变更，我们会提前在网站上通知。',
          ],
        },
      ],
    },
    {
      heading: '联系我们',
      items: [
        {
          q: '联系方式是什么？',
          a: ['如有咨询，请通过以下电子邮箱与我们联系：', 'info@matchfav.com'],
        },
      ],
    },
  ],
};

/** ロケール別 FAQ コンテンツ（全ロケール提供を tsc が型強制する）。 */
export const FAQ_CONTENT: Record<Locale, FaqContent> = { ja, en, es, pt, zh };

/** メールアドレス単体の段落判定（FaqSection で mailto リンク化する）。 */
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * FAQ を schema.org FAQPage 構造化データ（JSON-LD）へ変換する。
 * 回答は段落を1つの文字列に連結する（検索エンジン向けの平文）。
 */
export function faqJsonLd(content: FaqContent): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: content.categories.flatMap((category) =>
      category.items.map((item) => ({
        '@type': 'Question',
        name: item.q,
        acceptedAnswer: { '@type': 'Answer', text: item.a.join(' ') },
      })),
    ),
  };
}
