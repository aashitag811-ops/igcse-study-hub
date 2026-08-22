import urllib.request, re

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}

def fetch(url):
    req = urllib.request.Request(url, headers=headers)
    resp = urllib.request.urlopen(req, timeout=15)
    print(f'  Final URL: {resp.url}')
    return resp.read().decode('utf-8', 'ignore')

# Step 1: fetch march page and get the absolute URL of a paper link
march_url = 'https://bestexamhelp.com/exam/cambridge-igcse/accounting-0452/2021/march.php'
print(f'Fetching: {march_url}')
html = fetch(march_url)
links = re.findall(r'href=["\']([^"\']+)["\']', html, re.I)
paper_links = [l for l in links if '0452' in l and 'qp' in l]
print('Paper links found:')
for l in paper_links[:5]:
    print(' ', l)

# Step 2: resolve first paper link relative to the march page and fetch it
if paper_links:
    from urllib.parse import urljoin
    paper_url = urljoin(march_url, paper_links[0])
    print(f'\nFetching paper page: {paper_url}')
    try:
        html2 = fetch(paper_url)
        links2 = re.findall(r'href=["\']([^"\']+)["\']', html2, re.I)
        srcs2  = re.findall(r'src=["\']([^"\']+)["\']', html2, re.I)
        pdfs   = [l for l in links2 + srcs2 if '.pdf' in l.lower()]
        print('PDF links:')
        for p in pdfs:
            print(' ', p)
        if not pdfs:
            print('No PDF links — first 20 links:')
            for l in (links2 + srcs2)[:20]:
                print(' ', l)
    except Exception as e:
        print(f'  ERROR: {e}')
