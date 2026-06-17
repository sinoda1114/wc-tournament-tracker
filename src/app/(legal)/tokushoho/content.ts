import { REFERENCE_NOTE, type LegalItemsDoc, type TranslatedLang } from '../legalShared';

/**
 * 特商法表記の翻訳版（en/es/pt/zh）。T-114。
 * 正本は日本語版（page.tsx の既存JSX）。本データは参考訳で、日本語版が優先。
 * 特商法は日本法に基づく開示のため、免責注記に日本法準拠の旨を併記する。
 */

const EMAIL = 'info@matchfav.com';

/** 各言語の「特商法は日本法準拠」注記を参考訳免責に足す。 */
function note(lang: TranslatedLang): string {
  const extra: Record<TranslatedLang, string> = {
    en: " This disclosure is provided under Japan's Act on Specified Commercial Transactions.",
    es: ' Esta información se proporciona conforme a la Ley de Transacciones Comerciales Especificadas de Japón.',
    pt: ' Esta informação é fornecida nos termos da Lei de Transações Comerciais Específicas do Japão.',
    zh: ' 本表记依据日本《特定商取引法》提供。',
  };
  return REFERENCE_NOTE[lang] + extra[lang];
}

export const TOKUSHOHO_CONTENT: Record<TranslatedLang, LegalItemsDoc> = {
  en: {
    title: 'Notice based on the Act on Specified Commercial Transactions',
    updatedLabel: 'Last updated',
    updated: 'June 10, 2026',
    referenceNote: note('en'),
    relatedLabel: 'Related:',
    related: [
      { href: '/terms', text: 'Terms of Service' },
      { href: '/privacy', text: 'Privacy Policy' },
    ],
    backLabel: 'Back to top',
    items: [
      {
        label: 'Seller',
        value: [
          'As the operator is a sole proprietor, the name and other details required under the Act on Specified Commercial Transactions will be disclosed without delay by email upon request. Please contact us at the address below to request disclosure.',
        ],
      },
      {
        label: 'Address',
        value: ['Disclosed without delay upon request (see “Seller” above).'],
      },
      {
        label: 'Phone number',
        value: [
          'Disclosed without delay upon request. Inquiries are accepted, in principle, by email at the address below.',
        ],
      },
      { label: 'Contact (email)', value: [{ b: EMAIL }] },
      {
        label: 'Price',
        value: [
          'Shown on the purchase screen of each plan (a one-time purchase, tax included; this is not a monthly or other recurring subscription).',
        ],
      },
      {
        label: 'Additional fees',
        value: [
          'None. However, the internet connection and communication charges required to use the service are borne by the user.',
        ],
      },
      { label: 'Payment method', value: ['Credit card payment.'] },
      { label: 'Payment timing', value: ['Charged immediately at the time of purchase.'] },
      {
        label: 'Delivery / service period',
        value: [
          'All features become available immediately after payment is completed. The service is provided until September 30, 2026 (planned; any change will be announced in advance on the site). This service is a time-limited service tied to the tournament, and the one-time fee is consideration for the right to use it until that date. The group-stage period (until 0:00 on June 29, 2026 Japan time / 15:00 UTC on June 28, 2026) is free to use. Users who register after that time (the start of the knockout-stage period) may use the service free of charge for 72 hours from registration.',
        ],
      },
      {
        label: 'Returns / cancellations (refund policy)',
        value: [
          'Due to the nature of digital content, returns, cancellations, or refunds requested for the user’s own convenience after payment is completed are, in principle, not accepted. Please check the content during the free period (the group-stage period, or 72 hours from registration after the knockout stage begins) before purchasing. If the service was unavailable for a substantial period due to reasons attributable to us, or if a double charge occurs, please contact us at the address above and we will respond on a case-by-case basis.',
        ],
      },
      { label: 'Recommended environment', value: ['The latest version of Google Chrome is recommended.'] },
    ],
  },
  es: {
    title: 'Aviso conforme a la Ley de Transacciones Comerciales Especificadas',
    updatedLabel: 'Última actualización',
    updated: '10 de junio de 2026',
    referenceNote: note('es'),
    relatedLabel: 'Relacionado:',
    related: [
      { href: '/terms', text: 'Términos de servicio' },
      { href: '/privacy', text: 'Política de privacidad' },
    ],
    backLabel: 'Volver al inicio',
    items: [
      {
        label: 'Vendedor',
        value: [
          'Como el operador es un trabajador autónomo, el nombre y demás datos exigidos por la Ley de Transacciones Comerciales Especificadas se divulgarán sin demora por correo electrónico previa solicitud. Para solicitar la divulgación, contáctenos en la dirección indicada abajo.',
        ],
      },
      {
        label: 'Domicilio',
        value: ['Se divulga sin demora previa solicitud (véase «Vendedor» arriba).'],
      },
      {
        label: 'Teléfono',
        value: [
          'Se divulga sin demora previa solicitud. Las consultas se atienden, en principio, por correo electrónico en la dirección indicada abajo.',
        ],
      },
      { label: 'Contacto (correo)', value: [{ b: EMAIL }] },
      {
        label: 'Precio',
        value: [
          'Se muestra en la pantalla de compra de cada plan (pago único, impuestos incluidos; no es una suscripción mensual ni recurrente).',
        ],
      },
      {
        label: 'Cargos adicionales',
        value: [
          'Ninguno. No obstante, los gastos de conexión a internet y de comunicación necesarios para usar el servicio corren a cargo del usuario.',
        ],
      },
      { label: 'Forma de pago', value: ['Pago con tarjeta de crédito.'] },
      { label: 'Momento del pago', value: ['Se cobra de inmediato al realizar la compra.'] },
      {
        label: 'Plazo de prestación del servicio',
        value: [
          'Todas las funciones quedan disponibles inmediatamente después de completarse el pago. El servicio se presta hasta el 30 de septiembre de 2026 (previsto; cualquier cambio se anunciará con antelación en el sitio). Este servicio es un servicio por tiempo limitado vinculado al torneo, y la tarifa única es la contraprestación por el derecho a usarlo hasta esa fecha. El periodo de la fase de grupos (hasta las 0:00 del 29 de junio de 2026, hora de Japón / 15:00 UTC del 28 de junio de 2026) es gratuito. Los usuarios que se registren después de ese momento (el inicio de la fase eliminatoria) podrán usar el servicio de forma gratuita durante 72 horas desde el registro.',
        ],
      },
      {
        label: 'Devoluciones / cancelaciones (política de reembolso)',
        value: [
          'Por la naturaleza del contenido digital, no se aceptan, en principio, devoluciones, cancelaciones ni reembolsos solicitados por conveniencia del usuario una vez completado el pago. Compruebe el contenido durante el periodo gratuito (la fase de grupos, o 72 horas desde el registro tras el inicio de la fase eliminatoria) antes de comprar. Si el servicio no estuvo disponible durante un periodo considerable por causas atribuibles a nosotros, o si se produce un cobro duplicado, contáctenos en la dirección indicada arriba y responderemos caso por caso.',
        ],
      },
      { label: 'Entorno recomendado', value: ['Se recomienda la última versión de Google Chrome.'] },
    ],
  },
  pt: {
    title: 'Aviso nos termos da Lei de Transações Comerciais Específicas',
    updatedLabel: 'Última atualização',
    updated: '10 de junho de 2026',
    referenceNote: note('pt'),
    relatedLabel: 'Relacionado:',
    related: [
      { href: '/terms', text: 'Termos de Serviço' },
      { href: '/privacy', text: 'Política de Privacidade' },
    ],
    backLabel: 'Voltar ao início',
    items: [
      {
        label: 'Vendedor',
        value: [
          'Como o operador é um profissional autônomo, o nome e os demais dados exigidos pela Lei de Transações Comerciais Específicas serão divulgados sem demora por e-mail mediante solicitação. Para solicitar a divulgação, entre em contato pelo endereço abaixo.',
        ],
      },
      {
        label: 'Endereço',
        value: ['Divulgado sem demora mediante solicitação (ver “Vendedor” acima).'],
      },
      {
        label: 'Telefone',
        value: [
          'Divulgado sem demora mediante solicitação. As consultas são atendidas, em princípio, por e-mail no endereço abaixo.',
        ],
      },
      { label: 'Contato (e-mail)', value: [{ b: EMAIL }] },
      {
        label: 'Preço',
        value: [
          'Exibido na tela de compra de cada plano (compra única, impostos incluídos; não é uma assinatura mensal ou recorrente).',
        ],
      },
      {
        label: 'Encargos adicionais',
        value: [
          'Nenhum. Contudo, os custos de conexão à internet e de comunicação necessários para usar o serviço são de responsabilidade do usuário.',
        ],
      },
      { label: 'Forma de pagamento', value: ['Pagamento com cartão de crédito.'] },
      { label: 'Momento do pagamento', value: ['Cobrado imediatamente no momento da compra.'] },
      {
        label: 'Prazo de prestação do serviço',
        value: [
          'Todos os recursos ficam disponíveis imediatamente após a conclusão do pagamento. O serviço é prestado até 30 de setembro de 2026 (previsto; qualquer alteração será anunciada com antecedência no site). Este serviço é um serviço por tempo limitado vinculado ao torneio, e a taxa única é a contrapartida pelo direito de uso até essa data. O período da fase de grupos (até 0:00 de 29 de junho de 2026, horário do Japão / 15:00 UTC de 28 de junho de 2026) é gratuito. Os usuários que se registrarem após esse momento (o início da fase eliminatória) podem usar o serviço gratuitamente por 72 horas a partir do registro.',
        ],
      },
      {
        label: 'Devoluções / cancelamentos (política de reembolso)',
        value: [
          'Devido à natureza do conteúdo digital, não são aceitos, em princípio, devoluções, cancelamentos ou reembolsos solicitados por conveniência do usuário após a conclusão do pagamento. Verifique o conteúdo durante o período gratuito (a fase de grupos ou 72 horas a partir do registro após o início da fase eliminatória) antes de comprar. Se o serviço ficou indisponível por um período considerável por motivos a nós atribuíveis, ou se ocorrer cobrança em duplicidade, entre em contato pelo endereço acima e responderemos caso a caso.',
        ],
      },
      { label: 'Ambiente recomendado', value: ['Recomenda-se a versão mais recente do Google Chrome.'] },
    ],
  },
  zh: {
    title: '基于日本《特定商取引法》的表记',
    updatedLabel: '最后修订',
    updated: '2026年6月10日',
    referenceNote: note('zh'),
    relatedLabel: '相关页面：',
    related: [
      { href: '/terms', text: '使用条款' },
      { href: '/privacy', text: '隐私政策' },
    ],
    backLabel: '返回首页',
    items: [
      {
        label: '销售经营者',
        value: [
          '由于经营者为个人事业者，依据《特定商取引法》应公示的姓名等信息，将在收到请求后通过电子邮件等方式不迟延地予以公开。如需公开，请通过下方联系方式提出请求。',
        ],
      },
      {
        label: '所在地',
        value: ['收到请求后不迟延地公开（参见上方“销售经营者”）。'],
      },
      {
        label: '电话号码',
        value: ['收到请求后不迟延地公开。咨询原则上通过下方邮箱受理。'],
      },
      { label: '联系方式（邮箱）', value: [{ b: EMAIL }] },
      {
        label: '销售价格',
        value: ['在各套餐的购买页面显示（买断制、含税价格；并非按月等的持续付费）。'],
      },
      {
        label: '商品价款以外的必要费用',
        value: ['无。但使用本服务所需的网络连接费、通信费由用户自行承担。'],
      },
      { label: '支付方式', value: ['信用卡支付。'] },
      { label: '支付时间', value: ['在购买手续时即时扣款。'] },
      {
        label: '服务提供时间',
        value: [
          '付款完成后即可立即使用全部功能。提供期限至2026年9月30日（预定；如有变更将在网站上提前通知）。本服务是与赛事相关的限时服务，买断费用是截至该日的使用权对价。小组赛阶段（截至日本时间2026年6月29日0:00／UTC 2026年6月28日15:00）可免费使用。在该时间（淘汰赛阶段开始）之后新注册的用户，可自注册起免费使用72小时。',
        ],
      },
      {
        label: '退货・取消（退款政策）',
        value: [
          '鉴于数字内容的商品性质，付款完成后因用户自身原因的退货、取消、退款原则上不予受理。请在免费期间（小组赛阶段，或淘汰赛开始后自注册起72小时）充分确认内容后再行购买。如因可归责于我方的事由导致服务在相当期间内无法使用，或发生重复扣款，请通过上方联系方式与我们联系，我们将个别处理。',
        ],
      },
      { label: '运行环境', value: ['建议使用最新版 Google Chrome。'] },
    ],
  },
};
