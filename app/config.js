// ============================================================
//  CONFIG DO BOLÃO — troque só o que está aqui
//  Contexto atual: Amistosos internacionais da Data FIFA — quinta 24/09/2026
// ============================================================

export const config = {
  // >>> WhatsApp que recebe o bilhete (só dígitos, com DDI+DDD) <<<
  whatsappNumero: "559180194075",

  whatsappMensagem: "Quero validar meu palpite #{codigo}",

  supabase: {
    url: "https://nhquytiuzezckqmbevif.supabase.co",
    anonKey: "sb_publishable_CAgOTV9H6Z-z4qvimwV3Kg_ZSudeqrt",
  },

  marca: "Bolão dos Amistosos",

  gaId: "",

  pixelId: "",

  seo: {
    titulo: "Bolão dos Amistosos — R$ 500 pra quem cravar 10 palpites",
    descricao: "10 palpites nos amistosos da Data FIFA. Cravou os 10, leva R$ 500 no Pix. Grátis.",
  },

  oferta: {
    valor: "R$ 500",
    regra: "no Pix pra quem cravar os 10",
  },

  // ---------- Rodada ----------
  rodada: {
    id: "amistosos-fifa-set26",
    nome: "Amistosos • Data FIFA (24/09)",
    // Encerramento: 30 min antes do primeiro jogo (06:30 BRT → fecha 06:00 BRT)
    encerramento: "2026-09-24T06:00:00-03:00",
    jogos: [
      { casa: "Palestina",     fora: "Nova Zelândia", quando: "Qui 24/09 • 06h30", escudoCasa: "/escudos/ps.png", escudoFora: "/escudos/nz.png" },
      { casa: "Japão",         fora: "Uruguai",       quando: "Qui 24/09 • 07h05", escudoCasa: "/escudos/jp.png", escudoFora: "/escudos/uy.png" },
      { casa: "Coreia do Sul", fora: "Equador",       quando: "Qui 24/09 • 08h00", escudoCasa: "/escudos/kr.png", escudoFora: "/escudos/ec.png" },
      { casa: "China",         fora: "Maldivas",      quando: "Qui 24/09 • 08h35", escudoCasa: "/escudos/cn.png", escudoFora: "/escudos/mv.png" },
      { casa: "Uzbequistão",   fora: "Irã",           quando: "Qui 24/09 • 11h00", escudoCasa: "/escudos/uz.png", escudoFora: "/escudos/ir.png" },
    ],
  },

  marquee: ["Bolão dos Amistosos", "Data FIFA", "R$ 500 no Pix", "5 jogos • 10 palpites", "Quinta-feira", "Grátis"],

  landing: {
    heroImage: "/hero.webp",
    heroModo: "recorte",
    heroBandeiras: true,   // mostra bandeiras dos países da rodada como decoração no hero
    label: "Bolão dos Amistosos • Data FIFA",
    titulo: "*R$ 500* pra quem cravar a rodada",
    subtitulo: "Dois palpites por jogo dos amistosos da quinta. Cravou os dez, o Pix é seu.",
    ctaLabel: "Fazer meus palpites",
    ctaHint: "Grátis. Resultado na quinta à noite.",
    comoFunciona: [
      "Responde as 10 perguntas em 2 minutos",
      "Registra o bilhete no WhatsApp",
      "Cravou os 10, recebe R$ 500 no Pix",
    ],
  },

  // ---------- Palpites (10 = 2 por jogo, misturando resultado + mercado difícil) ----------
  palpites: [
    // --- 1. Palestina x Nova Zelândia ---
    {
      jogo: 0,
      mercado: "Resultado",
      pergunta: "Quem vence o jogo?",
      opcoes: ["Palestina", "Empate", "Nova Zelândia"],
    },
    {
      jogo: 0,
      mercado: "Total de gols",
      pergunta: "Quantos gols no jogo?",
      opcoes: ["0 ou 1", "2 ou 3", "4 ou mais"],
    },

    // --- 2. Japão x Uruguai ---
    {
      jogo: 1,
      mercado: "Resultado",
      pergunta: "Quem vence o jogo?",
      opcoes: ["Japão", "Empate", "Uruguai"],
    },
    {
      jogo: 1,
      mercado: "Ambas marcam",
      pergunta: "Os dois times marcam?",
      opcoes: ["Sim", "Não"],
    },

    // --- 3. Coreia do Sul x Equador ---
    {
      jogo: 2,
      mercado: "Resultado",
      pergunta: "Quem vence o jogo?",
      opcoes: ["Coreia do Sul", "Empate", "Equador"],
    },
    {
      jogo: 2,
      mercado: "Gol no 1º tempo",
      pergunta: "Sai gol no primeiro tempo?",
      opcoes: ["Sim", "Não"],
    },

    // --- 4. China x Maldivas ---
    {
      jogo: 3,
      mercado: "Resultado",
      pergunta: "Quem vence o jogo?",
      opcoes: ["China", "Empate", "Maldivas"],
    },
    {
      jogo: 3,
      mercado: "Gols da China",
      pergunta: "Quantos gols a China faz?",
      opcoes: ["0 a 2", "3 ou 4", "5 ou mais"],
    },

    // --- 5. Uzbequistão x Irã ---
    {
      jogo: 4,
      mercado: "Resultado",
      pergunta: "Quem vence o jogo?",
      opcoes: ["Uzbequistão", "Empate", "Irã"],
    },
    {
      jogo: 4,
      mercado: "Ambas marcam",
      pergunta: "Os dois times marcam?",
      opcoes: ["Sim", "Não"],
    },
  ],

  loading: {
    label: "Fechando seu bilhete",
    etapas: ["Anotando seus palpites", "Gerando o número do bilhete", "Quase lá"],
    segundos: 1.6,
  },

  bilhete: {
    slipTitulo: "Bolão dos Amistosos",
    label: "Seu bilhete",
    titulo: "Registra no WhatsApp pra valer",
    subtitulo: "Sem registro o bilhete não conta. Aperta o botão que a mensagem já vai com o número do bilhete.",
    ctaLabel: "Registrar no WhatsApp",
    ctaHint: "Abre o WhatsApp com o número do seu bilhete",
    refazerLabel: "Refazer palpites",
  },

  aviso: {
    titulo: "Aviso importante",
    linhas: [
      "Bolão gratuito, sem depósito. Só concorre quem registrar o bilhete no WhatsApp antes do primeiro jogo (quinta 24/09, 06h30).",
      "Se mais de um bilhete cravar os 10, o prêmio é sorteado entre eles.",
      "Apostas esportivas envolvem risco financeiro. Nunca aposte mais do que pode perder.",
      "Conteúdo destinado a maiores de 18 anos. Jogue com responsabilidade.",
    ],
  },
};
