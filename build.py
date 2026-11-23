from pathlib import Path
import subprocess

root = Path(__file__).resolve().parent
for name in ('engine.js', 'app.js'):
    subprocess.run(['node', '--check', str(root / 'src' / name)], check=True)
css = (root / 'src/style.css').read_text(encoding='utf-8')
scripts = '\n'.join('<script>\n' + (root / 'src' / name).read_text(encoding='utf-8') + '\n</script>' for name in ('engine.js', 'app.js'))
html = '''<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#245a49"><meta name="description" content="依据克劳尔公开理论与样题机制重做的120题十课归纳训练：自行发现、定位修复、反向查验与方法依据。"><title>比较之间 · 克劳尔方法重做版 v2</title><style>
''' + css + '''
</style></head><body>
<div id="app"></div><div id="toast" class="toast hidden" role="status" aria-live="polite"></div>
<dialog id="resetDialog" class="modal"><h2>清除本版训练进度？</h2><p>清除的是方法重做版在本浏览器的记录。旧版数据仍保留。需要时先导出备份。</p><div class="row"><button id="cancelReset">保留记录</button><button id="confirmReset" class="danger">清除本版记录</button></div></dialog>
<dialog id="methodDialog" class="modal"><div id="methodContent"></div><button id="closeMethod">返回题目</button></dialog>
<noscript>请开启浏览器JavaScript以进行训练。</noscript>
''' + scripts + '\n</body></html>\n'
assert '<script src=' not in html and '<link ' not in html
(root / 'index.html').write_text(html, encoding='utf-8')
print('Built method edition:', len(html.encode('utf-8')), 'bytes; standalone HTML')
