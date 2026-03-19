exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_API_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: "API key não configurada." }) };
  }

  try {
    const { tipo, outorgantes, outorgados, poderes, foro } = JSON.parse(event.body);

    // Helper to format address from fields
    const fmtEnd = (o) => {
      let end = "";
      if (o.rua) end += o.rua;
      if (o.numero) end += ", " + o.numero;
      if (o.complemento) end += ", " + o.complemento;
      if (o.bairro) end += ", " + o.bairro;
      if (o.cidade) end += ", Cidade e Comarca de " + o.cidade;
      if (o.uf) end += "/" + o.uf;
      if (o.cep) end += " - CEP: " + o.cep;
      return end || o.endereco || "";
    };

    const outorgantesTexto = outorgantes.map((o, i) => {
      return `OUTORGANTE ${outorgantes.length > 1 ? (i + 1) : ""}:
- Nome: ${o.nome}
- Nacionalidade: ${o.nacionalidade}
- Estado Civil: ${o.estadoCivil}
- Profissão: ${o.profissao}
- CPF: ${o.cpf}
- RG: ${o.rg} - ${o.orgaoExpedidor}
- Endereço: ${fmtEnd(o)}`;
    }).join("\n\n");

    const outorgadosTexto = outorgados.map((o, i) => {
      const endereco = fmtEnd(o) || fmtEnd(outorgados[0]);
      let texto = `OUTORGADO ${outorgados.length > 1 ? (i + 1) : ""}:
- Nome: ${o.nome}
- Nacionalidade: ${o.nacionalidade}
- Profissão: ${o.profissao}
- CPF: ${o.cpf}`;
      if (o.oab) texto += `\n- OAB: ${o.oab}`;
      texto += `\n- Endereço: ${endereco}`;
      return texto;
    }).join("\n\n");

    const prompt = `Você é um advogado brasileiro experiente. Gere uma PROCURAÇÃO ${tipo.toUpperCase()} completa e pronta para uso.

DADOS DOS OUTORGANTES:
${outorgantesTexto}

DADOS DOS OUTORGADOS:
${outorgadosTexto}

PODERES SELECIONADOS: ${poderes}
FORO: ${foro}

SIGA RIGOROSAMENTE ESTE FORMATO DE EXEMPLO:

PROCURAÇÃO ${tipo.toUpperCase()}

OUTORGANTE: MINOL TAKAMITTSU, brasileiro, casado, aposentado, nascido aos 31/07/1938, portador do RG no 2.366.632-8-SSP/SP e do CPF no 036.275.438-15, natural de Viradouro/SP, filho de Shinso Takamittsu e Kiva Takamittsu, residente e domiciliado na Rua Particular José Cavalheiro, 04, Bairro Vila Moraes, Cidade e Comarca de Mogi das Cruzes/SP - CEP: 08766-515, nomeia e constitui seus procuradores os advogados;

OUTORGADOS: DR. JOSÉ DOS PASSOS, advogado, brasileiro, casado, inscrito na OAB/SP sob o no 98.550, DR. FELIPE JOSÉ FERREIRA PASSOS, advogado, brasileiro, inscrito na OAB/SP sob o no 287.009, ambos com escritório de advocacia sito à Rua Santa Isabel-no 31- Mogi das Cruzes/SP.

PODERES: Amplos e gerais poderes de representação para o exercício do procuratório judicial e extrajudicial, atinentes a cláusula ad judicia et extra, em qualquer Juízo, instância ou Tribunal, podendo propor contra quem de direito as ações competentes e defender nas contrárias, seguindo umas e outras, até o final da decisão, usando dos recursos legais, conferindo-lhes ainda, os poderes especiais de confessar, desistir, transigir, firmar compromissos, ou acordos, receber e dar quitação, agindo em conjunto ou separadamente, podendo ainda, substabelecer esta em outra, com ou sem reserva de iguais poderes, dando tudo por bom, firme e valioso.


_________________________________
OUTORGANTE: MINOL TAKAMITTSU

AGORA GERE A PROCURAÇÃO USANDO OS DADOS FORNECIDOS ACIMA, SEGUINDO ESTAS REGRAS OBRIGATÓRIAS:

1. NUNCA use asteriscos (*), negrito, itálico ou qualquer formatação markdown
2. NUNCA inclua "Por ser verdade, assino o presente instrumento" ou frase similar
3. NUNCA inclua campo de data ou local e data
4. NUNCA inclua campo de assinatura para advogados/outorgados, SOMENTE para outorgante(s)/cliente(s)
5. Os nomes devem estar em MAIÚSCULAS na primeira menção
6. Cada seção (OUTORGANTE, OUTORGADOS, PODERES) deve ser um parágrafo separado
7. O título "PROCURAÇÃO ${tipo.toUpperCase()}" deve ficar sozinho na primeira linha (centralizado)
8. Se houver múltiplos outorgantes, use um parágrafo separado para cada, começando com "OUTORGANTE:"
9. Todos os outorgados devem estar no MESMO parágrafo começando com "OUTORGADOS:", separados por vírgula, com "DR." antes de cada nome
10. Os poderes devem ser em texto corrido em parágrafo único, sem listas ou bullets
11. Use "no" (e não "nº") para números de documentos
12. O parágrafo do OUTORGANTE deve terminar com "nomeia e constitui seus procuradores os advogados;"
13. Ao final, coloque apenas linha(s) de assinatura para cada OUTORGANTE no formato:
_________________________________
OUTORGANTE: [NOME]
14. Gere APENAS o texto da procuração, sem explicações ou comentários antes ou depois`;

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
