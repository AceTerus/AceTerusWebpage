files = {
    'OcrQuizGenerator.tsx': (
        r'C:\Users\Dhiren23\Documents\AceTerusRebrand-1\src\components\OcrQuizGenerator.tsx',
        ['\\u0000-\\u0008\\u000B', 'catch (err: unknown)', 'err instanceof Error']
    ),
    'text-quiz-parser/index.ts': (
        r'C:\Users\Dhiren23\Documents\AceTerusRebrand-1\supabase\functions\text-quiz-parser\index.ts',
        ['\\u0000-\\u0008\\u000B']
    ),
    'MascotGreeter.tsx': (
        r'C:\Users\Dhiren23\Documents\AceTerusRebrand-1\src\components\MascotGreeter.tsx',
        ['pushMessage])']
    ),
}

all_ok = True
for name, (path, needles) in files.items():
    c = open(path, encoding='utf-8').read()
    for needle in needles:
        found = needle in c
        status = 'OK' if found else 'MISSING'
        if not found:
            all_ok = False
        print(name + ': ' + repr(needle[:50]) + ' -> ' + status)

print()
print('All checks passed!' if all_ok else 'SOME CHECKS FAILED')
