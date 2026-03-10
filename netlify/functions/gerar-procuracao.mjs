export default async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const ANTHROPIC_API_KEY = Netlify.env.get("ANTHROPIC_API_KEY");

  if (!ANTHROPIC_API_KEY) {
    return new Response(
      JSON.stringify({ error: "API key não configurada. Configure ANTHROPIC_API_KEY nas variáveis de ambiente do Netlify." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const { tipo, outorgante, outorgado, poderes, foro } = await req.json();

    const prompt = `Você é um advogado brasileiro experiente. Gere uma PROCURAÇÃO ${tipo.toUpperCase()} completa, formal e pronta para uso, seguindo rigorosamente o formato jurídico brasileiro.

DADOS DO OUTORGANTE:
- Nome: ${outorgante.nome}
- Nacionalidade: ${outorgante.nacionalidade}
- Estado Civil: ${outorgante.estadoCivil}
- Profissão: ${outorgante.profissao}
- CPF: ${outorgante.cpf}
- RG: ${outorgante.rg} - ${outorgante.orgaoExpedidor}
- Endereço: ${outorgante.endereco}

DADOS DO OUTORGADO:
- Nome: ${outorgado.nome}
- Nacionalidade: ${outorgado.nacionalidade}
- Profissão: ${outorgado.profissao}
- CPF: ${outorgado.cpf}
${outorgado.oab ? `- OAB: ${outorgado.oab}` : ""}
- Endereço: ${outorgado.endereco}

PODERES: ${poderes}
FORO: ${foro}

Gere APENAS o texto da procuração, sem comentários. Inclua cabeçalho, qualificação das partes, poderes, cláusula de foro, data por extenso e espaço para assinatura. Se Ad Judicia, referencie arts. 105 CPC e 661 CC.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2048,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: data.error?.message || "Erro na API da Anthropic" }),
        { status: response.status, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor: " + err.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

export const config = {
  path: "/.netlify/functions/gerar-procuracao",
};
