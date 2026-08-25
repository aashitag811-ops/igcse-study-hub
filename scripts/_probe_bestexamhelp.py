import requests, re, sys

url = 'https://bestexamhelp.com/exam/cambridge-igcse/global-perspectives-0457/2025/0457-m25-er.php'
r = requests.get(url, timeout=15, headers={'User-Agent': 'Mozilla/5.0'})
text = r.text

# Write raw HTML to file to inspect
with open('scripts/_probe_output.html', 'w', encoding='utf-8') as f:
    f.write(text)

pdfs = re.findall(r'https?://[^\s<>"]+\.pdf', text, re.I)
iframes = re.findall(r'<iframe[^>]+src=["\']([^"\']+)["\']', text, re.I)
embeds = re.findall(r'<embed[^>]+src=["\']([^"\']+)["\']', text, re.I)
objects = re.findall(r'<object[^>]+data=["\']([^"\']+)["\']', text, re.I)
google = re.findall(r'https://drive\.google\.com[^\s<>"]+', text, re.I)

print('Direct PDFs:', pdfs[:5])
print('iframes:', iframes[:5])
print('embeds:', embeds[:5])
print('objects:', objects[:5])
print('google drive:', google[:5])
print('HTML saved to scripts/_probe_output.html')
