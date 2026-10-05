#!/usr/bin/env python3
"""Read a public COMP/CON pilot share into a local JSON file. Python 3 standard library only."""
import argparse
import json
import re
from pathlib import Path
from urllib.parse import urlparse, urlencode, urljoin
from urllib.request import Request, urlopen

API_KEY = 'fcFvjjrnQy2hypelJQi4X9dRI55r5KuI4bC07Maf'  # Public application identifier; no login.
BUCKET = 'https://ds69h3g1zxwgy.cloudfront.net/'
MAX_BYTES = 12 * 1024 * 1024

def share_code(value):
    code = value.replace('-', '').upper()
    if value.startswith(('http:', 'https:')):
        url = urlparse(value)
        if url.scheme != 'https' or url.hostname not in ('compcon.app', 'www.compcon.app') or url.username or url.password or url.port:
            raise ValueError('Use um link HTTPS de compcon.app.')
        match = re.fullmatch(r'/link/pilot/([a-zA-Z0-9]{12})(?:/(?:full|build))?/?', url.path)
        if not match:
            raise ValueError('Link de piloto inválido.')
        code = match[1].upper()
    if not re.fullmatch(r'[A-Z0-9]{12}', code):
        raise ValueError('Código de piloto inválido.')
    return code

def read_json(url, headers=None):
    with urlopen(Request(url, headers=headers or {}), timeout=20) as response:
        data = response.read(MAX_BYTES + 1)
    if len(data) > MAX_BYTES:
        raise ValueError('Resposta maior que 12 MB.')
    return json.loads(data)

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('link', help='link ou código de piloto')
    parser.add_argument('output', type=Path, help='novo arquivo .json; não sobrescreve arquivos existentes')
    args = parser.parse_args()
    try:
        code = share_code(args.link)
        lookup = read_json('https://api.compcon.app/v3/code?' + urlencode({'codes': json.dumps([code]), 'scope': 'items'}), {'x-api-key': API_KEY})
        entry = next((x for x in lookup if x.get('code') == code), lookup[0] if lookup else None)
        if not entry or not entry.get('uri'):
            raise ValueError('Compartilhamento não encontrado.')
        url = urljoin(BUCKET, entry['uri'])
        if urlparse(url).scheme != 'https' or urlparse(url).netloc != urlparse(BUCKET).netloc:
            raise ValueError('Origem não reconhecida.')
        data = read_json(url)
        if not isinstance(data, dict) or not isinstance(data.get('name'), str) or not isinstance(data.get('mechs'), list):
            raise ValueError('Resposta não é uma ficha de piloto.')
        with args.output.open('x', encoding='utf-8') as destination:
            json.dump(data, destination, ensure_ascii=False, indent=2)
        print(f"Ficha salva: {args.output} ({data.get('callsign', data['name'])}).")
    except Exception as error:
        parser.exit(1, f'Não foi possível resolver a ficha: {error}\n')

if __name__ == '__main__':
    main()
