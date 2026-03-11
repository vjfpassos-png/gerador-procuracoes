exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_API_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: "API key não configurada." }) };
  }

  try {
    const { tipo, outorgante, outorgados, poderes, foro } = JSON.parse(event.body);

    const outorgadosTexto = outorgados.map((o, i) => {
      let texto = `OUTORGADO ${outorgados.length > 1 ? (i + 1) : ""}:
- Nome: ${o.nome}
- Nacionalidade: ${o.nacionalidade}
- Profissão: ${o.profissao}
- CPF: ${o.cpf}`;
      if (o.oab) texto += `\n- OAB: ${o.oab}`;
      texto += `\n- Endereço: ${o.endereco}`;
      return texto;
    }).join("\n\n");

    const prompt = `Você é um advogado brasileiro experiente. Gere uma PROCURAÇÃO ${tipo.toUpperCase()} completa, formal e pronta para uso, seguindo rigorosamente o formato jurídico brasileiro.

DADOS DO OUTORGANTE:
- Nome: ${outorgante.nome}
- Nacionalidade: ${outorgante.nacionalidade}
- Estado Civil: ${outorgante.estadoCivil}
- Profissão: ${outorgante.profissao}
- CPF: ${outorgante.cpf}
- RG: ${outorgante.rg} - ${outorgante.orgaoExpedidor}
- Endereço: ${outorgante.endereco}

${outorgadosTexto}

PODERES: ${poderes}
FORO: ${foro}

Gere APENAS o texto da procuração, sem comentários. Inclua cabeçalho, qualificação completa de TODAS as partes (outorgante e todos os outorgados), poderes, cláusula de foro, data por extenso e espaço para assinatura de cada parte. Se Ad Judicia, referencie arts. 105 CPC e 661 CC.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      return { statusCode: response.status, body: JSON.stringify({ error: data.error?.message || "Erro na API" }) };
    }
    return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: "Erro interno: " + err.message }) };
  }
};
