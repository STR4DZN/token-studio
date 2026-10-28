"""Read-only conversion of a Token Studio backup into native Actor JSON files.

Does not connect to Foundry, restore documents or change image paths/IDs.
Use a NEW output directory; all input is validated before writing any file.
"""
import argparse
import json
from pathlib import Path
import re


def extract_backup(source: Path, destination: Path):
    if source.stat().st_size > 64 * 1024 * 1024:
        raise ValueError("Backup excede 64 MiB; examine-o manualmente.")
    data = json.loads(source.read_text(encoding="utf-8"))
    if not isinstance(data, dict) or data.get("schema") != "token-studio-foundry-backup-1":
        raise ValueError("O arquivo não é um backup nativo do Token Studio.")
    documents = data.get("documents")
    if not isinstance(documents, list) or not documents:
        raise ValueError("Backup sem lista de documentos recuperáveis.")
    identifiers = set()
    outputs = []
    for document in documents:
        if not isinstance(document, dict):
            raise ValueError("Documento inválido no backup.")
        identifier = document.get("_id")
        if not isinstance(identifier, str) or not re.fullmatch(r"[A-Za-z0-9_-]{1,64}", identifier):
            raise ValueError("Identificador de ator inválido no backup.")
        if identifier in identifiers:
            raise ValueError("Identificador de ator repetido; não é seguro escolher um destino.")
        identifiers.add(identifier)
        if document.get("type") not in ("pilot", "mech") or not isinstance(document.get("system"), dict):
            raise ValueError("Tipo ou dados do ator incompatíveis com este procedimento Lancer.")
        items = document.get("items")
        if not isinstance(items, list) or any(not isinstance(item, dict) or not isinstance(item.get("_id"), str) for item in items):
            raise ValueError("Lista de itens incompleta no snapshot do ator.")
        item_ids = [item["_id"] for item in items]
        if len(item_ids) != len(set(item_ids)):
            raise ValueError("Identificadores de itens repetidos no snapshot do ator.")
        # No projection or reserialization into Foundry's dotted update format.
        outputs.append((identifier + ".json", json.dumps(document, ensure_ascii=False, indent=2, allow_nan=False) + "\n"))
    destination.mkdir(parents=True, exist_ok=False)
    for filename, content in outputs:
        (destination / filename).write_text(content, encoding="utf-8")
    return {"schema": data["schema"], "world": data.get("world"), "createdAt": data.get("createdAt"), "files": [filename for filename, _ in outputs]}


def main():
    parser = argparse.ArgumentParser(description="Extrai snapshots nativos sem alterar o mundo Foundry.")
    parser.add_argument("backup", type=Path)
    parser.add_argument("--output", type=Path, required=True, help="Pasta nova; nunca sobrescreve uma pasta existente.")
    args = parser.parse_args()
    try:
        result = extract_backup(args.backup, args.output)
    except (OSError, ValueError, TypeError) as error:
        parser.exit(1, f"Não foi possível extrair o backup: {error}\n")
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
