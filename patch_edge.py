path = r'C:\Users\Dhiren23\Documents\AceTerusRebrand-1\supabase\functions\text-quiz-parser\index.ts'
c = open(path, encoding='utf-8').read()

# The file has literal text \x00 \x08 etc (not actual bytes).
# Replace with \uNNNN equivalents.
old = '/[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F\\x7F]/g'
new = '/[\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F\\u007F]/g'

if old in c:
    c = c.replace(old, new)
    open(path, 'w', encoding='utf-8').write(c)
    print('text-quiz-parser regex fixed')
else:
    print('pattern not found, current content around replace:')
    idx = c.find('replace(/')
    print(repr(c[idx:idx+80]))
