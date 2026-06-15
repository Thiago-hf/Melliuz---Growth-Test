import { useState, useEffect } from 'react'
import { Database, GitBranch, ArrowRight, ExternalLink, RefreshCw, History, FileText, Download, Key } from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

function App() {
  const [analysisData, setAnalysisData] = useState(null)
  const [loadingFile, setLoadingFile] = useState(false)
  const [uploadedFileName, setUploadedFileName] = useState("")
  const [historyLog, setHistoryLog] = useState([])
  
  const [selectedAI, setSelectedAI] = useState("Méliuz Internal AI")
  const [apiKey, setApiKey] = useState("")

  const fetchHistory = async () => {
    try {
      const response = await fetch("http://localhost:8000/api/history")
      const data = await response.json()
      setHistoryLog(data.history || [])
    } catch (error) {
      console.error("Erro ao buscar histórico:", error)
    }
  }

  useEffect(() => {
    fetchHistory()
  }, [])

  const displayMetrics = analysisData?.metrics || []
  const partnerName = analysisData?.partner || "AWAITING_CORE_INGESTION"
  const winnerNode = analysisData?.winner || "NONE"

  const handleIngestFile = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    if (selectedAI !== "Méliuz Internal AI" && !apiKey.trim()) {
      alert(`⚠️ Operação Bloqueada: Por favor, insira a API Key para utilizar o modelo ${selectedAI}.`);
      return; 
    }

    setUploadedFileName(file.name)
    setLoadingFile(true)

    const formData = new FormData()
    formData.append("file", file)
    formData.append("ai_model", selectedAI)
    formData.append("api_key", selectedAI === "Méliuz Internal AI" ? "" : apiKey)

    try {
      const response = await fetch("http://localhost:8000/api/analyze", {
        method: "POST",
        body: formData
      })

      if (!response.ok) {
        throw new Error("Erro no processamento. Verifique o schema do arquivo.")
      }
      
      const data = await response.json()
      if (data.success) {
        setAnalysisData(data)
        await fetchHistory()
      }
    } catch (error) {
      console.error(error)
      alert("⚠️ Erro no processamento. Verifique a sua API Key ou se o backend está rodando.")
    } finally {
      setLoadingFile(false)
    }
  }

  const generatePDF = () => {
    if (!analysisData) return;
    
    const doc = new jsPDF();
    const partner = partnerName;
    const isPrejuizo = analysisData.status === "PREJUÍZO DETECTADO";

    const primaryColor = isPrejuizo ? [224, 27, 27] : [224, 27, 76]; 
    const textColor = [40, 40, 40];
    const lightText = [100, 100, 100];

    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text("Méliuz - Relatório Executivo de Growth", 14, 20);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.setTextColor(lightText[0], lightText[1], lightText[2]);
    doc.text(`Análise de Rentabilidade A/B — Parceiro: ${partner}`, 14, 28);
    doc.setDrawColor(200, 200, 200);
    doc.line(14, 32, 196, 32); 

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.text("1. Contexto Analítico", 14, 42);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(80, 80, 80);
    const contexto = `O teste A/B para o parceiro ${partner} foi processado utilizando o motor ${selectedAI}. O objetivo principal desta análise é determinar a elasticidade do cashback e identificar qual estrutura maximiza o Lucro Líquido Real.`;
    const splitContexto = doc.splitTextToSize(contexto, 180);
    doc.text(splitContexto, 14, 49);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.text("2. Decisão da Inteligência Analítica", 14, 75);

    doc.setFontSize(15);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    
    if (isPrejuizo) {
      doc.text(`ALERTA: RECOMENDAÇÃO DE PAUSA`, 14, 83);
      doc.setFontSize(11);
      doc.setTextColor(80, 80, 80);
      doc.setFont("helvetica", "normal");
      doc.text("Ação Recomendada: Abortar o rollout e estancar a queima de caixa imediatamente.", 14, 90);
    } else {
      doc.text(`VENCEDOR DE MARGEM: ${winnerNode.toUpperCase()}`, 14, 83);
      doc.setFontSize(11);
      doc.setTextColor(80, 80, 80);
      doc.setFont("helvetica", "normal");
      doc.text(`Ação Recomendada: Escalar imediatamente a variante '${winnerNode}' para 100%.`, 14, 90);
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.text("3. Consolidado Financeiro por Variante", 14, 105);

    const tableData = displayMetrics.map(m => [
      m.grupo + (m.grupo === winnerNode ? (isPrejuizo ? " (Menor Prejuízo)" : " (Win)") : ""),
      m.compradores.toLocaleString('pt-BR'),
      `R$ ${m.gmv.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`,
      `R$ ${m.comissao.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`,
      `R$ ${m.lucro_liquido.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`,
      `${(m.margem_lucro || 0).toFixed(1)}%`
    ]);

    autoTable(doc, {
      startY: 110,
      head: [['Variante', 'Compradores', 'GMV Total', 'Comissão Parceiro', 'Lucro Líquido', 'Margem']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: primaryColor, textColor: [255, 255, 255], fontStyle: 'bold' }
    });

    const finalY = doc.lastAutoTable.finalY + 15;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.text("4. Resumo e Justificativa (Report)", 14, finalY);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    
    const aiReportText = analysisData.report ? doc.splitTextToSize(analysisData.report, 180) : "Nenhuma análise gerada.";
    doc.text(aiReportText, 14, finalY + 8);

    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    const dataHora = new Date().toLocaleString('pt-BR');
    doc.text(`Documento gerado e auditado por ${selectedAI} em ${dataHora}`, 14, 285);

    doc.save(`Meliuz_Growth_Report_${partner}.pdf`);
  };

  return (
    <div className="min-h-screen bg-[#060913] text-[#e2e8f0] flex flex-col p-4 selection:bg-emerald-500/20 font-sans">
      
      <div className="w-full bg-[#0d1324] border border-[#1e293b] rounded-xl px-5 py-3 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400 mb-4 shadow-xl">
        <div className="flex items-center flex-wrap gap-4">
          <div className="flex items-center space-x-2 text-white font-mono font-bold tracking-wider mr-2">
            <span className="text-[#10b981] font-black text-base">⟡</span>
            <span>MELIUZ_GROWTH_AI //</span>
          </div>

          <select 
            value={selectedAI} 
            onChange={(e) => {
              setSelectedAI(e.target.value);
              if (e.target.value === "Méliuz Internal AI") setApiKey("");
            }}
            className="bg-[#060913] text-[#3b82f6] border border-[#1e293b] rounded-md px-3 py-1.5 text-[10px] font-mono outline-none focus:border-[#3b82f6]/50 transition-colors uppercase tracking-wider cursor-pointer shadow-sm"
          >
            <option value="Méliuz Internal AI">Méliuz Internal AI (Default)</option>
            <option value="ChatGPT">ChatGPT (OpenAI)</option>
            <option value="Claude">Claude (Anthropic)</option>
            <option value="Gemini">Gemini (Google)</option>
          </select>

          {selectedAI !== "Méliuz Internal AI" && (
            <div className="flex items-center bg-[#060913] border border-[#1e293b] rounded-md px-2 py-1 focus-within:border-[#10b981]/50 transition-colors shadow-sm">
              <Key size={12} className="text-slate-500 mr-2" />
              <input 
                type="password" 
                placeholder={`API Key do ${selectedAI.split(' ')[0]}...`}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="bg-transparent text-slate-300 text-[10px] font-mono outline-none w-48 placeholder:text-slate-600"
              />
            </div>
          )}
        </div>

        <div className="flex items-center space-x-3 ml-auto">
          {analysisData && (
            <button 
              onClick={generatePDF}
              className="flex items-center gap-2 bg-[#10b981] text-[#060913] px-4 py-1.5 rounded border border-[#10b981] font-bold text-[11px] uppercase tracking-wider hover:bg-[#059669] transition-all"
            >
              <Download size={14} /> Baixar Relatório (PDF)
            </button>
          )}
        </div>
      </div>

      <div className="w-full bg-[#0d1324] border border-[#1e293b] rounded-xl p-6 relative overflow-hidden mb-4 min-h-[360px] flex flex-col justify-between shadow-2xl">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#141c36_1px,transparent_1px),linear-gradient(to_bottom,#141c36_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] opacity-40 pointer-events-none" />

        <div className="text-[11px] font-mono text-slate-500 uppercase tracking-widest flex items-center justify-between z-10 relative">
          <span>[ Architecture Topology Mapping ]</span>
          <span className="text-slate-400 font-bold bg-[#060913] px-2 py-0.5 rounded border border-[#1e293b]">TARGET: {partnerName}</span>
        </div>

        <div className="my-auto flex flex-col lg:flex-row items-center justify-between gap-6 px-4 z-10 relative">
          
          <div className="bg-[#060913] p-4 rounded-xl border border-[#3b82f6]/40 text-center w-56">
            <div className="text-[10px] text-[#3b82f6] font-mono font-bold tracking-wider mb-2.5 flex items-center justify-center gap-1.5 border-b border-[#141c36] pb-2">
              <Database size={12} /> INGESTION_ENGINE
            </div>
            <label className="w-full flex flex-col items-center justify-center h-24 border border-dashed border-[#3b82f6]/30 hover:border-[#3b82f6]/70 bg-[#0d1324] hover:bg-[#0d1324]/90 rounded-lg cursor-pointer p-2">
              <input type="file" accept=".csv" className="hidden" onChange={handleIngestFile} disabled={loadingFile} />
              {loadingFile ? (
                <div className="flex flex-col items-center justify-center space-y-1.5">
                  <RefreshCw size={18} className="text-[#3b82f6] animate-spin" />
                  <span className="text-[9px] font-mono text-[#3b82f6]">PROCESSING...</span>
                </div>
              ) : uploadedFileName ? (
                <div className="text-[11px] font-mono font-bold text-[#10b981] truncate px-1">{uploadedFileName}</div>
              ) : (
                <span className="text-[10px] font-mono text-slate-400">LOAD_CSV_DATA</span>
              )}
            </label>
          </div>

          <ArrowRight className="text-slate-700 hidden lg:block animate-pulse" size={16} />

          <div className="bg-[#060913] p-4 rounded-xl border border-[#10b981]/40 text-center w-56 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
            <div className="text-[10px] text-[#10b981] font-mono font-bold tracking-wider mb-2 flex items-center justify-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-[#10b981] animate-ping mr-1" />
              AI_ANALYTICS_CORE
            </div>
            <div className={`text-xs font-bold bg-[#071a14] border border-[#10b981]/30 py-2 px-2 rounded-lg mt-2 uppercase tracking-wide font-mono truncate shadow-inner ${winnerNode !== 'NONE' ? 'text-[#10b981]' : 'text-slate-600'}`}>
              {winnerNode !== 'NONE' ? `🏆 ${winnerNode}` : 'CALCULATING...'}
            </div>
          </div>

          <ArrowRight className="text-slate-700 hidden lg:block animate-pulse" size={16} />

          <a href="https://docs.google.com/spreadsheets/d/1rS0fgOQDw8C__go5mot1JWlOPdJ7xEH81szL4itRPlI/edit?usp=sharing" target="_blank" rel="noreferrer" className="bg-[#060913] p-4 rounded-xl border border-[#10b981]/20 text-center w-52 block">
            <div className="text-[10px] text-slate-400 font-mono tracking-wider mb-2 flex items-center justify-center gap-1">
              LIVE_SPREADSHEET <ExternalLink size={10} />
            </div>
            <div className={`text-[9px] font-mono mt-2.5 border rounded py-1 ${analysisData ? 'bg-[#061712] text-[#10b981] border-[#10b981]/20' : 'bg-slate-900 text-slate-600'}`}>
              {analysisData ? '✓ Saved Successfully' : '○ Standby Line'}
            </div>
          </a>
        </div>

        <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono pt-4 border-t border-[#141c36] z-10 relative">
          <div className="flex space-x-4">
            <span className="text-[#3b82f6]">↳ MODEL_SELECTED: {selectedAI.toUpperCase()}</span>
          </div>
        </div>
      </div>

      <div className="w-full bg-[#0d1324] border border-[#1e293b] rounded-xl p-5 shadow-xl flex-1">
        <h3 className="text-sm font-bold text-slate-300 mb-4 flex items-center gap-2 uppercase tracking-wide">
          <History size={16} className="text-[#3b82f6]" /> Histórico de Decisões do Motor AI
        </h3>
        
        {historyLog.length > 0 ? (
          <div className="overflow-x-auto rounded-lg border border-[#1e293b]">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#060913] text-slate-400 font-mono text-[10px] uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 font-medium border-b border-[#1e293b]">Data/Hora</th>
                  <th className="px-4 py-3 font-medium border-b border-[#1e293b]">Nome do Teste</th>
                  <th className="px-4 py-3 font-medium border-b border-[#1e293b]">Resultado da Engine</th>
                  <th className="px-4 py-3 font-medium border-b border-[#1e293b]">Ação Recomendada</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e293b] bg-[#0d1324]">
                {historyLog.map((log, index) => (
                  <tr key={index} className="hover:bg-[#141c36]/50 transition-colors">
                    <td className="px-4 py-3 text-slate-500 font-mono text-xs whitespace-nowrap">{log.Data || "N/A"}</td>
                    <td className="px-4 py-3 text-slate-300 font-medium flex items-center gap-2">
                      <FileText size={14} className="text-slate-500"/>
                      {log['Nome do Teste']}
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs">{log.Resultado}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-1 rounded-md bg-[#061712] text-[#10b981] border border-[#10b981]/20 text-[10px] font-mono font-bold uppercase tracking-wider">
                        {log['Decisão Tomada']}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-slate-500 border border-dashed border-[#1e293b] rounded-lg bg-[#060913]/50">
            <Database size={24} className="mb-2 opacity-50" />
            <p className="text-sm">Nenhum histórico de análise encontrado no banco de dados.</p>
          </div>
        )}
      </div>

    </div>
  )
}

export default App