#!/usr/bin/env python3
"""Importação resumível somente das informações públicas da loja autorizada."""
import concurrent.futures as futures
from collections import Counter, defaultdict
import hashlib
import io
import json
import math
import re
import threading
import time
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / 'public'
CACHE = ROOT / 'source' / 'products'
BASE = 'https://www.sportcarautopecas.com.br'
local = threading.local()
for directory in [PUBLIC / 'data' / 'products', PUBLIC / 'images' / 'products', CACHE, ROOT / 'source' / 'pages']:
    directory.mkdir(parents=True, exist_ok=True)

def session():
    if not hasattr(local, 'session'):
        local.session = requests.Session()
        local.session.headers['User-Agent'] = 'Stoffels-Catalog-Migration/1.0'
    return local.session

def get(url):
    for attempt in range(5):
        try:
            r = session().get(url, timeout=45)
            r.raise_for_status()
            return r
        except requests.RequestException:
            if attempt == 4:
                raise
            time.sleep(1 + attempt * 2)

def write_json(path, value):
    tmp = path.with_suffix('.tmp')
    tmp.write_text(json.dumps(value, ensure_ascii=False, separators=(',', ':')))
    tmp.replace(path)

def listing(page):
    path = ROOT / 'source' / 'pages' / f'{page}.json'
    if not path.exists():
        write_json(path, get(f'{BASE}/web_api/products?limit=50&page={page}').json())
    return json.loads(path.read_text())

def detail(item):
    product = item['Product']
    path = CACHE / f"{product['id']}.json"
    if not path.exists():
        write_json(path, get(f"{BASE}/web_api/products/{product['id']}").json()['Product'])
    return json.loads(path.read_text())

def image_path(url):
    return '/images/products/' + hashlib.sha256(url.encode()).hexdigest()[:24] + '.webp'

def download_image(url):
    path = PUBLIC / image_path(url).lstrip('/')
    if not path.exists():
        im = ImageOps.exif_transpose(Image.open(io.BytesIO(get(url).content)))
        im.thumbnail((1100, 1100))
        im = im.convert('RGB')
        im.save(path.with_suffix('.tmp'), format='WEBP', quality=83, method=4)
        path.with_suffix('.tmp').replace(path)
    return url

def photos(product):
    images = product.get('ProductImage') or []
    return list(dict.fromkeys(x.get('https') or x.get('http', '').replace('http:', 'https:') for x in images if x.get('https') or x.get('http')))

def sanitize_description(html):
    soup = BeautifulSoup(html or '', 'html.parser')
    for el in soup.find_all(['script', 'style', 'iframe', 'form', 'object', 'embed']):
        el.decompose()
    for el in soup.find_all(True):
        if el.name not in ['p','br','strong','b','em','i','ul','ol','li','h2','h3','h4','table','tbody','tr','td','th']:
            el.unwrap()
        else:
            el.attrs = {}
    return re.sub('sportcar', 'Stoffels', str(soup), flags=re.I)

def main():
    first = listing(1)
    total = first['paging']['total']
    pages = math.ceil(total / 50)
    print(f'Catálogo público: {total} produtos, {pages} páginas', flush=True)
    items = []
    with futures.ThreadPoolExecutor(max_workers=8) as pool:
        for i, page in enumerate(pool.map(listing, range(1, pages + 1)), 1):
            items.extend(page['Products'])
            if i % 20 == 0:
                print(f'Listagem: {i}/{pages}', flush=True)
    products, errors = [], []
    with futures.ThreadPoolExecutor(max_workers=10) as pool:
        jobs = {pool.submit(detail, x): x['Product']['id'] for x in items}
        for i, job in enumerate(futures.as_completed(jobs), 1):
            try:
                products.append(job.result())
            except Exception as exc:
                errors.append({'id': jobs[job], 'error': str(exc)})
            if i % 500 == 0:
                print(f'Detalhes: {i}/{len(items)}, falhas: {len(errors)}', flush=True)
    urls = sorted(set(url for product in products for url in photos(product)))
    print(f'Fotos únicas: {len(urls)}', flush=True)
    image_errors = []
    with futures.ThreadPoolExecutor(max_workers=10) as pool:
        jobs = {pool.submit(download_image, url): url for url in urls}
        for i, job in enumerate(futures.as_completed(jobs), 1):
            try:
                job.result()
            except Exception as exc:
                image_errors.append({'url': jobs[job], 'error': str(exc)})
            if i % 1000 == 0:
                print(f'Fotos: {i}/{len(urls)}, falhas: {len(image_errors)}', flush=True)
    catalog = []
    categories = {}
    list_by_id = {str(item['Product']['id']): item['Product'] for item in items}
    category_paths = defaultdict(Counter)
    for p in products:
        path = (p.get('slug') or '').split('/')[:-1]
        if path and path[0] == 'categorias':
            path = path[1:]
        if path:
            category_paths[str(p['category_id'])]['/'.join(path)] += 1
    for p in products:
        slug = p.get('slug') or p['url']['https'].removeprefix(BASE + '/')
        paths = slug.split('/')[:-1]
        if paths and paths[0] == 'categorias':
            paths = paths[1:]
        if not paths:
            candidates = category_paths[str(p['category_id'])]
            paths = candidates.most_common(1)[0][0].split('/') if candidates else ['outras-pecas']
        for idx in range(len(paths)):
            key = '/'.join(paths[:idx+1])
            label = paths[idx].replace('-', ' ').capitalize()
            if str(p.get('category_id')) and idx == len(paths) - 1 and p.get('category_name'):
                label = p['category_name']
            categories.setdefault(key, {'slug': key, 'name': label, 'count': 0})['count'] += 1
        price = float(p.get('price') or 0)
        promo = float(p.get('promotional_price') or 0)
        normalized = {
            'id': str(p['id']), 'slug': slug, 'name': p['name'], 'price': promo if 0 < promo < price else price,
            'originalPrice': price, 'brand': p.get('brand') or '', 'model': p.get('model') or '',
            'category': '/'.join(paths), 'categoryName': p.get('category_name') or '',
            'available': p.get('available') == '1' and list_by_id[str(p['id'])].get('available_for_purchase') == '1',
            'featured': p.get('hot') == '1', 'new': p.get('release') == '1',
            'images': [image_path(url) for url in photos(p) if (PUBLIC / image_path(url).lstrip('/')).exists()],
        }
        full = {**normalized, 'description': sanitize_description(p.get('description')),
                'properties': p.get('Properties') or [], 'sourceUrl': BASE + '/' + slug}
        write_json(PUBLIC / 'data' / 'products' / f"{p['id']}.json", full)
        catalog.append({**normalized, 'image': normalized['images'][0] if normalized['images'] else '', 'images': None})
    catalog.sort(key=lambda p: int(p['id']))
    write_json(PUBLIC / 'data' / 'catalog.json', catalog)
    write_json(PUBLIC / 'data' / 'categories.json', list(categories.values()))
    report = {'source': BASE, 'importedAt': datetime.now(timezone.utc).isoformat(), 'expectedProducts': total,
              'importedProducts': len(catalog), 'availableProducts': sum(p['available'] for p in catalog),
              'downloadedImages': len(urls) - len(image_errors), 'productErrors': errors, 'imageErrors': image_errors}
    write_json(ROOT / 'source' / 'import-report.json', report)
    print(json.dumps(report, ensure_ascii=False), flush=True)

if __name__ == '__main__':
    main()
