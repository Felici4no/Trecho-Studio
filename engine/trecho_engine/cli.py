import sys
import os
import json
import argparse
from typing import Dict, Any

from trecho_engine.media_probe import run_probe
from trecho_engine.render_plan import RenderPlan
from trecho_engine.render_service import RenderService
from trecho_engine.errors import TrechoEngineError, PROJECT_INVALID

def print_stderr(message: str) -> None:
    print(message, file=sys.stderr, flush=True)

def cmd_probe(args: argparse.Namespace) -> int:
    try:
        print_stderr(f"Iniciando ffprobe para o arquivo: {args.input}")
        metadata = run_probe(args.input)
        
        # Emite saída de sucesso em JSON puro
        print(json.dumps({
            "success": True,
            "data": metadata
        }), flush=True)
        return 0
    except TrechoEngineError as e:
        print(json.dumps({
            "success": False,
            "error": e.to_json()
        }), flush=True)
        return 0 # Retornamos 0 para que o JSON seja consumido normalmente e tratado na lógica
    except Exception as e:
        print(json.dumps({
            "success": False,
            "error": {
                "code": "MEDIA_PROBE_FAILED",
                "message": "Erro inesperado ao analisar mídia.",
                "details": str(e)
            }
        }), flush=True)
        return 0

def cmd_render(args: argparse.Namespace) -> int:
    job_id = args.job_id or "job_render"
    try:
        # Se for um caminho de arquivo, lê o arquivo
        if os.path.exists(args.plan):
            print_stderr(f"Lendo plano de renderização do arquivo: {args.plan}")
            with open(args.plan, "r", encoding="utf-8") as f:
                plan_data = json.load(f)
        else:
            # Caso contrário, tenta interpretar como string JSON
            print_stderr("Lendo plano de renderização diretamente da string JSON")
            plan_data = json.loads(args.plan)

        plan = RenderPlan.from_dict(plan_data)
        
        # Executa o serviço de renderização
        service = RenderService(plan, job_id=job_id)
        service.execute()
        return 0
    except json.JSONDecodeError as e:
        # Emite falha de renderização estruturada se o plano for inválido
        print(json.dumps({
            "type": "render.failed",
            "jobId": job_id,
            "error": {
                "code": PROJECT_INVALID,
                "message": "O plano de renderização fornecido não é um JSON válido.",
                "details": str(e)
            }
        }), flush=True)
        return 0
    except Exception as e:
        print(json.dumps({
            "type": "render.failed",
            "jobId": job_id,
            "error": {
                "code": "PROJECT_INVALID",
                "message": "Erro ao iniciar o processo de renderização.",
                "details": str(e)
            }
        }), flush=True)
        return 0

def main() -> int:
    parser = argparse.ArgumentParser(description="Trecho Studio Engine CLI")
    subparsers = parser.add_subparsers(dest="command", required=True)

    # Comando probe
    probe_parser = subparsers.add_parser("probe", help="Analisa metadados de um vídeo")
    probe_parser.add_argument("--input", required=True, help="Caminho do arquivo de vídeo de entrada")

    # Comando render
    render_parser = subparsers.add_parser("render", help="Executa renderização com base em um plano")
    render_parser.add_argument("--plan", required=True, help="Caminho do arquivo JSON contendo o RenderPlan ou string JSON")
    render_parser.add_argument("--job-id", help="Identificador único da renderização")

    args = parser.parse_args()

    if args.command == "probe":
        return cmd_probe(args)
    elif args.command == "render":
        return cmd_render(args)
    
    return 1

if __name__ == "__main__":
    sys.exit(main())
