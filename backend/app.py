import os
import pandas as pd
import numpy as np
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import io

import gspread
from google.oauth2.service_account import Credentials

app = FastAPI(title="Méliuz Growth AI Analytics Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def clean_currency(val):
    if pd.isna(val):
        return 0.0
    if isinstance(val, (int, float)):
        return float(val)
    if isinstance(val, str):
        val = val.replace("R$", "").replace(" ", "")
        if "." in val and "," in val:
            val = val.replace(".", "")
        val = val.replace(",", ".")
        try:
            return float(val)
        except ValueError:
            return 0.0
    return 0.0

def process_ab_test(df: pd.DataFrame):
    df.columns = [c.lower().strip() for c in df.columns]
    
    col_mapping = {
        'grupos de usuários': 'grupo',
        'grupo de usuários': 'grupo',
        'grupo': 'grupo',
        'grupos': 'grupo',
        'parceiro': 'parceiro',
        'compradores': 'compradores',
        'comissão': 'comissao',
        'comissao': 'comissao',
        'cashback': 'cashback',
        'vendas totais': 'gmv',
        'gmv': 'gmv'
    }
    
    renamed_cols = {}
    for c in df.columns:
        if c in col_mapping:
            renamed_cols[c] = col_mapping[c]
            
    df = df.rename(columns=renamed_cols)
    
    df['compradores'] = pd.to_numeric(df['compradores'], errors='coerce').fillna(0).astype(int)
    df['comissao'] = df['comissao'].apply(clean_currency)
    df['cashback'] = df['cashback'].apply(clean_currency)
    df['gmv'] = df['gmv'].apply(clean_currency)
    df['lucro_liquido'] = df['comissao'] - df['cashback']
    
    summary = df.groupby('grupo').agg({
        'compradores': 'sum',
        'gmv': 'sum',
        'comissao': 'sum',
        'cashback': 'sum',
        'lucro_liquido': 'sum'
    }).reset_index()
    
    summary['margem_lucro'] = (summary['lucro_liquido'] / summary['comissao']).fillna(0) * 100
    
    partner_name = df['parceiro'].iloc[0] if 'parceiro' in df.columns else "Desconhecido"
    
    winning_idx = summary['lucro_liquido'].idxmax()
    winner = summary.loc[winning_idx, 'grupo']
    
    return summary.to_dict(orient='records'), partner_name, winner

def generate_report(ai_model: str, api_key: str, partner: str, summary_data: list, winner: str):
    win_data = next((item for item in summary_data if item["grupo"] == winner), None)
    lucro_winner_val = win_data['lucro_liquido'] if win_data else 0.0
    lucro_winner_str = f"R$ {lucro_winner_val:,.2f}"
    
    if lucro_winner_val < 0:
        internal_fallback_text = (
            f"ALERTA CRÍTICO: Todas as variantes analisadas operam com margem de contribuição NEGATIVA. "
            f"A variante '{winner}' apresenta o menor prejuízo financeiro relativo ({lucro_winner_str}), porém, sob a perspectiva de Growth, "
            f"a recomendação mandatória é INTERROMPER o teste imediatamente. Não realize o rollout para 100% do tráfego até que as premissas "
            f"de cashback e a taxa de comissão contratual sejam renegociadas para estancar a queima de caixa."
        )
    else:
        internal_fallback_text = (
            f"Com base na análise determinística de dados do parceiro {partner}, "
            f"a variante '{winner}' é a recomendada para escala. "
            f"Esta decisão baseia-se na maximização matemática do Lucro Líquido Real ({lucro_winner_str}), "
            f"garantindo ganho de volume sustentável com geração de margens financeiras positivas para a plataforma."
        )

    if ai_model == "Méliuz Internal AI" or not api_key.strip():
        return internal_fallback_text

    prompt = f"""
    Você é um Analista de Growth Sênior no Méliuz.
    Fizemos um teste A/B de cashback no parceiro '{partner}'. A variante com menor prejuízo ou maior lucro foi '{winner}'.
    Os dados consolidados de todas as variantes são: {summary_data}.
    
    REGRA DE NEGÓCIO CRÍTICA: Se o lucro líquido da variante '{winner}' for NEGATIVO (menor que zero), você é PROIBIDO de recomendar o rollout/escala. Você DEVE emitir um alarme de margem negativa e recomendar a suspensão imediata do teste para proteção do caixa da empresa.
    Escreva um parágrafo executivo curto (3 a 4 frases), analítico, direto e sem saudações.
    """

    try:
        if "ChatGPT" in ai_model:
            import openai
            client = openai.OpenAI(api_key=api_key)
            response = client.chat.completions.create(model="gpt-4o", messages=[{"role": "user", "content": prompt}])
            return response.choices[0].message.content
        elif "Claude" in ai_model:
            import anthropic
            client = anthropic.Anthropic(api_key=api_key)
            response = client.messages.create(model="claude-3-5-sonnet-20240620", max_tokens=300, messages=[{"role": "user", "content": prompt}])
            return response.content[0].text
        elif "Gemini" in ai_model:
            import google.generativeai as genai
            genai.configure(api_key=api_key)
            model = genai.GenerativeModel('gemini-1.5-pro')
            response = model.generate_content(prompt)
            return response.text
    except Exception as e:
        return f"[Análise Alternativa devido a falha na API externa]:\n{internal_fallback_text}"

def register_in_sheets_mock(test_name, description, result, decision):
    sheets_file = "tracking_sheets.csv"
    from datetime import datetime
    row = {
        "Data": datetime.now().strftime("%d/%m/%Y %H:%M"),
        "Nome do Teste": test_name,
        "Descrição": description,
        "Resultado": result,
        "Decisão Tomada": decision
    }
    df_row = pd.DataFrame([row])
    if not os.path.exists(sheets_file):
        df_row.to_csv(sheets_file, index=False)
    else:
        df_row.to_csv(sheets_file, mode='a', header=False, index=False)

def register_in_google_sheets(test_name, description, result, decision):
    scopes = ["https://www.googleapis.com/auth/spreadsheets", "https://www.googleapis.com/auth/drive"]
    try:
        if not os.path.exists("credentials.json"): 
            return
        credentials = Credentials.from_service_account_file("credentials.json", scopes=scopes)
        gc = gspread.authorize(credentials)
        sh = gc.open_by_key("1rS0fgOQDw8C__go5mot1JWlOPdJ7xEH81szL4itRPlI")
        worksheet = sh.get_worksheet(0) 
        
        from datetime import datetime
        data_str = datetime.now().strftime("%d/%m/%Y %H:%M:%S")
        
        if len(worksheet.get_all_values()) == 0:
            worksheet.append_row(["Data da Análise", "Nome do Teste", "Descrição / Justificativa Completa", "Resultado Principal", "Decisão (Growth)"])
            
        worksheet.append_row([data_str, test_name, description, result, decision])
    except Exception as e:
        print(f"Erro ao salvar no GSheets: {e}")

@app.post("/api/analyze")
async def analyze_test(
    file: UploadFile = File(...), 
    ai_model: str = Form("Méliuz Internal AI"), 
    api_key: str = Form("")
):
    try:
        contents = await file.read()
        try:
            df = pd.read_csv(io.BytesIO(contents), encoding="utf-8")
        except UnicodeDecodeError:
            df = pd.read_csv(io.BytesIO(contents), encoding="iso-8859-1")
        
        summary_data, partner_name, winner = process_ab_test(df)
        
        report_text = generate_report(ai_model, api_key, partner_name, summary_data, winner)
        
        win_data = next((item for item in summary_data if item["grupo"] == winner), None)
        is_prejuizo = win_data['lucro_liquido'] < 0 if win_data else False
        status_growth = "PREJUÍZO DETECTADO" if is_prejuizo else "SUCESSO"

        test_name = f"Teste A/B Cashback — Parceiro {partner_name}"
        metrics_summary = " | ".join([
            f"{m['grupo']}: LL R$ {m['lucro_liquido']:,.2f} ({m['margem_lucro']:.1f}%)" 
            for m in summary_data
        ])
        
        if is_prejuizo:
            result_summary = f"Risco de Margem: {winner} é a menos prejudicial [Métricas -> {metrics_summary}]"
            decision_taken = "Pausar Teste imediatamente / Abortar rollout."
        else:
            result_summary = f"Vencedor: {winner} [Métricas -> {metrics_summary}]"
            decision_taken = f"Escalar a variante '{winner}' para 100% do tráfego."
        
        register_in_sheets_mock(test_name, report_text, result_summary, decision_taken)
        register_in_google_sheets(test_name, report_text, result_summary, decision_taken)
        
        return {
            "success": True,
            "partner": partner_name,
            "winner": winner,
            "status": status_growth,
            "metrics": summary_data,
            "report": report_text
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/history")
async def get_history():
    sheets_file = "tracking_sheets.csv"
    if not os.path.exists(sheets_file):
        return {"history": []}
    try:
        df = pd.read_csv(sheets_file).fillna("")
        return {"history": df.to_dict(orient="records")[::-1]}
    except Exception as e:
        return {"history": []}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)