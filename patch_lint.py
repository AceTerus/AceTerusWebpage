import sys

# The regex we want written into the TypeScript files (as printable chars, no actual ctrl chars)
NEW_REGEX = '/[\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F\\u007F]/g'

# ── OcrQuizGenerator.tsx ────────────────────────────────────────────────────
path1 = r'C:\Users\Dhiren23\Documents\AceTerusRebrand-1\src\components\OcrQuizGenerator.tsx'
c = open(path1, encoding='utf-8').read()

# The actual bytes currently in the file (control chars embedded in the regex)
OLD_REGEX = '/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g'

if OLD_REGEX in c:
    c = c.replace(OLD_REGEX, NEW_REGEX)
    print('OcrQuizGenerator: regex replaced')
else:
    print('OcrQuizGenerator: old regex not found, skipping')

# Fix catch blocks
c = c.replace(
    'catch (err: any) {\n      setStep("configure");\n      toast({ title: "Processing failed", description: err.message, variant: "destructive" });',
    'catch (err: unknown) {\n      setStep("configure");\n      const msg = err instanceof Error ? err.message : "An unexpected error occurred.";\n      toast({ title: "Processing failed", description: msg, variant: "destructive" });'
)
c = c.replace(
    'catch (err: any) {\n      toast({ title: "Save failed", description: err.message, variant: "destructive" });',
    'catch (err: unknown) {\n      const msg = err instanceof Error ? err.message : "An unexpected error occurred.";\n      toast({ title: "Save failed", description: msg, variant: "destructive" });'
)

open(path1, 'w', encoding='utf-8').write(c)
print('OcrQuizGenerator.tsx written')

# ── text-quiz-parser index.ts ───────────────────────────────────────────────
path2 = r'C:\Users\Dhiren23\Documents\AceTerusRebrand-1\supabase\functions\text-quiz-parser\index.ts'
c2 = open(path2, encoding='utf-8').read()

if OLD_REGEX in c2:
    c2 = c2.replace(OLD_REGEX, NEW_REGEX)
    print('text-quiz-parser: regex replaced')
else:
    print('text-quiz-parser: old regex not found, skipping')

open(path2, 'w', encoding='utf-8').write(c2)
print('text-quiz-parser/index.ts written')

print('Verify NEW_REGEX bytes:', [hex(ord(ch)) for ch in NEW_REGEX[:30]])
