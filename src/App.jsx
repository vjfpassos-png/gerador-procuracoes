import { useState, useEffect, useRef } from "react";
import mammoth from "mammoth";
import JSZip from "jszip";

// ─── Constants ───
const TIPOS_PROCURACAO = [
  { id: "ad_judicia", label: "Ad Judicia", desc: "Representação em processos judiciais" },
  { id: "ad_negotia", label: "Ad Negotia", desc: "Representação em negócios e atos extrajudiciais" },
  { id: "ad_judicia_et_extra", label: "Ad Judicia et Extra", desc: "Poderes judiciais e extrajudiciais combinados" },
  { id: "publica", label: "Pública", desc: "Para atos que exigem escritura pública" },
];

const PODERES_COMUNS = {
  ad_judicia: [
    "Poderes da cláusula 'ad judicia'",
    "Poderes para o foro em geral",
    "Poderes especiais para confessar, reconhecer a procedência do pedido, transigir, desistir, renunciar ao direito sobre o qual se funda a ação, receber, dar quitação, firmar compromisso e assinar declaração de hipossuficiência econômica",
    "Poderes para substabelecer com ou sem reserva de poderes",
  ],
  ad_negotia: [
    "Poderes para representar o outorgante perante quaisquer repartições públicas federais, estaduais e municipais",
    "Poderes para assinar contratos, recibos e documentos",
    "Poderes para movimentar contas bancárias, fazer depósitos, saques e transferências",
    "Poderes para comprar e vender bens móveis e imóveis",
  ],
  ad_judicia_et_extra: [
    "Poderes da cláusula 'ad judicia et extra'",
    "Poderes para o foro em geral e atos extrajudiciais",
    "Poderes especiais para confessar, transigir, desistir, renunciar, receber e dar quitação",
    "Poderes para substabelecer com ou sem reserva de poderes",
    "Poderes para representar perante repartições públicas e autarquias",
  ],
  publica: [
    "Poderes para representar o outorgante em todos os atos da vida civil",
    "Poderes para comprar, vender, permutar bens móveis e imóveis",
    "Poderes para assinar escrituras públicas e contratos particulares",
    "Poderes para movimentar contas e aplicações financeiras",
  ],
};

const VARIABLE_GUIDE = [
  { v: "{{NOME_OUTORGANTE}}", d: "Nome completo do outorgante" },
  { v: "{{NACIONALIDADE_OUTORGANTE}}", d: "Nacionalidade" },
  { v: "{{ESTADO_CIVIL}}", d: "Estado civil" },
  { v: "{{PROFISSAO_OUTORGANTE}}", d: "Profissão do outorgante" },
  { v: "{{CPF_OUTORGANTE}}", d: "CPF do outorgante" },
  { v: "{{RG_OUTORGANTE}}", d: "RG do outorgante" },
  { v: "{{ORGAO_EXPEDIDOR}}", d: "Órgão expedidor do RG" },
  { v: "{{ENDERECO_OUTORGANTE}}", d: "Endereço completo" },
  { v: "{{OUTORGANTES}}", d: "Dados de todos os outorgantes" },
  { v: "{{OUTORGADOS}}", d: "Dados de todos os outorgados" },
  { v: "{{PODERES}}", d: "Descrição dos poderes concedidos" },
  { v: "{{FORO}}", d: "Comarca / Foro eleito" },
  { v: "{{DATA}}", d: "Data por extenso" },
];

// ─── Design Tokens ───
const tk = {
  bg: "#0C0F14", surface: "#151921", border: "#252D3A", borderFocus: "#C9A96E",
  accent: "#C9A96E", accentDark: "#A8863A", accentLight: "#E8D5A8",
  text: "#E8E6E1", textMuted: "#8A8F9C", textDim: "#5A5F6C",
  danger: "#D4645C", success: "#6BAF7B",
};
const serif = "'Cormorant Garamond', Georgia, serif";
const sans = "'DM Sans', 'Helvetica Neue', sans-serif";

const inputBase = {
  width: "100%", padding: "12px 16px", background: tk.surface,
  border: `1px solid ${tk.border}`, borderRadius: "8px", color: tk.text,
  fontSize: "14px", fontFamily: sans, outline: "none",
  transition: "border-color 0.2s, box-shadow 0.2s", boxSizing: "border-box",
};
const lbl = {
  display: "block", fontSize: "12px", fontWeight: 600, color: tk.textMuted,
  marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: sans,
};
const btnP = {
  padding: "14px 32px", background: `linear-gradient(135deg, ${tk.accent}, ${tk.accentDark})`,
  color: tk.bg, border: "none", borderRadius: "8px", fontSize: "15px", fontWeight: 700,
  fontFamily: sans, cursor: "pointer", transition: "transform 0.15s, box-shadow 0.2s",
};
const btnS = {
  padding: "12px 24px", background: "transparent", color: tk.accent,
  border: `1px solid ${tk.border}`, borderRadius: "8px", fontSize: "14px",
  fontWeight: 600, fontFamily: sans, cursor: "pointer", transition: "all 0.2s",
};

// ─── Helpers ───
const emptyOutorgante = () => ({ nome: "", nacionalidade: "brasileiro(a)", estadoCivil: "", profissao: "", cpf: "", rg: "", orgaoExpedidor: "", endereco: "" });
const emptyOutorgado = () => ({ nome: "", nacionalidade: "brasileiro(a)", profissao: "", cpf: "", oab: "", endereco: "" });

function buildVarMap(form) {
  const foro = form.foro || "";
  const poderes = [...(form.poderesSelecionados || []), ...(form.poderesExtras ? [form.poderesExtras] : [])].join("; ");
  const meses = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
  const now = new Date();
  const outorgadosTexto = form.outorgados.map((o, i) => {
    let t = `${o.nome}, ${o.nacionalidade}, ${o.profissao}, CPF ${o.cpf}`;
    if (o.oab) t += `, OAB ${o.oab}`;
    const end = i === 0 ? o.endereco : (o.endereco || form.outorgados[0].endereco);
    if (end) t += `, com endereço profissional em ${end}`;
    return t;
  }).join("; e ");
  const outorgantesTexto = form.outorgantes.map(o => {
    return `${o.nome}, ${o.nacionalidade}, ${o.estadoCivil}, ${o.profissao}, CPF ${o.cpf}, RG ${o.rg} - ${o.orgaoExpedidor}, residente em ${o.endereco}`;
  }).join("; e ");
  const o1 = form.outorgantes[0] || {};
  return {
    "{{NOME_OUTORGANTE}}": o1.nome || "",
    "{{NACIONALIDADE_OUTORGANTE}}": o1.nacionalidade || "",
    "{{ESTADO_CIVIL}}": o1.estadoCivil || "",
    "{{PROFISSAO_OUTORGANTE}}": o1.profissao || "",
    "{{CPF_OUTORGANTE}}": o1.cpf || "",
    "{{RG_OUTORGANTE}}": o1.rg || "",
    "{{ORGAO_EXPEDIDOR}}": o1.orgaoExpedidor || "",
    "{{ENDERECO_OUTORGANTE}}": o1.endereco || "",
    "{{OUTORGANTES}}": outorgantesTexto,
    "{{OUTORGADOS}}": outorgadosTexto,
    "{{NOME_OUTORGADO}}": form.outorgados[0]?.nome || "",
    "{{NACIONALIDADE_OUTORGADO}}": form.outorgados[0]?.nacionalidade || "",
    "{{PROFISSAO_OUTORGADO}}": form.outorgados[0]?.profissao || "",
    "{{CPF_OUTORGADO}}": form.outorgados[0]?.cpf || "",
    "{{OAB_OUTORGADO}}": form.outorgados[0]?.oab || "",
    "{{ENDERECO_OUTORGADO}}": form.outorgados[0]?.endereco || "",
    "{{PODERES}}": poderes,
    "{{FORO}}": foro,
    "{{DATA}}": `${now.getDate()} de ${meses[now.getMonth()]} de ${now.getFullYear()}`,
  };
}

// ─── PDF Generator with Letterhead ───
async function extrairTimbrado(arrayBuffer) {
  try {
    const zip = await JSZip.loadAsync(arrayBuffer);

    // Extract ALL images from the docx (logos etc)
    let logoBase64 = "";
    const mediaFiles = Object.keys(zip.files).filter(n => n.startsWith("word/media/"));
    if (mediaFiles.length > 0) {
      const imgFile = mediaFiles[0];
      const ext = imgFile.split(".").pop().toLowerCase();
      const mimeMap = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", bmp: "image/bmp", emf: "image/emf", wmf: "image/wmf" };
      const mime = mimeMap[ext] || "image/png";
      const imgData = await zip.file(imgFile).async("base64");
      logoBase64 = `data:${mime};base64,${imgData}`;
    }

    // Extract header text - check all header files, use the one with most content
    let headerText = "";
    let headerMaxLen = 0;
    const headerFiles = Object.keys(zip.files).filter(n => n.match(/word\/header\d*\.xml/));
    for (const hf of headerFiles) {
      const xml = await zip.file(hf).async("string");
      // Extract text per paragraph (each <w:p> is a line)
      const lines = [];
      xml.replace(/<w:p[^>]*>([\s\S]*?)<\/w:p>/g, (_, pContent) => {
        const texts = [];
        pContent.replace(/<w:t[^>]*>([^<]*)<\/w:t>/g, (__, t) => { texts.push(t); });
        if (texts.length > 0) lines.push(texts.join(""));
      });
      const joined = lines.join("\n").trim();
      if (joined.length > headerMaxLen) {
        headerMaxLen = joined.length;
        headerText = joined;
      }
    }

    // Extract footer text - same approach
    let footerText = "";
    let footerMaxLen = 0;
    const footerFiles = Object.keys(zip.files).filter(n => n.match(/word\/footer\d*\.xml/));
    for (const ff of footerFiles) {
      const xml = await zip.file(ff).async("string");
      const lines = [];
      xml.replace(/<w:p[^>]*>([\s\S]*?)<\/w:p>/g, (_, pContent) => {
        const texts = [];
        pContent.replace(/<w:t[^>]*>([^<]*)<\/w:t>/g, (__, t) => { texts.push(t); });
        if (texts.length > 0) lines.push(texts.join(""));
      });
      const joined = lines.join(" | ").trim();
      if (joined.length > footerMaxLen) {
        footerMaxLen = joined.length;
        footerText = joined;
      }
    }

    return { logoBase64, headerText, footerText };
  } catch (err) {
    console.error("Erro ao extrair timbrado:", err);
    return { logoBase64: "", headerText: "", footerText: "" };
  }
}

async function gerarPDF(texto, templateArrayBuffer, templateExt) {
  let logo = "";
  let header = "";
  let footer = "";

  if (templateArrayBuffer && templateExt === ".docx") {
    const timbrado = await extrairTimbrado(templateArrayBuffer);
    logo = timbrado.logoBase64;
    header = timbrado.headerText;
    footer = timbrado.footerText;
  }

  const safeTexto = texto.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const safeHeader = header.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>");
  const safeFooter = footer.replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
  @page { size: A4; margin: ${(logo || header) ? "1cm" : "2cm"} 2.5cm 2cm 2.5cm; }
  @media print { .no-print { display: none; } }
  body { font-family: 'Times New Roman', Georgia, serif; font-size: 12pt; line-height: 1.7; color: #000; margin: 0; padding: 0; }
  .letterhead { text-align: center; padding: 10px 0 14px 0; margin-bottom: 20px; border-bottom: 2px solid #333; }
  .letterhead img { max-height: 90px; max-width: 350px; margin-bottom: 10px; display: block; margin-left: auto; margin-right: auto; }
  .letterhead .header-text { font-size: 9pt; color: #333; line-height: 1.6; }
  .content { white-space: pre-wrap; text-align: justify; }
  .footer { position: fixed; bottom: 0; left: 0; right: 0; text-align: center; font-size: 8pt; color: #666; padding: 8px 2.5cm; border-top: 1px solid #ccc; }
</style></head><body>
${(logo || header) ? `<div class="letterhead">
  ${logo ? `<img src="${logo}" alt="Logo" />` : ""}
  ${header ? `<div class="header-text">${safeHeader}</div>` : ""}
</div>` : ""}
<div class="content">${safeTexto}</div>
${footer ? `<div class="footer">${safeFooter}</div>` : ""}
</body></html>`;

  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const w = window.open(url, "_blank");
  if (w) {
    w.onload = () => { w.print(); };
  } else {
    const a = document.createElement("a");
    a.href = url;
    a.download = "procuracao.html";
    a.click();
  }
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

// ─── Mask Helpers ───
function maskCPF(v) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0,3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6)}`;
  return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`;
}

function maskRG(v) {
  const d = v.replace(/\D/g, "").slice(0, 9);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0,2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5)}`;
  return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}-${d.slice(8)}`;
}

function maskOAB(v) {
  let clean = v.toUpperCase();
  const match = clean.match(/^(OAB)?[\/\s]*([A-Z]{0,2})[\/\s]*(\d{0,6})/);
  if (!match) return clean.slice(0, 16);
  const uf = match[2] || "";
  const num = match[3] || "";
  let result = "OAB";
  if (uf) result += `/${uf}`;
  if (num) {
    if (num.length <= 3) result += ` ${num}`;
    else result += ` ${num.slice(0,3)}.${num.slice(3)}`;
  }
  return result;
}

function MaskedInput({ label, value, onChange, placeholder, required, mask }) {
  const [f, setF] = useState(false);
  return (
    <div style={{ marginBottom: "16px" }}>
      <label style={lbl}>{label}{required && <span style={{ color: tk.danger }}> *</span>}</label>
      <input value={value} onChange={e => onChange(mask ? mask(e.target.value) : e.target.value)} placeholder={placeholder}
        onFocus={() => setF(true)} onBlur={() => setF(false)}
        style={{ ...inputBase, borderColor: f ? tk.borderFocus : tk.border, boxShadow: f ? `0 0 0 3px ${tk.accent}22` : "none" }} />
    </div>
  );
}

// ─── Reusable UI ───
function Input({ label, value, onChange, placeholder, required }) {
  const [f, setF] = useState(false);
  return (
    <div style={{ marginBottom: "16px" }}>
      <label style={lbl}>{label}{required && <span style={{ color: tk.danger }}> *</span>}</label>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        onFocus={() => setF(true)} onBlur={() => setF(false)}
        style={{ ...inputBase, borderColor: f ? tk.borderFocus : tk.border, boxShadow: f ? `0 0 0 3px ${tk.accent}22` : "none" }} />
    </div>
  );
}

function Select({ label, value, onChange, options, required }) {
  const [f, setF] = useState(false);
  return (
    <div style={{ marginBottom: "16px" }}>
      <label style={lbl}>{label}{required && <span style={{ color: tk.danger }}> *</span>}</label>
      <select value={value} onChange={e => onChange(e.target.value)}
        onFocus={() => setF(true)} onBlur={() => setF(false)}
        style={{ ...inputBase, borderColor: f ? tk.borderFocus : tk.border, appearance: "none",
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%238A8F9C' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
          backgroundRepeat: "no-repeat", backgroundPosition: "right 14px center", paddingRight: "40px" }}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function Area({ label, value, onChange, placeholder, rows = 3, required }) {
  const [f, setF] = useState(false);
  return (
    <div style={{ marginBottom: "16px" }}>
      <label style={lbl}>{label}{required && <span style={{ color: tk.danger }}> *</span>}</label>
      <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows}
        onFocus={() => setF(true)} onBlur={() => setF(false)}
        style={{ ...inputBase, resize: "vertical", minHeight: "80px", borderColor: f ? tk.borderFocus : tk.border, boxShadow: f ? `0 0 0 3px ${tk.accent}22` : "none" }} />
    </div>
  );
}

function Steps({ current, total }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "4px", marginBottom: "32px", flexWrap: "wrap" }}>
      {Array.from({ length: total }, (_, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <div style={{
            width: "30px", height: "30px", borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "12px", fontWeight: 700, fontFamily: sans,
            background: i <= current ? tk.accent : "transparent",
            color: i <= current ? tk.bg : tk.textDim,
            border: `2px solid ${i <= current ? tk.accent : tk.border}`,
            transition: "all 0.3s ease",
          }}>
            {i < current ? "✓" : i + 1}
          </div>
          {i < total - 1 && <div style={{ width: "20px", height: "2px", background: i < current ? tk.accent : tk.border }} />}
        </div>
      ))}
    </div>
  );
}

function H2({ children }) { return <h2 style={{ fontFamily: serif, fontSize: "28px", fontWeight: 600, color: tk.text, marginBottom: "8px" }}>{children}</h2>; }
function Sub({ children }) { return <p style={{ fontFamily: sans, fontSize: "14px", color: tk.textMuted, marginBottom: "28px" }}>{children}</p>; }

// ─── Step 1: Tipo ───
function StepTipo({ form, setForm }) {
  return (
    <div>
      <H2>Tipo de Procuração</H2><Sub>Selecione o modelo adequado</Sub>
      <div style={{ display: "grid", gap: "12px" }}>
        {TIPOS_PROCURACAO.map(tipo => {
          const sel = form.tipo === tipo.id;
          return (
            <div key={tipo.id} onClick={() => setForm(f => ({ ...f, tipo: tipo.id }))}
              style={{ padding: "20px", borderRadius: "10px", cursor: "pointer", transition: "all 0.2s",
                border: `2px solid ${sel ? tk.accent : tk.border}`, background: sel ? `${tk.accent}0A` : tk.surface }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ width: "20px", height: "20px", borderRadius: "50%",
                  border: `2px solid ${sel ? tk.accent : tk.border}`,
                  display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {sel && <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: tk.accent }} />}
                </div>
                <div>
                  <div style={{ fontFamily: sans, fontSize: "16px", fontWeight: 600, color: tk.text }}>{tipo.label}</div>
                  <div style={{ fontFamily: sans, fontSize: "13px", color: tk.textMuted, marginTop: "2px" }}>{tipo.desc}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Step 2: Template ───
function StepTemplate({ form, setForm }) {
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef(null);

  const allowedExts = [".docx", ".doc", ".pdf"];
  const getExt = (name) => name ? "." + name.split(".").pop().toLowerCase() : "";

  const parse = async (file) => {
    if (!file) return;
    setError("");
    const ext = getExt(file.name);
    if (!allowedExts.includes(ext)) {
      setError("Formato não suportado. Envie um .docx, .doc ou .pdf");
      return;
    }
    const ab = await file.arrayBuffer();
    setForm(f => ({ ...f, templateFile: file, templateFileName: file.name, templateArrayBuffer: ab, templateExt: ext }));
  };

  const remove = () => {
    setForm(f => ({ ...f, templateFile: null, templateFileName: "", templateArrayBuffer: null, templateExt: "" }));
    setError("");
  };

  const ext = form.templateExt || "";
  const isDocx = ext === ".docx";

  return (
    <div>
      <H2>Papel Timbrado</H2><Sub>Use o papel timbrado de um documento existente ou gere sem timbrado</Sub>
      <div style={{ display: "flex", gap: "8px", marginBottom: "24px" }}>
        {[{ id: "ai", label: "Sem timbrado", icon: "✦" }, { id: "template", label: "Usar meu timbrado", icon: "↑" }].map(m => (
          <button key={m.id} onClick={() => setForm(f => ({ ...f, templateMode: m.id }))}
            style={{ flex: 1, padding: "14px", borderRadius: "10px",
              border: `2px solid ${form.templateMode === m.id ? tk.accent : tk.border}`,
              background: form.templateMode === m.id ? `${tk.accent}0A` : tk.surface,
              color: form.templateMode === m.id ? tk.accent : tk.textMuted,
              fontFamily: sans, fontSize: "14px", fontWeight: 600, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
            <span style={{ fontSize: "18px" }}>{m.icon}</span>{m.label}
          </button>
        ))}
      </div>

      {form.templateMode === "template" && (
        <>
          {!form.templateFileName ? (
            <div onDragOver={e => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) parse(f); }}
              onClick={() => fileRef.current?.click()}
              style={{ border: `2px dashed ${dragOver ? tk.accent : tk.border}`, borderRadius: "12px", padding: "48px 24px",
                textAlign: "center", cursor: "pointer", background: dragOver ? `${tk.accent}08` : "transparent" }}>
              <div style={{ fontSize: "36px", marginBottom: "12px", opacity: 0.6 }}>📄</div>
              <div style={{ fontFamily: sans, fontSize: "15px", color: tk.text, fontWeight: 600, marginBottom: "6px" }}>Arraste um documento com seu papel timbrado</div>
              <div style={{ fontFamily: sans, fontSize: "13px", color: tk.textMuted }}>Aceita .docx, .doc ou .pdf — pode ser qualquer documento do escritório</div>
              <input ref={fileRef} type="file" accept=".docx,.doc,.pdf" onChange={e => { if (e.target.files[0]) parse(e.target.files[0]); }} style={{ display: "none" }} />
            </div>
          ) : (
            <div style={{ background: tk.surface, borderRadius: "10px", border: `1px solid ${tk.accent}44`, padding: "16px 20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ fontSize: "20px" }}>{ext === ".pdf" ? "📕" : "📄"}</span>
                  <div>
                    <div style={{ fontFamily: sans, fontSize: "14px", fontWeight: 600, color: tk.text }}>{form.templateFileName}</div>
                    <div style={{ fontFamily: sans, fontSize: "12px", color: tk.success }}>✓ Arquivo carregado</div>
                  </div>
                </div>
                <button onClick={remove} style={{ background: "none", border: "none", color: tk.danger, cursor: "pointer", fontSize: "18px" }}>✕</button>
              </div>
              <div style={{ padding: "12px 16px", background: `${tk.accent}08`, borderRadius: "8px", border: `1px solid ${tk.accent}22` }}>
                {isDocx ? (
                  <div style={{ fontFamily: sans, fontSize: "12px", color: tk.textMuted, lineHeight: "1.6" }}>
                    O cabeçalho, rodapé, logo e formatação serão preservados. O conteúdo será substituído pela nova procuração gerada por IA.
                  </div>
                ) : (
                  <div style={{ fontFamily: sans, fontSize: "12px", color: tk.textMuted, lineHeight: "1.6" }}>
                    <span style={{ color: tk.accent, fontWeight: 600 }}>Formato {ext.toUpperCase().replace(".", "")}</span> — A procuração será gerada por IA normalmente. Para download com papel timbrado incorporado, use um arquivo .docx.
                    Você ainda poderá copiar o texto ou salvar como PDF.
                  </div>
                )}
              </div>
            </div>
          )}
          {error && <div style={{ color: tk.danger, fontSize: "13px", marginTop: "8px" }}>{error}</div>}
        </>
      )}

      {form.templateMode === "ai" && (
        <div style={{ padding: "24px", borderRadius: "10px", border: `1px solid ${tk.border}`, background: tk.surface, textAlign: "center" }}>
          <div style={{ fontSize: "32px", marginBottom: "12px" }}>✦</div>
          <div style={{ fontFamily: sans, fontSize: "15px", fontWeight: 600, color: tk.text, marginBottom: "6px" }}>Geração sem timbrado</div>
          <div style={{ fontFamily: sans, fontSize: "13px", color: tk.textMuted, maxWidth: "360px", margin: "0 auto" }}>
            A procuração será gerada pela IA em formato texto. Você pode copiar, salvar como PDF ou colar no seu modelo.
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Step 3: Outorgantes (multiple) ───
function StepOutorgantes({ form, setForm }) {
  const outorgantes = form.outorgantes;

  const update = (idx, key, val) => {
    setForm(f => {
      const updated = [...f.outorgantes];
      updated[idx] = { ...updated[idx], [key]: val };
      return { ...f, outorgantes: updated };
    });
  };

  const add = () => setForm(f => ({ ...f, outorgantes: [...f.outorgantes, emptyOutorgante()] }));

  const remove = (idx) => {
    if (outorgantes.length <= 1) return;
    setForm(f => ({ ...f, outorgantes: f.outorgantes.filter((_, i) => i !== idx) }));
  };

  return (
    <div>
      <H2>Dados do{outorgantes.length > 1 ? "s" : ""} Outorgante{outorgantes.length > 1 ? "s" : ""}</H2>
      <Sub>Quem concede os poderes</Sub>

      {outorgantes.map((o, idx) => (
        <div key={idx} style={{
          padding: "20px", background: tk.surface, borderRadius: "10px",
          border: `1px solid ${tk.border}`, marginBottom: "16px",
        }}>
          {outorgantes.length > 1 && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div style={{ fontFamily: sans, fontSize: "14px", fontWeight: 700, color: tk.accent }}>
                Outorgante {idx + 1}
              </div>
              <button onClick={() => remove(idx)}
                style={{ background: "none", border: `1px solid ${tk.danger}44`, color: tk.danger,
                  borderRadius: "6px", padding: "4px 12px", fontSize: "12px", fontFamily: sans,
                  cursor: "pointer", fontWeight: 600 }}>
                Remover
              </button>
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
            <div style={{ gridColumn: "1/-1" }}><Input label="Nome completo" value={o.nome} onChange={v => update(idx, "nome", v)} placeholder="Nome completo" required /></div>
            <Input label="Nacionalidade" value={o.nacionalidade} onChange={v => update(idx, "nacionalidade", v)} placeholder="Brasileiro(a)" required />
            <Select label="Estado Civil" value={o.estadoCivil} onChange={v => update(idx, "estadoCivil", v)} required options={[
              { value: "", label: "Selecione..." }, { value: "solteiro(a)", label: "Solteiro(a)" },
              { value: "casado(a)", label: "Casado(a)" }, { value: "divorciado(a)", label: "Divorciado(a)" },
              { value: "viúvo(a)", label: "Viúvo(a)" }, { value: "união estável", label: "União Estável" },
            ]} />
            <Input label="Profissão" value={o.profissao} onChange={v => update(idx, "profissao", v)} placeholder="Profissão" required />
            <MaskedInput label="CPF" value={o.cpf} onChange={v => update(idx, "cpf", v)} placeholder="000.000.000-00" required mask={maskCPF} />
            <MaskedInput label="RG" value={o.rg} onChange={v => update(idx, "rg", v)} placeholder="00.000.000-0" required mask={maskRG} />
            <Input label="Órgão Expedidor" value={o.orgaoExpedidor} onChange={v => update(idx, "orgaoExpedidor", v)} placeholder="SSP/SP" required />
            <div style={{ gridColumn: "1/-1" }}><Input label="Endereço completo" value={o.endereco} onChange={v => update(idx, "endereco", v)} placeholder="Rua, nº, bairro, cidade, UF, CEP" required /></div>
          </div>
        </div>
      ))}

      <button onClick={add}
        style={{ ...btnS, width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
          borderStyle: "dashed", padding: "14px" }}>
        + Adicionar outorgante
      </button>
    </div>
  );
}

// ─── Step 4: Outorgados (multiple) ───
function StepOutorgados({ form, setForm }) {
  const isAdv = form.tipo === "ad_judicia" || form.tipo === "ad_judicia_et_extra";
  const outorgados = form.outorgados;

  const update = (idx, key, val) => {
    setForm(f => {
      const updated = [...f.outorgados];
      updated[idx] = { ...updated[idx], [key]: val };
      return { ...f, outorgados: updated };
    });
  };

  const addOutorgado = () => {
    setForm(f => ({ ...f, outorgados: [...f.outorgados, emptyOutorgado()] }));
  };

  const removeOutorgado = (idx) => {
    if (outorgados.length <= 1) return;
    setForm(f => ({ ...f, outorgados: f.outorgados.filter((_, i) => i !== idx) }));
  };

  return (
    <div>
      <H2>Dados do{outorgados.length > 1 ? "s" : ""} Outorgado{outorgados.length > 1 ? "s" : ""}</H2>
      <Sub>{isAdv ? "Advogado(s) que receberá(ão) os poderes" : "Quem receberá os poderes"}</Sub>

      {outorgados.map((o, idx) => (
        <div key={idx} style={{
          padding: "20px", background: tk.surface, borderRadius: "10px",
          border: `1px solid ${tk.border}`, marginBottom: "16px",
        }}>
          {outorgados.length > 1 && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div style={{ fontFamily: sans, fontSize: "14px", fontWeight: 700, color: tk.accent }}>
                {isAdv ? `Advogado(a) ${idx + 1}` : `Outorgado ${idx + 1}`}
              </div>
              <button onClick={() => removeOutorgado(idx)}
                style={{ background: "none", border: `1px solid ${tk.danger}44`, color: tk.danger,
                  borderRadius: "6px", padding: "4px 12px", fontSize: "12px", fontFamily: sans,
                  cursor: "pointer", fontWeight: 600 }}>
                Remover
              </button>
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
            <div style={{ gridColumn: "1/-1" }}>
              <Input label="Nome completo" value={o.nome} onChange={v => update(idx, "nome", v)} placeholder={isAdv ? "Nome do(a) advogado(a)" : "Nome completo"} required />
            </div>
            <Input label="Nacionalidade" value={o.nacionalidade} onChange={v => update(idx, "nacionalidade", v)} placeholder="Brasileiro(a)" required />
            <Input label="Profissão" value={o.profissao} onChange={v => update(idx, "profissao", v)} placeholder={isAdv ? "Advogado(a)" : "Profissão"} required />
            <MaskedInput label="CPF" value={o.cpf} onChange={v => update(idx, "cpf", v)} placeholder="000.000.000-00" required mask={maskCPF} />
            {isAdv && <MaskedInput label="OAB" value={o.oab} onChange={v => update(idx, "oab", v)} placeholder="OAB/SP 000.000" required mask={maskOAB} />}
            {idx === 0 && (
              <div style={{ gridColumn: "1/-1" }}>
                <Input label="Endereço profissional" value={o.endereco} onChange={v => update(idx, "endereco", v)} placeholder="Rua, nº, bairro, cidade, UF, CEP" required />
              </div>
            )}
          </div>
        </div>
      ))}

      <button onClick={addOutorgado}
        style={{ ...btnS, width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
          borderStyle: "dashed", padding: "14px" }}>
        + Adicionar {isAdv ? "advogado(a)" : "outorgado"}
      </button>
    </div>
  );
}

// ─── Step 5: Poderes ───
function StepPoderes({ form, setForm }) {
  const sugestoes = PODERES_COMUNS[form.tipo] || [];
  const toggle = p => {
    setForm(f => {
      const c = f.poderesSelecionados || [];
      return { ...f, poderesSelecionados: c.includes(p) ? c.filter(x => x !== p) : [...c, p] };
    });
  };
  return (
    <div>
      <H2>Poderes</H2><Sub>Selecione ou adicione poderes personalizados</Sub>
      <div style={{ marginBottom: "20px" }}>
        <label style={{ ...lbl, marginBottom: "12px" }}>Poderes sugeridos</label>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {sugestoes.map((p, i) => {
            const sel = (form.poderesSelecionados || []).includes(p);
            return (
              <div key={i} onClick={() => toggle(p)} style={{
                padding: "14px 16px", borderRadius: "8px", cursor: "pointer",
                border: `1px solid ${sel ? tk.accent : tk.border}`,
                background: sel ? `${tk.accent}0D` : tk.surface,
                display: "flex", alignItems: "flex-start", gap: "12px" }}>
                <div style={{ width: "20px", height: "20px", minWidth: "20px", borderRadius: "4px", marginTop: "1px",
                  border: `2px solid ${sel ? tk.accent : tk.border}`, background: sel ? tk.accent : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "12px", color: tk.bg, fontWeight: 700 }}>
                  {sel && "✓"}
                </div>
                <span style={{ fontFamily: sans, fontSize: "14px", color: tk.text, lineHeight: "1.5" }}>{p}</span>
              </div>
            );
          })}
        </div>
      </div>
      <Area label="Poderes adicionais (opcional)" value={form.poderesExtras || ""} onChange={v => setForm(f => ({ ...f, poderesExtras: v }))} placeholder="Descreva poderes específicos..." />
      <Input label="Foro" value={form.foro || ""} onChange={v => setForm(f => ({ ...f, foro: v }))} placeholder="Ex: Comarca de Mogi das Cruzes/SP" required />
    </div>
  );
}

// ─── Step 6: Revisão e Geração ───
function StepRevisao({ form, resultado, loading, onGerar, onGerarDocx, onGerarPDF, docxReady, copied }) {
  const tipoLabel = TIPOS_PROCURACAO.find(x => x.id === form.tipo)?.label || form.tipo;
  const foro = form.foro || "";

  const outorgantesSummary = form.outorgantes.map(o => {
    return `${o.nome}, ${o.nacionalidade}, ${o.estadoCivil}, ${o.profissao}, CPF ${o.cpf}`;
  }).join("\n");

  const outorgadosSummary = form.outorgados.map(o => {
    let t = `${o.nome}, ${o.profissao}`;
    if (o.oab) t += `, OAB ${o.oab}`;
    t += `, CPF ${o.cpf}`;
    return t;
  }).join("\n");

  const cards = [
    { t: "Tipo", c: tipoLabel },
    { t: "Timbrado", c: form.templateMode === "template" ? `📄 ${form.templateFileName}` : "Sem timbrado" },
    { t: `Outorgante${form.outorgantes.length > 1 ? "s" : ""} (${form.outorgantes.length})`, c: outorgantesSummary },
    { t: `Outorgado${form.outorgados.length > 1 ? "s" : ""} (${form.outorgados.length})`, c: outorgadosSummary },
    { t: "Foro", c: foro },
  ];

  return (
    <div>
      <H2>Revisão e Geração</H2><Sub>Confira os dados antes de gerar</Sub>
      <div style={{ display: "grid", gap: "12px", marginBottom: "28px" }}>
        {cards.map((card, i) => (
          <div key={i} style={{ padding: "14px 18px", background: tk.surface, borderRadius: "8px", borderLeft: `3px solid ${tk.accent}` }}>
            <div style={{ fontSize: "11px", fontWeight: 700, color: tk.textMuted, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: sans, marginBottom: "4px" }}>{card.t}</div>
            <div style={{ fontSize: "14px", color: tk.text, fontFamily: sans, lineHeight: "1.5", whiteSpace: "pre-wrap" }}>{card.c}</div>
          </div>
        ))}
      </div>

      {!resultado && (
        <button onClick={onGerar} disabled={loading}
          style={{ ...btnP, width: "100%", opacity: loading ? 0.7 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" }}>
          {loading ? (
            <><span style={{ width: "18px", height: "18px", border: "2px solid transparent", borderTop: `2px solid ${tk.bg}`, borderRadius: "50%", animation: "spin 0.8s linear infinite", display: "inline-block" }} />
              Gerando procuração...</>
          ) : (
            <>⚖ Gerar Procuração</>
          )}
        </button>
      )}

      {resultado && (
        <>
          <div style={{ marginTop: "20px", padding: "28px", background: "#FDFBF7", borderRadius: "10px",
            border: `1px solid ${tk.accentLight}`, color: "#1A1A1A",
            fontFamily: "Georgia, serif", fontSize: "14px", lineHeight: "1.8",
            whiteSpace: "pre-wrap", maxHeight: "420px", overflowY: "auto" }}>
            {resultado}
          </div>
          <div style={{ display: "flex", gap: "10px", marginTop: "16px", flexWrap: "wrap" }}>
            <button onClick={() => { navigator.clipboard.writeText(resultado); }}
              style={{ ...btnS, flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
              {copied ? "✓ Copiado!" : "📋 Copiar texto"}
            </button>
            <button onClick={onGerarPDF}
              style={{ ...btnP, flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
              📄 {form.templateMode === "template" && form.templateArrayBuffer ? "Salvar PDF com timbrado" : "Salvar PDF"}
            </button>
            {form.templateMode === "template" && form.templateArrayBuffer && form.templateExt === ".docx" && (
              <button onClick={onGerarDocx} style={{ ...btnS, flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", borderColor: tk.accent }}>
                {docxReady ? "✓ Baixado!" : "📥 Baixar .docx com timbrado"}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Main App ───
export default function App() {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState("");
  const [docxReady, setDocxReady] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef(null);

  const [form, setForm] = useState({
    tipo: "ad_judicia", templateMode: "ai",
    templateFile: null, templateFileName: "", templateArrayBuffer: null, templateExt: "",
    outorgantes: [emptyOutorgante()],
    outorgados: [emptyOutorgado()],
    poderesSelecionados: [], poderesExtras: "", foro: "",
  });

  const N = 6;
  useEffect(() => { ref.current?.scrollTo({ top: 0, behavior: "smooth" }); }, [step]);

  const handleCopy = () => {
    navigator.clipboard.writeText(resultado);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const gerar = async () => {
    setLoading(true); setResultado(""); setDocxReady(false); setCopied(false);
    const tipoLabel = TIPOS_PROCURACAO.find(x => x.id === form.tipo)?.label || form.tipo;
    const foro = form.foro || "";
    const poderes = [...(form.poderesSelecionados || []), ...(form.poderesExtras ? [form.poderesExtras] : [])].join(";\n");

    try {
      const res = await fetch("/.netlify/functions/gerar-procuracao", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo: tipoLabel,
          outorgantes: form.outorgantes,
          outorgados: form.outorgados,
          poderes,
          foro,
        }),
      });
      const data = await res.json();
      if (data.error) {
        setResultado("Erro da API: " + data.error);
      } else if (data.content && data.content.length > 0) {
        setResultado(data.content.map(b => b.text || "").join("\n"));
      } else {
        setResultado("Resposta inesperada: " + JSON.stringify(data).substring(0, 500));
      }
    } catch (err) { setResultado("Erro ao conectar: " + err.message); }
    setLoading(false);
  };

  const gerarDocx = async () => {
    if (!form.templateArrayBuffer || !resultado || form.templateExt !== ".docx") return;
    try {
      const zip = await JSZip.loadAsync(form.templateArrayBuffer);

      // Validate docx structure
      const docFile = zip.file("word/document.xml");
      if (!docFile) {
        alert("Erro: o arquivo não parece ser um .docx válido. Verifique se o arquivo foi salvo no formato .docx (Word).");
        return;
      }

      const docXml = await docFile.async("string");

      const bodyMatch = docXml.match(/<w:body>([\s\S]*)<\/w:body>/);
      if (!bodyMatch) {
        alert("Erro: não foi possível localizar o corpo do documento.");
        return;
      }

      // Extract sectPr (section properties - contains header/footer references, margins, page size)
      const sectPrMatch = bodyMatch[1].match(/<w:sectPr[\s\S]*<\/w:sectPr>/);
      const sectPr = sectPrMatch ? sectPrMatch[0] : "";

      // Convert AI-generated text into proper docx XML paragraphs
      const lines = resultado.split("\n");
      const paragraphs = lines.map(line => {
        const trimmed = line.trim();
        if (!trimmed) {
          return `<w:p><w:pPr><w:spacing w:after="0"/></w:pPr></w:p>`;
        }
        const isTitle = trimmed === trimmed.toUpperCase() && trimmed.length < 80 && trimmed.length > 3 && !trimmed.startsWith("_");
        const isSigLine = trimmed.startsWith("____");
        const rPr = isTitle
          ? `<w:rPr><w:b/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr>`
          : `<w:rPr><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr>`;
        const pPr = isTitle
          ? `<w:pPr><w:jc w:val="center"/><w:spacing w:after="200"/></w:pPr>`
          : isSigLine
          ? `<w:pPr><w:jc w:val="center"/><w:spacing w:before="400" w:after="0"/></w:pPr>`
          : `<w:pPr><w:jc w:val="both"/><w:spacing w:after="120" w:line="360" w:lineRule="auto"/></w:pPr>`;
        const safeText = trimmed.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        return `<w:p>${pPr}<w:r>${rPr}<w:t xml:space="preserve">${safeText}</w:t></w:r></w:p>`;
      }).join("");

      const newBody = `<w:body>${paragraphs}${sectPr}</w:body>`;
      const newDocXml = docXml.replace(/<w:body>[\s\S]*<\/w:body>/, newBody);

      zip.file("word/document.xml", newDocXml);

      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `procuracao_${form.outorgantes[0]?.nome.replace(/\s+/g, "_") || "nova"}.docx`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url); setDocxReady(true);
    } catch (err) {
      console.error(err);
      alert("Erro ao gerar o .docx. Verifique se o arquivo enviado é um .docx válido salvo pelo Word.");
    }
  };

  const stepView = () => {
    switch (step) {
      case 0: return <StepTipo form={form} setForm={setForm} />;
      case 1: return <StepTemplate form={form} setForm={setForm} />;
      case 2: return <StepOutorgantes form={form} setForm={setForm} />;
      case 3: return <StepOutorgados form={form} setForm={setForm} />;
      case 4: return <StepPoderes form={form} setForm={setForm} />;
      case 5: return <StepRevisao form={form} resultado={resultado} loading={loading} onGerar={gerar} onGerarDocx={gerarDocx} onGerarPDF={() => gerarPDF(resultado, form.templateMode === "template" ? form.templateArrayBuffer : null, form.templateExt)} docxReady={docxReady} copied={copied} />;
      default: return null;
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: tk.bg, fontFamily: sans, color: tk.text,
      display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 20px" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=DM+Sans:wght@400;500;600;700&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        * { box-sizing: border-box; margin: 0; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${tk.border}; border-radius: 3px; }
        select option { background: ${tk.surface}; color: ${tk.text}; }
      `}</style>

      <div style={{ textAlign: "center", marginBottom: "36px" }}>
        <div style={{ fontSize: "13px", fontWeight: 700, color: tk.accent, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: "12px" }}>Gerador Inteligente</div>
        <h1 style={{ fontFamily: serif, fontSize: "42px", fontWeight: 600, color: tk.text, margin: 0, lineHeight: 1.1 }}>Procurações Jurídicas</h1>
        <p style={{ fontFamily: sans, fontSize: "15px", color: tk.textMuted, marginTop: "12px", maxWidth: "420px" }}>
          Gere com IA ou preencha seu template .docx automaticamente
        </p>
      </div>

      <div style={{ width: "100%", maxWidth: "660px", background: `${tk.surface}88`, backdropFilter: "blur(12px)",
        borderRadius: "16px", border: `1px solid ${tk.border}`, overflow: "hidden" }}>
        <div style={{ padding: "28px 32px 0" }}><Steps current={step} total={N} /></div>
        <div ref={ref} style={{ padding: "0 32px 28px", maxHeight: "60vh", overflowY: "auto", animation: "fadeIn 0.3s ease" }}>
          {stepView()}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", padding: "20px 32px",
          borderTop: `1px solid ${tk.border}`, background: `${tk.bg}88` }}>
          <button onClick={() => { setStep(s => s - 1); if (step === 5) { setResultado(""); setDocxReady(false); setCopied(false); } }}
            disabled={step === 0} style={{ ...btnS, opacity: step === 0 ? 0.3 : 1, cursor: step === 0 ? "default" : "pointer" }}>← Voltar</button>
          {step < N - 1 && (
            <button onClick={() => setStep(s => s + 1)} style={btnP}
              onMouseEnter={e => { e.target.style.transform = "translateY(-1px)"; e.target.style.boxShadow = `0 4px 20px ${tk.accent}44`; }}
              onMouseLeave={e => { e.target.style.transform = "none"; e.target.style.boxShadow = "none"; }}>Próximo →</button>
          )}
        </div>
      </div>
      <div style={{ marginTop: "32px", fontSize: "12px", color: tk.textDim, textAlign: "center" }}>
        Documento gerado por IA — revisão profissional recomendada antes do uso
      </div>
    </div>
  );
}
