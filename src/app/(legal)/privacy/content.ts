import { REFERENCE_NOTE, type LegalSectionsDoc, type TranslatedLang } from '../legalShared';

/**
 * プライバシーポリシーの翻訳版（en/es/pt/zh）。T-114。
 * 正本は日本語版（page.tsx の既存JSX）。本データは参考訳で、日本語版が優先。
 */

const EMAIL = 'info@matchfav.com';

export const PRIVACY_CONTENT: Record<TranslatedLang, LegalSectionsDoc> = {
  en: {
    title: 'Privacy Policy',
    updatedLabel: 'Last updated',
    updated: 'June 11, 2026',
    referenceNote: REFERENCE_NOTE.en,
    relatedLabel: 'Related:',
    related: [
      { href: '/terms', text: 'Terms of Service' },
      { href: '/tokushoho', text: 'Act on Specified Commercial Transactions' },
    ],
    backLabel: 'Back to top',
    sections: [
      {
        heading: '1. Basic policy',
        blocks: [
          {
            p: [
              'The operator (“we”) handles users’ personal information on the web service “MatchFav” (the “Service”) appropriately and in compliance with the Act on the Protection of Personal Information and other applicable laws. The Service is an unofficial fan site not endorsed by FIFA.',
            ],
          },
        ],
      },
      {
        heading: '2. Information we collect',
        blocks: [
          {
            ul: [
              [
                { b: 'Account information:' },
                ' When you sign in through an external authentication provider, we obtain information such as your email address, display name, and profile image. We never hold your password.',
              ],
              [
                { b: 'Payment information:' },
                ' Payments for paid services are processed through an external payment provider, and ',
                { b: 'we do not hold your credit card number' },
                '. We obtain only payment records such as the success or failure of the payment and the date and time of purchase.',
              ],
              [
                { b: 'Service usage data:' },
                ' We store data such as your prediction votes and registered favorite teams, linked to your user account.',
              ],
              [
                { b: 'Information stored on your device:' },
                ' We store information such as cookies on your device to keep you signed in, retain language and display settings, and prevent duplicate voting.',
              ],
              [
                { b: 'Technical information:' },
                ' For stable operation and security, information such as access date and time, IP address, and browser information may be temporarily recorded.',
              ],
            ],
          },
        ],
      },
      {
        heading: '3. Purposes of use',
        blocks: [
          {
            ul: [
              ['To provide the Service (login authentication, payment processing, and management of purchase status).'],
              ['To provide user-facing features such as favorites, prediction voting, and language settings.'],
              ['To tally prediction votes and to prevent fraud and duplicate voting.'],
              ['For stable operation, quality improvement, and protection against unauthorized access.'],
              ['To respond to inquiries from users.'],
            ],
          },
        ],
      },
      {
        heading: '4. Outsourcing and provision to external services',
        blocks: [
          {
            p: [
              'To the extent necessary to provide the Service, we outsource authentication, payment, data storage, delivery, and similar functions to external providers, and user information is provided to those providers within that scope. Each provider’s handling is governed by its own privacy policy. ',
              { b: 'These providers include third parties located outside Japan.' },
              ' Except for the outsourcing described above and cases based on laws and regulations, we do not provide users’ personal information to third parties without the user’s consent.',
            ],
          },
        ],
      },
      {
        heading: '5. Retention period',
        blocks: [
          {
            ul: [
              [
                'Account information and service usage data are retained until the user withdraws, or until a reasonable period has passed after the Service ends (planned for September 30, 2026; see the ',
                { link: { href: '/terms', text: 'Terms of Service' } },
                '), after which they are deleted.',
              ],
              ['Payment records are retained for the legally required period in accordance with statutory retention obligations.'],
              ['Technical information is retained only for the period necessary for operation.'],
            ],
          },
        ],
      },
      {
        heading: '6. Requests for disclosure, correction, and deletion',
        blocks: [
          {
            p: [
              'You may request the disclosure, correction, suspension of use, or deletion of your personal information that we hold. If you wish to delete your account and related data, please contact us from your registered email address at ',
              { b: EMAIL },
              '. After verifying your identity, we will respond without delay in accordance with the law (except for payment records and the like that we are legally required to retain).',
            ],
          },
        ],
      },
      {
        heading: '7. Revisions',
        blocks: [
          {
            p: [
              'This policy may be revised in response to changes in laws or in the content of the Service. If we make a material change, we will announce it on the Service.',
            ],
          },
        ],
      },
      {
        heading: '8. Operator information and contact',
        blocks: [
          {
            p: [
              'The operator is a sole proprietor. The operator’s name, address, and similar details are disclosed without delay upon request, by the method set out in the ',
              { link: { href: '/tokushoho', text: 'Act on Specified Commercial Transactions notice' } },
              '. For inquiries about this policy, please contact ',
              { b: EMAIL },
              '.',
            ],
          },
        ],
      },
    ],
  },
  es: {
    title: 'Política de privacidad',
    updatedLabel: 'Última actualización',
    updated: '11 de junio de 2026',
    referenceNote: REFERENCE_NOTE.es,
    relatedLabel: 'Relacionado:',
    related: [
      { href: '/terms', text: 'Términos de servicio' },
      { href: '/tokushoho', text: 'Ley de Transacciones Comerciales Especificadas' },
    ],
    backLabel: 'Volver al inicio',
    sections: [
      {
        heading: '1. Política básica',
        blocks: [
          {
            p: [
              'El operador («nosotros») trata la información personal de los usuarios en el servicio web «MatchFav» (el «Servicio») de forma adecuada y conforme a la Ley de Protección de Información Personal y demás leyes aplicables. El Servicio es un sitio de fans no oficial, sin el respaldo de la FIFA.',
            ],
          },
        ],
      },
      {
        heading: '2. Información que recopilamos',
        blocks: [
          {
            ul: [
              [
                { b: 'Información de la cuenta:' },
                ' Cuando inicia sesión a través de un proveedor de autenticación externo, obtenemos información como su correo electrónico, nombre para mostrar e imagen de perfil. Nunca conservamos su contraseña.',
              ],
              [
                { b: 'Información de pago:' },
                ' Los pagos de los servicios de pago se procesan a través de un proveedor de pagos externo, y ',
                { b: 'no conservamos el número de su tarjeta de crédito' },
                '. Solo obtenemos registros de pago, como el éxito o el fracaso del pago y la fecha y hora de la compra.',
              ],
              [
                { b: 'Datos de uso del servicio:' },
                ' Almacenamos datos como sus pronósticos y los equipos favoritos registrados, vinculados a su cuenta de usuario.',
              ],
              [
                { b: 'Información almacenada en su dispositivo:' },
                ' Almacenamos información como cookies en su dispositivo para mantener la sesión iniciada, conservar los ajustes de idioma y visualización y evitar votos duplicados.',
              ],
              [
                { b: 'Información técnica:' },
                ' Para un funcionamiento estable y la seguridad, puede registrarse temporalmente información como la fecha y hora de acceso, la dirección IP y los datos del navegador.',
              ],
            ],
          },
        ],
      },
      {
        heading: '3. Finalidades del uso',
        blocks: [
          {
            ul: [
              ['Prestar el Servicio (autenticación de inicio de sesión, procesamiento de pagos y gestión del estado de compra).'],
              ['Ofrecer funciones para el usuario, como favoritos, pronósticos y ajustes de idioma.'],
              ['Recontar los pronósticos y prevenir el fraude y los votos duplicados.'],
              ['Para un funcionamiento estable, la mejora de la calidad y la protección contra accesos no autorizados.'],
              ['Atender las consultas de los usuarios.'],
            ],
          },
        ],
      },
      {
        heading: '4. Subcontratación y comunicación a servicios externos',
        blocks: [
          {
            p: [
              'En la medida necesaria para prestar el Servicio, subcontratamos la autenticación, el pago, el almacenamiento de datos, la entrega y funciones similares a proveedores externos, y la información del usuario se comunica a dichos proveedores dentro de ese alcance. El tratamiento por parte de cada proveedor se rige por su propia política de privacidad. ',
              { b: 'Estos proveedores incluyen terceros ubicados fuera de Japón.' },
              ' Salvo la subcontratación descrita anteriormente y los casos basados en leyes y reglamentos, no comunicamos la información personal de los usuarios a terceros sin su consentimiento.',
            ],
          },
        ],
      },
      {
        heading: '5. Periodo de conservación',
        blocks: [
          {
            ul: [
              [
                'La información de la cuenta y los datos de uso del servicio se conservan hasta que el usuario se da de baja, o hasta que transcurre un periodo razonable tras la finalización del Servicio (prevista para el 30 de septiembre de 2026; véanse los ',
                { link: { href: '/terms', text: 'Términos de servicio' } },
                '), tras lo cual se eliminan.',
              ],
              ['Los registros de pago se conservan durante el periodo legalmente exigido conforme a las obligaciones de conservación.'],
              ['La información técnica se conserva solo durante el periodo necesario para el funcionamiento.'],
            ],
          },
        ],
      },
      {
        heading: '6. Solicitudes de acceso, rectificación y supresión',
        blocks: [
          {
            p: [
              'Puede solicitar el acceso, la rectificación, la suspensión del uso o la supresión de su información personal que conservamos. Si desea eliminar su cuenta y los datos relacionados, contáctenos desde su correo electrónico registrado en ',
              { b: EMAIL },
              '. Tras verificar su identidad, responderemos sin demora conforme a la ley (salvo los registros de pago y similares que estamos legalmente obligados a conservar).',
            ],
          },
        ],
      },
      {
        heading: '7. Modificaciones',
        blocks: [
          {
            p: [
              'Esta política puede modificarse en respuesta a cambios legislativos o en el contenido del Servicio. Si realizamos un cambio importante, lo anunciaremos en el Servicio.',
            ],
          },
        ],
      },
      {
        heading: '8. Información del operador y contacto',
        blocks: [
          {
            p: [
              'El operador es un trabajador autónomo. El nombre, el domicilio y demás datos del operador se divulgan sin demora previa solicitud, por el método establecido en el ',
              { link: { href: '/tokushoho', text: 'Aviso conforme a la Ley de Transacciones Comerciales Especificadas' } },
              '. Para consultas sobre esta política, contacte con ',
              { b: EMAIL },
              '.',
            ],
          },
        ],
      },
    ],
  },
  pt: {
    title: 'Política de Privacidade',
    updatedLabel: 'Última atualização',
    updated: '11 de junho de 2026',
    referenceNote: REFERENCE_NOTE.pt,
    relatedLabel: 'Relacionado:',
    related: [
      { href: '/terms', text: 'Termos de Serviço' },
      { href: '/tokushoho', text: 'Lei de Transações Comerciais Específicas' },
    ],
    backLabel: 'Voltar ao início',
    sections: [
      {
        heading: '1. Política básica',
        blocks: [
          {
            p: [
              'O operador (“nós”) trata as informações pessoais dos usuários no serviço web “MatchFav” (o “Serviço”) de forma adequada e em conformidade com a Lei de Proteção de Informações Pessoais e demais leis aplicáveis. O Serviço é um site de fãs não oficial, sem endosso da FIFA.',
            ],
          },
        ],
      },
      {
        heading: '2. Informações que coletamos',
        blocks: [
          {
            ul: [
              [
                { b: 'Informações da conta:' },
                ' Quando você faz login por meio de um provedor de autenticação externo, obtemos informações como seu e-mail, nome de exibição e imagem de perfil. Nunca guardamos sua senha.',
              ],
              [
                { b: 'Informações de pagamento:' },
                ' Os pagamentos dos serviços pagos são processados por um provedor de pagamento externo, e ',
                { b: 'não guardamos o número do seu cartão de crédito' },
                '. Obtemos apenas registros de pagamento, como o sucesso ou a falha do pagamento e a data e hora da compra.',
              ],
              [
                { b: 'Dados de uso do serviço:' },
                ' Armazenamos dados como seus palpites e os times favoritos registrados, vinculados à sua conta de usuário.',
              ],
              [
                { b: 'Informações armazenadas no seu dispositivo:' },
                ' Armazenamos informações como cookies no seu dispositivo para manter o login, reter as configurações de idioma e exibição e evitar votos duplicados.',
              ],
              [
                { b: 'Informações técnicas:' },
                ' Para operação estável e segurança, informações como data e hora de acesso, endereço IP e dados do navegador podem ser registradas temporariamente.',
              ],
            ],
          },
        ],
      },
      {
        heading: '3. Finalidades de uso',
        blocks: [
          {
            ul: [
              ['Prestar o Serviço (autenticação de login, processamento de pagamentos e gestão do status de compra).'],
              ['Oferecer recursos para o usuário, como favoritos, palpites e configurações de idioma.'],
              ['Apurar os palpites e prevenir fraudes e votos duplicados.'],
              ['Para operação estável, melhoria da qualidade e proteção contra acessos não autorizados.'],
              ['Responder às solicitações dos usuários.'],
            ],
          },
        ],
      },
      {
        heading: '4. Terceirização e fornecimento a serviços externos',
        blocks: [
          {
            p: [
              'Na medida necessária para prestar o Serviço, terceirizamos a autenticação, o pagamento, o armazenamento de dados, a entrega e funções semelhantes a provedores externos, e as informações do usuário são fornecidas a esses provedores dentro desse escopo. O tratamento por cada provedor é regido por sua própria política de privacidade. ',
              { b: 'Esses provedores incluem terceiros localizados fora do Japão.' },
              ' Exceto pela terceirização descrita acima e pelos casos baseados em leis e regulamentos, não fornecemos as informações pessoais dos usuários a terceiros sem o consentimento do usuário.',
            ],
          },
        ],
      },
      {
        heading: '5. Período de retenção',
        blocks: [
          {
            ul: [
              [
                'As informações da conta e os dados de uso do serviço são mantidos até que o usuário cancele a conta, ou até que decorra um período razoável após o término do Serviço (previsto para 30 de setembro de 2026; consulte os ',
                { link: { href: '/terms', text: 'Termos de Serviço' } },
                '), após o que são excluídos.',
              ],
              ['Os registros de pagamento são mantidos pelo período legalmente exigido, conforme as obrigações de retenção.'],
              ['As informações técnicas são mantidas apenas pelo período necessário para a operação.'],
            ],
          },
        ],
      },
      {
        heading: '6. Solicitações de acesso, correção e exclusão',
        blocks: [
          {
            p: [
              'Você pode solicitar o acesso, a correção, a suspensão do uso ou a exclusão das suas informações pessoais que mantemos. Se desejar excluir sua conta e os dados relacionados, entre em contato a partir do seu e-mail registrado em ',
              { b: EMAIL },
              '. Após verificar sua identidade, responderemos sem demora conforme a lei (exceto registros de pagamento e similares que somos legalmente obrigados a manter).',
            ],
          },
        ],
      },
      {
        heading: '7. Alterações',
        blocks: [
          {
            p: [
              'Esta política pode ser alterada em resposta a mudanças na legislação ou no conteúdo do Serviço. Se fizermos uma alteração relevante, iremos anunciá-la no Serviço.',
            ],
          },
        ],
      },
      {
        heading: '8. Informações do operador e contato',
        blocks: [
          {
            p: [
              'O operador é um profissional autônomo. O nome, o endereço e demais dados do operador são divulgados sem demora mediante solicitação, pelo método estabelecido no ',
              { link: { href: '/tokushoho', text: 'Aviso nos termos da Lei de Transações Comerciais Específicas' } },
              '. Para dúvidas sobre esta política, entre em contato pelo ',
              { b: EMAIL },
              '.',
            ],
          },
        ],
      },
    ],
  },
  zh: {
    title: '隐私政策',
    updatedLabel: '最后修订',
    updated: '2026年6月11日',
    referenceNote: REFERENCE_NOTE.zh,
    relatedLabel: '相关页面：',
    related: [
      { href: '/terms', text: '使用条款' },
      { href: '/tokushoho', text: '特定商取引法相关表记' },
    ],
    backLabel: '返回首页',
    sections: [
      {
        heading: '1. 基本方针',
        blocks: [
          {
            p: [
              '经营者（以下称“我方”）在所提供的网络服务“MatchFav”（以下称“本服务”）中，遵守《个人信息保护法》及其他相关法律，妥善处理用户的个人信息。本服务是未获 FIFA 认可的非官方球迷网站。',
            ],
          },
        ],
      },
      {
        heading: '2. 我们收集的信息',
        blocks: [
          {
            ul: [
              [
                { b: '账户信息：' },
                '通过外部认证平台登录时，我们会获取电子邮箱、显示名称、头像等信息。我方不会保存您的密码。',
              ],
              [
                { b: '支付信息：' },
                '付费服务的支付通过外部支付代理商进行，',
                { b: '我方不保存您的信用卡卡号' },
                '。我方仅获取支付成败、购买时间等支付记录。',
              ],
              [
                { b: '服务使用数据：' },
                '我们会将预测投票内容、收藏球队等数据与您的用户账户关联保存。',
              ],
              [
                { b: '保存在您设备上的信息：' },
                '为维持登录状态、保存语言与显示设置、防止重复投票，我们会在您的设备上保存 Cookie 等信息。',
              ],
              [
                { b: '技术信息：' },
                '为稳定运行与安全，可能会临时记录访问时间、IP 地址、浏览器信息等。',
              ],
            ],
          },
        ],
      },
      {
        heading: '3. 使用目的',
        blocks: [
          {
            ul: [
              ['用于提供本服务（登录认证、支付处理、购买状态管理）。'],
              ['用于提供收藏、预测投票、语言设置等面向用户的功能。'],
              ['用于统计预测投票，以及防止舞弊与重复投票。'],
              ['用于本服务的稳定运行、质量改进与防范非法访问。'],
              ['用于回应用户的咨询。'],
            ],
          },
        ],
      },
      {
        heading: '4. 向外部服务的委托与提供',
        blocks: [
          {
            p: [
              '在提供本服务所必需的范围内，我方将认证、支付、数据存储、分发等委托给外部经营者，用户信息在该范围内提供给各经营者。各经营者的处理依其各自的隐私政策而定。',
              { b: '这些经营者包括位于日本境外的第三方。' },
              '除上述委托及依据法律法规的情形外，未经本人同意，我方不会向第三方提供用户的个人信息。',
            ],
          },
        ],
      },
      {
        heading: '5. 保存期间',
        blocks: [
          {
            ul: [
              [
                '账户信息与服务使用数据将保存至用户注销时，或本服务结束（预定2026年9月30日；参见',
                { link: { href: '/terms', text: '使用条款' } },
                '）后经过合理期间为止，其后予以删除。',
              ],
              ['支付记录依法定保存义务，保存法定期间。'],
              ['技术信息仅在运营所需的期间内保存。'],
            ],
          },
        ],
      },
      {
        heading: '6. 披露・更正・删除请求',
        blocks: [
          {
            p: [
              '用户可就我方所持有的本人个人信息，请求披露、更正、停止使用或删除。如希望删除账户及相关数据，请使用注册邮箱发送邮件至',
              { b: EMAIL },
              '。在完成身份确认后，我方将依法不迟延地予以处理（依法负有保存义务的支付记录等除外）。',
            ],
          },
        ],
      },
      {
        heading: '7. 修订',
        blocks: [
          {
            p: [
              '本政策可能因法律修订或服务内容变更而修订。如进行重要变更，将在本服务上予以公告。',
            ],
          },
        ],
      },
      {
        heading: '8. 经营者信息与联系方式',
        blocks: [
          {
            p: [
              '经营者为个人事业者。经营者的姓名、所在地等，依',
              { link: { href: '/tokushoho', text: '特定商取引法相关表记' } },
              '所定方式，在收到请求后不迟延地公开。有关本政策的咨询，请联系',
              { b: EMAIL },
              '。',
            ],
          },
        ],
      },
    ],
  },
};
