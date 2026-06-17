import { REFERENCE_NOTE, type LegalSectionsDoc, type TranslatedLang } from '../legalShared';

/**
 * 利用規約の翻訳版（en/es/pt/zh）。T-114。
 * 正本は日本語版（page.tsx の既存JSX）。本データは参考訳で、日本語版が優先。
 * 第6条の CC BY-SA 帰属（Wikipedia / ライセンスへの外部リンク）はライセンス義務のため必ず保持する。
 */

const EMAIL = 'info@matchfav.com';
const WIKIPEDIA = 'https://www.wikipedia.org/';
const CC_BY_SA = 'https://creativecommons.org/licenses/by-sa/4.0/';

export const TERMS_CONTENT: Record<TranslatedLang, LegalSectionsDoc> = {
  en: {
    title: 'Terms of Service',
    updatedLabel: 'Last updated',
    updated: 'June 11, 2026',
    referenceNote: REFERENCE_NOTE.en,
    relatedLabel: 'Related:',
    related: [
      { href: '/privacy', text: 'Privacy Policy' },
      { href: '/tokushoho', text: 'Act on Specified Commercial Transactions' },
    ],
    backLabel: 'Back to top',
    sections: [
      {
        heading: 'Article 1 (Application)',
        blocks: [
          {
            p: [
              'These Terms of Service (the “Terms”) set out the conditions for providing the web service “MatchFav” (domain: ',
              { b: 'matchfav.com' },
              '; the “Service”), provided by the operator (disclosed by the method set out in Article 14; “we”), and the rights and obligations between us and users regarding use of the Service. By registering an account for, or using, the Service, the user is deemed to have agreed to these Terms.',
            ],
          },
        ],
      },
      {
        heading: 'Article 2 (Content of the Service; not endorsed by FIFA)',
        blocks: [
          {
            ul: [
              [
                'The Service is an ',
                { b: 'unofficial information service' },
                ' that presents information such as the schedule, results, participating nations, venues, and weather of an international football tournament held in 2026 (the “Tournament”) in a fan-friendly, easy-to-read format.',
              ],
              [
                {
                  b: 'The Service has no affiliation whatsoever with FIFA, the organizers or operating bodies of the Tournament, official sponsors, or any national football association, and is not endorsed, sponsored, recommended, or licensed by any of them.',
                },
                ' The Service does not use official logos, official emblems, or official-name trademarks.',
              ],
              [
                'The Service is a ',
                { b: 'time-limited service' },
                ' tied to the Tournament and is ',
                { b: 'scheduled to end on September 30, 2026 (Japan time)' },
                ' (if the end date changes, we will announce it in advance on the Service). After the service ends, user data such as votes and favorites will be deleted within a reasonable period. Users purchase with prior understanding of this service period.',
              ],
            ],
          },
        ],
      },
      {
        heading: 'Article 3 (Account registration)',
        blocks: [
          {
            ul: [
              ['Using the Service requires login registration by the method we prescribe (external authentication via a Google account or similar).'],
              ['Users must manage their accounts at their own responsibility and must not let third parties use them, or lend or transfer them.'],
              ['If a user violates these Terms, or if we determine there is a risk of misuse, we may suspend or delete the account without prior notice.'],
            ],
          },
        ],
      },
      {
        heading: 'Article 4 (Paid service; free period)',
        blocks: [
          {
            ul: [
              [
                'The Service is a ',
                { b: 'one-time-purchase' },
                ' paid service. By paying the prescribed fee (shown on the purchase screen of each plan) once, the user may use the Service until provision ends with the conclusion of the Tournament. It is not a monthly, annual, or other recurring subscription.',
              ],
              [
                'During the group-stage period of the Tournament, all registered users may use the Service free of charge. The free period ends at ',
                { b: '0:00 on June 29, 2026 (Japan time) = 15:00 on June 28, 2026 (UTC)' },
                ', and use from that time onward (the knockout-stage period) requires payment of the fee in the preceding item (collectively, the “free period”).',
              ],
              [
                'Notwithstanding the preceding item, a user who completes new account registration after the end of the free period in the preceding item (0:00 on June 29, 2026, Japan time) may use the Service free of charge for ',
                { b: '72 hours' },
                ' from completion of registration.',
              ],
              ['Even if no payment is made during the free period, you will not be charged automatically.'],
              ['Payment is processed through a system provided by an external payment provider.'],
              ['Fees are shown as the total amount including consumption tax at the time of display.'],
            ],
          },
        ],
      },
      {
        heading: 'Article 5 (Refunds and cancellations)',
        blocks: [
          {
            ul: [
              [
                'Because the Service is digital content for which all features are provided immediately after payment is completed, refunds or cancellations requested for the user’s own convenience after payment are, ',
                { b: 'in principle, not accepted' },
                ' due to its nature. Please use the free period to check the content thoroughly before purchasing.',
              ],
              [
                'Notwithstanding the preceding item, if the Service was unavailable for a substantial period due to reasons attributable to us, if a double charge occurs, or in other cases we deem necessary, we may provide refunds or other remedies on a case-by-case basis. For refund inquiries, please contact ',
                { b: EMAIL },
                '.',
              ],
              [
                'The details of refunds and cancellations are as set out in the ',
                { link: { href: '/tokushoho', text: 'Act on Specified Commercial Transactions notice' } },
                '.',
              ],
            ],
          },
        ],
      },
      {
        heading: 'Article 6 (Accuracy of information; disclaimer)',
        blocks: [
          {
            ul: [
              [
                'The match schedules, results, standings, player information, weather forecasts, and other information provided by the Service are based on external public data sources. We strive for accuracy to the extent possible, but because these are free, public data sources, ',
                { b: 'omissions, delays, or errors may occur' },
                ', and we do not guarantee their completeness, accuracy, timeliness, or usefulness.',
              ],
              [
                'The main data sources are TheSportsDB for match schedules and results, and WeatherAPI.com for weather forecasts. In addition, some match events (scorers, cards, etc.) are based on descriptions from ',
                { ext: { href: WIKIPEDIA, text: 'Wikipedia' } },
                ', used under the ',
                { ext: { href: CC_BY_SA, text: 'Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)' } },
                ' license (we may modify them as necessary to extract and summarize facts).',
              ],
              ['Weather information is a forecast and may differ from actual weather conditions. Always check official announcements and forecasts before making decisions about attending matches, travel, or otherwise.'],
              ['“Title predictions,” “everyone’s predictions (voting),” and the like are reference information for entertainment purposes and are not intended to be used as a basis for gambling, investment, or other decisions.'],
              ['We are not liable for any acts or results arising from a user’s use of the information on the Service.'],
              ['Even where we are liable to a user for damages, unless we acted with intent or gross negligence, the amount of compensation is limited to the amount of fees the user paid for the Service.'],
            ],
          },
        ],
      },
      {
        heading: 'Article 7 (Data storage and cookies)',
        blocks: [
          {
            p: [
              'The Service stores cookies and similar information on the user’s device, and stores information in our database, for features such as registering favorite teams, prediction voting, and language and display settings. The information we obtain and the details of its handling are as set out in the ',
              { link: { href: '/privacy', text: 'Privacy Policy' } },
              '.',
            ],
          },
        ],
      },
      {
        heading: 'Article 8 (Intellectual property rights)',
        blocks: [
          {
            p: [
              'Copyrights and other intellectual property rights in the text, design, programs, and the like published on the Service belong to us or to the rightful owners. The names, emblems, logos, and the like of each country, club, tournament, sponsor, and so on are the trademarks and other rights of their respective owners; the Service respects these as the intellectual property of their owners and does not use official logos or official emblems.',
            ],
          },
        ],
      },
      {
        heading: 'Article 9 (Prohibited acts)',
        blocks: [
          {
            ul: [
              ['Acts that violate laws or public order and morals.'],
              ['Acts that interfere with the operation of the Service, or unauthorized access to servers and the like.'],
              ['Excessive access or mass acquisition of information by automated means (bots, scraping, etc.).'],
              ['Reproducing, redistributing, or reselling all or part of the Service, or sharing or transferring accounts.'],
              ['Using the voting or prediction features by duplicate voting or other improper methods.'],
              ['Using the Service for gambling or other illegal activities.'],
              ['Any other acts we deem inappropriate.'],
            ],
          },
        ],
      },
      {
        heading: 'Article 10 (Change, suspension, and termination of the Service)',
        blocks: [
          {
            p: [
              'We may change the content of the Service or temporarily suspend its provision without prior notice to users in cases of system maintenance, failures of external data sources, or other unavoidable reasons. Furthermore, the Service is a time-limited offering tied to the Tournament and may be terminated after the Tournament ends. We are not liable for damages incurred by users or third parties as a result of these matters beyond the scope of Article 6, item 6.',
            ],
          },
        ],
      },
      {
        heading: 'Article 11 (Withdrawal and data deletion)',
        blocks: [
          {
            p: [
              'Users may withdraw at any time by the method we prescribe. If a user withdraws, refunds of the one-time fee are governed by Article 5. The handling of user data upon withdrawal is as set out in the ',
              { link: { href: '/privacy', text: 'Privacy Policy' } },
              '.',
            ],
          },
        ],
      },
      {
        heading: 'Article 12 (Changes to these Terms)',
        blocks: [
          {
            p: [
              'We may change these Terms where the change conforms to the general interests of users, or where the change does not conflict with the purpose of the contract and is reasonable, in accordance with the provisions on changes to standard-form contracts under Article 548-4 of the Civil Code. When making a change, we will set an effective date and give prior notice by display on the Service or other appropriate means.',
            ],
          },
        ],
      },
      {
        heading: 'Article 13 (Governing law and jurisdiction)',
        blocks: [
          {
            p: [
              'These Terms are governed by the laws of Japan. In the event of a dispute between us and a user regarding the Service, the district court or summary court having jurisdiction over the location of the operator shall be the exclusive agreed jurisdictional court of first instance.',
            ],
          },
        ],
      },
      {
        heading: 'Article 14 (Operator information and contact)',
        blocks: [
          {
            p: [
              'The operator is a sole proprietor. The operator’s name, address, and similar details are disclosed without delay upon request, by the method set out in the ',
              { link: { href: '/tokushoho', text: 'Act on Specified Commercial Transactions notice' } },
              '. For inquiries about these Terms, please contact ',
              { b: EMAIL },
              '.',
            ],
          },
        ],
      },
    ],
  },
  es: {
    title: 'Términos de servicio',
    updatedLabel: 'Última actualización',
    updated: '11 de junio de 2026',
    referenceNote: REFERENCE_NOTE.es,
    relatedLabel: 'Relacionado:',
    related: [
      { href: '/privacy', text: 'Política de privacidad' },
      { href: '/tokushoho', text: 'Ley de Transacciones Comerciales Especificadas' },
    ],
    backLabel: 'Volver al inicio',
    sections: [
      {
        heading: 'Artículo 1 (Aplicación)',
        blocks: [
          {
            p: [
              'Estos Términos de servicio (los «Términos») establecen las condiciones de prestación del servicio web «MatchFav» (dominio: ',
              { b: 'matchfav.com' },
              '; el «Servicio»), prestado por el operador (que se divulga por el método del Artículo 14; «nosotros»), así como los derechos y obligaciones entre nosotros y los usuarios respecto al uso del Servicio. Al registrar una cuenta o usar el Servicio, se considera que el usuario ha aceptado estos Términos.',
            ],
          },
        ],
      },
      {
        heading: 'Artículo 2 (Contenido del Servicio; sin respaldo de la FIFA)',
        blocks: [
          {
            ul: [
              [
                'El Servicio es un ',
                { b: 'servicio de información no oficial' },
                ' que presenta información como el calendario, los resultados, las selecciones participantes, las sedes y el clima de un torneo internacional de fútbol celebrado en 2026 (el «Torneo») en un formato claro y pensado para los aficionados.',
              ],
              [
                {
                  b: 'El Servicio no tiene relación alguna con la FIFA, los organizadores u órganos operativos del Torneo, los patrocinadores oficiales ni ninguna federación nacional de fútbol, y no cuenta con su reconocimiento, patrocinio, recomendación ni autorización.',
                },
                ' El Servicio no utiliza logotipos oficiales, emblemas oficiales ni marcas de denominaciones oficiales.',
              ],
              [
                'El Servicio es un ',
                { b: 'servicio por tiempo limitado' },
                ' vinculado al Torneo y ',
                { b: 'está previsto que finalice el 30 de septiembre de 2026 (hora de Japón)' },
                ' (si la fecha de finalización cambia, lo anunciaremos con antelación en el Servicio). Tras la finalización, los datos del usuario, como votos y favoritos, se eliminarán en un plazo razonable. El usuario compra con conocimiento previo de este periodo de prestación.',
              ],
            ],
          },
        ],
      },
      {
        heading: 'Artículo 3 (Registro de cuenta)',
        blocks: [
          {
            ul: [
              ['El uso del Servicio requiere el registro mediante el método que establecemos (autenticación externa con una cuenta de Google u otra).'],
              ['El usuario debe gestionar su cuenta bajo su propia responsabilidad y no debe permitir que terceros la usen, ni prestarla o cederla.'],
              ['Si el usuario incumple estos Términos, o si determinamos que existe riesgo de uso indebido, podemos suspender o eliminar la cuenta sin previo aviso.'],
            ],
          },
        ],
      },
      {
        heading: 'Artículo 4 (Servicio de pago; periodo gratuito)',
        blocks: [
          {
            ul: [
              [
                'El Servicio es un servicio de pago de tipo ',
                { b: 'pago único' },
                '. Al pagar una vez la tarifa establecida (que se muestra en la pantalla de compra de cada plan), el usuario puede usar el Servicio hasta que su prestación finalice con la conclusión del Torneo. No es una suscripción mensual, anual ni recurrente.',
              ],
              [
                'Durante el periodo de la fase de grupos del Torneo, todos los usuarios registrados pueden usar el Servicio de forma gratuita. El periodo gratuito finaliza a las ',
                { b: '0:00 del 29 de junio de 2026 (hora de Japón) = 15:00 del 28 de junio de 2026 (UTC)' },
                ', y el uso a partir de ese momento (la fase eliminatoria) requiere el pago de la tarifa del punto anterior (en conjunto, el «periodo gratuito»).',
              ],
              [
                'No obstante lo anterior, el usuario que complete un nuevo registro de cuenta después del fin del periodo gratuito del punto anterior (0:00 del 29 de junio de 2026, hora de Japón) puede usar el Servicio de forma gratuita durante ',
                { b: '72 horas' },
                ' desde la finalización del registro.',
              ],
              ['Aunque no se realice ningún pago durante el periodo gratuito, no se le cobrará automáticamente.'],
              ['El pago se procesa a través de un sistema proporcionado por un proveedor de pagos externo.'],
              ['Las tarifas se muestran como el importe total, incluido el impuesto al consumo vigente en el momento de la visualización.'],
            ],
          },
        ],
      },
      {
        heading: 'Artículo 5 (Reembolsos y cancelaciones)',
        blocks: [
          {
            ul: [
              [
                'Dado que el Servicio es contenido digital cuyas funciones se prestan en su totalidad inmediatamente después de completarse el pago, los reembolsos o cancelaciones solicitados por conveniencia del usuario tras el pago ',
                { b: 'no se aceptan, en principio' },
                ', por su naturaleza. Utilice el periodo gratuito para comprobar el contenido a fondo antes de comprar.',
              ],
              [
                'No obstante lo anterior, si el Servicio no estuvo disponible durante un periodo considerable por causas atribuibles a nosotros, si se produce un cobro duplicado o en otros casos que consideremos necesarios, podemos ofrecer reembolsos u otras soluciones caso por caso. Para consultas sobre reembolsos, contacte con ',
                { b: EMAIL },
                '.',
              ],
              [
                'Los detalles de los reembolsos y cancelaciones se rigen por lo dispuesto en el ',
                { link: { href: '/tokushoho', text: 'Aviso conforme a la Ley de Transacciones Comerciales Especificadas' } },
                '.',
              ],
            ],
          },
        ],
      },
      {
        heading: 'Artículo 6 (Exactitud de la información; exención de responsabilidad)',
        blocks: [
          {
            ul: [
              [
                'El calendario de partidos, los resultados, las clasificaciones, la información de jugadores, las previsiones meteorológicas y demás información que ofrece el Servicio se basan en fuentes de datos públicas externas. Procuramos la exactitud en la medida de lo posible, pero, por tratarse de fuentes de datos gratuitas y públicas, ',
                { b: 'pueden producirse omisiones, retrasos o errores' },
                ', y no garantizamos su integridad, exactitud, actualidad ni utilidad.',
              ],
              [
                'Las principales fuentes de datos son TheSportsDB para el calendario y los resultados de los partidos, y WeatherAPI.com para las previsiones meteorológicas. Además, parte de los eventos de los partidos (goleadores, tarjetas, etc.) se basa en lo descrito en ',
                { ext: { href: WIKIPEDIA, text: 'Wikipedia' } },
                ', utilizado bajo la licencia ',
                { ext: { href: CC_BY_SA, text: 'Creative Commons Atribución-CompartirIgual 4.0 Internacional (CC BY-SA 4.0)' } },
                ' (podemos modificarlo según sea necesario para extraer y resumir hechos).',
              ],
              ['La información meteorológica es una previsión y puede diferir de las condiciones reales. Verifique siempre los anuncios y previsiones oficiales antes de tomar decisiones sobre asistir a partidos, desplazarse u otras.'],
              ['Las «predicciones del campeón», las «predicciones de todos (votación)» y similares son información de referencia con fines de entretenimiento y no están destinadas a usarse como base para apuestas, inversiones u otras decisiones.'],
              ['No nos hacemos responsables de ningún acto ni resultado derivado del uso por parte del usuario de la información del Servicio.'],
              ['Aun cuando seamos responsables de daños frente a un usuario, salvo que hayamos actuado con dolo o culpa grave, el importe de la indemnización se limita al importe de las tarifas que el usuario pagó por el Servicio.'],
            ],
          },
        ],
      },
      {
        heading: 'Artículo 7 (Almacenamiento de datos y cookies)',
        blocks: [
          {
            p: [
              'El Servicio almacena cookies y similares en el dispositivo del usuario, y almacena información en nuestra base de datos, para funciones como registrar equipos favoritos, los pronósticos y los ajustes de idioma y visualización. La información que obtenemos y los detalles de su tratamiento son los establecidos en la ',
              { link: { href: '/privacy', text: 'Política de privacidad' } },
              '.',
            ],
          },
        ],
      },
      {
        heading: 'Artículo 8 (Derechos de propiedad intelectual)',
        blocks: [
          {
            p: [
              'Los derechos de autor y demás derechos de propiedad intelectual sobre los textos, el diseño, los programas y similares publicados en el Servicio pertenecen a nosotros o a sus legítimos titulares. Los nombres, emblemas, logotipos y similares de cada país, club, torneo, patrocinador, etc., son marcas y otros derechos de sus respectivos titulares; el Servicio los respeta como propiedad intelectual de sus titulares y no utiliza logotipos ni emblemas oficiales.',
            ],
          },
        ],
      },
      {
        heading: 'Artículo 9 (Conductas prohibidas)',
        blocks: [
          {
            ul: [
              ['Actos que infrinjan las leyes o el orden público y las buenas costumbres.'],
              ['Actos que interfieran en el funcionamiento del Servicio, o el acceso no autorizado a servidores y similares.'],
              ['Acceso excesivo o adquisición masiva de información por medios automatizados (bots, scraping, etc.).'],
              ['Reproducir, redistribuir o revender la totalidad o parte del Servicio, o compartir o ceder cuentas.'],
              ['Usar las funciones de votación o pronóstico mediante votos duplicados u otros métodos indebidos.'],
              ['Usar el Servicio para apuestas u otras actividades ilegales.'],
              ['Cualquier otro acto que consideremos inapropiado.'],
            ],
          },
        ],
      },
      {
        heading: 'Artículo 10 (Modificación, suspensión y terminación del Servicio)',
        blocks: [
          {
            p: [
              'Podemos modificar el contenido del Servicio o suspender temporalmente su prestación sin previo aviso a los usuarios en casos de mantenimiento del sistema, fallos de fuentes de datos externas u otros motivos inevitables. Además, el Servicio es una oferta por tiempo limitado vinculada al Torneo y puede terminarse tras la finalización del Torneo. No nos hacemos responsables de los daños sufridos por usuarios o terceros como consecuencia de ello más allá del alcance del Artículo 6, punto 6.',
            ],
          },
        ],
      },
      {
        heading: 'Artículo 11 (Baja y eliminación de datos)',
        blocks: [
          {
            p: [
              'El usuario puede darse de baja en cualquier momento por el método que establecemos. En caso de baja, los reembolsos de la tarifa única se rigen por el Artículo 5. El tratamiento de los datos del usuario tras la baja es el establecido en la ',
              { link: { href: '/privacy', text: 'Política de privacidad' } },
              '.',
            ],
          },
        ],
      },
      {
        heading: 'Artículo 12 (Modificación de los Términos)',
        blocks: [
          {
            p: [
              'Podemos modificar estos Términos cuando la modificación se ajuste a los intereses generales de los usuarios, o cuando la modificación no contravenga el objeto del contrato y sea razonable, conforme a las disposiciones sobre la modificación de cláusulas de adhesión del Artículo 548-4 del Código Civil. Al realizar una modificación, fijaremos una fecha de entrada en vigor y la anunciaremos con antelación mediante su visualización en el Servicio u otros medios adecuados.',
            ],
          },
        ],
      },
      {
        heading: 'Artículo 13 (Ley aplicable y jurisdicción)',
        blocks: [
          {
            p: [
              'Estos Términos se rigen por las leyes de Japón. En caso de controversia entre nosotros y un usuario en relación con el Servicio, el tribunal de distrito o el tribunal sumario con jurisdicción sobre el domicilio del operador será el tribunal de jurisdicción exclusiva acordada de primera instancia.',
            ],
          },
        ],
      },
      {
        heading: 'Artículo 14 (Información del operador y contacto)',
        blocks: [
          {
            p: [
              'El operador es un trabajador autónomo. El nombre, el domicilio y demás datos del operador se divulgan sin demora previa solicitud, por el método establecido en el ',
              { link: { href: '/tokushoho', text: 'Aviso conforme a la Ley de Transacciones Comerciales Especificadas' } },
              '. Para consultas sobre estos Términos, contacte con ',
              { b: EMAIL },
              '.',
            ],
          },
        ],
      },
    ],
  },
  pt: {
    title: 'Termos de Serviço',
    updatedLabel: 'Última atualização',
    updated: '11 de junho de 2026',
    referenceNote: REFERENCE_NOTE.pt,
    relatedLabel: 'Relacionado:',
    related: [
      { href: '/privacy', text: 'Política de Privacidade' },
      { href: '/tokushoho', text: 'Lei de Transações Comerciais Específicas' },
    ],
    backLabel: 'Voltar ao início',
    sections: [
      {
        heading: 'Artigo 1 (Aplicação)',
        blocks: [
          {
            p: [
              'Estes Termos de Serviço (os “Termos”) estabelecem as condições de prestação do serviço web “MatchFav” (domínio: ',
              { b: 'matchfav.com' },
              '; o “Serviço”), prestado pelo operador (divulgado pelo método do Artigo 14; “nós”), bem como os direitos e obrigações entre nós e os usuários quanto ao uso do Serviço. Ao registrar uma conta ou usar o Serviço, considera-se que o usuário concordou com estes Termos.',
            ],
          },
        ],
      },
      {
        heading: 'Artigo 2 (Conteúdo do Serviço; sem endosso da FIFA)',
        blocks: [
          {
            ul: [
              [
                'O Serviço é um ',
                { b: 'serviço de informação não oficial' },
                ' que apresenta informações como o calendário, os resultados, as seleções participantes, as sedes e o clima de um torneio internacional de futebol realizado em 2026 (o “Torneio”) em um formato claro e voltado aos torcedores.',
              ],
              [
                {
                  b: 'O Serviço não tem qualquer relação com a FIFA, os organizadores ou órgãos operacionais do Torneio, os patrocinadores oficiais ou qualquer federação nacional de futebol, e não possui reconhecimento, patrocínio, recomendação ou autorização de nenhum deles.',
                },
                ' O Serviço não utiliza logotipos oficiais, emblemas oficiais ou marcas de denominações oficiais.',
              ],
              [
                'O Serviço é um ',
                { b: 'serviço por tempo limitado' },
                ' vinculado ao Torneio e ',
                { b: 'está previsto para terminar em 30 de setembro de 2026 (horário do Japão)' },
                ' (se a data de término mudar, anunciaremos com antecedência no Serviço). Após o término, os dados do usuário, como votos e favoritos, serão excluídos em um prazo razoável. O usuário compra com conhecimento prévio deste período de prestação.',
              ],
            ],
          },
        ],
      },
      {
        heading: 'Artigo 3 (Registro de conta)',
        blocks: [
          {
            ul: [
              ['O uso do Serviço exige o registro pelo método que estabelecemos (autenticação externa com uma conta Google ou outra).'],
              ['O usuário deve gerenciar sua conta sob sua própria responsabilidade e não deve permitir que terceiros a usem, nem emprestá-la ou cedê-la.'],
              ['Se o usuário violar estes Termos, ou se determinarmos que há risco de uso indevido, podemos suspender ou excluir a conta sem aviso prévio.'],
            ],
          },
        ],
      },
      {
        heading: 'Artigo 4 (Serviço pago; período gratuito)',
        blocks: [
          {
            ul: [
              [
                'O Serviço é um serviço pago do tipo ',
                { b: 'compra única' },
                '. Ao pagar uma vez a taxa estabelecida (exibida na tela de compra de cada plano), o usuário pode usar o Serviço até que sua prestação termine com a conclusão do Torneio. Não é uma assinatura mensal, anual ou recorrente.',
              ],
              [
                'Durante o período da fase de grupos do Torneio, todos os usuários registrados podem usar o Serviço gratuitamente. O período gratuito termina às ',
                { b: '0:00 de 29 de junho de 2026 (horário do Japão) = 15:00 de 28 de junho de 2026 (UTC)' },
                ', e o uso a partir desse momento (a fase eliminatória) exige o pagamento da taxa do item anterior (em conjunto, o “período gratuito”).',
              ],
              [
                'Não obstante o item anterior, o usuário que concluir um novo registro de conta após o término do período gratuito do item anterior (0:00 de 29 de junho de 2026, horário do Japão) pode usar o Serviço gratuitamente por ',
                { b: '72 horas' },
                ' a partir da conclusão do registro.',
              ],
              ['Mesmo que nenhum pagamento seja feito durante o período gratuito, você não será cobrado automaticamente.'],
              ['O pagamento é processado por meio de um sistema fornecido por um provedor de pagamento externo.'],
              ['As taxas são exibidas como o valor total, incluindo o imposto sobre consumo vigente no momento da exibição.'],
            ],
          },
        ],
      },
      {
        heading: 'Artigo 5 (Reembolsos e cancelamentos)',
        blocks: [
          {
            ul: [
              [
                'Como o Serviço é conteúdo digital cujos recursos são prestados integralmente logo após a conclusão do pagamento, reembolsos ou cancelamentos solicitados por conveniência do usuário após o pagamento ',
                { b: 'não são aceitos, em princípio' },
                ', devido à sua natureza. Use o período gratuito para verificar o conteúdo cuidadosamente antes de comprar.',
              ],
              [
                'Não obstante o item anterior, se o Serviço ficou indisponível por um período considerável por motivos a nós atribuíveis, se ocorrer cobrança em duplicidade ou em outros casos que julgarmos necessários, podemos oferecer reembolsos ou outras soluções caso a caso. Para dúvidas sobre reembolsos, entre em contato pelo ',
                { b: EMAIL },
                '.',
              ],
              [
                'Os detalhes dos reembolsos e cancelamentos regem-se pelo disposto no ',
                { link: { href: '/tokushoho', text: 'Aviso nos termos da Lei de Transações Comerciais Específicas' } },
                '.',
              ],
            ],
          },
        ],
      },
      {
        heading: 'Artigo 6 (Exatidão das informações; isenção de responsabilidade)',
        blocks: [
          {
            ul: [
              [
                'O calendário de partidas, os resultados, as classificações, as informações de jogadores, as previsões do tempo e demais informações oferecidas pelo Serviço baseiam-se em fontes de dados públicas externas. Procuramos a exatidão na medida do possível, mas, por serem fontes de dados gratuitas e públicas, ',
                { b: 'podem ocorrer omissões, atrasos ou erros' },
                ', e não garantimos sua integridade, exatidão, atualidade ou utilidade.',
              ],
              [
                'As principais fontes de dados são o TheSportsDB para o calendário e os resultados das partidas, e o WeatherAPI.com para as previsões do tempo. Além disso, parte dos eventos das partidas (artilheiros, cartões, etc.) baseia-se no que é descrito na ',
                { ext: { href: WIKIPEDIA, text: 'Wikipédia' } },
                ', utilizada sob a licença ',
                { ext: { href: CC_BY_SA, text: 'Creative Commons Atribuição-CompartilhaIgual 4.0 Internacional (CC BY-SA 4.0)' } },
                ' (podemos modificá-la conforme necessário para extrair e resumir fatos).',
              ],
              ['As informações meteorológicas são uma previsão e podem diferir das condições reais. Verifique sempre os anúncios e previsões oficiais antes de tomar decisões sobre assistir a partidas, deslocar-se ou outras.'],
              ['As “previsões de campeão”, as “previsões de todos (votação)” e similares são informações de referência para fins de entretenimento e não se destinam a ser usadas como base para apostas, investimentos ou outras decisões.'],
              ['Não nos responsabilizamos por quaisquer atos ou resultados decorrentes do uso, pelo usuário, das informações do Serviço.'],
              ['Mesmo quando formos responsáveis por danos perante um usuário, salvo se agirmos com dolo ou culpa grave, o valor da indenização limita-se ao valor das taxas que o usuário pagou pelo Serviço.'],
            ],
          },
        ],
      },
      {
        heading: 'Artigo 7 (Armazenamento de dados e cookies)',
        blocks: [
          {
            p: [
              'O Serviço armazena cookies e similares no dispositivo do usuário, e armazena informações em nosso banco de dados, para recursos como registrar times favoritos, os palpites e as configurações de idioma e exibição. As informações que obtemos e os detalhes de seu tratamento são os estabelecidos na ',
              { link: { href: '/privacy', text: 'Política de Privacidade' } },
              '.',
            ],
          },
        ],
      },
      {
        heading: 'Artigo 8 (Direitos de propriedade intelectual)',
        blocks: [
          {
            p: [
              'Os direitos autorais e demais direitos de propriedade intelectual sobre os textos, o design, os programas e similares publicados no Serviço pertencem a nós ou aos legítimos titulares. Os nomes, emblemas, logotipos e similares de cada país, clube, torneio, patrocinador, etc., são marcas e outros direitos de seus respectivos titulares; o Serviço os respeita como propriedade intelectual de seus titulares e não utiliza logotipos nem emblemas oficiais.',
            ],
          },
        ],
      },
      {
        heading: 'Artigo 9 (Condutas proibidas)',
        blocks: [
          {
            ul: [
              ['Atos que violem as leis ou a ordem pública e os bons costumes.'],
              ['Atos que interfiram na operação do Serviço, ou o acesso não autorizado a servidores e similares.'],
              ['Acesso excessivo ou aquisição massiva de informações por meios automatizados (bots, scraping, etc.).'],
              ['Reproduzir, redistribuir ou revender a totalidade ou parte do Serviço, ou compartilhar ou ceder contas.'],
              ['Usar as funções de votação ou palpite por meio de votos duplicados ou outros métodos indevidos.'],
              ['Usar o Serviço para apostas ou outras atividades ilegais.'],
              ['Qualquer outro ato que julguemos inadequado.'],
            ],
          },
        ],
      },
      {
        heading: 'Artigo 10 (Alteração, suspensão e encerramento do Serviço)',
        blocks: [
          {
            p: [
              'Podemos alterar o conteúdo do Serviço ou suspender temporariamente sua prestação sem aviso prévio aos usuários em casos de manutenção do sistema, falhas de fontes de dados externas ou outros motivos inevitáveis. Além disso, o Serviço é uma oferta por tempo limitado vinculada ao Torneio e pode ser encerrado após o término do Torneio. Não nos responsabilizamos pelos danos sofridos por usuários ou terceiros em decorrência disso além do alcance do Artigo 6, item 6.',
            ],
          },
        ],
      },
      {
        heading: 'Artigo 11 (Cancelamento e exclusão de dados)',
        blocks: [
          {
            p: [
              'O usuário pode cancelar a conta a qualquer momento pelo método que estabelecemos. Em caso de cancelamento, os reembolsos da taxa única regem-se pelo Artigo 5. O tratamento dos dados do usuário após o cancelamento é o estabelecido na ',
              { link: { href: '/privacy', text: 'Política de Privacidade' } },
              '.',
            ],
          },
        ],
      },
      {
        heading: 'Artigo 12 (Alteração dos Termos)',
        blocks: [
          {
            p: [
              'Podemos alterar estes Termos quando a alteração estiver em conformidade com os interesses gerais dos usuários, ou quando a alteração não contrariar a finalidade do contrato e for razoável, de acordo com as disposições sobre alteração de contratos de adesão do Artigo 548-4 do Código Civil. Ao fazer uma alteração, definiremos uma data de vigência e a anunciaremos com antecedência por meio de exibição no Serviço ou outros meios adequados.',
            ],
          },
        ],
      },
      {
        heading: 'Artigo 13 (Lei aplicável e foro)',
        blocks: [
          {
            p: [
              'Estes Termos regem-se pelas leis do Japão. Em caso de litígio entre nós e um usuário em relação ao Serviço, o tribunal distrital ou o tribunal sumário com competência sobre o domicílio do operador será o foro exclusivo acordado de primeira instância.',
            ],
          },
        ],
      },
      {
        heading: 'Artigo 14 (Informações do operador e contato)',
        blocks: [
          {
            p: [
              'O operador é um profissional autônomo. O nome, o endereço e demais dados do operador são divulgados sem demora mediante solicitação, pelo método estabelecido no ',
              { link: { href: '/tokushoho', text: 'Aviso nos termos da Lei de Transações Comerciais Específicas' } },
              '. Para dúvidas sobre estes Termos, entre em contato pelo ',
              { b: EMAIL },
              '.',
            ],
          },
        ],
      },
    ],
  },
  zh: {
    title: '使用条款',
    updatedLabel: '最后修订',
    updated: '2026年6月11日',
    referenceNote: REFERENCE_NOTE.zh,
    relatedLabel: '相关页面：',
    related: [
      { href: '/privacy', text: '隐私政策' },
      { href: '/tokushoho', text: '特定商取引法相关表记' },
    ],
    backLabel: '返回首页',
    sections: [
      {
        heading: '第1条（适用）',
        blocks: [
          {
            p: [
              '本使用条款（以下称“本条款”）规定了由经营者（以第14条所定方式公开；以下称“我方”）提供的网络服务“MatchFav”（域名：',
              { b: 'matchfav.com' },
              '；以下称“本服务”）的提供条件，以及我方与用户之间关于本服务使用的权利义务关系。用户通过注册账户或使用本服务，即视为同意本条款。',
            ],
          },
        ],
      },
      {
        heading: '第2条（本服务内容・未获FIFA认可）',
        blocks: [
          {
            ul: [
              [
                '本服务是将2026年举办的国际足球赛事（以下称“本赛事”）的赛程、结果、参赛国、场馆、天气等信息，以便于球迷阅读的方式整理提供的',
                { b: '非官方信息服务' },
                '。',
              ],
              [
                {
                  b: '本服务与FIFA（国际足球联合会）、本赛事的主办方及运营机构、官方赞助商、各国足球协会均无任何关系，亦未获得上述方的认可、赞助、推荐或许可。',
                },
                '本服务不使用官方标志、官方徽章、官方名称商标。',
              ],
              [
                '本服务是与本赛事相关的',
                { b: '限时服务' },
                '，',
                { b: '预定于2026年9月30日（日本时间）结束提供' },
                '（如变更结束日期，将在本服务上提前通知）。提供结束后，投票、收藏等用户数据将在合理期间内删除。用户在购买时即预先了解并接受该提供期间。',
              ],
            ],
          },
        ],
      },
      {
        heading: '第3条（账户注册）',
        blocks: [
          {
            ul: [
              ['使用本服务需以我方指定方式（通过 Google 账户等外部认证）进行登录注册。'],
              ['用户应自行负责管理账户，不得让第三方使用，亦不得出借或转让。'],
              ['用户违反本条款，或我方判断存在滥用之虞时，可不经事先通知暂停或删除账户。'],
            ],
          },
        ],
      },
      {
        heading: '第4条（付费服务・免费期间）',
        blocks: [
          {
            ul: [
              [
                '本服务是',
                { b: '买断制' },
                '的付费服务。用户一次性支付规定费用（在各套餐的购买页面显示）后，即可使用本服务直至随本赛事结束而终止提供之时。并非按月、按年等的持续付费（订阅）。',
              ],
              [
                '在本赛事小组赛阶段，所有注册用户均可免费使用本服务。免费期间的终点为',
                { b: '2026年6月29日0时00分（日本时间）＝2026年6月28日15时00分（UTC）' },
                '，自该时刻起（淘汰赛阶段）的使用需支付前款费用（以上统称为“免费期间”）。',
              ],
              [
                '尽管有前款规定，于前款免费期间终点（2026年6月29日0时00分，日本时间）之后新完成账户注册的用户，可自注册完成时起',
                { b: '72小时' },
                '内免费使用本服务。',
              ],
              ['即使在免费期间内未付款，也不会被自动扣费。'],
              ['支付通过外部支付代理商提供的系统进行。'],
              ['费用以显示时点含消费税的总额表示。'],
            ],
          },
        ],
      },
      {
        heading: '第5条（退款・取消）',
        blocks: [
          {
            ul: [
              [
                '由于本服务是付款完成后即时提供全部功能的数字内容，鉴于其性质，付款完成后因用户自身原因的退款、取消',
                { b: '原则上不予受理' },
                '。请在购买前利用免费期间充分确认内容。',
              ],
              [
                '尽管有前款规定，如因可归责于我方的事由导致本服务在相当期间内无法使用、发生重复扣款，或我方认为有必要的其他情形，我方可个别进行退款等处理。有关退款的咨询，请联系',
                { b: EMAIL },
                '。',
              ],
              [
                '退款・取消的详情，依',
                { link: { href: '/tokushoho', text: '特定商取引法相关表记' } },
                '之规定。',
              ],
            ],
          },
        ],
      },
      {
        heading: '第6条（信息准确性・免责）',
        blocks: [
          {
            ul: [
              [
                '本服务提供的赛程、结果、排名、球员信息、天气预报及其他信息，均基于外部公开数据源。我方在可能的范围内力求准确，但鉴于这些是免费、公开的数据源，',
                { b: '可能发生缺漏、延迟或错误' },
                '，我方不保证其完整性、准确性、时效性与有用性。',
              ],
              [
                '主要数据源为：赛程、结果等来自 TheSportsDB，天气预报来自 WeatherAPI.com。此外，部分比赛事件（进球者、纸牌等）基于',
                { ext: { href: WIKIPEDIA, text: '维基百科' } },
                '的记载，并在',
                { ext: { href: CC_BY_SA, text: '知识共享 署名-相同方式共享 4.0 国际（CC BY-SA 4.0）' } },
                '许可下使用（为提取与摘要事实，可能在必要时进行改写）。',
              ],
              ['天气信息为预报，可能与实际气象情况不同。关于观赛、出行及其他判断，请务必确认官方发布与预报后再行决定。'],
              ['“夺冠预测”“大家的预测（投票）”等为娱乐目的的参考信息，无意作为赌博、投资或其他决策的依据。'],
              ['对于用户利用本服务信息所进行的一切行为及结果，我方概不负责。'],
              ['即使我方对用户负有损害赔偿责任，除我方存在故意或重大过失外，赔偿金额以用户就本服务所支付的费用金额为上限。'],
            ],
          },
        ],
      },
      {
        heading: '第7条（数据保存・Cookie 等）',
        blocks: [
          {
            p: [
              '本服务为收藏球队、预测投票、语言与显示设置等功能，会在用户设备内保存 Cookie 等，并在我方数据库中保存信息。所获取的信息及处理详情，依',
              { link: { href: '/privacy', text: '隐私政策' } },
              '之规定。',
            ],
          },
        ],
      },
      {
        heading: '第8条（知识产权）',
        blocks: [
          {
            p: [
              '本服务所登载的文章、设计、程序等的著作权及其他知识产权，归属于我方或正当权利人。各国、各俱乐部、赛事、赞助商等的名称、徽章、标志等，分别为各权利人的商标等；本服务将其作为各权利人的知识产权予以尊重，不使用官方标志、官方徽章。',
            ],
          },
        ],
      },
      {
        heading: '第9条（禁止事项）',
        blocks: [
          {
            ul: [
              ['违反法律法规或公序良俗的行为。'],
              ['妨碍本服务运营的行为，对服务器等的非法访问。'],
              ['通过自动化手段（机器人、抓取等）进行的过度访问或大量获取信息。'],
              ['复制、再分发、转售本服务的全部或一部分，共享或转让账户。'],
              ['通过重复投票或其他不正当方法使用投票・预测功能。'],
              ['将本服务用于赌博或其他违法行为。'],
              ['其他我方判断为不当的行为。'],
            ],
          },
        ],
      },
      {
        heading: '第10条（服务的变更・中断・终止）',
        blocks: [
          {
            p: [
              '在系统维护、外部数据源故障或其他不得已的事由下，我方可不经事先通知变更本服务的内容、暂时中断提供。此外，本服务是与本赛事相关的限时提供，可能在本赛事结束后终止。对于由此给用户或第三方造成的损害，我方在超出第6条第6项范围之外不承担责任。',
            ],
          },
        ],
      },
      {
        heading: '第11条（注销・数据删除）',
        blocks: [
          {
            p: [
              '用户可随时以我方指定方式注销。注销时，买断费用的退款依第5条之规定。注销所涉用户数据的处理，依',
              { link: { href: '/privacy', text: '隐私政策' } },
              '之规定。',
            ],
          },
        ],
      },
      {
        heading: '第12条（条款的变更）',
        blocks: [
          {
            p: [
              '在本条款的变更符合用户的一般利益，或变更不违反合同目的且属合理的情形下，我方可依《民法》第548条之4关于定型条款变更的规定，变更本条款。变更时，将设定生效日期，并通过在本服务上的展示或其他适当方法提前公示。',
            ],
          },
        ],
      },
      {
        heading: '第13条（准据法・管辖法院）',
        blocks: [
          {
            p: [
              '本条款的准据法为日本法。就本服务在我方与用户之间发生纠纷时，以我方（经营者）所在地管辖的地方法院或简易法院为第一审的专属合意管辖法院。',
            ],
          },
        ],
      },
      {
        heading: '第14条（经营者信息与联系方式）',
        blocks: [
          {
            p: [
              '经营者为个人事业者。经营者的姓名、所在地等，依',
              { link: { href: '/tokushoho', text: '特定商取引法相关表记' } },
              '所定方式，在收到请求后不迟延地公开。有关本条款的咨询，请联系',
              { b: EMAIL },
              '。',
            ],
          },
        ],
      },
    ],
  },
};
